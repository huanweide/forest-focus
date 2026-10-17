# forest-focus · 内部操作手册（agent 接手须知）

> 本文件约束任何用 AI 代理维护本仓库的会话。

## 一、仓库定位

forest-focus 是**公开**的专注锁项目（PWA + Android + Windows 原型，产品门面）。
对外只放：源码 `src/` `android/` `focus-lock/`、构建 `index.html` `sw.js`、使用文档 `README.md`。

## 二、零号·仓库卫生铁律（2026-10-17 立，最高优先级）

**禁止往本公开仓库提交任何暴露瑞宝宝个人内部工作流 / 决策运作方式的文件。**

判别标准（命中即禁止）：
- 是否揭示「瑞宝宝个人怎么做决策 / 怎么排活 / 内部怎么开会」？
- 是否含「魔王系统 / maxloop / 多 agent 团队 / Chair / review-worker」这类内部运作记录？
- 是否含本地绝对路径（如 `C:\Users\Administrator\...`）或 AI 人格身份（如「千惠」「IDENTITY 铁律」）？

上述一律不放公开仓库，改存本地知识库。

> 已执行：移除 `PROCESS/meetings/`（多 agent 轮次会议纪要 + Chair 整合报告）与
> `PROCESS/forest-focus-round9.md`、`PROCESS/forest-focus-round10.md`（内部迭代轮次记录），
> 均暴露内部 maxloop 自主迭代流程。以后保持**零新增**，不得在仓库重建等价目录。

## 三、普通提交规范

- 仓库卫生改动（删敏感/暴露文件）**不 bump 版本**。
- 功能改动才 bump 版本 + 更新 CHANGELOG。
- 推送走 SSH 远端 `ghssh`；门禁通过后再提交。
