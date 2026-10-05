#!/usr/bin/env python3
"""
build.py - 阿梓的森林 构建脚本（v5.0）

把模块化的 CSS / JS 内联进单一 dist/index.html，并复制静态资源。

设计要点（v5 重写原因）：
  旧版把 CSS / JS 文件名硬编码在 Python 列表里，index.html 新增引用后若忘记
  同步该列表，构建产物就会静默少打包一个文件（曾导致 desktop.css 被漏掉，
  线上桌面端布局全部失效）。v5 改为**以 index.html 为唯一事实源**：直接解析
  BUILD 注释块内的 <link> / <script src> 得到打包清单，并在构建末尾自检，
  任何遗漏都会以非 0 退出码报错，从而可被 CI 拦截。

用法：python build.py
"""
import os
import re
import shutil
import sys

# 强制 UTF-8 输出（Windows 控制台默认 GBK 会炸）
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

BASE = os.path.dirname(os.path.abspath(__file__))
DIST = os.path.join(BASE, 'dist')
INDEX = os.path.join(BASE, 'index.html')

# BUILD 注释块：构建时该块内的外链引用会被替换为内联内容
CSS_BLOCK = r'<!-- BUILD:CSS -->(.*?)<!-- /BUILD:CSS -->'
JS_CORE_BLOCK = r'<!-- BUILD:JS_CORE -->(.*?)<!-- /BUILD:JS_CORE -->'
JS_MODULES_BLOCK = r'<!-- BUILD:JS_MODULES -->(.*?)<!-- /BUILD:JS_MODULES -->'

STATIC_FOLDERS = ['src/images', 'src/audio']
STATIC_FILES = ['manifest.json', 'sw.js']


def read_file(path):
    # utf-8-sig：index.html 带 BOM，读出来要剥掉，否则内联进 style/script 会多一个不可见字符
    with open(path, 'r', encoding='utf-8-sig') as f:
        return f.read()


def parse_refs(html, block_pattern, attr):
    """从 BUILD 块中按出现顺序解析本地资源引用路径。

    只认 src/css、src/js 这类相对本地路径；http(s)://、// 开头的 CDN 引用会被跳过
    （保持原样外链，不内联），避免把第三方资源拉进来。
    """
    block = re.search(block_pattern, html, re.DOTALL)
    if not block:
        return []
    refs = []
    for m in re.finditer(attr + r'="([^"]+)"', block.group(1)):
        url = m.group(1).strip()
        if not url or url.startswith(('http://', 'https://', '//', 'data:')):
            continue
        if url not in refs:
            refs.append(url)
    return refs


def safe_inline(code):
    """内联进 <script> 前转义，防止代码里的 </script 提前闭合标签。"""
    return code.replace('</script', r'<\/script')


def build():
    print('🌳 阿梓的森林 · 构建中...\n')

    if not os.path.exists(INDEX):
        print('❌ 找不到 index.html 模板！')
        return 1
    html = read_file(INDEX)

    # ---------- 1. 解析打包清单（唯一事实源 = index.html） ----------
    css_refs = parse_refs(html, CSS_BLOCK, 'href')
    js_core_refs = parse_refs(html, JS_CORE_BLOCK, 'src')
    js_module_refs = parse_refs(html, JS_MODULES_BLOCK, 'src')
    js_refs = js_core_refs + js_module_refs

    if not css_refs:
        print('❌ BUILD:CSS 块里没解析到任何本地样式表，index.html 结构可能已变')
        return 1
    if not js_refs:
        print('❌ BUILD:JS_CORE / BUILD:JS_MODULES 块里没解析到任何本地脚本')
        return 1

    print(f'📦 解析到 CSS {len(css_refs)} 个 / JS {len(js_refs)} 个')
    print(f'   CSS: {", ".join(os.path.basename(r) for r in css_refs)}')
    print(f'   JS : {", ".join(os.path.basename(r) for r in js_refs)}\n')

    # ---------- 2. 读取内容（缺失即报错，不再静默跳过） ----------
    missing = []

    def load_all(refs):
        parts = []
        for rel in refs:
            fpath = os.path.join(BASE, *rel.split('/'))
            if not os.path.exists(fpath):
                missing.append(rel)
                continue
            body = read_file(fpath)
            name = os.path.basename(rel)
            parts.append(f'/* === {name} === */\n{body}' if rel.endswith('.css')
                         else f'// === {name} ===\n{body}')
        return parts

    print('📦 打包 CSS...')
    css_content = '\n'.join(load_all(css_refs))

    print('📦 打包 JS（core 优先，pwa 收尾）...')
    js_core_content = '\n'.join(load_all(js_core_refs))
    js_modules_content = '\n'.join(load_all(js_module_refs))

    if missing:
        print('❌ 以下被 index.html 引用的资源在磁盘上不存在：')
        for m in missing:
            print(f'   - {m}')
        return 1

    # ---------- 3. 内联替换 ----------
    html = re.sub(CSS_BLOCK,
                  lambda m: '<style>\n' + css_content + '\n</style>',
                  html, flags=re.DOTALL)
    html = re.sub(JS_CORE_BLOCK,
                  lambda m: '<script>\n' + safe_inline(js_core_content) + '\n</script>',
                  html, flags=re.DOTALL)
    html = re.sub(JS_MODULES_BLOCK,
                  lambda m: '<script>\n' + safe_inline(js_modules_content) + '\n</script>',
                  html, flags=re.DOTALL)

    # 去掉 BUILD:HTML 注释标记（保留内容）
    html = html.replace('<!-- BUILD:HTML -->', '').replace('<!-- /BUILD:HTML -->', '')

    # ---------- 4. 写 dist ----------
    os.makedirs(DIST, exist_ok=True)
    dist_path = os.path.join(DIST, 'index.html')
    with open(dist_path, 'w', encoding='utf-8') as f:
        f.write(html)

    # 复制静态资源
    print('📁 复制静态资源...')
    for folder in STATIC_FOLDERS:
        src = os.path.join(BASE, folder)
        dst = os.path.join(DIST, folder)
        if not os.path.exists(src):
            continue
        if os.path.exists(dst):
            shutil.rmtree(dst)
        shutil.copytree(src, dst)

    for f in STATIC_FILES:
        src = os.path.join(BASE, f)
        dst = os.path.join(DIST, f)
        if os.path.exists(src):
            shutil.copy2(src, dst)

    # ---------- 5. 自检：任何遗漏必须以非 0 退出码暴露 ----------
    print('\n🔍 构建自检...')
    dist_html = read_file(dist_path)
    errors = []

    for rel in css_refs + js_refs:
        marker = os.path.basename(rel)
        if f'=== {marker} ===' not in dist_html:
            errors.append(f'产物里缺少内联内容: {rel}')

    # 产物不应再有本地外链（内联后仍出现说明替换失败）
    for rel in css_refs + js_refs:
        if f'"{rel}"' in dist_html:
            errors.append(f'产物里仍存在外链引用（未内联成功）: {rel}')

    for token in ('BUILD:CSS', 'BUILD:JS_CORE', 'BUILD:JS_MODULES'):
        if token in dist_html:
            errors.append(f'产物里残留构建标记: {token}')

    if errors:
        print('❌ 构建自检未通过：')
        for e in errors:
            print(f'   - {e}')
        return 1

    size_kb = os.path.getsize(dist_path) / 1024
    print('✅ 构建完成并通过自检！')
    print(f'   📄 dist/index.html ({size_kb:.1f} KB)')
    print(f'   🌐 用浏览器打开 dist/index.html 即可使用')
    return 0


if __name__ == '__main__':
    sys.exit(build())
