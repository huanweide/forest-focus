# forest-focus 迭代记录 · Round 10（金币系统复活 + 精灵物理修复 + 金币UI刷新 + 锁机边界澄清）

> 目标：maxloop 自主迭代。本回合在用户「很多东西没效果」的反馈驱动下，用真机体验测试（playwright + 系统 chrome）定位并修复三个真凶，并澄清 Web 的能力边界。

## 一、本回合要解决的问题（来自用户）
- 用户感知「很多东西没效果」——尤其习惯追踪、目标计划、小精灵。
- 要求：再跑一次 maxloop 深度修复；派 Agent 真机体验（截图、点题测试、效果验证）；澄清「本地版是否只能计时、能否锁机」。
- 前置条件：若 Web 修好无问题，则推进安卓版。

## 二、根因定位（三个真凶）

### Bug A：金币系统完全失效（核心）
- `core.js` 的 `AppState` 把 `coins/score/mood/streakFreezes` 以**值拷贝**暴露（`coins: _state.coins`，基本类型）。
- 后果：`addCoins/spendCoins` 改的是闭包里的 `_state.coins`，而 `AppState.coins` 是陈旧副本 → 金币奖励永不生效、UI 卡初始值（实测 coins 始终停在 50/60）。

### Bug A 另一半：金币 UI 永不刷新
- `timer.js` 的 `goTab` 原用 `document.getElementById('bar').textContent = [...]`。
- 后果：`textContent` 赋值会**清空整个 appbar 的所有子节点**（含 `#coinVal` 金币文本、分享、暗黑按钮）→ 每次切 tab 金币文本节点被销毁 → 即便金币值变了，顶栏也永不刷新。

### Bug B：精灵物理越界 + 粒子风暴
- `pwa.js` 原 `wrap.style.transform = 'translate(Xpx,Ypx)'` 覆盖了 CSS 的 `-50%` 居中补偿 → 精灵飞出场景右边界约 100px。
- 同时贴地时每帧都判定碰撞并 `spawnChibiSpark` → 满屏火花粒子风暴。

## 三、改动清单（已落地 + 已提交 404465d）

- **core.js**：`AppState` 的 `coins/score/mood/streakFreezes` 改 getter/setter 代理 `_state`，读写实时同步（兼容 `stats.js` 直接写 `AppState.score` 的旧调用）。
- **pwa.js**：transform 改为 `translate(calc(-50% + Xpx), calc(-50% + Ypx))` 保留居中补偿；新增 `chibiState.onFloor` 字段，仅高速撞击或离地时才生成碰撞火花（去重贴地刷屏）。
- **timer.js**：`goTab` 改为 `document.getElementById('barTitle').textContent = [...]` 只更新标题子元素，不再清空 appbar。

## 四、真机验证（playwright + 系统 chrome，零 PAGEERROR）

- **_verify2.py 5/5 PASS**：精灵初始居中(offset=0px)；物理后不越界(右边界765.32≈场景右边界765.33)；习惯打卡金币联动UI(coins 60→92，顶栏 `#coinVal` 文本同步 60→92)；跨刷新持久化(习惯 len/dates 与金币均保留)。
- **_experience.py 6/6 PASS**：首页+点题(精灵点击→气泡「阿梓在呢~」+3粒子)；专注计时(25分钟倒计时启动)；习惯新增+打卡(卡片可见, dates/streak/health 更新)；目标新增+番茄tick(tomatoes 累加)；换装衣柜(93套穿搭/92装备渲染)；签到弹卡(overlay 可见)。**零 PAGEERROR、零失败请求**。
- 结论：用户感知「没效果」的根因（金币失效 + UI 不刷新 + 精灵越界）已被真机验证彻底修复。修复前可能因看了旧的 `dist`（已 rebuild 含本轮修复）。

## 五、锁机能力边界（回答用户疑问）

- 当前 forest-focus 是**纯前端 Web PWA**：专注计时 + 游戏化追踪（种树/金币/衣装/习惯/目标/签到）。
- **Web 标准能力下无法锁机/锁电脑/锁屏**：浏览器沙箱不允许网页接管操作系统锁屏、禁用其他 App、或强制保持前台。这是 Web 平台安全模型决定的，任何纯网页方案都做不到（代码里也确实没有任何锁机逻辑）。
- 若需要「锁机式强制专注」，必须原生 App（安卓/iOS 原生或 WebView 壳 + 设备专注模式 API），但即便原生也受系统限制（不能真锁死 OS，只能引导式专注）。
- 当前定位：自律**辅助**工具（用游戏化激励），不是强制锁机软件。

## 六、安卓版现状与下一步（待用户确认路线）

- 仓库已有 `android/`（标准 Gradle TWA 项目骨架）+ `build-apk.js`（用 `@bubblewrap/core` 生成 TWA APK）。
- 现状：TWA 是「在线包装」——`startUrl` 指向 `https://huanweide.github.io/forest-focus/`，**需先部署 GitHub Pages**；且需 JDK17 + Android SDK 才能 build；还需 `.well-known/assetlinks.json` 数字资产验证（否则回退 Custom Tabs 浏览器打开）。
- 更简方案：PWA 本身已支持安卓 Chrome「添加到主屏幕」(standalone 全屏、离线可用)，无需 APK。
- 路线选项（待用户拍板）：
  - A. 部署 GitHub Pages + PWA 直装（零门槛、离线、立即可用）
  - B. bubblewrap TWA APK（应用商店分发风格，但在线加载 Pages）
  - C. Cordova/Capacitor 离线 APK（把 dist 内联进安装包真离线，工作量较大）

## 七、遗留 / 说明
- `dist/` 已 rebuild（278.6 KB）含本轮全部修复（已 grep 校验 barTitle/calc(-50%/set coins/onFloor 均内联），但 dist 被 gitignore 不入库，部署时重新 build。
- 验证脚本 `_experience.py` / `_verify2.py` 作为回归脚本入库，后续改动可直接重跑。

## 八、安卓版执行（PWA 直装已部署）
- 用户拍板路线 A：部署 GitHub Pages + 安卓 Chrome「添加到主屏幕」当全屏离线 App。
- 已确认 PWA 子路径适配无需改代码：`manifest.json` 用 `start_url:"./"`+`scope:"."`（相对路径），`sw.js` PRECACHE/fetch 作用域基于 `self.location`，部署到 `/forest-focus/` 子路径自动解析正确。
- 已用 `gh api` 启用仓库 Pages（source: main /root，build_type legacy），`status: built`。
- 线上地址：`https://huanweide.github.io/forest-focus/`，curl 验证 index/manifest/sw.js/core.js 均 HTTP 200。
- 安卓安装：Chrome 打开 URL → 菜单「添加到主屏幕」→ 命名 → 桌面图标 → 全屏离线运行（service worker 已配置离线缓存）。
- 备选：若后续要 .apk 安装包（路线 B TWA / 路线 C Cordova 离线），需 JDK17+Android SDK，再行推进。
