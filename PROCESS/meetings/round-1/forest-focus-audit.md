# 阿梓的森林 · Forest Focus（huanweide/forest-focus）深度体验与评分报告

- **审计子代理**：max loop 魔王系统独立子代理（Chair=千惠）
- **被审计仓库**：https://github.com/huanweide/forest-focus （阿梓森林番茄钟 PWA）
- **本地路径**：`C:\Users\Administrator\WorkBuddy\2026-08-18-22-47-25\github-governance\forest-focus`
- **审计时间**：2026-08-18
- **方法**：全量静态读码 + grep 安全扫描 + Node 逻辑复现 + 真实本地起服务/脚本跑通验证（Playwright 无头 Chromium）
- **环境限制（重要声明）**：本沙箱无 GUI/显示器，无法启动真实浏览器窗口做人工截图或可视化交互。因此"桌面端实测"以**无头 Chromium + DOM/JS 断言**作为最接近真实桌面的可用验证手段；凡涉及像素级视觉、真机 App 行为，均显式标注为"未实测"。

---

## 一、安全自查

**1. 硬编码密钥扫描：未发现应用层密钥泄露（良好）。**
- 全仓 grep `apiKey|secret|token|password|sk-|ghp_|AKIA|Authorization` 命中项均为：(a) DeepSeek API 调用处的 `Authorization: Bearer ` 头；(b) package-lock.json 依赖元数据；(c) 一张图片内嵌的维基页面。
- DeepSeek Key 来源为**用户手动输入**（`src/js/chat.js:13` `var dsApiKey = localStorage.getItem('ds_key') || '';`；`chat.js:162` `prompt('请输入 DeepSeek API Key...')`），并非代码硬编码，存储在 localStorage，调用仅发往 `https://api.deepseek.com/chat/completions`（`chat.js:142`、`diary.js:184`）。属于用户自有凭据，风险可控。
- PWA（网页端）权限面极小：`manifest.json` 无 geolocation/camera/contacts 等敏感权限；`sw.js` 仅缓存同源静态资源、对 `api.` 子域与 `/api/` 路径跳过缓存（sw.js:43-53），逻辑稳健（网络优先 HTML + LRU 运行时缓存，防 Cache 膨胀）。

**2. 第三方依赖：运行时零依赖。** `package.json` 仅含 dev 依赖 `@bubblewrap/core`（APK 打包用），`src/` 内无任何 CDN `<script>`/`<link>` 外链（grep `https?://` 在 src 中仅命中 DeepSeek API 与一张图片文件）。供应链攻击面低。

**3. 安卓层安全问题（中低风险，需关注）。**
- `android/app/build.gradle:19,21`：`storePassword System.getenv("KEYSTORE_PASSWORD") ?: "azusa2026"`、`keyPassword ... ?: "azusa2026"`——**把签名密钥口令 `azusa2026` 作为回退值硬编码进仓库**。虽仅为 fallback，但属于不应提交的凭据。
- `android/app/src/main/AndroidManifest.xml:4-11` 申请了 `SYSTEM_ALERT_WINDOW`（悬浮窗）、`PACKAGE_USAGE_STATS`（应用用量统计，敏感权限）、`INTERNET` 等；`:14` `android:allowBackup="true"`（可被 adb 备份导出 localStorage 数据）；`:19` `android:usesCleartextTraffic="true"`（允许明文 HTTP）。对番茄钟"专注锁"场景这些权限或有用意，但 `PACKAGE_USAGE_STATS`+`SYSTEM_ALERT_WINDOW` 组合属高风险权限，建议在隐私说明中明示用途。

**4. 可疑资源：伪装成 PNG 的 HTML 文件（低危，需清理）。**
- `src/images/azusa/azusa_spring_summer.png` 经 `file`/magic 检测实为 HTML 文档（magic=`<!DOCTYP`，43834 字节），内容是一段萌娘百科页面（含 `<script>`、gtag、moe-auth 等）。全仓 grep `azusa_spring_summer` **无任何引用**，属孤儿/误提交资源。浏览器以 `<img>` 加载时因 `.png` 扩展名按图片解码会失败（显示裂图），不会造成 XSS，但属于仓库完整性/卫生问题，建议删除或替换。

---

## 二、去 bug 自查（关键发现）

