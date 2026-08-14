# 阿梓的专注锁 · Android 工程

聚焦模式锁机功能的 Android 完整工程，对应调研结论「手机端优先、默认软锁、可选硬核」。
已接入 `forest-focus` 仓库，路径为 `forest-focus/focus-lock/`（独立 Android 工程模块，
与既有 `android/` TWA 骨架互不冲突）。

## 这是一个可直接用 Android Studio 打开编译的工程

- Gradle 8.5 + AGP 8.3.2，compileSdk 34，minSdk 23，Java 17
- 纯原生 `android.widget`，无 AndroidX / 第三方依赖（最低引入成本）
- 真实 XML 布局（`activity_main` / `activity_whitelist` / `item_app`）+ 暗色森林主题
- 白名单可视化页：扫描已装 App 勾选，刚需锁定不可取消
- PWA 深链：`aziforest://start?mode=soft|pinned` 一键唤起并开专注

## 三种锁机模式

| 模式 | 实现 | 不可退出？ | 用户门槛 |
|------|------|-----------|---------|
| SOFT（默认） | AccessibilityService 检测前台包名 → 非白名单弹回 | 否（可手动退出） | 低，授权即用 |
| PINNED | `startLockTask()` 应用固定 | 普通用户可退出；Device Owner 下不可退出 | 中（开系统固定） |
| DEVICE_OWNER | PINNED 模式 + `adb dpm set-device-owner` + `setLockTaskFeatures(NONE)` | 是（真锁死） | 高（需出厂重置） |

## 编译运行

需要 Android Studio / Android SDK（compileSdk 34，minSdk 23）。

```
cd forest-focus/focus-lock
./gradlew assembleDebug        # 生成 app/build/outputs/apk/debug/app-debug.apk
adb install app/build/outputs/apk/debug/app-debug.apk
```

### 首次构建注意（wrapper.jar）
本仓库未提交二进制的 `gradle-wrapper.jar`（与 `android/` 模块一致）。首次编译前二选一：
- **方式 A（推荐）**：直接用 Android Studio 打开 `focus-lock/` 目录，AS 会自动补全 wrapper 并下载 Gradle 8.5；
- **方式 B**：本地已装 Gradle，在本目录执行 `gradle wrapper --gradle-version 8.5` 生成 jar。

> 说明：本工程结构完整（Manifest / Service / 两个 Activity / 配置 / Gradle 脚本 / XML 布局齐全），
> 代码已逐文件人工审阅以保证可编译。但当前环境**无 Android SDK / javac**，无法实机编译验证，
> 请在 Android Studio 中打开并编译确认。

## 首次使用步骤

1. 打开 App → 选模式（默认软锁）→ 点「开始专注」→ 跳转系统设置开启「阿梓的专注锁」无障碍服务。
2. 点「管理白名单」勾选允许在专注时打开的 App；电话 / 短信 / 微信 / 支付宝 / 桌面为刚需，已锁定不可取消。
3. 想更强：选「应用固定」模式，系统会请求固定确认。
4. 25 分钟番茄钟后自动结束；低电量（≤15%）自动放行；随时可点「停止专注」。

## 白名单可视化

`WhitelistActivity` 用 `PackageManager.getInstalledApplications(MATCH_ALL)` 列出全部已装 App，
按应用名排序，勾选即写入 `WhitelistStore`（SharedPreferences 持久化）。

- 默认刚需包名（电话 `com.android.dialer`、短信 `com.android.mms`、微信 `com.tencent.mm`、
  支付宝 `com.eg.android.AlipayGphone`、各厂商桌面、`com.aziforest.focuslock` 自身）显示为锁定，
  复选框禁用，避免误锁漏重要事。
- Android 11+ 包可见性限制：已声明 `QUERY_ALL_PACKAGES` 权限（自用 / 侧载场景）。

## PWA 深链打通

网页（阿梓的森林 PWA）无法锁机，原生 App 负责真锁机。两者通过深链握手：

```
aziforest://start?mode=soft|pinned
```

- App 在 `MainActivity` 注册 `aziforest://` 的 `VIEW`/`BROWSABLE` intent-filter，
  解析 URI 后自动选中模式并 `startFocus()`。
- PWA 里只需一行：`window.location.href = 'aziforest://start?mode=' + mode;`
- 本地验证页见 `pwa-deeplink-demo.html`；集成说明见 `PWA_DEEPLINK.md`。

> 深链是单向握手（网页 → App 启动指定模式）。双向实时同步「是否专注 / 剩余时间」需共享后端，
> 超出本原型范围。

## 硬核不可退出（Device Owner，可选）

仅给极客 / 单机自用设备。需先**出厂重置且不加任何账户**：

```bash
adb shell dpm set-device-owner com.aziforest.focuslock/.AdminReceiver
```

设置成功后，PINNED 模式会调用 `setLockTaskFeatures(LOCK_TASK_FEATURE_NONE)`，
Home / 最近任务 / 返回 / 全局动作全部失效，只有本应用能退出；
`stopFocus()` 在退出时自动恢复默认锁任务特性，不会退出后仍锁死。

## 逃生口（必备，无逃生口不发布）

- **定时自动解锁**：默认 25 分钟番茄钟后自动结束（`scheduleAutoUnlock`）。
- **低电量放行**：`isLowBattery()` 低于 15% 时自动停止专注。
- **白名单刚需**：电话 / 短信 / 微信 / 支付默认在列，紧急情况能接通。
- **可随时停止**：应用内「停止专注」按钮。

## 合规声明（Google Play 无障碍政策）

- 本 App 的无障碍权限**仅用于自律专注的前台检测**，不收集、不上传任何数据。
- 在商店页与首次授权均明示真实用途并取得用户同意，符合 Google Play Accessibility API 政策
  （非伪装无障碍、不阻止用户卸载、不规避平台安全控制）。
- 国内《无障碍环境建设法》第24条：辅助功能以服务用户平等参与为目的，本功能用于帮助用户专注，不构成越权。
- `QUERY_ALL_PACKAGES` 用于白名单选择全部已装 App，属合理用途；若上架 Play 需按政策补充说明。

## 与 Web 版（阿梓的森林 PWA）的关系

Web 版**无法**锁机（浏览器沙盒限制），本原生 App 补齐「锁机 + 白名单」能力。
建议架构：PWA 负责游戏化激励与数据，原生 App 负责锁机引擎，通过深链打通专注状态。

## Windows 端专注锁原型（软锁）

文件：`windows-focus-lock.py`（纯标准库，仅 Windows 运行）。

```
python windows-focus-lock.py          # 默认 25 分钟
python windows-focus-lock.py 50       # 50 分钟
```

- 全屏专注计时 + 低层键盘钩子（ctypes）拦截 **Win / Alt+Tab / Ctrl+Esc / Alt+Esc**。
- 逃生口（均放行）：**Esc**、**Alt+F4**、界面「停止专注」按钮、鼠标点击。
- 钩子随进程退出自动卸载（Windows 在进程结束时移除其钩子），不会造成永久锁死。
- 这是「软锁」，符合「电脑端就是一个专注」的定位：保留逃生口，不阻断系统。

> 若要真正不可退出（kiosk 多用户固定），见 `会议/专注模式锁机调研/05-Windows思路.md`
> 的 **Assigned Access（Windows 专业版/企业版 + 单独账户 + 锁任务应用）** 方案。
