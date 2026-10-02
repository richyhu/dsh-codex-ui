# dsh-codex-ui

把 DeepSeek Harness Web 客户端的**导航区**改成 Codex 桌面端的样式：最左侧常驻
56px 图标竖栏 + 第二列会话/项目列表，主内容区与对话框（composer）完全不动。

```
┌────────┬──────────────────┬──────────────────────────────┐
│ 竖栏   │  会话 / 项目列表  │   主内容区（原样）            │
│ 56px   │                  │   对话框 / composer 不改      │
└────────┴──────────────────┴──────────────────────────────┘
```

[English →](./README.md)

> **状态：个人项目，跟着宿主版本走。** 这个插件是从外部**改写宿主编译产物**的样式，
> 依赖稳定的 `data-cx-*` 锚点和 `[class*="_后缀"]` 选择器，但 DSH 还在 rc 阶段，
> 内部结构会变。**只在 0.2.0-rc.2 上验证过。**

## 做了什么

| 部分 | 说明 |
| --- | --- |
| 图标竖栏 | 新建会话、面板切换（插件 / 定时任务）、溢出菜单、底部头像。竖栏取代了宿主"折叠后整列消失"的行为，所以对话界面永远有路回去 |
| 品牌标 | 由插件自己渲染的**唯一一个** Logo，随侧边栏折叠在侧边栏表头和竖栏槽位之间平移 |
| 面板连体 | 会话列和主面板是**一整块**：没有缝隙、没有分隔线，只靠底色区分；外侧圆角、内侧直角 |
| 原生毛玻璃 | 窗口是以 macOS `vibrancy: "sidebar"` / Windows `backgroundMaterial: "acrylic"` 创建的。列保留宿主的 `color-mix(… 90%, transparent)` 底色，让原生材质透出来而不是被盖死 |
| 折叠动画 | 一条水平平移。列宽、Logo、折叠按钮、标题行共用同一条 0.36s 曲线，宿主的交叉淡入淡出被关掉，所以不会闪 |
| 对话头部 | 标题行（标题、子智能体、智能体团队、模式、后台任务）搬到窗口顶部条；「对话 / 轨迹」做成一个胶囊分段控件 |
| 账号菜单 | 点头像弹出个人资料卡：昵称 + 手机号、可折叠的「剩余用量」（剩余额度 / 赠送额度）、设置、帮助 |
| 个人看板 | 使用概览：累计 Token、峰值、最长任务、连续天数、会话数、Token 构成，以及 365 天活动热力图。入口在 设置 → 账户 |

## 环境要求

- DeepSeek Harness 桌面端 **0.2.0-rc.2**（必须是 App 自带的那份 Web 客户端）
- macOS / Windows。Linux 未测试

## 安装

### 从本地克隆

```bash
git clone https://github.com/<you>/dsh-codex-ui.git
```

然后在任意一个 DeepSeek Harness 会话里让智能体执行：

```
plugin_manager install_bundle target="/绝对路径/dsh-codex-ui"
```

`install_bundle` 会自己完成依赖安装和 bundle 选择。**不要**手改 profile 里的
`package.json` / `cordis.patch.yml`，也不要在 profile 目录里跑包管理器。

### 从 npm

发布之后：

```
plugin_manager install_bundle target="dsh-codex-ui"
```

bundle 选中后刷新客户端（`Cmd/Ctrl + R`）。

## 卸载 / 回滚

1. 关掉 bundle：设置 → 插件 → `dsh-codex-ui`，或
   `plugin_manager set_bundle target="dsh-codex-ui" enabled=false`
2. 彻底移除：`plugin_manager remove_bundle target="dsh-codex-ui"`

不会动 profile 之外的任何东西；bundle 一关，客户端立刻回到宿主原样。

## 原理

插件注册了两半：

- **Host 半**（`lib/index.js`）—— 读本地会话投影缓存
  （`~/.dsh/storages/session_projcache/sessions/*.json`），通过 Connection 的
  fetch 通道在 `GET /api/codex-ui.dashboard` 提供个人看板的数据。
- **Client 半**（`lib/client.js`）—— 一个 `shell.overlay` 占用者（竖栏 + 账号菜单）、
  一个 `settings.launcher` 占用者（头像），外加一张样式表。它同时用
  `MutationObserver` 给宿主元素打上 `data-cx-*` 标记，所有样式规则都挂在标记上。

两条自保规则：

1. 选择器一律用 `[class*="_后缀"]`，**绝不用编译产物的哈希前缀**（每次构建都会变）
2. 凡是插件自己拥有的东西，都由插件自己渲染 —— Logo、竖栏按钮、菜单、看板。
   不搬运别的插件的组件，也不依赖 hover 时的 DOM 互换

由于确实改了宿主的类名，未来 DSH 版本如果改了某个 key，这里就需要跟着更新。
App 升级后如果侧边栏错乱，原因就是这个。

## 布局参考值

数值取自 Codex 桌面端参考截图实测（2 倍图）。

| 项 | 浅色 | 深色 |
| --- | --- | --- |
| 竖栏宽 | 56px | 56px |
| 顶部条 | 48px | 48px |
| 卡片圆角 | 12px | 12px |
| 竖栏槽位 | 40px | 40px |
| 表面底色 | `--dsw-specific-sidebar-fill` 的 90% | 同左 |
| 强调色 | `#3383f3` | `#3383f3` |

面板内边距、竖栏几何、热力图色阶等全部数值见 `docs/NOTES.md`。

## 许可

MIT —— 见 [LICENSE](./LICENSE)。
