[![License](https://img.shields.io/github/license/huanweide/forest-focus)](LICENSE)
[![CI](https://github.com/huanweide/forest-focus/actions/workflows/ci.yml/badge.svg)](https://github.com/huanweide/forest-focus/actions/workflows/ci.yml)
[![Stars](https://img.shields.io/github/stars/huanweide/forest-focus)](https://github.com/huanweide/forest-focus/stargazers)
[![PWA](https://img.shields.io/badge/PWA-可安装·离线可用-7C5CBF)](https://huanweide.github.io/forest-focus/)
[![Release](https://img.shields.io/github/v/release/huanweide/forest-focus)](https://github.com/huanweide/forest-focus/releases/latest)

# 阿梓的森林 · Forest Focus —— 番茄钟自律 PWA，专注种树收集阿梓全部衣装

一款**零依赖、可安装、离线可用**的番茄钟自律 PWA：每次完成专注就为阿梓（VTuber）种下一棵树，逐步解锁她全部衣装皮肤与成就。把「自律」变成一场看得见的收集旅程。

> 即刻使用：**https://huanweide.github.io/forest-focus/**

## 项目简介

- 用番茄钟管理专注，用「种树 + 衣装收集」把枯燥的自律变得有反馈、有动力。
- 内置习惯打卡、目标追踪、数据仪表盘与成就系统，覆盖从单次专注到长期习惯的完整闭环。
- 纯前端单页应用，支持「添加到主屏幕」与离线运行，数据全部保存在本地。

## 项目合并说明

`forest-focus`（本仓库）与 `self-discipline-forest`（Flutter 原型）是两个同源的「专注森林 / 自律」项目。为单一真相源、避免分叉，已于 2026-08-15 将两者合并为本仓库并**删除 `self-discipline-forest`**：

- 种树引擎（8 树型 × 7 生长阶段）与习惯健康度算法（近期 70% + 历史 30%）此前已在 round 6 移植；
- 本次合并补齐 **Flowmodoro 注意力标记**（深度专注 / 专注 / 走神 / 分心）与 **15 分钟最短预设**，使本仓库成为两项目的完整超集。

## 核心特性

| 特性 | 说明 |
|------|------|
| 番茄钟 | 15 / 20 / 25 / 30 / 45 / 60 分钟多档时长（含自定义），紫色渐变计时环 |
| Flowmodoro 注意力标记 | 专注中可标记 🔥深度专注 / 👍专注 / 😐走神 / 📱分心，分心累计影响本次专注质量 |
| 种树系统 | 每完成一次专注解锁阿梓新衣装，共 14 级收集路线 |
| 衣柜画廊 | 查看所有阿梓形象与解锁进度 |
| 习惯打卡 | 三级难度、连续天数、健康值、月度热力图 |
| 目标追踪 | 番茄数进度，可手动增量 |
| 数据仪表盘 | 饼图、连续天数，支持今日 / 本周 / 本月 / 本年切换 |
| 成就系统 | 17 项成就，含稀有度分级与进度条 |
| 专注锁定 | 切走页面触发遮罩，强制保持专注 |
| 暗色模式 | 一键切换，偏好本地保存 |
| 阿梓聊天 | 内置与阿梓的轻量对话陪伴（离线模式可用） |
| PWA | 可添加到主屏幕、离线可用 |

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

## 配置说明

应用以本地偏好为主，无需服务端配置：

| 选项 | 说明 |
|------|------|
| 专注时长 | 15 / 20 / 25 / 30 / 45 / 60 分钟（含自定义），随时切换 |
| 暗色模式 | 一键切换，偏好保存在本地 |
| 专注锁定 | 开启后切走页面触发遮罩，强制专注 |
| 数据备份 | 所有进度存于浏览器本地存储，可导出 / 清除以换新设备 |

## 工作原理

```
开始专注（选定时长）
      │  计时进行中
      │  若切走页面且开启「专注锁定」→ 遮罩拦截
      ▼
专注完成 ✔
      │  累计专注次数 +1
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
index.html              单页应用入口
manifest.json           PWA 清单（名称 / 图标 / 主题色）
sw.js                    Service Worker（离线缓存）
src/css/                样式（变量 / 基础 / 计时 / 衣装 / 统计 / 聊天 / 特效）
src/js/                 逻辑模块
  ├─ core.js            核心状态与存储
  ├─ timer.js           番茄钟计时
  ├─ habits.js          习惯打卡
  ├─ goals.js           目标追踪
  ├─ stats.js           数据仪表盘
  ├─ achievements.js    成就系统
  ├─ economy.js         金币经济
  ├─ betting.js         小游戏
  ├─ shop.js            商店
  ├─ checkin.js         打卡
  ├─ dressup.js         衣装解锁与画廊
  ├─ effects.js         视觉特效
  ├─ diary.js           日记
  ├─ chat.js            与阿梓聊天
  └─ pwa.js             PWA 注册
src/images/azusa/       阿梓形象与衣装资源
docs/                   文档与构建产物说明
build-apk.js / build.py  APK 打包脚本
```

## 技术栈

单文件纯 HTML / CSS / JS，零依赖、零框架；通过 Service Worker 实现 PWA 离线能力，可经 `build-apk.js` / `build.py` 打包为 Android APK。

## 贡献指南

- 功能建议或 Bug 反馈请走 [Issues](https://github.com/huanweide/forest-focus/issues)。
- 提交前请确保 CI 通过（`.github/workflows/ci.yml`）。
- 资源与文案请尊重阿梓形象相关版权，仅作非商业粉丝向用途。

## 许可证

[MIT License](LICENSE) —— 详见仓库 LICENSE 文件。

## 项目合并说明

本仓库已合并并取代 [`self-discipline-forest`](https://github.com/huanweide/self-discipline-forest)（该仓库已归档）。后续维护统一在此进行。
