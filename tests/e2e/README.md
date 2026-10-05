# 端到端体验验证（真浏览器）

这三个脚本用 Playwright 驱动本机 Chrome，**真点一遍界面**来验证功能是否可见、可交互。
它们原本散落在仓库根目录（`_experience.py` / `_verify2.py` / `_shot.py`），现统一收在这里。

它们**不进 CI**：CI 环境没有本机 Chrome，且真浏览器跑一轮要几分钟。
CI 只跑 `scripts/audit.mjs`（静态审计）与 `tests/app.test.mjs`（核心逻辑单测）。

## 安装

```bash
pip install -r requirements-dev.txt
```

脚本通过 `channel="chrome"` 启动**系统已安装的 Chrome**（不是 Playwright 自带的 Chromium），
所以不需要 `playwright install`。

## 使用

| 脚本 | 作用 |
|------|------|
| `experience.py` | 全流程体验：首页 → 专注计时 → 习惯 → 目标 → 换装 → 打卡，每步做「操作前后」断言并验证元素真实可见（尺寸 > 0、非 display:none、非 opacity:0） |
| `verify_sprite.py` | 专项验证：精灵位置是否越界、数据跨刷新是否持久化、金币与 UI 是否联动 |
| `shots.py` | 批量截图各 Tab，产物用于人工核对视觉效果 |

```bash
# 全流程体验（自带静态服务器，端口 8099）
python tests/e2e/experience.py

# 专项验证（端口 8098）
python tests/e2e/verify_sprite.py

# 截图（需另开一个静态服务器，默认读取 8080）
python -m http.server 8080 &
python tests/e2e/shots.py
```

端口可用环境变量覆盖：`E2E_PORT=9099 python tests/e2e/experience.py`；
`shots.py` 的待测地址可用 `E2E_URL=http://127.0.0.1:3000/index.html` 覆盖。

## 产物

截图输出到 `_shots/`（已被 `.gitignore` 忽略），控制台日志、页面错误与失败请求一并收集。
