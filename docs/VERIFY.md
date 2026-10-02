# 怎么验证

UI 插件的验证分三层：宿主半边是否激活、浏览器半边是否渲染、几何/配色是否符合预期。
前两层不需要看屏幕。

## 1. 宿主半边激活（加载器行是否生效）

`lib/index.js` 的 `apply()` 会写一个标记文件：

```bash
ls -l "$TMPDIR/dsh-codex-ui-host-applied.json"
```

存在即说明 bundle 行已被加载器激活。

## 2. 浏览器半边渲染（Slot 树）

用 `cordis_inspect_query` 查 live Slot 树：

```
platform: client, provider: Slots, method: listSubTree, input: { "root": "shell.overlay" }
```

`occupants` 里应出现 `{ "id": "codex-rail", "active": true }`。

`active: false` 表示组件在渲染时抛异常并被 Slot registry 停用（abdication）——
这是本项目最常用的失败信号。浏览器控制台会同时打印
`[dsh-codex-ui] rail render failed` 加完整堆栈。

## 3. 几何与配色（页面内测量）

临时往 `apply()` 末尾塞一段测量代码，把 `getBoundingClientRect()` 的结果写进
`document.title` 或者发到本地端口，就能在无 GUI 的情况下核对：

```js
window.setTimeout(() => {
  const r = (sel) => {
    const el = document.querySelector(sel)
    if (!el) return 'null'
    const b = el.getBoundingClientRect()
    return [b.x, b.y, b.width, b.height].join(',')
  }
  console.log({
    frame: r('[data-cx-frame]'),
    col: r('[data-cx-col]'),
    rail: r('[data-cx-col]'),
    brandmark: r('[data-cx-brandmark]'),
    panellist: r('[data-cx-panellist]'),
    listHeader: r('[data-cx-region] [class*="_sectionHeader"]'),
    session: r('[data-row-key^="session:"]'),
  })
}, 3000)
```

1470×923 窗口下的基准值（macOS，侧边栏展开，卡片从顶部条 48px 下方开始）：

| 元素 | 期望 |
| --- | --- |
| `[data-cx-frame]` | `0,0,1470,923` |
| `[data-cx-col]` | `56,48,278,875`（含 2px 卡片缝隙） |
| 内容列 | `336,48,1134,875` |
| 侧边栏拖拽条 | `332,48,8,875`（边界 336） |
| `[data-cx-brandmark]` | `96,12,24,24`（顶部条内） |
| 产品名 | `128,14,170,20` |
| 折叠按钮 | `298,10,28,28`（与产品名同一行） |
| `[data-cx-panellist]` | `0,152,56,88` |
| `[data-cx-foot]` | `0,873,56,40` |
| `.cx-rail-new` | `0,104,56,40` |
| `.cx-rail-profile` | 底部往上 `110px` 起 |
| `.cx-rail-more` | `0,821,56,40` |
| 列表 section header | `64,142,268,26` |
| 新聊天行（卡片第一行） | `64,48,264,34` |
| 项目行 / 会话行 | 高 30px，会话行比项目行多缩进 16px |
| 卡片圆角 | 列表 `12px 0 0`；内容 `0 12px 0 0` |

折叠态应满足：

| 元素 | 期望 |
| --- | --- |
| `[data-cx-col]` | `56,48,0,875`（列收成 0 宽） |
| 内容列 | `56,48,1414,875`（直接贴到竖栏右边） |
| 折叠按钮 | `68,10,36,36`，且 `elementFromPoint(中心)` 命中 `BUTTON` —— 折叠后仍然可点，否则会"再也展开不了" |
| `[data-shell-leading]` | `0,0,0,0`（已隐藏，避免和竖栏/顶部条按钮重复） |
| `[data-cx-brandmark]` | `96,12,24,24`（折叠态用 `railMark`，仍然可见） |
| `[data-cx-panellist]` / `[data-cx-foot]` | `0,152,56,88` / `0,873,56,40` |

## 3b. 个人看板

宿主路由（浏览器相对路径）：

```js
fetch('api/codex-ui.dashboard').then(r => r.json())
```

期望：`200` + `{ totals, streak, heatmap }`。返回 `404 not found` 说明宿主半边
没有加载成功（见 README 的"宿主半边改动需要热重载配置"），先看
`$TMPDIR/dsh-codex-ui-host-applied.json` 里的 `diagnostics.registered`。

面板本身：`layout.selectPanel('codex-profile')` 之后 `document.querySelector('.cx-board')`
应存在，`.cx-heat-cell` 数量 = 371 + 8（图例）= 379。

配色（`getComputedStyle`）：

| 项 | 亮色 | 暗色 |
| --- | --- | --- |
| `[data-cx-col]::before` 背景 | `rgb(239,239,239)` | `rgb(23,23,24)` |
| `[data-cx-col]` 背景 | `rgb(252,251,252)` | `rgb(30,30,31)` |
| 竖栏宽 | `56px` | `56px` |

## 4. 人工确认

自动化测不到"看起来像不像"。需要人工看：截图里的圆角、留白、字号、hover 反馈、
弹层位置。这是唯一必须看屏幕的一项。