**BUG-1（高，核心功能正确性）：`AppState.totalCompletions` 为快照值，`addSession` 后不同步，导致"皮肤解锁进度"在会话内不前进。**
证据链：
- `src/js/core.js:365` 暴露为普通属性 `totalCompletions: _state.totalCompletions,`（**无 getter**）；
- `core.js:281` `if (session.completed) _state.totalCompletions++;` 只递增内部 `_state`，**不回写 AppState**；
- `core.js:102-103` `saveState()` 序列化 `totalCompletions: AppState.totalCompletions`（陈旧值）；
- `timer.js:29` 与 `timer.js:231` 两处 `var totalCompletions = AppState.totalCompletions;`（读取陈旧值驱动衣柜/成就/统计）；
- `achievements.js:140` 用该 `totalCompletions` 构建成就上下文，`stats.js`、`share.js:26` 同理。
**Node 复现验证**：
```
init AppState.totalCompletions = 5
after addSession: _state.totalCompletions = 6
after addSession: AppState.totalCompletions = 5   <-- 未被同步
```
实际影响：完成一次专注后，衣柜画廊/下一件衣装/相关成就在本页面内**不会随专注次数增加而解锁**，必须刷新页面才更新（刷新时 `pwa.js:450` `totalCompletions = sessions.filter(s=>s.completed).length` 从 sessions 重算，故无永久数据丢失，但实时反馈断裂）。这是本仓库最值得优先修复的缺陷。

**BUG-2（中，死代码/无提示）：`onDone` 的新衣装解锁提示永不触发。**
`timer.js:233` 已先调用 `updateCurrentTree()` 把 `currentTreeIdx` 推进到最高已解锁项；随后 `timer.js:262-265` 的 `for (var i = AZUSA_TREES.length - 1; i > currentTreeIdx; i--)` 因 `i > currentTreeIdx` 永远不成立，`newTree` 恒为 `null`——"🌸 新衣装解锁！"庆祝 toast 永远不会弹出（衣柜静态解锁仍可见，但缺少解锁正反馈）。

**BUG-3（低，数据一致性）：`AZUSA_TREES` 解锁阈值非单调。**
`timer.js:6-26`：`box` 在第 16 项解锁值 160，而 `wechat1` 在第 17 项解锁值 150（值更小却排在后面）。`updateCurrentTree()` 从末尾向前取首个已解锁项，会在 totalCompletions∈[150,160) 时把 `currentTreeIdx` 错取为索引 17（wechat1），进而影响 `skin_all`(检查 `>=17`) 等成就判定。建议按解锁值重排数组。

**测试存在性**：全仓 `*.test.*`/`*.spec.*` 检索**为空**；`package.json:10` `"test": "echo \"Error: no test specified\" && exit 1"`。没有任何单元测试。

---

## 三、优化自查（文档 / CI / 组织）

**1. README 与代码事实不一致（影响可信度）。**
- README:24 称"共 **14 级**收集路线"，但 `timer.js:6-26` `AZUSA_TREES` 实有 **20 项**（含 seed）；
- README:29 称"**17 项**成就"，而 `achievements.js:1,6` 头部明确"**62 个成就**"（grep `id:'` 也达 47 条，另有双引号 id）；
- 解锁阈值对不上：README 写 panda@20、ultimate@180，代码为 panda@18、ultimate@200；
- `package.json:18` `"license": "ISC"`，但 `LICENSE` 文件与 README:143 均为 **MIT**——许可证声明冲突。
README 结构（特性表/解锁路线/快速开始/配置/工作原理/目录/技术栈/贡献指南）本身较完整，但关键数字与代码脱节，需校对。

**2. CI 实质为空（质量门形同虚设）。**
`.github/workflows/ci.yml` 仅执行 `flutter analyze || true`——`|| true` 使其**永远通过**，且完全不 lint/测试 JS（`_verify2.py` 等浏览器测试未接入流水线）。README 顶部"CI"徽章恒绿，但不代表质量保障。建议把 `_verify2.py`（或轻量 JS 单测）接进 CI 并去掉 `|| true`。

**3. 代码组织：良好。** `src/js` 模块化清晰（core/timer/habits/goals/stats/achievements/economy/betting/shop/checkin/dressup/effects/diary/chat/share/pwa 共 16 个模块），`EventBus`+`Storage`+`AppState` 分层合理；`build.py` 可一键内联打包为单文件 `dist/index.html`（已实测生成 280KB）。模块间通过全局变量耦合（非 ES Module），是"零依赖单页"取舍，可接受。

---

## 四、实际跑通验证

**1. 构建脚本 `build.py`：✅ 成功。** 运行 `python3 build.py`，生成 `dist/index.html`（280.1 KB）并复制 `src/images`、`manifest.json`、`sw.js`，无报错。

**2. 静态服务 + curl 加载 `index.html`：✅ 成功。** 启动 `python3 -m http.server`，`curl` 实测：`index.html` → HTTP 200、下载 17727 字节（与源文件一致）；`manifest.json`、`sw.js`、`src/js/core.js`、`src/images/azusa/icon-192.png` 等均 200。PWA 入口可在本地静态服务正常加载。

