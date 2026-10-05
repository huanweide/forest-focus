[![License](https://img.shields.io/github/license/huanweide/forest-focus)](LICENSE)
[![CI](https://github.com/huanweide/forest-focus/actions/workflows/ci.yml/badge.svg)](https://github.com/huanweide/forest-focus/actions/workflows/ci.yml)
[![Stars](https://github.com/huanweide/forest-focus/stargazers)](https://github.com/huanweide/forest-focus/stargazers)
[![PWA](https://img.shields.io/badge/PWA-可安装·离线可用-7C5CBF)](https://huanweide.github.io/forest-focus/)
[![Release](https://img.shields.io/github/v/release/huanweide/forest-focus)](https://github.com/huanweide/forest-focus/releases/latest)

# 阿梓的森林 · Forest Focus

> **不是又一个番茄钟 —— 是「专注 → 换装 → 养成」的完整闭环。**
> 每完成一次专注，就为阿梓种下一棵树、解锁一件新衣装。把枯燥的自律变成一场看得见的收集旅程。

立刻使用：**https://huanweide.github.io/forest-focus/**

---

## 它和普通番茄钟有什么不一样

番茄计时本身没有壁垒：pomotroid、Marinara、PomodoroLogger 都是成熟且免费的实现，
只想找个计时器的话，用它们就好。本项目解决的是另一件事 —— **让"坚持"本身产生反馈**：

| | 普通番茄钟 | 阿梓的森林 |
|---|---|---|
| 计时结束得到什么 | 一个打勾 | 一棵树 + 一次衣装解锁进度 |
| 长期动力来源 | 靠自律 | 14 级衣装收集路线 + 17 项成就 |
| 中断成本 | 无感 | 押注金币、习惯连续天数、护符会被消耗 |
| 数据 | 多为单日统计 | 习惯热力图 / 目标进度 / 仪表盘（日·周·月·年）/ 日记 |
| 陪伴感 | 无 | 阿梓表情反馈、离线对话、金币商店 |
| 部署形态 | 多为网页或客户端 | PWA：可装到手机主屏、离线可用、数据全在本地 |

一句话：**它把"我该专注了"变成了"我想看看阿梓下一套衣装"。**

## 核心特性

| 特性 | 说明 |
|------|------|
| 番茄钟 | 20 / 25 / 30 / 45 / 60 分钟多档，紫色渐变计时环 |
| 种树与衣装收集 | 每完成一次专注推进解锁进度，共 14 级收集路线 |
| 衣柜画廊 | 分层立绘（身体 / 上装 / 下装 / 头饰 / 背景），自由搭配与保存 |
| 习惯打卡 | 三级难度、连续天数、健康值、月度热力图、补签卡 |
| 目标追踪 | 番茄数进度，可手动增量 |
| 数据仪表盘 | 饼图、连续天数，支持今日 / 本周 / 本月 / 本年切换 |
| 成就系统 | 17 项成就，含稀有度分级与进度条 |
| 金币经济 | 专注产出金币，可在商店购买道具，也能押注加倍（有输有赢） |
| 专注锁定 | 切走页面触发遮罩；安卓端可深链唤起「阿梓的专注锁」软锁机 |
| 日记与分享 | 专注日记、生成分享文案 |
| 暗色模式 | 一键切换，偏好本地保存 |
| 阿梓聊天 | 内置与阿梓的轻量对话陪伴（离线模式可用） |
| PWA | 可添加到主屏幕、离线可用、Service Worker 缓存 |

## 阿梓衣装解锁路线

| 等级 | 衣装 | 需要专注次数 |
|------|------|-------------|
| 0 | 种子 | 初始 |
| 1 | 默认衣装 | 1 次 |
| 2 | 新年衣装 | 5 次 |
| 3 | 夏日衣装 | 12 次 |
| 4 | 熊猫阿梓 | 20 次 |
| 5 | 兔兔阿梓 | 30 次 |
| 6 | 青蛙阿梓 | 40 次 |
| 7 | 蝴蝶阿梓 | 55 次 |
| 8 | 茄子阿梓 | 70 次 |
| 9 | 春装阿梓 | 90 次 |
| 10 | Q 版阿梓 | 110 次 |
| 11 | 礼物阿梓（Live2D） | 130 次 |
| 12 | 忍者阿梓 | 155 次 |
| 13 | 终极阿梓 | 180 次 |

## 快速开始

**网页版**：直接用浏览器打开 [应用链接](https://huanweide.github.io/forest-focus/) 即可使用，无需安装。

**安装到手机（PWA）**：

1. 用浏览器打开 [应用链接](https://huanweide.github.io/forest-focus/)
2. iPhone：点「分享」→「添加到主屏幕」
3. Android：点菜单 →「添加到主屏幕」
4. 主屏出现阿梓图标，点击即全屏运行，可离线使用

**本地运行**：

```bash
# 任意静态服务器即可，例如
python -m http.server 8080
# 浏览器访问 http://localhost:8080
```

## 工作原理

```
开始专注（选定时长）
      │  计时进行中
      │  若切走页面且开启「专注锁定」→ 遮罩拦截
      ▼
专注完成 ✔
      │  累计专注次数 +1，产出金币
      ▼
达成衣装解锁阈值？── 是 ──▶ 解锁阿梓新衣装（衣柜画廊更新）
      │  否
      ▼
同步习惯打卡 / 目标进度 / 成就进度 / 数据仪表盘
      │
      ▼
本地存储持久化（刷新、离线均保留）
```

## 目录结构

```
index.html              单页应用入口（开发态，靠 <script> 顺序加载模块）
manifest.json           PWA 清单（名称 / 图标 / 主题色）
sw.js                   Service Worker（离线缓存 + LRU 淘汰）
build.py                构建脚本：把 CSS/JS 内联进 dist/index.html
src/css/                样式（变量 / 基础 / 计时 / 衣装 / 统计 / 聊天 / 特效 / 桌面）
src/js/                 逻辑模块
  ├─ core.js            核心状态、存储、事件总线
  ├─ timer.js           番茄钟计时
  ├─ habits.js          习惯打卡      ├─ goals.js       目标追踪
  ├─ stats.js           数据仪表盘    ├─ achievements.js 成就系统
  ├─ economy.js         金币经济      ├─ betting.js     押注加倍
  ├─ shop.js            商店          ├─ checkin.js     签到与补签
  ├─ dressup.js         衣装解锁与画廊 ├─ effects.js     视觉特效
  ├─ diary.js           日记          ├─ chat.js        与阿梓聊天
  ├─ share.js           分享文案      └─ pwa.js         PWA 注册
src/images/azusa/       阿梓形象与衣装资源
scripts/audit.mjs       源码静态审计（见「质量保障」）
tests/                  Node 单元测试 + Playwright 端到端脚本
android/ build-apk.js   安卓 TWA 打包（APK 发布到 Release，不入库）
focus-lock/             安卓端「阿梓的专注锁」与深链协议
PROCESS/                迭代过程记录
```

## 开发

```bash
npm run audit     # 源码静态审计
npm test          # 核心逻辑单元测试（node:test）
npm run build     # 构建 dist/index.html
npm run verify    # 以上三步 + 产物校验，一条命令跑完
```

`scripts/audit.mjs` 不依赖任何 npm 包，`npm run audit` 开箱可用。

## 质量保障

这是个「一个 HTML + 若干全局脚本」的零构建单页应用：模块靠 `<script>` 顺序拼接、
交互靠 `onclick="fn()"` 字符串绑定。这种结构有三类问题**不会报错、只会静默失效**，
而且历史上都真实发生过，因此被固化成了自动检查：

| 历史事故 | 现象 | 现在的防线 |
|---|---|---|
| 漏打包 `desktop.css` | 线上桌面端布局全部失效，`.sidebar` 与所有 `@media` 都没了 | 构建清单以 `index.html` 为唯一事实源自动解析；审计比对磁盘文件 |
| 漏打包 `share.js` | 顶栏分享按钮点了抛 `ReferenceError`，是个死按钮 | 审计扫描全部 `onclick` 绑定的函数是否真的定义过 |
| 两份 `updateBetInfo` | 两个文件同名函数互相覆盖，一份是永远执行不到的死代码 | 审计检查全局函数重名 |
| `AppState` 引用快照 | 状态被整体替换后，外部拿到的还是旧数组，改了刷新就丢 | 引用型状态统一改为 `_state` 读写代理；单测覆盖持久化往返 |

每次 push / PR 都会跑：源码审计 → 单元测试 → 构建 → 产物校验。
部署到 GitHub Pages 之前还会再校验一次产物，坏版本不会上线。
此外每周一自动对照线上站点做一次体检（桌面样式、分享功能、图标可达性），
失败会自动开 issue。

## 数据隐私

所有进度都存在你浏览器的 localStorage 里，不上传、无账号、无后端。
清除浏览器数据会一并清除进度，可在「我的数据」里导出备份后迁移。

## 项目合并说明

本仓库已合并并取代 [`self-discipline-forest`](https://github.com/huanweide/self-discipline-forest)（该仓库已归档）。后续维护统一在此进行。

## 贡献指南

- 功能建议或 Bug 反馈请走 [Issues](https://github.com/huanweide/forest-focus/issues)。
- 提交前请跑 `npm run verify`，确保审计、单测、构建全部通过。
- 新增 CSS / JS 模块时，记得在 `index.html` 对应的 `BUILD:` 注释块里加上引用 ——
  build.py 以它为准，忘了加就会被漏打包（审计会拦截，但本地先跑一遍更快）。
- 资源与文案请尊重阿梓形象相关版权，仅作非商业粉丝向用途。

## 许可证

[MIT License](LICENSE)

## 作者

由 **ReTr · 樊斯瑞** 维护 · [GitHub 主页](https://github.com/huanweide)

## 赞助支持

如果这个项目帮到了你，欢迎 [点 Star](https://github.com/huanweide/forest-focus) 支持；
也可微信扫码自愿赞助（收款码见 `sponsor/wechat-qr.png`，纯静态图片、不含任何密钥）。
