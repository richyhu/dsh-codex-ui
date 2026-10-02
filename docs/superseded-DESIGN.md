> 说明：这是第一版设计草案，已被 README.md 取代；最新实现与数值以 README.md 为准。

# Codex 风格界面改造 — 设计方案（草案）

## 1. 目标

把 DSH Web 客户端的导航区（侧边栏）与整体布局改成 Codex 桌面端的样子：

```
┌──────┬──────────────┬──────────────────────────────┐
│ 图标 │  会话列表列   │        主内容区（不变）        │
│ 竖栏 │  (项目/置顶)  │  对话框 / composer 保持原样    │
│ 56px │  ~280px      │                               │
└──────┴──────────────┴──────────────────────────────┘
```

- 最左侧常驻 56px 图标竖栏：品牌标、面板图标（插件、定时任务）、更多、底部账户。
- 第二列是项目/置顶分组 + 会话行，风格对齐 Codex（圆角选中态、灰色分组标题、缩进会话行）。
- 主内容区、对话框、composer **不改**。

## 2. 事实依据（已验证）

| 事实 | 证据 |
| --- | --- |
| 运行中的 GUI = `DeepSeek Harness.app`，profile = `desktop`，URL `http://127.0.0.1:19387` | `ps aux`；`DSH_PROFILE=desktop` |
| 布局是 `sidebar / center / rightbar` 三栏 CSS Grid，列宽由 React 内联 `gridTemplateColumns` 决定 | `dsh-client-ui-layout/lib/client.js:320` |
| 侧边栏列 `overflow:hidden`，折叠时 56px、macOS 下折叠为 0 | layout README；layout client.js:38-39 |
| `sidebar.panellist` 已有 `plugins`、`schedules` 两个全局面板图标 | 实时 Slot 查询 |
| `main` 已有 `plugins`、`conversation`、`schedules` 三个面板 | 实时 Slot 查询 |
| 客户端插件可通过 `slots.inject('shell.overlay', …)` 注入 frame 级浮动层 | dsh-ui-motion 范例；实测注册成功 |
| 插件安装路径：profile `package.json` 的 `link:` 依赖 + bundle patch 行 | `plugin_manager install_bundle` 实测成功 |

## 3. 实现架构

新增客户端插件 `dsh-codex-ui`（源码在本仓库 `dsh-codex-ui/`，安装为 desktop profile 的 bundle）：

1. **宿主半边** `lib/index.js`：空实现（仅写一个激活标记文件，便于无 GUI 校验）。
2. **浏览器半边** `lib/client.js`：
   - 注入一份全局 `<style>`（所有改造样式集中在此，带 `data-plugin="dsh-codex-ui"`）。
   - 通过 `slots.inject('shell.overlay', …)` 注册一个 rail 组件，渲染我自有的图标（首页 / 新建会话 / 更多 / 账户）。
3. **CSS 改造**（不改 React 组件树，只做布局与配色覆盖）：
   - `.AppFrame` 增加 `padding-left: 56px`，让三栏整体右移，空出竖栏。
   - 把侧边栏列里已有的「品牌标 / 面板图标列表 / 设置入口」用 `position: fixed` 移进竖栏。
   - 其余列内容改造成 Codex 的列表列样式。
   - 补偿 `DragHandle.left`（+56px）、隐藏 `shell.leading` 座、修正 `--dsh-frame-leading-clearance`。

## 4. 实施顺序

1. 竖栏骨架（frame padding + rail 容器 + 品牌标/面板图标/设置入栏）。
2. 列表列样式（header、新聊天行、分组标题、会话行、hover/选中态）。
3. 折叠态、全屏、暗色主题、窄窗口回归。
4. 文档与回滚说明。

## 5. 风险

- CSS 依赖哈希类名（如 `_6Qf49G_frame`），**应用升级后可能失效**；所有哈希集中在文件顶部并注明。
- 竖栏把拖拽条/leading 座坐标挤偏，需要 CSS 补偿（已列入顺序 1）。
- 插件装进 profile 属于全局改动，提供一键卸载路径。
