# OPTIMIZER_LOG · forest-focus

- 仓库：`huanweide/forest-focus`
- 轮次：Round 1
- 日期：2026-10-06
- 执行者：GitHub 项目夜间全面优化器（自主运行）

---

## 一、存活评估（规范一）

**检索同类**：

| 方向 | 代表项目 | stars | 结论 |
|---|---|---|---|
| 通用番茄钟 | `Splode/pomotroid` | 5526 | 碾压级 |
| 通用番茄钟 | `schmich/marinara` | 2457 | 碾压级 |
| 通用番茄钟 | `zxch3n/PomodoroLogger` | 1161 | 碾压级 |
| 中文番茄钟 | `icodechef/Tick` 等 | ≤ 84 | 单薄 |
| VTuber/角色向专注 | `dianait/forest-clone` | 4 | 近乎空白 |
| VTuber/角色向专注 | `Sriram-Nambiar/forest-focus-timer` | 0 | 近乎空白 |

**结论：保留，但必须转向。**

作为「番茄钟」与 pomotroid / Marinara 正面竞争，功能、完成度、社区全部落后，
没有任何胜算 → 这条路是死路。
但「角色陪伴 + 衣装收集 + 养成闭环」这条交叉赛道上，检索到的竞品最高 4 stars，
是一片空地。项目真正稀缺的资产是 14 级衣装路线、分层立绘换装引擎、
金币经济 / 押注 / 商店 / 成就 / 日记这套完整养成闭环，而不是计时器本身。

**因此本轮方向 = 定位层整体转向 + 工程层深度特化**：
对外把叙事从「番茄钟」换成「专注 → 换装 → 养成」（零成本、改变竞争坐标系）；
对内把「零依赖单页应用的可信度」做成特色，因为这类结构天生容易静默失效。

## 二、方向选定（规范二）

- 单点深度特化：**工程质量与防回归能力**（从 0 到有真门禁、真测试、真审计）
- 整体转向：**定位叙事**（番茄钟 → 陪伴式专注养成）

## 三、决策原因 + 具体改动

### 1. build.py 硬编码打包清单 → 改为解析 index.html

- **发现过程**：审计发现 `index.html` 引用 8 个 CSS / 16 个 JS，
  而 build.py 的清单只有 7 / 15。
- **验证**：抓取线上 `huanweide.github.io/forest-focus/`，
  `.sidebar` 出现 0 次、`@media` 出现 0 次、`=== share.js ===` 出现 0 次、
  `function openShare` 出现 0 次 → **两个线上事故被证实**。
- **根因**：硬编码清单与 index.html 是两份事实源，必然漂移。
- **改动**：`build.py` 改为从 `BUILD:` 注释块解析引用，并在末尾自检
  （产物必须含每个文件的内联内容、无残留外链、无残留标记），失败 exit 1。
- **为什么这样改**：修「补一个文件名」只是治标；让 index.html 成为唯一事实源，
  以后新增模块不可能再漏。

### 2. 假 CI → 真门禁

- **发现**：`ci.yml` 跑 `flutter pub get || true` + `flutter analyze || true`，
  本仓库零 Flutter 代码，永远绿。徽章是假的。
- **改动**：新建 `scripts/audit.mjs`（7 类检查）+ `tests/app.test.mjs`（12 项），
  CI 改为 审计 → 单测 → 构建 → 产物校验。
- **自证有效性**：做了 4 次变异测试（移除 share.js 引用 / 移除 desktop.css 引用 /
  人为造同名函数 / 引用不存在图片），4/4 全部被抓到，恢复后基线绿。
  ——不做这一步，新 CI 就只是另一个假门禁。

### 3. 删除 docs/（34MB）

- **核实**：`gh api .../pages` 确认 Pages 源为 `gh-pages` 分支 + legacy，
  `docs/` 从未被使用；`docs/src/images` 与 `src/images` 逐文件同尺寸重复。
- **连带**：`build-apk.yml` 会把 APK commit 进 `docs/download/`，
  改为发布到 Release；`maintenance.yml` 对 docs 的依赖一并处理。
- **安全**：先 `mv` 到 /tmp 备份再删，未使用 `rm -rf`。

### 4. 其余修复

见 `CHANGELOG.md`。

## 四、自检与承认的错误

| # | 问题 | 处置 |
|---|---|---|
| 1 | 审计脚本初版把 CSS 的 `url()` 按 CSS 文件目录解析，误报 1 个资源缺失 | CSS 会被内联进根目录 index.html，改为双基准解析 |
| 2 | 初版把 `event.stopPropagation()` 当成全局函数调用误报 | 加负向后视，跳过成员调用 |
| 3 | 初版从磁盘全部 JS 收集全局定义，导致漏打包的模块仍被算作"已定义"，**正好掩盖要抓的那类事故** | 改为只从 index.html 打包清单收集 |
| 4 | 单测初版用 `AppState.set('habits', ...)` 后读不到，一度以为是测试写错 | 实为生产代码缺陷（引用快照），改生产代码而非改测试 |

第 3 条最值得记：如果没做变异测试，这个"看起来全绿"的审计脚本会一路绿灯地
放过真实的线上事故。

## 五、风险与回滚

- 全部改动为单个 PR，squash 合并为一个 commit，需要时一条 `git revert` 可整体撤销。
- 未改动任何 localStorage 键名，老用户升级后进度不丢。
- 未改动 UI 结构、DOM id、图片路径，视觉与交互无变化。
- 删除的 `docs/` 已备份；真需恢复可从 git 历史取回（未重写历史）。

## 六、下一轮建议

1. 角色包化：把 `src/images/azusa/` 与衣装数据抽成 `characters/<id>/` 包，
   让换装引擎可换角色 —— 这是把"阿梓粉丝向"变成"通用引擎"的关键一步。
2. `sw.js` 的缓存版本 `forest-v13` 仍靠手工 bump，可改为构建时注入。
3. 押注/商店等数值目前散落在各模块，可集中为一份配置便于调平衡。
