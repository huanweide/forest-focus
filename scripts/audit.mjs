#!/usr/bin/env node
/**
 * audit.mjs —— 阿梓的森林 · 源码静态审计
 *
 * 为什么需要它：
 *   本项目是「一个 index.html + 一堆全局 JS」的零构建单页应用，所有模块靠
 *   <script> 顺序拼接、所有交互靠 onclick="fn()" 字符串绑定。这种结构有三类
 *   问题不会报错、只会静默失效，历史上都真实发生过：
 *
 *     1. 桌面端样式全丢 —— build.py 硬编码 CSS 清单漏了 desktop.css；
 *     2. 分享按钮点了没反应 —— build.py 漏打包 share.js，openShare 未定义；
 *     3. 押注金额永远是 0 —— 两个文件定义了同名 updateBetInfo，后者遮蔽前者。
 *
 *   本脚本把这三类的检测自动化，任何一项失败即以非 0 退出码结束，供 CI 拦截。
 *
 * 用法：
 *   node scripts/audit.mjs            # 审计源码
 *   node scripts/audit.mjs --dist     # 额外校验 dist/ 构建产物
 */

import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, dirname, basename, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CHECK_DIST = process.argv.includes('--dist');

const errors = [];
const warnings = [];
const notes = [];

const err = (m) => errors.push(m);
const warn = (m) => warnings.push(m);

function read(rel) {
  return readFileSync(join(ROOT, rel), 'utf-8');
}

function walk(dirRel, out = []) {
  const abs = join(ROOT, dirRel);
  if (!existsSync(abs)) return out;
  for (const e of readdirSync(abs, { withFileTypes: true })) {
    const rel = `${dirRel}/${e.name}`;
    if (e.isDirectory()) {
      if (e.name === 'node_modules' || e.name === '.git' || e.name === 'dist') continue;
      walk(rel, out);
    } else {
      out.push(rel);
    }
  }
  return out;
}

const exists = (rel) => existsSync(join(ROOT, rel));

/* ------------------------------------------------------------------ */
/* 1. 语法检查                                                          */
/* ------------------------------------------------------------------ */
function checkSyntax() {
  const files = walk('src/js').concat(exists('sw.js') ? ['sw.js'] : []);
  let checked = 0;
  for (const f of files) {
    if (!f.endsWith('.js')) continue;
    try {
      execFileSync(process.execPath, ['--check', join(ROOT, f)], { stdio: 'pipe' });
      checked++;
    } catch (e) {
      err(`JS 语法错误 ${f}: ${String(e.stderr || e.message).split('\n')[0]}`);
    }
  }
  notes.push(`语法检查通过：${checked} 个 JS 文件`);
}

/* ------------------------------------------------------------------ */
/* 2. 本地资源引用完整性                                                */
/* ------------------------------------------------------------------ */
const ASSET_RE = /(?:src|href)\s*=\s*["']((?:src|assets)\/[^"']+)["']/g;
const CSS_URL_RE = /url\(\s*['"]?([^)'"]+)['"]?\s*\)/g;
const JS_PATH_RE = /["']((?:src|assets)\/[^"']+\.(?:png|jpe?g|gif|svg|webp|mp3|wav|ogg|json))["']/g;

