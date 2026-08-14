# Round 1 方案 · forest-focus 专注锁

> 每条 IMP 对应一个完整、可直接落地的方案块。Chair 复核后进入阶段四执行。

## IMP-001：PWA 深链传时长
- **问题**：`startPhoneLock()` 写死 `aziforest://start?mode=soft`，App 端 `scheduleAutoUnlock` 硬编码 25 分，用户选 50 分也 25 分解锁。两端时长不一致。
- **根因**：PWA 未把当前 `totalSec` 传给 App。
- **方案**：`src/js/timer.js` 的 `startPhoneLock()` 内
  `var min = Math.max(1, Math.round(totalSec / 60)) || 25;` 生成
  `aziforest://start?mode=soft&min=` + min。
- **涉及文件**：`src/js/timer.js`
- **验证**：`python build.py` 后 grep `dist/index.html` 确认 `min=` 出现；安卓端（IMP-003）解析。

## IMP-002：App 未安装检测
- **问题**：点深链按钮若未装 App，浏览器无法处理 `aziforest://` scheme，页面无任何反馈（静默失败）。
- **方案**：`startPhoneLock()` 唤起后 `setTimeout` 1.6s 检查 `document.hidden`，仍可见则
  `phoneLockHint('未检测到「阿梓的专注锁」App…请先安装：github.com/huanweide/forest-focus')`。
- **涉及文件**：`src/js/timer.js`
- **验证**：`build.py` 后 grep 确认提示文案与链接；非安卓已提示，安卓未装场景逻辑成立（真机确认留观察）。

## IMP-003：Android 读 min 参数对齐时长
- **问题**：`scheduleAutoUnlock(25 * 60 * 1000L)` 硬编码，与 PWA 时长不符。
- **方案**：`MainActivity.java`
  - `handleDeepLink` 解析 `min` 参数（默认 25，异常回退 25），调用 `startFocus(m, min)`；
  - 新增重载 `startFocus(int mode, int durationMin)`，`scheduleAutoUnlock(durationMin * 60 * 1000L)`。
- **涉及文件**：`focus-lock/app/src/main/java/com/aziforest/focuslock/MainActivity.java`
- **验证**：无 Android SDK 无法编译 APK；人工审阅代码逻辑（留观察，逻辑审查通过即收）。

## IMP-004：Windows 钩子改用 flags.ALTDOWN
- **问题**：`low_level_keyboard_proc` 用 `GetAsyncKeyState` 轮询 Alt/Ctrl 状态，时序不如系统给的 flags 可靠。
- **方案**：`windows-focus-lock.py` 增加常量 `LLKHF_ALTDOWN = 0x20`，
  `alt = bool(kb.flags & LLKHF_ALTDOWN)`；Ctrl 保留 `is_down(VK_CONTROL)`（Ctrl 无对应 flags 位）。
- **涉及文件**：`focus-lock/windows-focus-lock.py`
- **验证**：`python -m py_compile` 通过语法；逻辑审查（实机钩子行为需 Windows GUI，留观察）。
