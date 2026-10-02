# dsh-codex-ui

把 DSH Web 客户端的**导航区**改成 Codex 桌面端的样式：最左侧常驻 56px 图标竖栏 + 第二列会话/项目列表，主内容区与对话框（composer）完全不动。

```
┌────────┬──────────────────┬──────────────────────────────┐
│ 56px   │  会话 / 项目列表  │   主内容区（原样）            │
│ 竖栏   │                  │   对话框 / composer 不改      │
└────────┴──────────────────┴──────────────────────────────┘
```

## 竖栏内容

自上而下，全部对应 DSH 真实功能，没有占位图标：

| 位置 | 图标 | 来源 | 行为 |
| --- | --- | --- | --- |
| 顶部条 | 品牌标（鱼）+ 产品名 | DSH 原生品牌元素 | 移到窗口顶部条，与折叠按钮同一行 |
| 第 1 格 | 新建会话 | 本插件 | `uiWorkspace.startSession()` |
| 第 2 格起 | 插件 / 自动化任务 … | DSH 原生 `sidebar.panellist` | 打开对应全局面板 |
| 底部上方 | 个人看板 | 本插件 | 打开使用概览（Token 统计 + 活动热力图）；再点一次回到会话 |
| 底部上方 | 更多 … | 本插件 | 回到会话 / 折叠侧边栏 / 主题（跟随系统·浅色·深色） |
| 最底部 | 账号头像 | 本插件接管 `settings.launcher` | 只显示头像，**悬停不弹东西**；点击直接打开 DSH 原生设置面板（登录/退出/反馈都在里面） |

列表列保留 DSH 原有的全部能力：新聊天、搜索、视图选项、项目分组、置顶、重命名/置顶/归档/Fork、"展开显示"。

## 它是怎么做到的

一个客户端插件（`lib/client.js`），只做两件事，**不替换任何 React 组件树**：

1. **给 6 个宿主元素打 `data-cx-*` 标记**（`applyNavAnnotations`）。所有样式只依赖这些标记，
   DSH 内部那些带哈希的 CSS Module 类名只出现在这一个函数里（用 `[class*="_brandMark"]`
   这种"只匹配后缀"的写法），所以应用升级重新哈希类名时，这里一行注释都不用改。
2. **往 `shell.overlay` 注册一个 rail 组件**：竖栏自己的背景/拖拽区 + 两个 DSH 没有对应物的按钮
   （新建会话、更多）。

品牌标、面板图标、设置入口都是**宿主自己的元素**，只用 CSS 移进竖栏，所以它们的真实行为
（面板切换、设置弹窗、连接状态指示）原封不动。

## 布局与配色（数值取自 Codex 参考截图实测）

结构模型：

```
窗口底色 = 竖栏底色（竖栏不是一个独立面板，它直接坐在窗口底色上）
┌─────────────────────────────────────────────┐
│ 顶部条 48px  [logo] DeepSeek Harness [折叠按钮]│
├──────┬──────────────────┬───────────────────┤
│ 竖栏 │  会话列表（卡片）  │  主内容（卡片）     │
│ 56px │                   │                   │
└──────┴──────────────────┴───────────────────┘
         ↑ 卡片之间是 2px 的窗口底色缝隙，不是分割线

圆角规则：每张卡片都圆"两个上角"。
  会话列表 ↖ 圆    ↗ 直角
  主内容区 ↖ 直角  ↗ 圆
这样两张卡片之间的缝隙是一条笔直的线；如果内侧也圆角，接缝处会出现一个难看的缺口。
```

| 区域 | 亮色 | 暗色 |
| --- | --- | --- |
| 窗口底色 / 竖栏 | `#F1F1F1` | `#343434` |
| 会话列表卡片 | `#FCFBFC` | `#232323` |
| 主内容卡片 | `#FFFFFF` | `#181818` |
| 竖栏选中胶囊 | `#E7E7E7` | `#454545` |
| 列表选中行 | `#EDEDED` | `#2F2F2F` |
| 竖栏未读点 | `#3383F3` | `#3383F3` |

