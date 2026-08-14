# 阿梓的专注锁 · Android 原型

聚焦模式锁机功能的 Android 原型骨架，对应调研结论「手机端优先、默认软锁、可选硬核」。

## 三种锁机模式

| 模式 | 实现 | 不可退出？ | 用户门槛 |
|------|------|-----------|---------|
| SOFT（默认） | AccessibilityService 检测前台包名 → 非白名单弹回 | 否（可手动退出） | 低，授权即用 |
| PINNED | `startLockTask()` 应用固定 | 普通用户可退出；Device Owner 下不可退出 | 中（开系统固定） |
| DEVICE_OWNER | `adb dpm set-device-owner` + `setLockTaskFeatures(NO_HOME|NO_RECENTS|NO_BACK)` | 是（真锁死） | 高（需出厂重置） |

## 仓库位置

本工程已接入 `forest-focus` 仓库，路径为 `forest-focus/focus-lock/`（独立 Android 工程模块，
与既有 `android/` TWA 骨架互不冲突）。

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

> 工程已为完整可编译结构（Manifest / Service / Activity / 配置 / Gradle 脚本齐全），
> 核心逻辑可直接编入现有工程运行。

## 首次使用步骤

1. 打开 App → 点「开始专注（软锁）」→ 跳转系统设置开启「阿梓的专注锁」无障碍服务。
2. 白名单默认含电话 / 短信 / 微信 / 支付宝 / 桌面，避免误锁漏重要事。
3. 想更强：点「开始专注（应用固定）」，系统会请求固定确认。

## 硬核不可退出（Device Owner，可选）

仅给极客 / 单机自用设备。需先**出厂重置且不加任何账户**：

```bash
adb shell dpm set-device-owner com.aziforest.focuslock/.AdminReceiver
```

设置成功后，PINNED 模式会调用 `setLockTaskFeatures(NO_HOME | NO_RECENTS | NO_BACK)`，
Home / 最近任务 / 返回键全部失效，只有本应用能退出（代码中 `stopFocus()`）。

## 逃生口（必备，无逃生口不发布）

- **定时自动解锁**：默认 25 分钟番茄钟后自动结束（`scheduleAutoUnlock`）。
- **低电量放行**：`isLowBattery()` 低于 15% 时自动停止专注。
- **白名单刚需**：电话 / 短信 / 微信 / 支付默认在列，紧急情况能接通。
- **可随时停止**：状态栏 / 应用内「停止专注」按钮。

## 合规声明（Google Play 无障碍政策）

- 本 App 的无障碍权限**仅用于自律专注的前台检测**，不收集、不上传任何数据。
- 在商店页与首次授权均明示真实用途并取得用户同意，符合 Google Play Accessibility API 政策
  （非伪装无障碍、不阻止用户卸载、不规避平台安全控制）。
- 国内《无障碍环境建设法》第24条：辅助功能以服务用户平等参与为目的，本功能用于帮助用户专注，不构成越权。

## 与 Web 版（阿梓的森林 PWA）的关系

Web 版**无法**锁机（浏览器沙盒限制），本原生 App 补齐「锁机 + 白名单」能力。
建议架构：PWA 负责游戏化激励与数据，原生 App 负责锁机引擎，通过深链 / 本地存储打通专注状态。
