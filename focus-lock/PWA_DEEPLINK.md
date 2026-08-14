# PWA ↔ 专注锁 App 深链打通

Web 版（阿梓的森林 PWA）**无法**锁机（浏览器沙盒限制），原生 App 负责「锁机 + 白名单」。
两者通过**深链（deep link）**握手：网页把用户想用的模式传给 App，App 直接开始对应专注。

## 深链协议

```
aziforest://start?mode=soft|pinned
```

| 参数 | 含义 |
|------|------|
| `mode=soft` | 软锁（无障碍弹回，推荐） |
| `mode=pinned` | 应用固定（系统级，可手动退出） |

App 侧已在 `MainActivity` 注册 `aziforest://` 的 `VIEW`/`BROWSABLE` intent-filter，
并在 `onCreate` / `onNewIntent` 中解析该 URI、自动选中模式并 `startFocus()`。

## 在 PWA 里加一个按钮（一行即可）

```js
function startFocusOnPhone(mode) {
  // mode: 'soft' | 'pinned'
  window.location.href = 'aziforest://start?mode=' + mode;
}
```

在 PWA 专注面板放一个「用手机 App 锁机」按钮，点击即唤起已安装的「阿梓的专注锁」。

## 本地验证

打开 `pwa-deeplink-demo.html`（本目录），在装了 App 的手机浏览器里点按钮，
系统弹「用以下应用打开」→ 选「阿梓的专注锁」→ App 直接开始对应模式专注。

## 关于「专注状态双向实时同步」

深链是**单向握手**（网页 → App 启动指定模式）。若要两端实时共享「是否在专注 / 剩余时间」，
需要共享后端（如同一账号的云存储或 WebSocket），超出本原型范围。
当前架构已满足核心价值：网页做激励与数据，App 做真锁机，深链负责一键交接。
