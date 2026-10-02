# dsh-codex-ui

A Codex-style navigation shell for the DeepSeek Harness Web UI: a permanent
56px icon rail plus the session/project column, with the conversation and
composer left untouched.

```
┌────────┬──────────────────┬──────────────────────────────┐
│ rail   │  sessions /      │  main panel                  │
│ 56px   │  projects        │  (composer unchanged)        │
└────────┴──────────────────┴──────────────────────────────┘
```

[中文说明 →](./README.zh.md)

> **Status: personal project, moving target.** This plugin restyles the
> shipped client from the outside. It keys off stable `data-cx-*` anchors and
> `[class*="_suffix"]` selectors, but DeepSeek Harness is in release candidate
> and internals do move. Tested against **0.2.0-rc.2** only.

## What you get

| Piece | What it does |
| --- | --- |
| Icon rail | New session, panel switcher (plugins / schedules), an overflow menu, and an avatar at the bottom. The rail replaces the shipped collapsed column, so the conversation always has a way back. |
| Brand | One logo owned by the plugin, sliding between the sidebar header and the rail slot as the column collapses. |
| Joined panels | The session column and the main panel are one surface — no gap, no rule, only a colour change. Outer corners round, inner corners square. |
| Native frosted glass | The window is created with macOS `vibrancy: "sidebar"` / Windows `backgroundMaterial: "acrylic"`. The column keeps the shipped `color-mix(… 90%, transparent)` fill so the material reads through instead of being painted over. |
| Collapse motion | One horizontal slide. The column track, the logo, the toggle and the header row all move on the same 0.36s curve, and the shipped crossfade is switched off so nothing blinks. |
| Conversation header | The title row (title, subagents, agent team, mode, background tasks) moves into the window top band; the 对话 / 轨迹 tabs become one rounded segmented control. |
| Account menu | The avatar opens a profile popover: name + contact, a collapsible `剩余用量` (paid and granted balance), Settings, and Help. |
| Profile dashboard | A usage board — tokens, peak, longest task, streaks, session count, token composition and a 365-day activity heatmap — reachable from Settings → Account. |

## Requirements

- DeepSeek Harness desktop, **0.2.0-rc.2** (the Web client must be the one
  bundled with the app).
- macOS or Windows. Linux is untested.

## Install

### From a local clone

```bash
git clone https://github.com/<you>/dsh-codex-ui.git
```

Then, from a DeepSeek Harness session, ask the agent to install the bundle:

```
plugin_manager install_bundle target="/absolute/path/to/dsh-codex-ui"
```

`install_bundle` performs the package installation and bundle selection.
Do not edit the profile's `package.json` or `cordis.patch.yml` by hand, and do
not run a package manager inside the profile directory.

### From npm

Once published:

```
plugin_manager install_bundle target="dsh-codex-ui"
```

Reload the client (`Cmd/Ctrl + R`) after the bundle is selected.

## Uninstall / roll back

1. Toggle the bundle off — Settings → Plugins → `dsh-codex-ui`, or
   `plugin_manager set_bundle target="dsh-codex-ui" enabled=false`.
2. Remove it entirely with `plugin_manager remove_bundle target="dsh-codex-ui"`.

Nothing outside the profile is touched; the client returns to the shipped
layout as soon as the bundle is off.

## How it works

The plugin registers two halves:

- **Host** (`lib/index.js`) — reads the local session projection cache
  (`~/.dsh/storages/session_projcache/sessions/*.json`) and serves the profile
  dashboard payload over the Connection fetch channel at
  `GET /api/codex-ui.dashboard`.
- **Client** (`lib/client.js`) — one `shell.overlay` occupant (the rail and the
  profile menu) plus a `settings.launcher` occupant (the avatar), and a
  stylesheet. It also tags shipped elements with `data-cx-*` attributes from a
  `MutationObserver`, and every style rule keys off those anchors.

Two rules keep it from breaking on a shuffle:

1. Selectors use `[class*="_suffix"]`, never the build's hashed prefix (which
   changes on every app build).
2. Anything the plugin owns is rendered by the plugin itself — the logo, the
   rail buttons, the menus, the dashboard. It never re-parents another plugin's
   component and never relies on hover-time DOM swaps.

Because it does restyle shipped class names, a future DSH release can rename a
key and require an update here. If the sidebar looks wrong after an app update,
that is why.

## Layout reference values

Measured against Codex desktop reference screenshots (2× scale).

| Token | Light | Dark |
| --- | --- | --- |
| Rail width | 56px | 56px |
| Top band | 48px | 48px |
| Card radius | 12px | 12px |
| Rail slot | 40px | 40px |
| Surface | `--dsw-specific-sidebar-fill` at 90% | same |
| Accent | `#3383f3` | `#3383f3` |

Panel padding, rail geometry, the heatmap scale and every other number live in
`docs/NOTES.md`.

## License

MIT — see [LICENSE](./LICENSE).