其他改动：

| 改动 | 说明 |
| --- | --- |
| 卡片大圆角 | 列表卡片左上角 `12px`、内容卡片右上角 `12px`（卡片从顶部条下方开始） |
| 顶部条 | 会话的**标题行**搬到窗口顶部条（标题 + 子智能体 + 智能体团队 + 创造模式 + 后台任务 + 右侧控件）；卡片里只剩「对话 / 轨迹」胶囊，头部从 76px 压到 46px |
| 品牌位置 | 展开时在侧边栏表头（「新会话」上面）；**折叠后滑回竖栏顶部的空位**（「新建会话」上方），带 0.24s 过渡动画 |
| 侧边栏 3 个按钮 | 搜索 / 视图选项 / 添加工作区移到**窗口顶部条**，和折叠按钮同一行：`[搜索 204][视图 236][添加 268][折叠 300]`，全部 y=10，不再和 Logo/产品名重叠 |
| ⚠️ 原生毛玻璃 | 桌面端窗口是 `vibrancy: "sidebar"`（macOS）/ `backgroundMaterial: "acrylic"`（Windows）+ `backgroundColor: "#00000000"`，**窗口本身全透明**。官方 `._6Qf49G_sidebarCol` 的底色是 `color-mix(in srgb, var(--dsw-specific-sidebar-fill) 90%, transparent)` —— 90% 填充 + 10% 透明，那 10% 就是透出来的原生模糊。我原来给 frame 和列表列刷了不透明底色，把毛玻璃整个盖死了。现在：frame `transparent`、标题行 `transparent`、列表列用官方的 `color-mix(... 90%, transparent)`、内容列保持不透明（对话区本来就不透） |
| 侧边栏与主区 | **连成一整块**：去掉 2px 缝隙和中间的分隔，只靠底色区分（列表 `#FCFBFC` / 内容 `#FFF`）；两侧各圆自己的外上角 |
| 折叠按钮 | 顶部条侧边栏右缘；折叠后移到标题左边（x=100，标题从 x=140 开始） |
| 折叠动画 | 两条同时长（0.36s）的过渡：列宽 `grid-template-columns` 280→0，Logo `left` 68→16。实测同步率 1:1（t+90ms 时列走了 31%、Logo 也走了 31%）。**注意**：过渡必须常驻在 frame 上，只在 `[data-animating]` 期间挂上去是无效的（过渡属性和新值在同一次样式变更里落地 → 不触发），那正是"侧边栏瞬间收完、Logo 慢慢滑"的原因。拖拽手柄 / 右侧栏 instant 模式显式排除 |
| 折叠时的闪烁 | shipped 的 `_3WPZCG_railIn` / `_fading` 动画是挂在**侧边栏根节点自己**身上的，我原来的选择器写成"后代"形式所以从来没匹配上，动画一直在跑。改成 `[data-cx-shell][class*="_railIn"] ...` 后实测 `anims=none` |
| 顶部条三个按钮 | 它们的偏移量原来跟着 `--cx-sidebar-w` 走，折叠时这个值归零 → 三个按钮飞到 x=-1375 才淡出。改用"最后一次非零宽度" `--cx-sidebar-last-w` 锚定，现在跟着列平滑左移并淡出 |
| 所有跟随列移动的元素 | 统一用 `max()` 写成一个连续公式，而不是"展开一套值、折叠另一套值"。例如折叠按钮 `left: calc(rail + max(--cx-sidebar-w - 36px, 44px))`、标题行 `left: calc(rail + max(--cx-sidebar-w, 84px))`。两套离散值切换时一定会跳（300→100、336→140），`max()` 是连续的 |
| 跟随动画的时机 | 这些元素靠 `--cx-sidebar-w` 每帧更新来跟随，**不要**再给它们自己加 `left` 过渡 —— 那会变成"列已经走完、按钮还在追"，实测折叠按钮 420ms 时只走到 123（目标 100）|
| 折叠后的圆角 | 侧边栏收成 0 宽后内容卡片成为最左面，补上它的左上圆角（实测 `12px/12px`，之前是 `0px/12px`）|
| shipped 品牌标记 | 两个 mark 都隐藏（`brandMark` 用 `visibility: hidden` 保留占位，`railMark` 用 `display: none`）。曾经漏删一条旧规则把 `railMark` 设成 `inline-flex`，导致折叠后折叠按钮里多出一个鱼形 Logo |
| Logo 归属 | 插件**自己渲染一个 Logo**（复用 primitives 的 `FishLogo`），shipped 的两个 mark 用 CSS 藏掉。之前是"借用" shipped 的 mark：折叠时 React 会卸载 `brandMark`、挂载 `railMark`，同一个 Logo 换了 DOM 节点 → 必然闪一下。自己拥有一个固定元素后，`left` 过渡才是真正连续的平移 |
| 折叠动画 | 关掉 shipped 的淡入淡出（`.fading>*{opacity:0}`、`.wide` 动画、`railIn` 动画），只留框架的 `grid-template-columns` 平移；时长统一到 `--cx-collapse-duration: 0.36s` |
| 顶部标题行 | 标题行的控件来自不同插件，各自带 margin、行高不一（`12px/normal` vs `12px/18px`），实测三个小控件比标题高 3px、间距 32/53px 不齐 → 统一 `line-height: 20px`、`gap: 10–14px`、`translateY(3px)` 对齐中线 |
| 对话 / 轨迹 | 做成一个胶囊分段控件（`radius: 999px`），选中态实心，去掉下划线指示器和头部下边框 |
| 折叠按钮固定定位 | 折叠后侧边栏列宽为 0，按钮若留在列里就再也点不到；改为 `position: fixed`，折叠/展开都能点 |
| 卡片间缝隙 | 2px 窗口底色，取代原来的 hairline 分割线 |
| 竖栏按钮圆角 | 10px → `12px`，选中态加一个 8px 蓝色圆点（对应参考图的未读点） |
| 底部账号入口只留头像 | 隐藏账号菜单自带的文字标签 |
| 账号入口 | 接管 `settings.launcher`：只有头像，**点击弹出个人资料菜单**（不是直接进设置）。头像/昵称/手机号走 `remote.account.getProfile`（返回值是 `{status, value}` 双层，要解一层）；菜单最初一帧 `account` 还是 `null`，取 `account.balance` 前必须判 `undefined`，否则整个入口会渲染失败消失 |
| ⚠️ 选择器越界 | `[data-cx-col] [data-cx-foot] button > *:not(:first-child) { display: none }` 本来只是要藏掉宿主账号按钮里的昵称，但**自己的个人资料菜单就挂在这个容器里**，菜单每一行也是 `<button>` → 行内第 2、3 个子元素（文字、余额）全体 `display: none`。现象是"弹窗里只有图标、一个字都没有"。修法：`button:not(.cx-acct-row)`。教训：覆盖宿主样式时，凡是形如 `button > *` 这种结构性选择器，都要假设自己新加的 DOM 也住在同一个容器里 |
| 弹窗配色 | 菜单的**背景色和文字色写成行内样式**（按当前深浅色由 JS 选字面色值），不依赖样式表是否已注入、也不依赖 `--dsw-alias-*` 是否存在。宿主 token 是两级间接（`--dsw-alias-label-primary` → `--dsw-static-neutral-bluish-1000`），中间任何一环缺失都不会走 `var()` 兜底（兜底只在变量未定义时生效，不覆盖"解析成不可见颜色"），所以行内色值才可靠 |
| `themeState` 作用域 | 必须定义在**工厂作用域**而不是 `apply()` 里 —— 账号菜单是工厂作用域组件，在 `apply()` 里声明的 `themeState` 它取不到；一旦引用，effect 阶段抛 `ReferenceError`，整个 `settings.launcher` 槽**渲染成空**（头像直接消失） |
| 账号菜单 | 头像 + 昵称 + 手机号 → **`剩余用量`（可折叠模块）** → `设置 ⌘,`（`openSettings()`）→ `帮助 ↗`（打开 [快速开始](https://deepseek-harness.github.io/deepseek-harness/guide/quickstart)）。点击菜单外或 Esc 关闭 |
| 剩余用量折叠模块 | 默认**折叠**，行尾有会旋转 180° 的箭头。展开后多出两行（缩进、无悬停、不可点）：`剩余额度`（余额接口的 `value` 钱包组）和 `赠送额度`（`bonusWallets` 组），金额为 null 时显示 `—`。所以**要点两次**才能看到额度：一次开菜单，一次展开 |
| 赠送额度为空时隐藏 | `bonusWallets` 数值合计为 0 时整行不渲染（余额未就绪时不隐藏，避免闪一下）。实测赠送 ¥0.00 时只剩 `剩余额度` 一行 |
| 子行宽度 | 子行是 `div` 不是 `button`，没有宿主全局的 `box-sizing: border-box` → `width:100%` 叠 `padding` 后实测 268px，比同级按钮（252px）宽 16px，视觉上"位置偏"。显式补 `boxSizing: 'border-box'`。实测全部行现在是 252 |
| 设置里的网页入口 | `设置 → 账户 →「更多账号信息」` 的点击被改写为打开个人看板；原始网页地址保留在被注入的 `打开用量网页` 按钮上，按钮插在链接下方（父容器是 flex row，需要 `flex-wrap: wrap` + `flex-basis: 100%` 才能真正换行）。React 会重渲染设置面板，所以按钮在每次 annotate 时重新确认存在 |
| 个人看板入口 | 竖栏不再有独立按钮；入口在 **设置 → 账户 →「更多账号信息」**（点击被拦截，不再跳网页） |
| 设置 → 账户 →「更多账号信息」 | 拦截点击，不再跳网页：关掉设置面板并打开个人看板 |
| macOS 折叠按钮 | 从独立一行移到列表表头同一行，与产品名对齐 |

## 安装

已经装进 `desktop` profile（`~/.dsh/profiles/desktop`）：

```jsonc
// ~/.dsh/profiles/desktop/package.json
"dependencies": { "dsh-codex-ui": "link:/absolute/path/to/dsh-codex-ui" },
"dsh": { "profile": { "bundles": [ ..., "dsh-codex-ui" ] } }
```

重新安装（例如换了目录）：

```bash
# 用应用自带的 pnpm 与 node
NODE="/Applications/DeepSeek Harness.app/Contents/Resources/runtime/bin/node"
PNPM="/Applications/DeepSeek Harness.app/Contents/Resources/runtime/pnpm/bin/pnpm.mjs"
cd ~/.dsh/profiles/desktop && "$NODE" "$PNPM" add "link:$PWD/../../Desktop/Deepseek_Harness/dsh-codex-ui"
```

然后重启 DSH，或在设置里开关一次该 bundle。改 `lib/client.js` 后客户端 HMR 会自动生效，**不用重启**。

## 卸载 / 回滚

```bash
# 1) 从 bundle 列表移除（最省事：设置 → 插件 里关掉 dsh-codex-ui）
# 2) 完全卸载
cd ~/.dsh/profiles/desktop
"$NODE" "$PNPM" remove dsh-codex-ui
```

`dsh-codex-ui/.backup/` 里存着改动前的 `package.json`、`cordis.patch.yml`、
`cordis.yml`、`pnpm-workspace.yaml`，需要回到出厂状态时直接覆盖回去即可。

## 调参

所有参数集中在 `lib/client.js` 顶部 `const CSS` 的开头 `:root{}` 里：

```css
--cx-rail-w: 56px;      /* 竖栏宽度，与 DSH 自身的折叠栏一致 */
--cx-rail-slot: 40px;   /* 竖栏按钮命中区 */
--cx-rail-top: 52px;    /* 首个图标距顶（避开 macOS 红绿灯） */
--cx-rail-new: 100px;   /* 新建会话按钮的纵向位置 */
--cx-rail-bottom: 62px; /* 「更多」距底部 */
```

`[data-cx-panellist]` 的顶部位置由 `--cx-rail-top + 2 *(--cx-rail-slot + --cx-rail-gap)`
自动推出，新增全局面板图标会自动往下排。

## 个人看板

竖栏底部「个人看板」按钮打开，面板注册在 `main` 槽的 `codex-profile` 键上。

布局：顶部一行，左边是身份（头像 + 用户名），**右边是详情卡（6 项统计）**；
下面依次是 Token 活动热力图、Token 构成、最近会话。

| 指标 | 口径 |
| --- | --- |
| 累计 Token 数 | 所有会话的 `cacheRead + uncachedInput + cacheWrite + output` 之和 |
| Token 使用峰值 | 单会话 Token 最大值 |
| 最长任务用时 | 单会话 `llmMs + toolMs` 最大值 |
| 最长 / 当前连续天数 | 按有使用的日期算连续自然日 |
| 会话数 | 参与统计的会话数 |
| Token 活动热力图 | 最近 371 天（53 周），7 行 × 周列，4 级色阶按非零日四分位，带星期/月份刻度 |
| Token 构成 | 缓存命中 / 未缓存输入 / 输出 / 缓存写入 占比条 |
| 最近会话 | 最近 8 个会话的标题 + Token 数 + 相对时间 |

**数据来源**：宿主半边读取 `~/.dsh/storages/session_projcache/sessions/*.json`
（DSH 的会话投影缓存，里面有每个会话的 `tokenUsage.totals` 与 `sessionStats`），
聚合成 JSON 后通过 Connection fetch 桥接注册的路由 `GET /api/codex-ui.dashboard`
给浏览器 —— 与官方 `@deepseek-ai/dsh-session-log-export` 用的是同一条通道。

**粗糙之处（已知）**：缓存里只有会话级的 Token 总量，没有逐轮时间线，
所以一个会话的 Token 全部记在它**最后一次提问那一天**。跨天的会话会整体落在一天里。
这个口径是刻意的，先要能看，再谈精确。

## 已知限制

- **哈希类名后缀是唯一耦合点**。`[class*="_brandMark"]` 这类写法只依赖类名后缀，
  但若 DSH 大版本重命名了这些 CSS Module 键（如 `_brandMark` → `_logoMark`），
  需要同步改 `ANCHORS` 表。锚点集中在 `client.js` 的"2. Anchors"一节。
- **竖栏位置是按像素锚定的**（`--cx-rail-*`），面板图标数量增长到 5 个以上时，
  竖栏中段会接近底部簇，需要调 `--cx-rail-new` 或减去部分间距。
- 只验证了 macOS 桌面端（`data-platform=darwin`）。Windows 标题栏布局
  （`data-windows-titlebar`）没有实测。
- 暗色主题只用计算样式核对过竖栏/列表列配色，未逐屏人工确认。
- **宿主半边改动需要热重载配置**：客户端插件改动会自动生效，但 `lib/index.js`
  （宿主半边）是 Node 模块，默认被 require 缓存。profile 的 `cordis.patch.yml`
  里已经加了 `root: ["<插件绝对路径>"]` 给 `hmr`，改宿主代码后 `touch lib/index.js`
  即可热重载；换目录后要同步改这个路径。
- 看板的热力图对历史数据的口径很粗（见上），且这台机器只有 6 天有数据，
  热力图看起来会很空 —— 这是真实情况，不是渲染 bug。
