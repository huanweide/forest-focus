# 更新日志

## 2026-10-06 · 质量与可信度重建

定位从「番茄钟自律 PWA」调整为「陪伴式专注养成 PWA」——番茄计时本身有 pomotroid、
Marinara 等成熟免费的碾压级替代，正面竞争没有胜算；本项目真正的差异化在于
「专注 → 换装收集 → 养成闭环」。同时把工程可信度从零建起来。

### 修复

- **线上桌面端布局全部失效**：`build.py` 硬编码的 CSS 清单漏了 `desktop.css`，
  导致部署到 GitHub Pages 的产物里没有 `.sidebar` 样式，两条 `@media (min-width)`
  查询也全部丢失。改为以 `index.html` 为唯一事实源自动解析打包清单。
- **分享按钮是死的**：同样原因漏打包 `share.js`，线上 `openShare` 未定义，
  点击直接抛 `ReferenceError`。
- **押注回报算法存在两份**：`betting.js` 与 `timer.js` 各定义了一份 `updateBetInfo`，
  后者用固定 1.5 倍率、且用 `var currentBet` 局部遮蔽了全局押注额，属于按加载顺序
  互相覆盖的死代码。已删除 `timer.js` 那份。
- **`AppState` 的引用型状态是导出瞬间的快照**：`sessions` / `habits` / `checkinDates`
  等直接暴露引用，一旦被整体替换（导入备份、重置数据），外部读到的仍是旧数组，
  而持久化写的是新数组，会出现「改了但刷新后丢失」。统一改为 `_state` 读写代理。
- **签名私钥存在泄露风险**：`build-apk.yml` 在仓库根目录生成 `forest-focus.keystore`，
  而 `.gitignore` 没有任何 keystore 规则。已补全凭据类忽略规则。

### 新增

- `scripts/audit.mjs`：零依赖静态审计，检查 JS 语法、资源引用 404、
  HTML 内联事件绑定的函数是否真有定义、全局函数是否重名、打包清单是否与磁盘一致、
  PWA 元数据是否完整，支持 `--dist` 校验构建产物。
- `tests/app.test.mjs`：12 项核心逻辑单测（金币收支、专注记录、习惯打卡、
  押注倍率、持久化往返），用 `node:vm` 沙箱加载全局脚本，无需改造线上代码。
- `tests/e2e/`：把原先散落在根目录的 `_experience.py` / `_verify2.py` / `_shot.py`
  收拢为可复用的 Playwright 端到端套件，端口改为可配置，并补 `requirements-dev.txt`。
- `npm run audit` / `npm test` / `npm run build` / `npm run verify` 四个脚本。

### 变更

- `ci.yml`：原先跑的是 `flutter analyze || true` —— 本仓库没有 Flutter 代码，
  这个门禁永远绿，形同虚设。改为源码审计 → 单测 → 构建 → 产物校验四道真检查。
- `deploy.yml`：部署前增加产物校验，坏版本不再直接上线。
- `maintenance.yml`：原先只打印文件数然后永远输出「本次检查无需优化」，
  改为每周一真跑一遍全套检查并校验线上站点，失败自动开 issue。
- `build-apk.yml`：APK 从 commit 进仓库改为发布到 GitHub Release。
- 删除 `docs/`（34MB，是与 `src/` 完全重复的构建产物副本与资源镜像，
  Pages 实际走 `gh-pages` 分支，从未被使用）。工作区体积 98MB → 65MB。
- `package.json`：license 由 ISC 更正为 MIT（与 LICENSE 一致），
  `@bubblewrap/core` 移入 devDependencies，补齐 scripts 与 keywords。
- `README.md`：重写定位与目录结构，删除重复的「许可证」章节与从其他项目模板
  残留的「CI 门禁用法」段落（原文讲健康分与严重度，与本仓库无关）。
