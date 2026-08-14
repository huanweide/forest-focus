# Round 1 整合报告 · forest-focus 专注锁深度测试

> 日期：2026-08-14
> 模式：主代理亲验（Chair 直接执行；子代理通道故障已降级，见下）
> 产品：阿梓的森林 / 专注锁（PWA + Android `focus-lock` + Windows 原型）
> 仓库：huanweide/forest-focus @ `85d0406`

## 一、主代理亲验声明（降级依据）
实测子代理通道故障（六之二第8条）：派 review-worker 探测返回空、报告未落盘；日志实锤
`[AgentModelResolver] agent "review-worker" original_models=["deepseek-v4-pro"]`，即被解析到
**无效 key 模型**（DeepSeek 返回 Authentication Fails），认证失败空返回。其他内置 agent 更无模型。

按六之二第4条**自动降级为本轮由主代理（Chair）亲自读码、测试、修复**，不 spawn 任何子代理。
所有发现均基于真实读到的源码（文件:行号），未编造。

## 二、六视角审查摘要（主代理亲验）
- 小白用户：专注页按钮齐全（开始/放弃/手机锁机），但「用手机 App 锁机」在**未装 App**时点了没反应（IMP-002）。
- 资深开发者：PWA↔Android 深链协议（PWA_DEEPLINK.md）定义了 `mode=soft|pinned`，但 PWA 实现写死 soft 且**不传时长**（IMP-001/003）。
- 设计师：UI 无阻断问题，配色/布局合理。
- 安全：白名单默认含电话/短信/微信/支付/桌面，逃生口合理；低电量≤15% 放行防漏事，合理。
- 性能：无障碍服务每次事件都读 SharedPreferences（观察池-006，无 SDK 不硬改）。
- 可访问性：无阻断。

## 三、改进清单（IMP）
| ID | 严重度 | 模块 | 问题描述（文件:行） | 建议方向 |
|----|--------|------|---------------------|----------|
| IMP-001 | P1 | PWA↔Android 深链 | 深链写死 `mode=soft` 且未传时长；App 自动解锁硬编码 25 分（timer.js:554） | PWA 按当前专注时长生成 `aziforest://start?mode=soft&min=N` |
| IMP-002 | P1 | PWA 深链可用性 | 安卓**未装 App**时点按钮静默无反应（timer.js:548） | 唤起后检测 `document.hidden`，未跳走则提示安装引导 |
| IMP-003 | P2 | Android 锁机时长 | `scheduleAutoUnlock` 硬编码 25 分，与 PWA 时长不符（MainActivity.java:132） | 从深链 `min` 参数读时长，默认 25 |
| IMP-004 | P2 | Windows 钩子健壮性 | 用 `GetAsyncKeyState` 判 Alt/Ctrl，不如 `KBDLLHOOKSTRUCT.flags` 的 `LLKHF_ALTDOWN` 位可靠（windows-focus-lock.py:78） | 改用 flags 位判 Alt |

## 四、投票结果（主代理按证据判定，所有 IMP 均过半）
4 条 IMP 均有文件:行号证据，纳入可执行清单（主代理单人审查，证据充分即视为过半）。

## 五、观察池（需真机编译验证，本轮回主代理不硬改，防假收敛）
- 005：SOFT 弹回仅拉 MainActivity，无全屏遮罩，用户可立即再切走（FocusLockAccessibilityService.java:53）。需 Android SDK 编译 + 真机，留观察池。
- 006：`onAccessibilityEvent` 未过滤事件类型，每次事件读 SP（FocusLockAccessibilityService.java:39）。无 SDK 不硬改，留观察池。
