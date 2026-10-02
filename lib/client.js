/**
 * dsh-codex-ui — browser half.
 *
 * A Codex-style navigation shell over the shipped DSH Web client:
 *
 *   ┌────────┬──────────────────┬─────────────────────────┐
 *   │ 56px   │  session list    │  main content           │
 *   │ rail   │  (grouped rows)  │  (untouched composer)   │
 *   └────────┴──────────────────┴─────────────────────────┘
 *
 * Two mechanisms, no React tree replacement:
 *
 *  1. `applyNavAnnotations()` tags six shipped elements with stable
 *     `data-cx-*` attributes. Every style rule keys off those attributes,
 *     so the app's hashed CSS-module class names appear only in that one
 *     function — an app update that rehashes classes needs no CSS change.
 *  2. This module registers one `shell.overlay` occupant: the rail's own
 *     chrome and the two buttons DSH has no shipped equivalent for
 *     (New session, More). The brand mark, the global-panel icons and the
 *     settings entry are the SHIPPED elements, moved into the rail by CSS,
 *     so their behaviour and data flow stay intact.
 *
 * Nothing here touches the conversation, the composer or any dialog.
 */
window.__ModuleLoader__.load({
  id: 'dsh-codex-ui',
  factory: (require) => {
    var module = { exports: {} }
    var exports = module.exports
    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' })

    const React = require('react')
    const primitives = require('@deepseek-ai/dsh-client-ui-primitives')

    const {
      Tooltip,
      Menu,
      FishLogo,
      IconNewChatOutlineRegular,
      IconEllipsisOutlineRegular,
      IconSettingsOutlineRegular,
      IconClockOutlineRegular,
      IconQuestionOutlineRegular,
      IconChevronDownOutlineRegular,
    } = primitives

    /** Help lives on the published guide. */
    const HELP_URL = 'https://deepseek-harness.github.io/deepseek-harness/guide/quickstart'

    const BOARD_PANEL = 'codex-profile'
    const DASHBOARD_ROUTE = 'api/codex-ui.dashboard'

    const PLUGIN_ID = 'dsh-codex-ui'
    const LOCALE_NS = 'codex-ui'

    const h = React.createElement

    /* ────────────────────────────────────────────────────────────────
     * 1. Styles
     * ──────────────────────────────────────────────────────────────── */

    const CSS = String.raw`
/* ============================================================
 * dsh-codex-ui — Codex-style navigation shell
 * Owner: dsh-codex-ui. Removing the plugin removes every rule.
 *
 * Geometry model (measured from the reference UI):
 *
 *   window background  = the rail colour (the nav rail is not a surface
 *                        of its own; it sits on the window background)
 *   top band           = traffic lights / toolbar, cards start below it
 *   session list       = a rounded card on the window background
 *   main content       = a second rounded card, separated by a 2px gap
 *
 * Every selector keys off a data-cx-* anchor set by client.js; the only
 * app-class references are the *_key suffixes in the anchors.
 * ============================================================ */

:root {
  --cx-collapse-duration: 0.36s;
  /* geometry */
  --cx-rail-w: 56px;
  --cx-top-band: 48px;
  --cx-card-radius: 12px;
  --cx-card-gap: 2px;
  --cx-rail-slot: 40px;
  --cx-pill-radius: 12px;
  --cx-rail-gap: 8px;
  --cx-rail-top: 56px;
  --cx-rail-new: 104px;
  --cx-rail-bottom: 62px;

  /* Codex light surfaces */
  --cx-window-bg: #f1f1f1;
  --cx-list-bg: #fcfbfc;
  --cx-content-bg: #ffffff;
  --cx-pill-bg: #e7e7e7;
  --cx-row-selected: #ededed;
  --cx-hover: rgba(0, 0, 0, 0.05);
  --cx-hairline: rgba(0, 0, 0, 0.08);
  --cx-shadow-strong: rgba(0, 0, 0, 0.18);
  --cx-text: #1a1a1a;
  --cx-text-dim: #6b7280;
  --cx-surface: #ffffff;
  --cx-badge: #3383f3;
  --cx-panel-fill: #f2f3f5;
  --cx-segment-active: #ffffff;
  --cx-heat-0: rgba(0, 0, 0, 0.07);
  --cx-heat-1: #c6e0fb;
  --cx-heat-2: #8fbcf7;
  --cx-heat-3: #4e96ee;
  --cx-heat-4: #3383f3;
}
body[data-ds-dark-theme] {
  --cx-window-bg: #343434;
  --cx-list-bg: #232323;
  --cx-content-bg: #181818;
  --cx-pill-bg: #454545;
  --cx-row-selected: #2f2f2f;
  --cx-hover: rgba(255, 255, 255, 0.07);
  --cx-hairline: rgba(255, 255, 255, 0.10);
  --cx-shadow-strong: rgba(0, 0, 0, 0.55);
  --cx-text: #f9fafb;
  --cx-text-dim: #adb2b8;
  --cx-surface: #181818;
  --cx-badge: #3383f3;
  --cx-panel-fill: #262627;
  --cx-segment-active: #3a3a3c;
  --cx-heat-0: rgba(255, 255, 255, 0.08);
  --cx-heat-1: #123b63;
  --cx-heat-2: #1d5ea8;
  --cx-heat-3: #2c7fe0;
  --cx-heat-4: #58a6ff;
}

/* ── A. Frame: window background, rail gutter, top band ── */
/* The desktop window is created with vibrancy: "sidebar" (macOS) /
   backgroundMaterial: "acrylic" (Windows) and a fully transparent
   backgroundColor, so anything this frame paints opaquely destroys the
   frosted glass. Keep it transparent and let the native material show. */
[data-cx-frame] {
  box-sizing: border-box !important;
  padding: var(--cx-top-band) 0 0 var(--cx-rail-w) !important;
  background: transparent !important;
}
/* The sidebar drag handle runs the height of the columns, which now start
   below the top band. */
[data-cx-frame] > [data-side="sidebar"] {
  margin-left: calc(var(--cx-rail-w) - 4px);
  top: var(--cx-top-band);
}
/* Collapse is one horizontal slide. The shipped crossfade (content fading
   out, rail fading in) is what made the column flash, so it is switched
   off and the frame's own track transition carries the motion. */
/* The transition must exist BEFORE the track changes, otherwise the width
   snaps. Ship it always, and opt out only for the gestures that must be
   instant (handle drags, instant right-panel presentation). */
[data-cx-frame]:not([data-dragging]):not([data-rightbar-instant]) {
  transition: grid-template-columns var(--cx-collapse-duration) var(--ds-ease-in-out);
}
[data-cx-frame][data-dragging],
[data-cx-frame][data-rightbar-instant] {
  transition: none !important;
}
/* These two classes sit ON the shell element, so the descendant form of
   these selectors never matched and the shipped rail-in / fade animations
   kept running — that is what made the rail entry points blink. */
[data-cx-shell][class*="_fading"] > * {
  opacity: 1 !important;
  transition: none !important;
}
[data-cx-shell] [class*="_wide"] {
  animation: none !important;
}
[data-cx-shell][class*="_railIn"] [class*="_iconButton"],
[data-cx-shell][class*="_railIn"] [class*="_newSession"],
[data-cx-shell][class*="_railIn"] [class*="_panelList"],
[data-cx-shell][class*="_railIn"] [class*="_regionArea"],
[data-cx-shell][class*="_railIn"] [class*="_footArea"] {
  animation: none !important;
}
[data-cx-frame][data-animating] > [data-side="sidebar"] {
  transition: left var(--cx-collapse-duration) var(--ds-ease-in-out) !important;
}
/* ── B. The two cards ── */
/* The shipped sidebar column is 90% fill + 10% transparent, which is what
   lets the window's native vibrancy read through it. Reproduce that instead
   of painting an opaque card. */
[data-cx-col] {
  background: color-mix(
    in srgb,
    var(--dsw-specific-sidebar-fill, var(--cx-list-bg)) 90%,
    transparent
  ) !important;
  border-right: 0 !important;
  border-radius: var(--cx-card-radius) 0 0 0;
}
/* Sidebar and main are ONE surface: no gap and no rule between them, only
   a colour change. Each half rounds its own outer corner. */
[data-cx-frame] > div:nth-child(2) {
  background: var(--cx-content-bg) !important;
  border-left: 0 !important;
  border-radius: 0 var(--cx-card-radius) 0 0;
}
/* With the column collapsed the content card IS the left edge, so it takes
   the rounded corner the sidebar had. */
[data-cx-frame][data-sidebar-collapsed] > div:nth-child(2) {
  border-radius: var(--cx-card-radius) var(--cx-card-radius) 0 0;
}
[data-cx-frame] > div:nth-child(3) {
  background: var(--cx-content-bg) !important;
  border-radius: var(--cx-card-radius) var(--cx-card-radius) 0 0;
}

/* ── C. Sidebar header and new-chat row ── */
[data-cx-shell] {
  --dsh-sidebar-inline-padding: 8px;
  padding: 0 8px;
  font-size: 13px;
  background: transparent !important;
}
/* The product row moved into the window's top band, so both shell rows
   collapse and the list card starts straight at the new-chat row. */
[data-cx-shell] [class*="_topStrip"] {
  height: 0;
  margin: 0;
  padding: 0;
  overflow: visible;
}
[data-cx-shell] [class*="_logoRow"] {
  height: 40px;
  margin: 0 0 6px;
  padding: 0 0 0 4px;
  gap: 8px;
  overflow: visible;
}
/* Collapse toggle: fixed, so it stays clickable while the column is
   collapsed (a toggle inside a zero-width column could not be clicked
   again to reopen it). --cx-sidebar-w is published by client.js. */
/* One continuous formula for both states: the toggle tracks the column's
   right edge while it is wide, then parks at 44px once the column is gone.
   Discrete per-state values made it jump between 300 and 100. */
[data-cx-shell] [class*="_toggle"] {
  position: fixed;
  top: 10px;
  left: calc(var(--cx-rail-w) + max(var(--cx-sidebar-w, 280px) - 36px, 44px));
  transition: top var(--cx-collapse-duration) var(--ds-ease-in-out),
    width var(--cx-collapse-duration) var(--ds-ease-in-out),
    height var(--cx-collapse-duration) var(--ds-ease-in-out);
}
[data-cx-frame][data-sidebar-collapsed] [data-cx-shell] [class*="_toggle"] {
  top: 8px;
  width: 32px;
  height: 32px;
  z-index: 4;
}
/* The toggle keeps its own panel glyph; both shipped brand marks stay
   hidden because the shell renders the logo itself. */
[data-cx-frame][data-sidebar-collapsed] [data-cx-shell] [class*="_toggle"] [class*="_panelIcon"] {
  display: inline !important;
}

/* The window-chrome seat duplicates the rail's new-session button and the
   band's toggle; this shell owns both. */
[data-cx-frame] > [data-shell-leading] {
  display: none !important;
}
html[data-platform="darwin"] [data-cx-frame][data-sidebar-collapsed],
html[data-platform="darwin"][data-fullscreen] [data-cx-frame][data-sidebar-collapsed] {
  --dsh-frame-leading-clearance: 0px;
}
[data-cx-shell] [class*="_brand"] {
  overflow: visible;
}
[data-cx-shell] [class*="_brandIdentity"] {
  gap: 0;
  height: 20px;
}
[data-cx-shell] [class*="_brandName"] {
  height: 20px;
  gap: 6px;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0;
}
[data-cx-shell] [class*="_fallbackBrandName"] {
  font-size: 14px;
}
[data-cx-shell] [class*="_localBuildBrand"] {
  height: 20px;
  gap: 0;
}
[data-cx-shell] [class*="_localBuildTitle"] {
  font-size: 14px;
  font-weight: 600;
  line-height: 20px;
}
[data-cx-shell] [class*="_buildVersion"] {
  display: none;
}
/* The "v" affordance Codex puts after the product name. */
[data-cx-shell] [class*="_brandName"]::after {
  content: "";
  width: 6px;
  height: 6px;
  flex: none;
  margin: 0 0 3px 1px;
  border-right: 1.4px solid currentColor;
  border-bottom: 1.4px solid currentColor;
  border-radius: 1px;
  opacity: 0.5;
  transform: rotate(45deg);
}
/* New Session -> the Codex "new chat" row (full width, quiet, left aligned) */
[data-cx-shell] button[class*="_newSession"] {
  container-type: normal;
  height: 34px;
  margin: 0 0 12px;
  padding: 0 8px;
  gap: 8px;
  justify-content: flex-start;
  border: 0 !important;
  border-radius: var(--cx-pill-radius);
  background: transparent !important;
  font-size: 13px;
  font-weight: 400;
}
[data-cx-shell] button[class*="_newSession"]:hover {
  background: var(--cx-hover) !important;
}
[data-cx-shell] button[class*="_newSession"] [class*="_newSessionContent"] {
  justify-content: flex-start;
  width: 100%;
  gap: 8px;
}
[data-cx-shell] button[class*="_newSession"] [class*="_newSessionLabel"] {
  max-width: none;
  font-size: 13px;
}
[data-cx-shell] button[class*="_newSession"] [class*="_newSessionShortcut"] {
  font-size: 11px;
  color: var(--dsw-alias-label-tertiary);
}

/* ── D. Rail: shipped brand mark, panel icons and account entry ── */
/* Brand: the shell renders ONE logo element of its own, so it can slide
   between the two positions instead of being re-mounted by the column
   crossfade (that re-mount was the blink). The shipped marks keep their
   space but are invisible, which is what keeps the product name aligned. */
.cx-brandmark {
  position: fixed;
  left: calc(var(--cx-rail-w) + 12px);
  top: calc(var(--cx-top-band) + 8px);
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 4;
  color: var(--dsw-alias-label-primary);
  pointer-events: auto !important;
  transition: left var(--cx-collapse-duration) var(--ds-ease-in-out);
}
[data-cx-frame][data-sidebar-collapsed] .cx-brandmark {
  left: calc((var(--cx-rail-w) - 24px) / 2);
}
[data-cx-shell] [class*="_brandMark"] {
  visibility: hidden !important;
}
[data-cx-shell] [class*="_railMark"] {
  display: none !important;
}
/* Two rail slots sit between the brand mark and the panel icons. */
[data-cx-col] [data-cx-panellist] {
  position: fixed;
  left: 0;
  top: calc(var(--cx-rail-top) + 2 * (var(--cx-rail-slot) + var(--cx-rail-gap)));
  width: var(--cx-rail-w);
  margin: 0;
  padding: 0;
  gap: var(--cx-rail-gap);
  align-items: center;
  z-index: 1;
}
[data-cx-col] [data-cx-panellist] > button {
  position: relative;
  width: var(--cx-rail-slot);
  height: var(--cx-rail-slot);
  min-height: var(--cx-rail-slot);
  margin: 0;
  padding: 0;
  justify-content: center;
  border-radius: var(--cx-pill-radius);
  color: var(--dsw-alias-label-secondary);
}
[data-cx-col] [data-cx-panellist] > button:hover {
  background: var(--cx-hover);
}
[data-cx-col] [data-cx-panellist] > button[aria-current="page"] {
  background: var(--cx-pill-bg);
  color: var(--dsw-alias-label-primary);
}
/* The activity dot the reference puts on the live rail entry. */
[data-cx-col] [data-cx-panellist] > button[aria-current="page"]::after {
  content: "";
  position: absolute;
  top: 4px;
  right: 4px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--cx-badge);
}
[data-cx-col] [data-cx-panellist] > button [class*="_panelTitle"] {
  display: none;
}
[data-cx-col] [data-cx-foot] {
  position: fixed;
  left: 0;
  bottom: 10px;
  width: var(--cx-rail-w);
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
}
[data-cx-col] [data-cx-foot] [class*="_triggerRow"] {
  width: auto !important;
  margin: 0 !important;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}
[data-cx-col] [data-cx-foot] [class*="_trigger"]:not([class*="_triggerRow"]):not([class*="_triggerLabel"]) {
  width: var(--cx-rail-slot) !important;
  height: var(--cx-rail-slot) !important;
  padding: 0 !important;
  justify-content: center !important;
  gap: 0 !important;
  border-radius: 50% !important;
  background: transparent !important;
}
[data-cx-col] [data-cx-foot] [class*="_triggerLabel"] {
  display: none;
}
/* The account entry is avatar-only; the shipped menu renders avatar + name.
   Scoped with :not(.cx-acct-row): our own profile menu is mounted in this
   same container and its rows are buttons too, so an unscoped rule blanked
   every label after the icon (the popup showed icons with no text). */
[data-cx-col] [data-cx-foot] button:not(.cx-acct-row) > *:not(:first-child) {
  display: none !important;
}

/* Our own rail chrome and buttons */
.cx-rail-drag {
  position: fixed;
  left: 0;
  top: 0;
  width: var(--cx-rail-w);
  height: var(--cx-rail-top);
  z-index: 2;
  pointer-events: auto !important;
  -webkit-app-region: drag;
}
.cx-rail-fixed {
  position: fixed;
  left: 0;
  width: var(--cx-rail-w);
  height: var(--cx-rail-slot);
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: auto !important;
}
.cx-rail-new {
  top: var(--cx-rail-new);
}
.cx-rail-more {
  top: auto;
  bottom: var(--cx-rail-bottom);
}
.cx-rail-btn {
  box-sizing: border-box;
  width: var(--cx-rail-slot);
  height: var(--cx-rail-slot);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 0;
  border-radius: var(--cx-pill-radius);
  background: transparent;
  color: var(--dsw-alias-label-secondary);
  cursor: pointer;
  pointer-events: auto !important;
  transition: background-color 0.14s var(--ds-ease-in-out), color 0.14s var(--ds-ease-in-out);
}
.cx-rail-btn:hover {
  background: var(--cx-hover);
  color: var(--dsw-alias-label-primary);
}
.cx-rail-btn[data-active="true"] {
  background: var(--cx-pill-bg);
  color: var(--dsw-alias-label-primary);
}
.cx-rail-btn:focus-visible {
  outline: var(--dsw-focus-ring-width) solid var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary));
  outline-offset: -2px;
}

/* ── Conversation: the title row moves into the window top band ──
   The card then starts with the 对话 / 轨迹 pills. */
[data-cx-conv] [class*="_titleRow"] {
  position: fixed;
  top: 0;
  /* Follows the column edge, but never slides under the logo/toggle. */
  left: calc(var(--cx-rail-w) + max(var(--cx-sidebar-w, 280px), 84px));
  right: 0;
  height: var(--cx-top-band);
  min-height: 0;
  margin: 0;
  padding: 0 20px;
  z-index: 5;
  align-items: center;
  background: transparent;
}
/* The header controls came from different plugins, each with its own
   margin, so the row read as unevenly spaced and off-baseline. Normalise. */
[data-cx-conv] [class*="_titleCluster"] {
  align-items: center;
  gap: 14px;
}
[data-cx-conv] [class*="_headerActions"],
[data-cx-conv] [class*="_headerUtilities"] {
  align-items: center;
  gap: 10px;
  margin-left: 0;
}
[data-cx-conv] [class*="_headerCorner"] {
  margin-left: 14px;
  margin-right: 0;
}
[data-cx-conv] [class*="_titleRow"] button {
  align-items: center;
  line-height: 20px;
}
/* The 12px controls sit 3px above the 14px title's centre line (they come
   from different plugins and never shared a baseline). Nudge the three
   groups onto it. */
[data-cx-conv] [class*="_headerActions"],
[data-cx-conv] [class*="_headerUtilities"],
[data-cx-conv] [class*="_headerCorner"] {
  transform: translateY(3px);
}

[data-cx-conv] [class*="_header"] {
  min-height: 0;
  padding: 4px 28px 10px 20px;
  border-bottom: 0;
  grid-template-rows: 0 auto;
}
[data-cx-conv] [class*="_headerSessionless"] {
  padding-top: 8px;
}

/* ── Conversation view tabs: 对话 / 轨迹 as one rounded segmented control ── */
[data-cx-conv] [class*="_tabs"] {
  display: inline-flex;
  width: max-content;
  justify-self: start;
  gap: 2px;
  padding: 3px;
  border-radius: 999px;
  background: var(--cx-panel-fill);
  margin-top: 0;
}
[data-cx-conv] [class*="_tabs"] > button {
  position: relative;
  padding: 4px 14px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--dsw-alias-label-secondary);
  font-size: 13px;
  font-weight: 500;
  line-height: 18px;
  cursor: pointer;
  transition: background-color 0.14s var(--ds-ease-in-out), color 0.14s var(--ds-ease-in-out);
}
[data-cx-conv] [class*="_tabs"] > button:after {
  content: none !important;
}
[data-cx-conv] [class*="_tabs"] > button:hover {
  color: var(--dsw-alias-label-primary);
}
[data-cx-conv] [class*="_tabs"] > button[class*="_tabActive"] {
  background: var(--cx-segment-active);
  color: var(--dsw-alias-label-primary);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
}

/* ── Profile dashboard panel ── */
.cx-board {
  box-sizing: border-box;
  height: 100%;
  overflow-y: auto;
  padding: 28px 32px 56px;
  color: var(--dsw-alias-label-primary);
}
.cx-board-inner {
  max-width: 940px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.cx-board-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  flex-wrap: wrap;
}
.cx-board-ident {
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
  padding-top: 4px;
}
.cx-board-avatar {
  width: 56px;
  height: 56px;
  flex: none;
  border-radius: 50%;
  object-fit: cover;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--dsw-alias-bg-skeleton, rgba(0, 0, 0, 0.08));
  color: var(--dsw-alias-label-secondary);
  font-size: 20px;
  font-weight: 600;
  text-transform: uppercase;
}
.cx-board-names {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}
.cx-board-name {
  font-size: 18px;
  font-weight: 600;
  line-height: 26px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.cx-board-handle {
  font-size: 12px;
  line-height: 18px;
  color: var(--dsw-alias-label-tertiary);
}
/* Detail card, top-right of the header row. */
.cx-board-detail {
  display: grid;
  grid-template-columns: repeat(3, minmax(88px, 1fr));
  gap: 2px 4px;
  padding: 12px 10px;
  border-radius: var(--cx-card-radius);
  background: var(--cx-panel-fill);
}
.cx-board-stat {
  display: flex;
  flex-direction: column;
  gap: 1px;
  padding: 4px 10px;
  min-width: 0;
}
.cx-board-stat-value {
  font-size: 15px;
  font-weight: 600;
  line-height: 22px;
  white-space: nowrap;
}
.cx-board-stat-label {
  font-size: 11px;
  line-height: 16px;
  color: var(--dsw-alias-label-tertiary);
  white-space: nowrap;
}
.cx-board-card {
  padding: 18px 20px 16px;
  border-radius: var(--cx-card-radius);
  background: var(--cx-panel-fill);
}
.cx-board-section-title {
  font-size: 13px;
  font-weight: 600;
  line-height: 20px;
  margin-bottom: 14px;
}
.cx-board-cols {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 16px;
}
.cx-board-empty,
.cx-board-error {
  font-size: 13px;
  line-height: 20px;
  color: var(--dsw-alias-label-tertiary);
}
.cx-board-heat {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  padding-bottom: 4px;
}
.cx-heat-days {
  display: grid;
  grid-template-rows: repeat(7, 12px);
  gap: 3px;
  flex: none;
  font-size: 10px;
  line-height: 12px;
  color: var(--dsw-alias-label-tertiary);
}
.cx-heat-body {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.cx-heat-months {
  position: relative;
  height: 14px;
  font-size: 11px;
  color: var(--dsw-alias-label-tertiary);
}
.cx-heat-month {
  position: absolute;
  top: 0;
  white-space: nowrap;
}
.cx-heat-grid {
  display: grid;
  grid-auto-flow: column;
  grid-template-rows: repeat(7, 12px);
  gap: 3px;
  width: max-content;
}
.cx-heat-cell {
  width: 12px;
  height: 12px;
  border-radius: 3px;
  background: var(--cx-heat-0);
}
.cx-heat-cell[data-level="1"] { background: var(--cx-heat-1); }
.cx-heat-cell[data-level="2"] { background: var(--cx-heat-2); }
.cx-heat-cell[data-level="3"] { background: var(--cx-heat-3); }
.cx-heat-cell[data-level="4"] { background: var(--cx-heat-4); }
.cx-heat-legend {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 4px;
  margin-top: 12px;
  font-size: 11px;
  color: var(--dsw-alias-label-tertiary);
}
.cx-heat-legend .cx-heat-cell {
  display: inline-block;
}
/* Composition bars */
.cx-comp-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 5px 0;
  font-size: 12px;
  line-height: 18px;
}
.cx-comp-label {
  width: 84px;
  flex: none;
  color: var(--dsw-alias-label-secondary);
}
.cx-comp-bar {
  flex: 1;
  min-width: 0;
  height: 6px;
  border-radius: 3px;
  background: var(--cx-heat-0);
  overflow: hidden;
}
.cx-comp-bar span {
  display: block;
  height: 100%;
  border-radius: 3px;
  background: var(--cx-heat-3);
}
.cx-comp-value {
  width: 84px;
  flex: none;
  text-align: right;
  color: var(--dsw-alias-label-primary);
  font-variant-numeric: tabular-nums;
}
/* Recent sessions */
.cx-recent-row {
  display: flex;
  align-items: baseline;
  gap: 12px;
  padding: 6px 0;
  font-size: 12px;
  line-height: 18px;
}
.cx-recent-title {
  flex: 1;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--dsw-alias-label-secondary);
}
.cx-recent-meta {
  flex: none;
  color: var(--dsw-alias-label-tertiary);
  font-variant-numeric: tabular-nums;
}

/* Account entry: avatar only, opens Settings on click, no hover surface. */
.cx-acct-menu {
  position: fixed;
  left: calc(var(--cx-rail-w) + 8px);
  bottom: 10px;
  z-index: 40;
  width: 252px;
  padding: 6px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  border-radius: var(--cx-card-radius);
  background: var(--dsw-alias-bg-elevated, var(--cx-surface));
  box-shadow: 0 10px 32px var(--cx-shadow-strong), 0 0 0 1px var(--cx-hairline);
  color: var(--dsw-alias-label-primary, var(--cx-text));
  pointer-events: auto !important;
}
.cx-acct-head {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 8px 10px;
}
.cx-acct-head .cx-account-img {
  position: static !important;
  width: 32px !important;
  height: 32px !important;
}
.cx-acct-copy {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.cx-acct-name {
  font-size: 13px;
  font-weight: 600;
  line-height: 18px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.cx-acct-sub {
  font-size: 11px;
  line-height: 16px;
  color: var(--dsw-alias-label-tertiary, var(--cx-text-dim));
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.cx-acct-sep {
  height: 1px;
  margin: 4px 6px;
  background: var(--cx-hairline);
}
.cx-acct-row {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 8px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: inherit;
  font-size: 13px;
  line-height: 18px;
  text-align: left;
  cursor: pointer;
}
.cx-acct-row:hover {
  background: var(--cx-hover);
}
.cx-acct-row-label {
  flex: 1;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.cx-acct-row-value {
  color: var(--dsw-alias-label-tertiary, var(--cx-text-dim));
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
/* Injected below the shipped "more account info" link in Settings. */
.cx-usage-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
  padding: 0;
  border: 0;
  background: none;
  color: var(--dsw-alias-label-secondary, var(--cx-text-dim));
  font-size: 13px;
  line-height: 20px;
  cursor: pointer;
}
.cx-usage-link:hover {
  color: var(--dsw-alias-label-primary, var(--cx-text));
}

.cx-account-btn {
  box-sizing: border-box;
  width: 36px;
  height: 36px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  pointer-events: auto !important;
}
.cx-account-btn:hover .cx-account-img {
  box-shadow: 0 0 0 2px var(--cx-hover);
}
.cx-account-btn:focus-visible {
  outline: var(--dsw-focus-ring-width) solid var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary));
  outline-offset: 2px;
}
.cx-account-img {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  object-fit: cover;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--dsw-alias-bg-skeleton, rgba(0, 0, 0, 0.08));
  color: var(--dsw-alias-label-secondary);
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
}

/* ── E. Session list ── */
/* The workspace header's search / view / add controls live in the window
   top band, in the same row as the collapse toggle, so the logo has nothing
   to overlap. Left to right: [search] [view] [add] [toggle], with right
   edges at 232 / 264 / 296 / 328 (offsets below are from the viewport's
   right edge). */
[data-cx-region] [class*="_searchSlot"],
[data-cx-region] [class*="_headerActions"] {
  position: fixed;
  top: calc((var(--cx-top-band) - 28px) / 2);
  z-index: 4;
  opacity: 1;
  transition: opacity 0.18s var(--ds-ease-in-out);
}
/* Anchored to the LAST non-zero column width: the live width collapses to
   zero, which would drag these three off-screen while they faded out. */
[data-cx-region] [class*="_headerActions"] {
  right: calc(100vw - var(--cx-rail-w) - var(--cx-sidebar-last-w, 280px) + 40px);
}
[data-cx-region] [class*="_searchSlot"] {
  right: calc(100vw - var(--cx-rail-w) - var(--cx-sidebar-last-w, 280px) + 104px);
  width: 28px;
  max-width: none;
}
[data-cx-region] [class*="_searchSlot"][class*="_searchSlotExpanded"] {
  width: 168px;
}
[data-cx-frame][data-sidebar-collapsed] [data-cx-region] [class*="_searchSlot"],
[data-cx-frame][data-sidebar-collapsed] [data-cx-region] [class*="_headerActions"] {
  opacity: 0;
  pointer-events: none;
}

[data-cx-region] [class*="_sectionHeader"] {
  justify-content: flex-start;
  height: 26px;
  margin: 0 0 2px;
  padding-left: 8px;
  color: var(--dsw-alias-label-tertiary);
  font-size: 12px;
  font-weight: 500;
}
[data-cx-region] [class*="_sectionLabel"] {
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.02em;
}
[data-cx-region] [class*="_groupSection"] + [class*="_groupSection"] {
  margin-top: 10px;
}
[data-cx-region] [class*="_list"] {
  padding-bottom: 24px;
}
[data-cx-region] [class*="_fade"] {
  display: none !important;
}
[data-cx-region] [data-row-key^="workspace:"],
[data-cx-region] [data-row-key^="session:"] {
  height: 30px;
  border-radius: 8px;
  padding-inline-start: calc(6px + var(--dsh-workspace-indent, 0px));
  padding-inline-end: 6px;
}
/* Sessions nested under their project row, the way Codex indents them. */
[data-cx-region] [data-row-key^="workspace:"] ~ [data-row-key^="session:"] {
  padding-inline-start: calc(22px + var(--dsh-workspace-indent, 0px));
}
[data-cx-region] [data-row-key^="workspace:"]:hover,
[data-cx-region] [data-row-key^="session:"]:hover {
  background: var(--cx-hover);
}
[data-cx-region] [data-row-key^="session:"][aria-selected="true"],
[data-cx-region] [data-row-key^="workspace:"][aria-selected="true"] {
  background: var(--cx-row-selected);
}
[data-cx-region] [data-row-key^="workspace:"] [class*="_title"] {
  font-size: 13px;
  font-weight: 500;
  color: var(--dsw-alias-label-secondary);
}
[data-cx-region] [data-row-key^="session:"] [class*="_title"] {
  font-size: 13px;
}
[data-cx-region] [class*="_time"] {
  font-size: 11px;
}
[data-cx-region] [data-row-key^="overflow:"] {
  height: 26px;
  padding-left: calc(22px + var(--dsh-workspace-indent, 0px));
  font-size: 12px;
  color: var(--dsw-alias-label-tertiary);
}
[data-cx-region] [data-row-key="empty"] {
  margin-top: 56px;
  font-size: 12px;
}

@media (prefers-reduced-motion: reduce) {
  .cx-rail-btn {
    transition: none;
  }
}
`

    /* ────────────────────────────────────────────────────────────────
     * 2. Anchors
     * ──────────────────────────────────────────────────────────────── */

    /** Only the class-name suffix matters: the hash prefix changes per build. */
    const ANCHORS = [
      ['data-cx-panellist', 'nav'],
      ['data-cx-brandmark', '[class*="_brandMark"], [class*="_railMark"]'],
      ['data-cx-foot', '[class*="_settingsArea"]'],
      ['data-cx-region', '[class*="_regionArea"]'],
    ]

    function mark(element, attribute) {
      if (element == null) return
      if (!element.hasAttribute(attribute)) element.setAttribute(attribute, '')
    }

    /**
     * Tag the shipped elements the stylesheet depends on. Runs once at apply
     * time and again whenever React replaces one of them.
     *
     * The sidebar column wraps the shell in one render-boundary element, so
     * the shell (`_..._root`) is found inside it rather than assumed to be it.
     */
    /**
     * Publish the live sidebar track width. The collapse toggle is fixed, so
     * it cannot read the column edge from its own box; the frame carries the
     * width as --cx-sidebar-w instead.
     */
    function publishSidebarWidth(frame, column) {
      if (column == null) return
      const width = column.getBoundingClientRect().width
      frame.style.setProperty('--cx-sidebar-w', width + 'px')
      /* Kept so controls that are anchored to the column edge stay put while
         the column animates down to zero. */
      if (width > 1) frame.style.setProperty('--cx-sidebar-last-w', width + 'px')
    }

    /**
     * The shipped "more account info" link used to open the vendor's web page.
     * This shell redirects that click to the profile board, so the original
     * destination is kept reachable through a button appended below the link.
     * React re-renders the settings panel, so it is re-asserted from every
     * annotation pass rather than mounted once.
     */
    function ensureUsageLink(label) {
      const anchor = document.querySelector('[role="dialog"] a[class*="_accountInfo"]')
      if (anchor === null || anchor.parentElement === null) return
      if (anchor.parentElement.querySelector('[data-cx-usage-link]') !== null) return
      const href = anchor.getAttribute('href')
      if (href === null || href === '') return
      /* The shipped row is a flex row; the button belongs on its own line. */
      anchor.parentElement.style.flexWrap = 'wrap'
      const button = document.createElement('button')
      button.type = 'button'
      button.dataset.cxUsageLink = ''
      button.className = 'cx-usage-link'
      button.style.flexBasis = '100%'
      button.textContent = label
      button.addEventListener('click', (event) => {
        event.preventDefault()
        event.stopPropagation()
        openExternal(new URL(href, window.location.href).href)
      })
      anchor.insertAdjacentElement('afterend', button)
    }

    let localeRef = null

    function applyNavAnnotations() {
      const overlay = document.querySelector('[data-shell-overlay]')
      const frame = overlay == null ? null : overlay.parentElement
      if (frame == null) return
      mark(frame, 'data-cx-frame')
      const column = frame.firstElementChild
      mark(column, 'data-cx-col')
      publishSidebarWidth(frame, column)
      const boundary = column == null ? null : column.firstElementChild
      if (boundary == null) return
      const shell = boundary.matches('[class*="_root"]')
        ? boundary
        : boundary.querySelector('[class*="_root"]')
      mark(shell, 'data-cx-shell')
      for (const [attribute, selector] of ANCHORS) {
        mark(boundary.querySelector(selector), attribute)
      }
      /* The Conversation panel root, for the view-tab styling below. */
      const center = frame.children[1]
      if (center !== undefined) mark(center.querySelector('[class*="_root"]'), 'data-cx-conv')

      /* Settings -> Account: keep the original web destination reachable
         next to the link whose click we redirect. */
      ensureUsageLink(
        localeRef === null ? 'Open usage page' : localeRef.translate(LOCALE_NS, 'account.usagePage'),
      )
    }

    /* ────────────────────────────────────────────────────────────────
     * 3. Profile dashboard
     * ──────────────────────────────────────────────────────────────── */

    /** Compact magnitude: 90992784 -> "9099.3万". */
    function formatTokens(value) {
      if (value >= 100000000) return (value / 100000000).toFixed(2) + '\u4ebf'
      if (value >= 10000) return (value / 10000).toFixed(1) + '\u4e07'
      return String(value)
    }

    function formatDuration(ms) {
      if (ms <= 0) return '-'
      const minutes = Math.round(ms / 60000)
      if (minutes < 60) return minutes + ' \u5206\u949f'
      const hours = Math.floor(minutes / 60)
      const rest = minutes % 60
      return rest === 0 ? hours + ' \u5c0f\u65f6' : hours + ' \u5c0f\u65f6 ' + rest + ' \u5206'
    }

    /** Relative day label for the recent-session list. */
    function formatWhen(ms, t) {
      const days = Math.floor((Date.now() - ms) / 86400000)
      if (days <= 0) return t('board.today')
      if (days === 1) return t('board.yesterday')
      return days + t('board.daysAgo')
    }

    /** Quartile thresholds over the non-zero days, so one huge day cannot flatten the rest. */
    function heatLevels(cells) {
      const values = cells
        .map((cell) => cell.tokens)
        .filter((tokens) => tokens > 0)
        .sort((a, b) => a - b)
      if (values.length === 0) return []
      const at = (quantile) => values[Math.min(values.length - 1, Math.floor(values.length * quantile))]
      return [at(0.25), at(0.5), at(0.75), at(0.95)]
    }

    function levelFor(tokens, thresholds) {
      if (tokens <= 0) return 0
      let level = 1
      for (let i = 0; i < thresholds.length; i += 1) if (tokens > thresholds[i]) level = i + 2
      return Math.min(4, level)
    }

    const HEAT_STEP = 15
    const WEEKDAY_LABELS = ['\u4e00', '', '\u4e09', '', '\u4e94', '', '']

    function Heatmap({ cells, t }) {
      const thresholds = heatLevels(cells)
      const first = new Date(cells[0].date + 'T00:00:00')
      const lead = (first.getDay() + 6) % 7
      const padded = new Array(lead).fill(null).concat(cells)
      const weeks = Math.ceil(padded.length / 7)
      const months = []
      let last = null
      padded.forEach((cell, index) => {
        if (cell === null) return
        const month = cell.date.slice(0, 7)
        if (month === last) return
        last = month
        const column = Math.floor(index / 7)
        if (column >= weeks - 1) return
        months.push({ key: month, label: String(Number(cell.date.slice(5, 7))) + '\u6708', column })
      })
      const active = cells.filter((cell) => cell.tokens > 0).length
      return h('div', null, [
        h('div', { key: 'heat', className: 'cx-board-heat' }, [
          h(
            'div',
            { key: 'days', className: 'cx-heat-days' },
            WEEKDAY_LABELS.map((label, index) => h('span', { key: index }, label)),
          ),
          h('div', { key: 'body', className: 'cx-heat-body' }, [
            h(
              'div',
              { key: 'months', className: 'cx-heat-months', style: { width: weeks * HEAT_STEP + 'px' } },
              months.map((month) =>
                h('span', {
                  key: month.key,
                  className: 'cx-heat-month',
                  style: { left: month.column * HEAT_STEP + 'px' },
                }, month.label),
              ),
            ),
            h(
              'div',
              { key: 'grid', className: 'cx-heat-grid' },
              padded.map((cell, index) =>
                cell === null
                  ? h('span', { key: 'pad' + index, className: 'cx-heat-cell', style: { visibility: 'hidden' } })
                  : h('span', {
                      key: cell.date,
                      className: 'cx-heat-cell',
                      'data-level': String(levelFor(cell.tokens, thresholds)),
                      title: cell.date + '  ' + cell.tokens.toLocaleString(),
                    }),
              ),
            ),
          ]),
        ]),
        h('div', { key: 'legend', className: 'cx-heat-legend' }, [
          h('span', { key: 'stat' }, active + ' ' + t('board.activeDays')),
          h('span', { key: 'gap', style: { flex: '1' } }),
          h('span', { key: 'l' }, '\u5c11'),
          [1, 2, 3, 4].map((level) =>
            h('span', { key: 'lv' + level, className: 'cx-heat-cell', 'data-level': String(level) }),
          ),
          h('span', { key: 'r' }, '\u591a'),
        ]),
      ])
    }

    function StatCell({ value, label }) {
      return h('div', { className: 'cx-board-stat' }, [
        h('span', { key: 'v', className: 'cx-board-stat-value' }, value),
        h('span', { key: 'l', className: 'cx-board-stat-label' }, label),
      ])
    }

    const COMPOSITION_ROWS = [
      ['cacheReadTokens', 'board.cacheRead'],
      ['uncachedInputTokens', 'board.uncachedInput'],
      ['outputTokens', 'board.output'],
      ['cacheWriteTokens', 'board.cacheWrite'],
    ]

    function Composition({ composition, t }) {
      const total = COMPOSITION_ROWS.reduce((sum, [key]) => sum + composition[key], 0) || 1
      return h(
        'div',
        null,
        COMPOSITION_ROWS.map(([key, labelKey]) =>
          h('div', { key, className: 'cx-comp-row' }, [
            h('span', { key: 'l', className: 'cx-comp-label' }, t(labelKey)),
            h('span', { key: 'b', className: 'cx-comp-bar' },
              h('span', { style: { width: Math.max(2, (composition[key] / total) * 100) + '%' } })),
            h('span', { key: 'v', className: 'cx-comp-value' }, formatTokens(composition[key])),
          ]),
        ),
      )
    }

    function Recent({ recent, t }) {
      if (recent.length === 0) return h('div', { className: 'cx-board-empty' }, t('board.noData'))
      return h(
        'div',
        null,
        recent.map((row, index) =>
          h('div', { key: index, className: 'cx-recent-row' }, [
            h('span', { key: 't', className: 'cx-recent-title', title: row.title }, row.title || t('board.untitled')),
            h('span', { key: 'm', className: 'cx-recent-meta' }, formatTokens(row.tokens)),
            h('span', { key: 'w', className: 'cx-recent-meta' }, formatWhen(row.at, t)),
          ]),
        ),
      )
    }

    function DashboardPanel({ t }) {
      const account = useAccountIdentity()
      const [state, setState] = React.useState({ phase: 'loading' })
      React.useEffect(() => {
        let cancelled = false
        fetch(DASHBOARD_ROUTE, { method: 'GET' })
          .then((response) => (response.ok ? response.json() : Promise.reject(new Error('HTTP ' + response.status))))
          .then((data) => {
            if (!cancelled) setState({ phase: 'ready', data })
          })
          .catch((error) => {
            if (!cancelled) setState({ phase: 'error', error: String((error && error.message) || error) })
          })
        return () => {
          cancelled = true
        }
      }, [])

      const name = account === null || account.name === '' ? t('board.signedOut') : account.name
      const data = state.phase === 'ready' ? state.data : null
      const detail = [
        h(StatCell, { key: 'tok', value: data === null ? '-' : formatTokens(data.totals.tokens), label: t('board.tokens') }),
        h(StatCell, { key: 'peak', value: data === null ? '-' : formatTokens(data.totals.peakTokens), label: t('board.peak') }),
        h(StatCell, { key: 'task', value: data === null ? '-' : formatDuration(data.totals.longestTaskMs), label: t('board.longest') }),
        h(StatCell, { key: 'ls', value: data === null ? '-' : String(data.streak.longest), label: t('board.streakLongest') }),
        h(StatCell, { key: 'cs', value: data === null ? '-' : String(data.streak.current), label: t('board.streakCurrent') }),
        h(StatCell, { key: 'ses', value: data === null ? '-' : String(data.totals.sessions), label: t('board.sessions') }),
      ]
      return h('div', { className: 'cx-board' }, [
        h('div', { key: 'inner', className: 'cx-board-inner' }, [
          h('div', { key: 'head', className: 'cx-board-head' }, [
            h('div', { key: 'ident', className: 'cx-board-ident' }, [
              account !== null && account.avatarUrl !== null && account.avatarUrl !== ''
                ? h('img', { key: 'a', className: 'cx-board-avatar', src: account.avatarUrl, alt: '' })
                : h('span', { key: 'a', className: 'cx-board-avatar' }, name.slice(0, 1)),
              h('div', { key: 'n', className: 'cx-board-names' }, [
                h('span', { key: 'name', className: 'cx-board-name' }, name),
                h('span', { key: 'handle', className: 'cx-board-handle' }, t('board.subtitle')),
              ]),
            ]),
            h('div', { key: 'detail', className: 'cx-board-detail' }, detail),
          ]),
          state.phase === 'error'
            ? h('div', { key: 'err', className: 'cx-board-error' }, t('board.error') + ': ' + state.error)
            : null,
          h('div', { key: 'heatcard', className: 'cx-board-card' }, [
            h('div', { key: 'title', className: 'cx-board-section-title' }, t('board.activity')),
            data === null
              ? h('div', { key: 'empty', className: 'cx-board-empty' }, state.phase === 'loading' ? t('board.loading') : t('board.noData'))
              : h(Heatmap, { key: 'heat', cells: data.heatmap.cells, t }),
          ]),
          data === null
            ? null
            : h('div', { key: 'cols', className: 'cx-board-cols' }, [
                h('div', { key: 'comp', className: 'cx-board-card' }, [
                  h('div', { key: 'title', className: 'cx-board-section-title' }, t('board.composition')),
                  h(Composition, { key: 'body', composition: data.composition, t }),
                ]),
                h('div', { key: 'recent', className: 'cx-board-card' }, [
                  h('div', { key: 'title', className: 'cx-board-section-title' }, t('board.recent')),
                  h(Recent, { key: 'body', recent: data.recent, t }),
                ]),
              ]),
        ]),
      ])
    }

    /* ────────────────────────────────────────────────────────────────
     * 4. Rail
     * ──────────────────────────────────────────────────────────────── */

    /**
     * The account identity, filled from the account Remote. The shipped
     * account entry is shadowed by our launcher, so there is no longer an
     * avatar in the DOM to read; the Remote call carries the same profile.
     */
    const accountState = {
      value: null,
      listeners: new Set(),
      set(value) {
        accountState.value = value
        for (const listener of accountState.listeners) listener(value)
      },
      merge(patch) {
        accountState.set({ ...(accountState.value ?? { name: '', avatarUrl: null }), ...patch })
      },
      hasBalance() {
        const current = accountState.value
        return current !== null && current.balance !== undefined && current.balance !== null
      },
      subscribe(listener) {
        accountState.listeners.add(listener)
        return () => accountState.listeners.delete(listener)
      },
    }

    /* Theme preference, shared between apply() and the components. */
    let themePreference = 'system'
    const themeListeners = new Set()
    const themeState = {
      get: () => themePreference,
      subscribe(fn) {
        themeListeners.add(fn)
        return () => themeListeners.delete(fn)
      },
    }

    /* Set once in apply(), so components can reach the account Remote. */
    let accountRemote = null
    let accountMetadata = () => ({ version: '0.0.0', locale: 'zh', timezoneOffsetSeconds: 0 })

    /** The client version the account Remote expects, read from the build badge. */
    let cachedVersion = ''
    function clientVersion() {
      if (cachedVersion !== '') return cachedVersion
      const badge = document.querySelector('[data-cx-shell] [class*="_buildVersion"]')
      const text = badge === null ? '' : (badge.textContent || '').trim()
      const match = /^(\d+\.\d+\.\d+(?:-[a-z0-9.]+)?)/i.exec(text)
      cachedVersion = match === null ? '0.0.0' : match[1]
      return cachedVersion
    }

    function useAccountIdentity() {
      const [account, setAccount] = React.useState(accountState.value)
      React.useEffect(() => accountState.subscribe(setAccount), [])
      return account
    }

    function RailButton({ label, active, onClick, children }) {
      return h(
        Tooltip,
        { label, side: 'right', gap: 10, delayMs: 400 },
        h(
          'button',
          {
            type: 'button',
            className: 'cx-rail-btn',
            'aria-label': label,
            'data-active': active === true ? 'true' : undefined,
            onClick,
          },
          children,
        ),
      )
    }

    /**
     * Containment for the rail only: a crash here must not take the shell's
     * overlay layer down with it. The broken rail simply renders nothing and
     * the shipped navigation keeps working.
     */
    class Boundary extends React.Component {
      constructor(props) {
        super(props)
        this.state = { error: null }
      }
      static getDerivedStateFromError(error) {
        return { error }
      }
      componentDidCatch(error, info) {
        console.error('[dsh-codex-ui] rail render failed', error, info)
      }
      render() {
        if (this.state.error !== null) return null
        return this.props.children
      }
    }

    /** Whether the shell is currently painting its dark theme. */
    function isDarkTheme() {
      return document.body !== null && document.body.hasAttribute('data-ds-dark-theme')
    }

    /**
     * The profile menu's palette, applied as INLINE styles. The popup renders
     * in the frame-wide overlay, so it must not depend on our stylesheet
     * having been injected: these values are set on the elements themselves.
     */
    function menuPalette(dark) {
      const tone = dark
        ? { surface: '#26272b', text: '#f9fafb', dim: '#a9aeb6', line: 'rgba(255,255,255,0.12)', hover: 'rgba(255,255,255,0.08)' }
        : { surface: '#ffffff', text: '#111827', dim: '#6b7280', line: 'rgba(0,0,0,0.10)', hover: 'rgba(0,0,0,0.05)' }
      return {
        menu: {
          position: 'fixed',
          left: 'calc(var(--cx-rail-w, 56px) + 8px)',
          bottom: '10px',
          zIndex: 40,
          width: '252px',
          padding: '6px',
          display: 'flex',
          flexDirection: 'column',
          gap: '2px',
          borderRadius: '12px',
          background: tone.surface,
          color: tone.text,
          boxShadow: dark
            ? '0 10px 32px rgba(0,0,0,0.55), 0 0 0 1px ' + tone.line
            : '0 10px 32px rgba(0,0,0,0.18), 0 0 0 1px ' + tone.line,
          pointerEvents: 'auto',
        },
        head: { display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 8px 10px' },
        avatar: {
          position: 'static',
          width: '32px',
          height: '32px',
          minWidth: '32px',
          borderRadius: '50%',
          objectFit: 'cover',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: tone.hover,
          color: tone.text,
          fontSize: '13px',
          fontWeight: 600,
        },
        name: { fontSize: '13px', fontWeight: 600, lineHeight: '18px', color: tone.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
        sub: { fontSize: '11px', lineHeight: '16px', color: tone.dim, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
        sep: { height: '1px', margin: '4px 6px', background: tone.line, flex: 'none' },
        row: {
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          boxSizing: 'border-box',
          width: '100%',
          padding: '8px',
          border: 0,
          borderRadius: '8px',
          background: 'transparent',
          color: tone.text,
          fontSize: '13px',
          lineHeight: '18px',
          textAlign: 'left',
          cursor: 'pointer',
          font: 'inherit',
        },
        icon: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '16px', height: '16px', flex: 'none', color: tone.dim },
        subIcon: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '16px', height: '16px', flex: 'none', color: tone.dim, marginLeft: '16px' },
        subRow: {
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          boxSizing: 'border-box',
          width: '100%',
          padding: '7px 8px',
          border: 0,
          borderRadius: '8px',
          background: 'transparent',
          color: tone.dim,
          fontSize: '12px',
          lineHeight: '18px',
          textAlign: 'left',
          font: 'inherit',
        },
        subLabel: { flex: '1', minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: tone.dim },
        label: { flex: '1', minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: tone.text },
        value: { color: tone.dim, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' },
      }
    }

    /** Open an external link through the shell (Electron routes it to the browser). */
    function openExternal(url) {
      const link = document.createElement('a')
      link.href = url
      link.target = '_blank'
      link.rel = 'noopener noreferrer'
      document.body.appendChild(link)
      link.click()
      link.remove()
    }

    /** A wallet list -> "¥12.34 + $5.00", or null when there is nothing. */
    function formatWalletList(wallets) {
      const parts = (Array.isArray(wallets) ? wallets : [])
        .map((wallet) => {
          const amount = Number(wallet.balance)
          if (!Number.isFinite(amount)) return null
          return (wallet.currency === 'CNY' ? '\u00a5' : '$') + amount.toFixed(2)
        })
        .filter(Boolean)
      return parts.length === 0 ? null : parts.join(' + ')
    }

    /**
     * The balance breaks into two groups: the paid balance (`value`) and the
     * granted/bonus balance (`bonusWallets`).
     */
    function walletTotal(wallets) {
      return (Array.isArray(wallets) ? wallets : []).reduce((sum, wallet) => {
        const amount = Number(wallet.balance)
        return sum + (Number.isFinite(amount) ? amount : 0)
      }, 0)
    }

    function walletBreakdown(account) {
      if (account === null || account === undefined || account.balance === null || account.balance === undefined) {
        return { paid: null, bonus: null, paidTotal: 0, bonusTotal: 0, ready: false }
      }
      const paidWallets = account.balance.value
      const bonusWallets = account.balance.bonusWallets
      return {
        paid: formatWalletList(paidWallets),
        bonus: formatWalletList(bonusWallets),
        paidTotal: walletTotal(paidWallets),
        bonusTotal: walletTotal(bonusWallets),
        ready: true,
      }
    }

    /**
     * The account entry: avatar only, no hover surface. Clicking it opens the
     * profile menu; Settings, Help and sign-out all stay reachable from there.
     */
    function AccountLauncher(props) {
      try {
        return renderAccountLauncher(props)
      } catch (error) {
        /* Never let a menu failure remove the account entry itself. */
        if (typeof console !== 'undefined') console.error('[codex-ui] account launcher', error)
        return h(
          'button',
          {
            type: 'button',
            className: 'cx-account-btn',
            'aria-label': 'account',
            onClick: props.openSettings,
          },
          h('span', { className: 'cx-account-img cx-account-fallback' }, '\u2026'),
        )
      }
    }

    function renderAccountLauncher({ openSettings, t }) {
      const [account, setAccount] = React.useState(accountState.value)
      const [open, setOpen] = React.useState(false)
      const [balance, setBalance] = React.useState('loading')
      const [balanceOpen, setBalanceOpen] = React.useState(false)
      const [dark, setDark] = React.useState(isDarkTheme)
      React.useEffect(() => themeState.subscribe(() => setDark(isDarkTheme())), [])

      React.useEffect(() => accountState.subscribe(setAccount), [])

      /* Close on any click outside the menu, or on Escape. */
      React.useEffect(() => {
        if (!open) return undefined
        const onPointerDown = (event) => {
          const target = event.target
          if (target instanceof Element && target.closest('.cx-acct-menu, .cx-account-btn') !== null) return
          setOpen(false)
        }
        const onKeyDown = (event) => {
          if (event.key === 'Escape') setOpen(false)
        }
        document.addEventListener('pointerdown', onPointerDown, true)
        document.addEventListener('keydown', onKeyDown, true)
        return () => {
          document.removeEventListener('pointerdown', onPointerDown, true)
          document.removeEventListener('keydown', onKeyDown, true)
        }
      }, [open])

      const readBalance = () => {
        setBalance('loading')
        Promise.resolve()
          .then(() =>
            accountRemote.getBalance(accountMetadata()),
          )
          .then((result) => {
            if (result === null || result.ok !== true || result.value == null) {
              setBalance('unavailable')
              return
            }
            accountState.merge({ balance: result.value })
            setBalance('ready')
          })
          .catch(() => setBalance('unavailable'))
      }

      React.useEffect(() => {
        if (open && !accountState.hasBalance()) readBalance()
      }, [open])

      const initial = account === null || account.name === '' ? '' : account.name.slice(0, 1)
      const wallets = walletBreakdown(account)
      const palette = menuPalette(dark)
      const quota = (text) => (balance === 'loading' ? t('account.loading') : text === null ? t('account.quotaEmpty') : text)
      const rows = [
        {
          key: 'balance',
          icon: h(IconClockOutlineRegular, { size: 16 }),
          label: t('account.balance'),
          disclosure: true,
          onSelect: () => {
            setBalanceOpen((value) => !value)
            if (!accountState.hasBalance()) readBalance()
          },
        },
        ...(balanceOpen
          ? [
              {
                key: 'quota-paid',
                sub: true,
                label: t('account.quotaPaid'),
                value: quota(wallets.paid),
                onSelect: null,
              },
              ...(wallets.ready && wallets.bonusTotal <= 0
                ? []
                : [
                    {
                      key: 'quota-bonus',
                      sub: true,
                      label: t('account.quotaBonus'),
                      value: quota(wallets.bonus),
                      onSelect: null,
                    },
                  ]),
            ]
          : []),
        {
          key: 'settings',
          icon: h(IconSettingsOutlineRegular, { size: 16 }),
          label: t('account.settings'),
          value: '\u2318,',
          onSelect: () => {
            setOpen(false)
            openSettings()
          },
        },
        { key: 'sep', separator: true },
        {
          key: 'help',
          icon: h(IconQuestionOutlineRegular, { size: 16 }),
          label: t('account.help'),
          value: '\u2197',
          onSelect: () => {
            setOpen(false)
            openExternal(HELP_URL)
          },
        },
      ]

      return h(React.Fragment, null, [
        h(
          'button',
          {
            key: 'trigger',
            type: 'button',
            className: 'cx-account-btn',
            'aria-label': t('account.open'),
            'aria-haspopup': 'menu',
            'aria-expanded': open,
            onClick: () => setOpen((value) => !value),
          },
          account !== null && account.avatarUrl !== null && account.avatarUrl !== ''
            ? h('img', { className: 'cx-account-img', src: account.avatarUrl, alt: '' })
            : h('span', { className: 'cx-account-img cx-account-fallback' }, initial || '\u2026'),
        ),
        !open
          ? null
          : h('div', { key: 'menu', className: 'cx-acct-menu', role: 'menu', style: palette.menu }, [
              h('div', { key: 'head', className: 'cx-acct-head', style: palette.head }, [
                account !== null && account.avatarUrl !== null && account.avatarUrl !== ''
                  ? h('img', { key: 'a', className: 'cx-account-img', src: account.avatarUrl, alt: '', style: palette.avatar })
                  : h('span', { key: 'a', className: 'cx-account-img cx-account-fallback', style: palette.avatar }, initial || '\u2026'),
                h('div', { key: 'c', className: 'cx-acct-copy', style: { display: 'flex', flexDirection: 'column', minWidth: 0 } }, [
                  h(
                    'span',
                    { key: 'n', className: 'cx-acct-name', style: palette.name },
                    account === null || account.name === '' ? t('board.signedOut') : account.name,
                  ),
                  account !== null && account.contact !== undefined && account.contact !== ''
                    ? h('span', { key: 's', className: 'cx-acct-sub', style: palette.sub }, account.contact)
                    : null,
                ]),
              ]),
              h('div', { key: 'sep-top', className: 'cx-acct-sep', style: palette.sep }),
              ...rows.map((row) => {
                if (row.separator === true) {
                  return h('div', { key: row.key, className: 'cx-acct-sep', style: palette.sep })
                }
                const isSub = row.sub === true
                const children = [
                  h('span', { key: 'i', style: isSub ? palette.subIcon : palette.icon }, row.icon),
                  h('span', { key: 'l', className: 'cx-acct-row-label', style: isSub ? palette.subLabel : palette.label }, row.label),
                  row.value === undefined
                    ? null
                    : h('span', { key: 'v', className: 'cx-acct-row-value', style: palette.value }, row.value),
                  row.disclosure === true
                    ? h(
                        'span',
                        {
                          key: 'c',
                          style: {
                            ...palette.icon,
                            transition: 'transform 0.18s var(--ds-ease-in-out)',
                            transform: balanceOpen ? 'rotate(180deg)' : 'none',
                          },
                        },
                        h(IconChevronDownOutlineRegular, { size: 14 }),
                      )
                    : null,
                ]
                if (isSub) {
                  return h(
                    'div',
                    { key: row.key, className: 'cx-acct-row cx-acct-subrow', style: palette.subRow },
                    children,
                  )
                }
                return h(
                  'button',
                  {
                    key: row.key,
                    type: 'button',
                    role: 'menuitem',
                    className: 'cx-acct-row',
                    style: palette.row,
                    'aria-expanded': row.disclosure === true ? balanceOpen : undefined,
                    onClick: row.onSelect,
                  },
                  children,
                )
              }),
            ]),
      ])
    }

    function Rail({ layout, uiWorkspace, theme, themeState, usePanelInfo, t }) {
      const [preference, setPreference] = React.useState(themeState.get)
      const [menuOpen, setMenuOpen] = React.useState(false)
      const activePanel = usePanelInfo((info) => info.activePanelId)

      React.useEffect(() => themeState.subscribe(setPreference), [themeState])


      const items = [
        { id: 'conversation', label: t('menu.conversation') },
        { id: 'toggle-sidebar', label: t('menu.toggleSidebar') },
        { type: 'separator' },
        { type: 'label', text: t('menu.appearance') },
        { id: 'theme:system', label: t('menu.theme.system') },
        { id: 'theme:light', label: t('menu.theme.light') },
        { id: 'theme:dark', label: t('menu.theme.dark') },
      ]

      const onSelect = (id) => {
        setMenuOpen(false)
        if (id === 'conversation') layout.selectPanel(null)
        else if (id === 'toggle-sidebar') layout.toggleSidebar()
        else if (typeof id === 'string' && id.startsWith('theme:')) {
          theme.setTheme(id.slice('theme:'.length))
        }
      }

      return h(React.Fragment, null, [
        h('div', {
          key: 'drag',
          className: 'cx-rail-drag',
          'aria-hidden': true,
          'data-cx-rail-drag': '',
        }),
        h(
          'div',
          { key: 'brand', className: 'cx-brandmark', 'aria-hidden': true },
          h(FishLogo, { size: 24 }),
        ),
        h(
          'div',
          { key: 'new', className: 'cx-rail-fixed cx-rail-new' },
          h(
            RailButton,
            { label: t('action.newSession'), onClick: () => uiWorkspace.startSession() },
            h(IconNewChatOutlineRegular, { size: 18 }),
          ),
        ),
        h(
          'div',
          { key: 'more', className: 'cx-rail-fixed cx-rail-more' },
          h(Menu, {
            open: menuOpen,
            onClose: () => setMenuOpen(false),
            onSelect,
            items,
            portal: true,
            side: 'right',
            align: 'start',
            selection: 'check',
            selectedId: preference,
            anchor: h(
              'button',
              {
                type: 'button',
                className: 'cx-rail-btn',
                'aria-label': t('action.more'),
                'aria-haspopup': 'menu',
                'aria-expanded': menuOpen,
                onClick: () => setMenuOpen((open) => !open),
              },
              h(IconEllipsisOutlineRegular, { size: 18 }),
            ),
          }),
        ),
      ])
    }

    /* ────────────────────────────────────────────────────────────────
     * 4. Plugin body
     * ──────────────────────────────────────────────────────────────── */

    const inject = ['slots', 'layout', 'uiWorkspace', 'theme', 'locale', 'remote', 'remote.account']

    function apply(ctx) {
      const slots = ctx.get('slots')
      if (slots === undefined) return

      const layout = ctx.get('layout')
      const uiWorkspace = ctx.get('uiWorkspace')
      const theme = ctx.get('theme')
      const locale = ctx.get('locale')
      const remote = ctx.get('remote')
      accountRemote = remote.account
      localeRef = locale
      accountMetadata = () => ({
        version: clientVersion(),
        locale: locale.getSnapshot().active,
        timezoneOffsetSeconds: -new Date().getTimezoneOffset() * 60,
      })

      ctx.effect(
        () => {
          const el = document.createElement('style')
          el.setAttribute('data-plugin', PLUGIN_ID)
          el.setAttribute('data-plugin-css', PLUGIN_ID + '/codex-ui.css')
          el.textContent = CSS
          document.head.appendChild(el)
          return () => el.remove()
        },
        PLUGIN_ID + ': styles',
      )

      /*
       * Settings -> Account carries a "more account information" link that
       * opens the vendor's web page. This shell owns that destination: the
       * click closes Settings and opens the profile dashboard instead.
       */
      ctx.effect(
        () => {
          const onClickCapture = (event) => {
            const target = event.target
            if (!(target instanceof Element)) return
            const anchor = target.closest('a[class*="_accountInfo"]')
            if (anchor === null) return
            /* Our own "usage page" button sits next to the link. */
            if (target.closest('[data-cx-usage-link]') !== null) return
            event.preventDefault()
            event.stopPropagation()
            const dialog = document.querySelector('[role="dialog"]')
            const close = dialog === null ? null : dialog.querySelector('[class*="_close"]')
            if (close !== null) close.click()
            layout.selectPanel(BOARD_PANEL)
          }
          document.addEventListener('click', onClickCapture, true)
          return () => document.removeEventListener('click', onClickCapture, true)
        },
        PLUGIN_ID + ': account link redirect',
      )

      ctx.effect(
        () => {
          let frame = null
          let queued = false
          const run = () => {
            queued = false
            applyNavAnnotations()
          }
          const schedule = () => {
            if (queued) return
            queued = true
            frame = requestAnimationFrame(run)
          }
          const observer = new MutationObserver(schedule)
          observer.observe(document.body, { childList: true, subtree: true })
          const resize = new ResizeObserver(schedule)
          const watch = () => {
            const column = document.querySelector('[data-cx-col]')
            if (column !== null) resize.observe(column)
          }
          watch()
          const watchTimer = window.setInterval(watch, 2000)
          run()
          return () => {
            observer.disconnect()
            resize.disconnect()
            window.clearInterval(watchTimer)
            if (frame !== null) cancelAnimationFrame(frame)
          }
        },
        PLUGIN_ID + ': navigation annotations',
      )

      /*
       * Account profile for the avatar. The Remote validates a client
       * descriptor; the version comes from the shipped build badge, which is
       * rendered (hidden) inside the sidebar.
       */
      ctx.effect(() => {
        let cancelled = false
        const read = () => {
          Promise.resolve()
            .then(() =>
              remote.account.getProfile(accountMetadata()),
            )
            .then((result) => {
              if (cancelled) return
              if (result === null || result.ok !== true || result.value == null) return
              /* getProfile answers a `{ status, value }` snapshot; unwrap it. */
              const snapshot = result.value
              const profile = snapshot.value == null ? snapshot : snapshot.value
              if (profile == null) return
              accountState.merge({
                name: profile.name ?? profile.contact ?? '',
                contact: profile.contact ?? '',
                avatarUrl: profile.avatarUrl ?? null,
              })
            })
            .catch(() => void 0)
        }
        read()
        return () => {
          cancelled = true
        }
      }, PLUGIN_ID + ': account profile')

      ctx.effect(
        () =>
          locale.register(LOCALE_NS, {
            zh: {
              'action.newSession': '新建会话',
              'action.board': '个人看板',
              'board.subtitle': '使用概览',
              'board.tokens': '累计 Token 数',
              'board.peak': 'Token 使用峰值',
              'board.longest': '最长任务用时',
              'board.streakLongest': '最长连续天数',
              'board.streakCurrent': '当前连续天数',
              'board.sessions': '会话数',
              'board.activity': 'Token 活动',
              'board.loading': '正在读取…',
              'board.activeDays': '天有记录',
              'board.composition': 'Token 构成',
              'board.cacheRead': '缓存命中',
              'board.uncachedInput': '未缓存输入',
              'board.output': '输出',
              'board.cacheWrite': '缓存写入',
              'board.recent': '最近会话',
              'board.noData': '暂无数据',
              'board.untitled': '未命名',
              'board.today': '今天',
              'board.yesterday': '昨天',
              'board.daysAgo': ' 天前',
              'account.open': '账户',
              'account.balance': '剩余用量',
              'account.quotaPaid': '剩余额度',
              'account.quotaBonus': '赠送额度',
              'account.quotaEmpty': '\u2014',
              'account.loading': '读取中…',
              'account.balanceUnknown': '查看',
              'account.settings': '设置',
              'account.help': '帮助',
              'account.usagePage': '打开用量网页',
              'board.error': '看板数据读取失败',
              'board.signedOut': '未登录',
              'action.more': '更多',
              'menu.conversation': '回到会话',
              'menu.toggleSidebar': '折叠 / 展开侧边栏',
              'menu.appearance': '外观',
              'menu.theme.system': '跟随系统',
              'menu.theme.light': '浅色',
              'menu.theme.dark': '深色',
            },
            en: {
              'action.newSession': 'New session',
              'action.board': 'Profile dashboard',
              'board.subtitle': 'Usage overview',
              'board.tokens': 'Total tokens',
              'board.peak': 'Peak tokens',
              'board.longest': 'Longest task',
              'board.streakLongest': 'Longest streak',
              'board.streakCurrent': 'Current streak',
              'board.sessions': 'Sessions',
              'board.activity': 'Token activity',
              'board.loading': 'Loading…',
              'board.activeDays': ' active days',
              'board.composition': 'Token composition',
              'board.cacheRead': 'Cache read',
              'board.uncachedInput': 'Uncached input',
              'board.output': 'Output',
              'board.cacheWrite': 'Cache write',
              'board.recent': 'Recent sessions',
              'board.noData': 'No data yet',
              'board.untitled': 'Untitled',
              'board.today': 'today',
              'board.yesterday': 'yesterday',
              'board.daysAgo': 'd ago',
              'account.open': 'Account',
              'account.balance': 'Usage remaining',
              'account.quotaPaid': 'Paid balance',
              'account.quotaBonus': 'Bonus balance',
              'account.quotaEmpty': '\u2014',
              'account.loading': 'Loading\u2026',
              'account.balanceUnknown': 'View',
              'account.settings': 'Settings',
              'account.help': 'Help',
              'account.usagePage': 'Open usage page',
              'board.error': 'Could not read dashboard data',
              'board.signedOut': 'Signed out',
              'action.more': 'More',
              'menu.conversation': 'Go to conversation',
              'menu.toggleSidebar': 'Collapse / expand sidebar',
              'menu.appearance': 'Appearance',
              'menu.theme.system': 'System',
              'menu.theme.light': 'Light',
              'menu.theme.dark': 'Dark',
            },
          }),
        PLUGIN_ID + ': dictionaries',
      )

      /*
       * Theme preference is subscribed here, in the plugin's own active
       * context: `ctx.on` registers through ctx.effect and therefore refuses
       * to run from a later React effect ("cannot create effect on inactive
       * context"). The rail reads the shared state through `themeState`.
       */
      themePreference = theme.getTheme().preference
      ctx.effect(() => {
        ctx.on('theme/change', (snapshot) => {
          themePreference =
            snapshot !== null && snapshot !== undefined && typeof snapshot.preference === 'string'
              ? snapshot.preference
              : theme.getTheme().preference
          for (const fn of themeListeners) fn(themePreference)
        })
      }, PLUGIN_ID + ': theme subscription')

      slots.inject('settings.launcher', () =>
        slots.register(
          { name: 'settings.launcher', priority: -1, locale: LOCALE_NS },
          (props) => h(Boundary, null, h(AccountLauncher, props)),
        ),
      )

      slots.inject('main', () =>
        slots.register({ name: 'main', key: BOARD_PANEL, locale: LOCALE_NS }, (props) =>
          h(Boundary, null, h(DashboardPanel, props)),
        ),
      )

      slots.inject('shell.overlay', () =>
        slots.register(
          { name: 'shell.overlay', id: 'codex-rail', order: -500, locale: LOCALE_NS },
          (props) =>
            h(
              Boundary,
              null,
              h(Rail, { ...props, layout, uiWorkspace, theme, themeState }),
            ),
        ),
      )
    }

    exports.inject = inject
    exports.apply = apply
    return module.exports
  },
})