function checkAssetRefs() {
  const missing = new Map();

  const record = (rel, from) => {
    if (!rel || /^(https?:)?\/\//.test(rel) || rel.startsWith('data:')) return;
    if (exists(rel)) return;
    if (!missing.has(rel)) missing.set(rel, new Set());
    missing.get(rel).add(from);
  };

  // index.html
  const html = read('index.html');
  for (const m of html.matchAll(ASSET_RE)) record(m[1], 'index.html');

  // CSS 内的 url()
  for (const f of walk('src/css')) {
    if (!f.endsWith('.css')) continue;
    // 注意：CSS 会被 build.py 内联进根目录的 index.html，因此 url() 的基准是
    // 站点根目录而不是 css 文件所在目录；两种基准都试一次，任一命中即算存在。
    const base = dirname(f);
    for (const m of read(f).matchAll(CSS_URL_RE)) {
      const u = m[1];
      if (/^(https?:)?\/\//.test(u) || u.startsWith('data:')) continue;
      const fromRoot = u.replace(/^\.\//, '');
      const fromCss = join(base, u).replace(/\\/g, '/');
      if (exists(fromRoot) || exists(fromCss)) continue;
      if (!missing.has(fromRoot)) missing.set(fromRoot, new Set());
      missing.get(fromRoot).add(f);
    }
  }

  // JS 里的资源路径字符串
  for (const f of walk('src/js')) {
    if (!f.endsWith('.js')) continue;
    for (const m of read(f).matchAll(JS_PATH_RE)) record(m[1], f);
  }

  // manifest.json 图标
  if (exists('manifest.json')) {
    let mf;
    try {
      mf = JSON.parse(read('manifest.json'));
    } catch {
      err('manifest.json 不是合法 JSON');
      mf = null;
    }
    if (mf) {
      for (const ic of mf.icons || []) record(ic.src, 'manifest.json');
      for (const s of mf.screenshots || []) record(s.src, 'manifest.json');
    }
  }

  // sw.js 预缓存清单
  if (exists('sw.js')) {
    const sw = read('sw.js');
    for (const m of sw.matchAll(/['"](\.\/src\/[^'"]+)['"]/g)) {
      record(m[1].replace(/^\.\//, ''), 'sw.js');
    }
  }

  for (const [rel, froms] of missing) {
    err(`引用了不存在的资源：${rel}（来自 ${[...froms].join(', ')}）`);
  }
  if (!missing.size) notes.push('资源引用完整性：无缺失');
}

/* ------------------------------------------------------------------ */
/* 3. 内联事件处理器 → 全局函数是否已定义（抓「按钮是死的」）           */
/* ------------------------------------------------------------------ */
// JS 内置 / 浏览器全局，不需要项目内定义
const BUILTIN = new Set([
  'if', 'for', 'while', 'switch', 'return', 'typeof', 'function', 'catch', 'new',
  'alert', 'confirm', 'prompt', 'parseInt', 'parseFloat', 'isNaN', 'Number', 'String',
  'Boolean', 'Array', 'Object', 'JSON', 'Math', 'Date', 'console', 'setTimeout',
  'clearTimeout', 'setInterval', 'clearInterval', 'encodeURIComponent', 'decodeURIComponent',
  'window', 'document', 'event', 'this', 'navigator', 'localStorage', 'fetch', 'open',
  'close', 'print', 'scrollTo', 'requestAnimationFrame', 'Promise', 'Error', 'RegExp',
]);

/**
 * 只从「会被打包进 dist/index.html」的 JS 里收集全局定义。
 * 这一点很关键：若扫描磁盘上全部 JS，那么被 build.py 漏打包的模块里的函数
 * 仍会被算作「已定义」，正好掩盖掉分享按钮失效那类线上事故。
 */
function collectGlobalDefs(packedJs) {
  const fns = new Set();
  const vars = new Set();
  for (const f of packedJs) {
    if (!exists(f)) continue;
    const code = read(f);
    // 顶层 function 声明（行首，无缩进）
    for (const m of code.matchAll(/^function\s+([A-Za-z_$][\w$]*)/gm)) fns.add(m[1]);
    // window.xxx = function / window.xxx =
    for (const m of code.matchAll(/^window\.([A-Za-z_$][\w$]*)\s*=/gm)) vars.add(m[1]);
    // 顶层 var / let / const
    for (const m of code.matchAll(/^(?:var|let|const)\s+([A-Za-z_$][\w$]*)/gm)) vars.add(m[1]);
  }
  return { fns, vars };
}

function checkInlineHandlers(defs) {
  const html = read('index.html');
  const handlers = new Map(); // fnName -> Set(htmlLineApprox)
  // 抓 on*="..." 属性里的函数调用
  for (const m of html.matchAll(/\son[a-z]+\s*=\s*"([^"]*)"/g)) {
    const expr = m[1];
    // 负向后视：跳过 obj.method() 这类成员调用，只抓真正的全局函数调用
    for (const c of expr.matchAll(/(?<![.\w$])([A-Za-z_$][\w$]*)\s*\(/g)) {
      const name = c[1];
      if (BUILTIN.has(name)) continue;
      if (!handlers.has(name)) handlers.set(name, new Set());
      handlers.get(name).add(expr.trim().slice(0, 60));
    }
  }

  const undef = [];
  for (const [name, ctxs] of handlers) {
    if (!defs.fns.has(name) && !defs.vars.has(name)) {
      undef.push(`${name}（用于 ${[...ctxs][0]}）`);
    }
  }
  if (undef.length) {
    err(`HTML 内联事件绑定了未定义的函数 —— 这些按钮点了不会有任何反应：\n      ` +
        undef.join('\n      '));
  } else {
    notes.push(`内联事件处理器：${handlers.size} 个函数全部有定义`);
  }
}

/* ------------------------------------------------------------------ */
/* 4. 全局符号重复定义（抓「互相覆盖的死代码」）                        */
/* ------------------------------------------------------------------ */
function checkDuplicateDefs(packedJs) {
  const fnMap = new Map();
  const varMap = new Map();
  for (const f of packedJs) {
    if (!exists(f)) continue;
    const code = read(f);
    for (const m of code.matchAll(/^function\s+([A-Za-z_$][\w$]*)/gm)) {
      if (!fnMap.has(m[1])) fnMap.set(m[1], []);
      fnMap.get(m[1]).push(f);
    }
    for (const m of code.matchAll(/^(?:var|let|const)\s+([A-Za-z_$][\w$]*)/gm)) {
      if (!varMap.has(m[1])) varMap.set(m[1], []);
      varMap.get(m[1]).push(f);
    }
  }
  let dup = 0;
  for (const [name, files] of fnMap) {
    const uniq = [...new Set(files)];
    if (uniq.length > 1) {
      err(`全局函数重复定义：${name} 同时出现在 ${uniq.join(' 与 ')}，` +
          `后加载者会静默覆盖前者`);
      dup++;
    }
  }
  for (const [name, files] of varMap) {
    const uniq = [...new Set(files)];
    if (uniq.length > 1) {
      // 顶层 const/let 重复会直接抛错；var 重复则互相覆盖，都值得警告
      warn(`顶层变量重复声明：${name}（${uniq.join(' 与 ')}）`);
    }
  }
  if (!dup) notes.push(`全局函数无重名（共 ${fnMap.size} 个）`);
}

/* ------------------------------------------------------------------ */
/* 5. index.html 引用清单 vs 构建产物（抓「漏打包」）                    */
/* ------------------------------------------------------------------ */
const CSS_BLOCK = /<!-- BUILD:CSS -->([\s\S]*?)<!-- \/BUILD:CSS -->/;
const JS_CORE_BLOCK = /<!-- BUILD:JS_CORE -->([\s\S]*?)<!-- \/BUILD:JS_CORE -->/;
const JS_MOD_BLOCK = /<!-- BUILD:JS_MODULES -->([\s\S]*?)<!-- \/BUILD:JS_MODULES -->/;

function parseBlockRefs(html, blockRe, attr) {
  const b = html.match(blockRe);
  if (!b) return null;
  const out = [];
  for (const m of b[1].matchAll(new RegExp(attr + '="([^"]+)"', 'g'))) {
    const u = m[1];
    if (/^(https?:)?\/\//.test(u) || u.startsWith('data:')) continue;
    if (!out.includes(u)) out.push(u);
  }
  return out;
}

function checkBuildConsistency() {
  const html = read('index.html');
  const css = parseBlockRefs(html, CSS_BLOCK, 'href');
  const core = parseBlockRefs(html, JS_CORE_BLOCK, 'src');
  const mods = parseBlockRefs(html, JS_MOD_BLOCK, 'src');

  if (!css || !core || !mods) {
    err('index.html 缺少 BUILD:CSS / BUILD:JS_CORE / BUILD:JS_MODULES 标记，build.py 无法工作');
    return { css: css || [], js: (core || []).concat(mods || []) };
  }

  const js = core.concat(mods);

  // 磁盘上真实存在、且被 index.html 引用、但没出现在 BUILD 块外的重复引用检测
  const diskJs = walk('src/js').filter((f) => f.endsWith('.js')).sort();
  const packed = new Set(js);
  const omitted = diskJs.filter((f) => !packed.has(f));
  if (omitted.length) {
    err(`以下 JS 文件在磁盘上但未出现在 index.html 的 BUILD 块中，构建时会被漏打包：` +
        `\n      ${omitted.join('\n      ')}`);
  }

  const diskCss = walk('src/css').filter((f) => f.endsWith('.css')).sort();
  const packedCss = new Set(css);
  const omittedCss = diskCss.filter((f) => !packedCss.has(f));
  if (omittedCss.length) {
    err(`以下 CSS 文件在磁盘上但未出现在 index.html 的 BUILD:CSS 块中：\n      ${omittedCss.join('\n      ')}`);
  }

  notes.push(`打包清单：CSS ${css.length} 个 / JS ${js.length} 个（与磁盘文件一致）`);
  return { css, js };
}

/* ------------------------------------------------------------------ */
/* 6. dist 产物校验                                                     */
/* ------------------------------------------------------------------ */
function checkDist(manifest) {
  const p = join(ROOT, 'dist', 'index.html');
  if (!existsSync(p)) {
    err('缺少 dist/index.html，请先运行 python build.py');
    return;
  }
  const html = readFileSync(p, 'utf-8');

  for (const rel of manifest.css.concat(manifest.js)) {
    if (!html.includes(`=== ${basename(rel)} ===`)) {
      err(`构建产物里缺少内联内容：${rel}`);
    }
    if (html.includes(`"${rel}"`)) {
      err(`构建产物里仍保留外链引用（未内联成功）：${rel}`);
    }
  }
  for (const t of ['BUILD:CSS', 'BUILD:JS_CORE', 'BUILD:JS_MODULES']) {
    if (html.includes(t)) err(`构建产物里残留构建标记：${t}`);
  }

  // 静态资源是否随构建一起复制
  for (const need of ['manifest.json', 'sw.js']) {
    if (!existsSync(join(ROOT, 'dist', need))) err(`构建产物缺少 ${need}`);
  }
  if (exists('src/images') && !existsSync(join(ROOT, 'dist', 'src', 'images'))) {
    err('构建产物缺少 src/images（PWA 图标与立绘将全部 404）');
  }

  notes.push('dist 产物校验通过：全部内联、无残留外链');
}

/* ------------------------------------------------------------------ */
/* 7. PWA 元数据                                                        */
/* ------------------------------------------------------------------ */
function checkPwa() {
  if (!exists('manifest.json')) return err('缺少 manifest.json');
  let mf;
  try {
    mf = JSON.parse(read('manifest.json'));
  } catch {
    return err('manifest.json 不是合法 JSON');
  }
  for (const k of ['name', 'short_name', 'start_url', 'display', 'icons']) {
    if (!mf[k]) err(`manifest.json 缺少必填字段 ${k}`);
  }
  if (!mf.icons || mf.icons.length === 0) err('manifest.json 未声明图标，PWA 无法安装');
  const has192 = (mf.icons || []).some((i) => i.sizes === '192x192');
  const has512 = (mf.icons || []).some((i) => i.sizes === '512x512');
  if (!has192 || !has512) err('manifest.json 图标缺少 192x192 或 512x512，Android 安装会被拒');
  if (!exists('sw.js')) err('缺少 sw.js，离线能力不可用');
  notes.push('PWA 元数据：manifest 与 sw.js 齐备');
}

/* ------------------------------------------------------------------ */
function main() {
  console.log('🔍 阿梓的森林 · 源码审计\n');

  checkSyntax();
  checkAssetRefs();
  const manifest = checkBuildConsistency();
  const defs = collectGlobalDefs(manifest.js);
  checkInlineHandlers(defs);
  checkDuplicateDefs(manifest.js);
  checkPwa();
  if (CHECK_DIST) checkDist(manifest);

  for (const n of notes) console.log(`  ✅ ${n}`);
  for (const w of warnings) console.log(`  ⚠️  ${w}`);
  for (const e of errors) console.log(`  ❌ ${e}`);

  console.log(`\n结果：${errors.length} 个错误 / ${warnings.length} 个警告`);
  if (errors.length) {
    console.log('审计未通过 ❌');
    process.exit(1);
  }
  console.log('审计通过 ✅');
}

main();