**3. 端到端脚本 `_verify2.py`：✅ 本环境真实跑通。** 该脚本需 Playwright+Chromium，本沙箱已具备。实测结果：
```
PASS | 精灵初始居中 | offset=0px
PASS | 精灵物理后不越界 | final_rect=...
PASS | 习惯打卡金币联动UI | coins 60->92 disp 60->92
PASS | 持久化-习惯跨刷新 | len 1->1 dates 1->1
PASS | 持久化-金币跨刷新 | coins 92->92
=== PAGEERRORS === (空)
TOTAL: 5 tests, 0 failed
```
即**真实无头 Chromium 中应用零 JS 报错**，精灵物理、习惯金币联动、跨刷新持久化均通过。这是"应用可运行"的强证据。注意：该 E2E 未覆盖 BUG-1 的皮肤解锁实时推进，故未能捕获该缺陷。

**4. GUI 限制声明（重申）：** 沙箱无显示器/窗口，无法人工点击、看动画、截真实浏览器图；上述均以无头 Chromium 断言替代。安卓 APK 的真机"专注锁"、悬浮窗、用量统计等权限行为**未实测**。

---

## 五、评分

评分标准：100=近乎完美；90=该细分场景 GitHub 无平替；<90=需优化。桌面端实测≥90 才建议上架。

| 维度 | 得分 | 依据摘要 |
|------|------|----------|
| 功能 Functionality | 80 | 特性丰富（番茄钟/皮肤/习惯/目标/统计/成就/经济/押注/商店/打卡/换装/日记/聊天/PWA 离线），真实 Chromium 零报错且 E2E 全过；但 BUG-1 使核心"收集衣装"反馈在会话内失效。 |
| 文档 Documentation | 72 | README 结构完整、可运行说明清晰；但 14/20 级数、17/62 成就、解锁阈值、ISC/MIT 许可证与代码不一致，降低可信度。 |
| 安全 Security | 76 | 网页端零硬编码密钥、零运行时依赖、SW 稳健；但安卓层硬编码 keystore 口令、申请 SYSTEM_ALERT_WINDOW/PACKAGE_USAGE_STATS、明文流量、allowBackup，外加伪装 PNG 资源。 |
| 体验 Experience | 82 | 紫系主题、桌面+移动双布局、暗色模式、阿梓动画、可安装+离线；核心解锁循环因 BUG-1 须刷新才更新，削弱正反馈。 |
| 测试 Testing | 60 | 无任何单元测试；仅靠 `_verify2.py` 一个可运行的 Playwright E2E（5/5 通过、零报错），但未接入 CI、未覆盖解锁 bug。 |

**总分：75 / 100（<90，需优化，未达桌面端上架门槛）。**

---

## 六、上架 / 隐藏建议

- **当前结论：暂不上架（建议保持隐藏/草稿态打磨）。** 依据"桌面端实测≥90 才上架"：本仓库在真实无头 Chromium 虽能零报错运行，但存在 BUG-1（核心衣装解锁实时推进失效）这一 headline 特性缺陷，桌面端实测体验 <90，不满足上架门槛。
- **0 star 不是障碍，但质量门槛要先过**：功能完整度是优势（番茄钟+收集养成的组合在 GitHub 中文圈确有辨识度），修复下列缺陷后具备 ≥90 上架潜力。
- **优先修复清单（按影响排序）**：
  1. **BUG-1**：为 `AppState.totalCompletions` 增加 getter（`get totalCompletions(){ return _state.totalCompletions; }`）或在 `addSession` 中同步 `AppState.totalCompletions`，使衣柜/成就实时推进。
  2. **BUG-2**：`onDone` 的新衣装检测应在 `updateCurrentTree()` 之前比较旧/新 `currentTreeIdx`，恢复解锁 toast。
  3. **BUG-3**：按解锁阈值重排 `AZUSA_TREES`，消除非单调导致的索引错乱。
  4. **文档对齐**：校正 README 的级数(20)、成就数(62)、解锁阈值，统一许可证为 MIT（改 package.json 或 LICENSE）。
  5. **安全**：移除 `build.gradle` 硬编码口令 `azusa2026`（改为仅读环境变量并文档化），评估 `PACKAGE_USAGE_STATS`/`SYSTEM_ALERT_WINDOW`/`usesCleartextTraffic` 必要性；清理伪 PNG 资源 `azusa_spring_summer.png`。
  6. **CI/测试**：把 `_verify2.py` 接入 CI（去 `|| true`），并补充覆盖解锁进度的断言与少量 JS 单测。

---

## 七、总结

Forest Focus 是一个完成度相当高的纯前端自律 PWA：功能广度（14+ 衣装路线、60+ 成就、习惯/目标/经济/聊天/离线）在同类开源项目中少见，构建可复现、静态托管可加载、真实浏览器零报错且有可用 E2E 验证。主要扣分项集中在：(1) 一个真实的核心正确性 bug（解锁进度会话内不前进）；(2) README 与代码事实脱节；(3) 安卓层权限/口令卫生；(4) 缺乏单元测试与有效 CI。综合 75/100，距上架门槛尚差一截，建议先修 BUG-1~3 与文档后再评估上架。
