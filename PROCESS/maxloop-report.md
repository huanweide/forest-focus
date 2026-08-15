# forest-focus · maxloop 深度测试优化 · 收敛报告

> 生成时间：2026-08-14
> 执行方式：主 agent（WorkBuddy）直接读码 / 构建 / 验证，**未依赖会空转的子代理**（按瑞宝宝纠偏）
> 结论：**循环在此收敛**。代码侧已完整、可构建、已修复核心回归；剩余仅"部署"一项属产品/基建决策，交瑞宝宝定夺。

---

## 一、做了什么（用户视角）

1. **主 agent 亲验，不假收敛**：逐文件比对了线上部署产物与两个分支的源码，没只信文档自报的"门禁全过"。
2. **修了一个真回归——手机锁孤儿**：网页唤起安卓「阿梓的专注锁」App 的 `aziforest://` 深链功能，只存在于**线上部署产物**里，从未进过任何分支的版本库。一旦哪天从源码重新构建，这功能就 silently 没了。已把它的源码（`startPhoneLock` / `phoneLockHint`）从线上构建产物里提取、移植回 `master` 的 `src/js/timer.js`，并在计时页加了 `btnPhoneLock` 按钮。
3. **收口了一批悬空改动**：此前有 13 个文件改了却没提交（数据导入导出、小精灵粒子限域首页、tabbar 清理、favicon、阿梓去背图）。已全部提交，`master` 工作树恢复干净。
4. **质量门禁实测通过**：18/18 个 JS `node --check` 全过；`build.py` 内联构建通过；产物同时含手机锁 + round6/7 全部功能。

---

## 二、关键发现：分支分叉（本轮最重要的结论）

| 分支 | 内容 | 手机锁深链 | round6/7（种树引擎·健康度·单树详情） |
|---|---|---|---|
| `origin/main`（**线上在跑的**） | round1 + 「电脑版优先/严格锁机/微信分享」(8430241) | ✅ 有 | ❌ 没有 |
| `master`（本地活跃开发） | round2–7 + in-flight 打磨 | ❌ 没有 | ✅ 有 |

**两分支互不为超集，且手机锁是"部署孤儿"。**

- 线上 `huanweide.github.io/forest-focus` 实测来自 `origin/main` 的构建产物：含 `aziforest://start?mode=soft&min=`、`btnPhoneLock`、`未检测到App` 提示（手机锁在），但 `showTreeDetail:0 / ht-tier:0 / treeDetail:0`（round6/7 全没上线）。
- 本地 `master` 含 round6/7 全部功能，却从头到尾没有 `startPhoneLock`（`git log -S aziforest --all` 全仓为空，证明它从没被提交过）。

**根因**：maxloop 一直在校验 `master`，但线上跑的是另一个分支；且早期某次"带了手机锁的本地构建"被部署了，对应源码改动却没提交 → 形成孤儿。这正好解释了你之前感觉"优化像没真正生效"。

---

## 三、底层原理（大白话）

- **手机锁深链是什么**：网页在安卓上点「用手机 App 锁机」→ 通过 `aziforest://start?mode=soft&min=25` 这种"深链"去唤起已安装的安卓 App，让 App 接管锁屏。`min=` 把当前专注时长传给 App，让它对齐自动解锁时间。非安卓、或没装 App，就给文字提示。这是 forest-focus「网页 + App 协同锁机」的核心一环，掉了等于锁机能力缺一块。
- **分支分叉是什么**：相当于"线上跑的是旧安装包，开发在写新版本，两边各少一块功能"。用户在浏览器里始终用不到完整版——要么没有新种树引擎/健康度，要么没有手机锁。
- **为什么之前没暴露**：之前依赖子代理，它们空转返回假"通过"；主 agent 早先只信了 round7 文档里自报的"门禁全过"，没真去把线上产物和源码逐行比对。

---

## 四、质量门禁（实测，非自报）

| 检查 | 结果 |
|---|---|
| 18/18 JS `node --check` | ✅ 全过 |
| `build.py` 内联构建 | ✅ 通过，`dist/index.html` 321 KB |
| 产物含手机锁深链 `aziforest://start?mode=soft&min=` | ✅ |
| 产物含 `btnPhoneLock` 按钮 | ✅ ×1 |
| 产物含 round7 `showTreeDetail` | ✅ ×4 |
| 计时漂移修复（`elapsed++` 残留） | ✅ 0 处（改用 `Date.now()` 墙钟基准） |
| Android `min` 解析（round1 IMP-003） | ✅ 在 `android/.../MainActivity.java`（包已改名 `com.huanweide.azusaforest`） |
| Windows 钩子 `LLKHF_ALTDOWN`（round1 IMP-004） | ✅ 在 `android/.../windows-focus-lock.py`（路径随 Android 目录重构，已从旧 `focus-lock/` 迁到 `android/`） |

> 说明：Android/Windows 的 round1 修复**没有丢**，只是目录从 `focus-lock/` 重构为 `android/`，包名从 `com.aziforest.focuslock` 改为 `com.huanweide.azusaforest`。早先按旧路径 grep 落空是虚惊，已按新路径复核确认完好。

---

## 五、仍待你拍板的一件事：部署

`master` 现在源码完整、可构建、已提交。但**线上仍是 `origin/main` 的旧内联构建**，用户还用不到 round6/7 + 手机锁。要真正上线，二选一：

- **方案 A（推荐）**：把 GitHub Pages 源切到 `master`，并加一个 Action 跑 `python build.py` 把内联产物发到 Pages（`dist/` 被 gitignore，必须有构建步骤，不能纯靠提交）。
- **方案 B（手动）**：本地 `python build.py` 生成 `dist/index.html`，把这份内联文件推到 Pages 源分支。

> ⚠️ 不要直接 `git merge master origin/main` 自动合：两边锁相关代码（master 的 lockOverlay/计时校准 vs origin/main 的「严格锁机/微信分享」）可能冲突，需人工核对。

可选：把 `master` 推到 `origin/master` 做远程备份（`git push origin master`），这步**不会**改变线上，纯属留底。

---

## 六、未做 / 局限（诚实声明）

- **无真实浏览器视觉实测**：本环境无 headless/chromium。SVG 渲染、单树详情弹窗动画、hover 手感、计时校准效果，需部署后人工验证。
- **OS 级硬锁做不到**：网页只能软锁（`visibilitychange` + `blur`/`focus`）。真锁屏需安卓设设备所有者走 PINNED，或 Windows 走 Assigned Access——均非网页能实现。
- **微信真分享暂缓**：当前 Web Share + 复制兜底；带卡片分享需公众号 appId + 后端签名，暂无后端。

---

## 七、结论

maxloop 七轮打磨 + 本轮收敛，已产出**完整、可构建、已修复核心回归**的 `master`（提交 `65fa72c`）。循环在此**收敛即停**——剩余仅是部署决策，属产品/基建动作而非代码优化，交给瑞宝宝定夺。需要我帮忙推 `master` 或搭部署 Action，说一声即可。
