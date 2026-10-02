'use strict'

/**
 * dsh-codex-ui — host half.
 *
 * Two jobs:
 *
 *  1. Keep the plugin's loader row observable: activation writes a small
 *     marker file so a headless check can confirm the row loaded without
 *     looking at the screen (see docs/VERIFY.md).
 *  2. Serve the profile dashboard's data. The Web client cannot read the
 *     session projection cache, so this half aggregates it and exposes one
 *     JSON endpoint on the Connection fetch bridge — the same channel
 *     `@deepseek-ai/dsh-session-log-export` uses for its download route.
 *
 * Everything else (rail, frame layout, styles) lives in lib/client.js.
 */

const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')

const MARKER = path.join(os.tmpdir(), 'dsh-codex-ui-host-applied.json')
const DASHBOARD_PATH = '/api/codex-ui.dashboard'
/** Days of history the heatmap returns, aligned so the client can lay out weeks. */
const HEATMAP_DAYS = 371

/** `~/.dsh` unless the launcher points somewhere else. */
function homeDirectory() {
  const configured = process.env.DSH_HOME
  return configured !== undefined && configured !== '' ? configured : path.join(os.homedir(), '.dsh')
}

function sessionsDirectory() {
  return path.join(homeDirectory(), 'storages', 'session_projcache', 'sessions')
}

function number(value) {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

/**
 * One cached session projection, reduced to what the dashboard shows.
 * The cache is the only place this machine keeps per-session token totals;
 * each file is small, so a full read stays cheap.
 */
function readSessions() {
  let names
  try {
    names = fs.readdirSync(sessionsDirectory())
  } catch {
    return []
  }
  const sessions = []
  for (const name of names) {
    if (!name.endsWith('.json')) continue
    let parsed
    try {
      parsed = JSON.parse(fs.readFileSync(path.join(sessionsDirectory(), name), 'utf8'))
    } catch {
      continue
    }
    const record = parsed === null || typeof parsed !== 'object' ? null : parsed.record
    if (record === null || typeof record !== 'object') continue
    const rows = record.rows ?? {}
    const totals = rows.tokenUsage?.val?.totals ?? {}
    const stats = rows.sessionStats?.val ?? {}
    const createdAt = number(record.identity?.createdAt)
    const lastPromptAt = number(rows.sessionListMetadata?.val?.lastPromptAt)
    const at = lastPromptAt > 0 ? lastPromptAt : createdAt
    if (at <= 0) continue
    const cacheRead = number(totals.cacheReadTokens)
    const uncached = number(totals.uncachedInputTokens)
    const cacheWrite = number(totals.cacheWriteTokens)
    const output = number(totals.outputTokens)
    sessions.push({
      id: name.slice(0, -'.json'.length),
      at,
      createdAt,
      tokens: cacheRead + uncached + cacheWrite + output,
      cacheReadTokens: cacheRead,
      cacheWriteTokens: cacheWrite,
      inputTokens: cacheRead + uncached + cacheWrite,
      outputTokens: output,
      turns: number(stats.turns),
      steps: number(stats.steps),
      durationMs: number(stats.llmMs) + number(stats.toolMs),
      title: typeof rows.title?.val === 'string' ? rows.title.val : '',
    })
  }
  return sessions
}

function dayKey(ms) {
  const date = new Date(ms)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

function startOfDay(ms) {
  const date = new Date(ms)
  date.setHours(0, 0, 0, 0)
  return date.getTime()
}

/**
 * Longest and current run of consecutive active days.
 * @param days - ascending `YYYY-MM-DD` keys of days with usage.
 * @returns `{ longest, current }` in days.
 */
function streaks(days) {
  if (days.length === 0) return { longest: 0, current: 0 }
  const DAY = 86400000
  let longest = 1
  let run = 1
  for (let i = 1; i < days.length; i += 1) {
    const previous = new Date(`${days[i - 1]}T00:00:00`).getTime()
    const current = new Date(`${days[i]}T00:00:00`).getTime()
    run = current - previous === DAY ? run + 1 : 1
    if (run > longest) longest = run
  }
  const today = startOfDay(Date.now())
  const last = new Date(`${days[days.length - 1]}T00:00:00`).getTime()
  const gap = Math.round((today - last) / DAY)
  if (gap > 1) return { longest, current: 0 }
  let current = 1
  for (let i = days.length - 1; i > 0; i -= 1) {
    const previous = new Date(`${days[i - 1]}T00:00:00`).getTime()
    const at = new Date(`${days[i]}T00:00:00`).getTime()
    if (at - previous !== DAY) break
    current += 1
  }
  return { longest, current }
}

/**
 * Aggregate the cached projections into the dashboard payload.
 *
 * Roughness is deliberate: one session's tokens are attributed to the day of
 * its last prompt, because the cache stores session totals, not a per-turn
 * timeline. A session spanning midnight therefore lands on one day.
 */
function buildDashboard() {
  const sessions = readSessions()
    .filter((session) => session.turns > 0 || session.tokens > 0)
    .sort((a, b) => b.at - a.at)
  const perDay = new Map()
  let totalTokens = 0
  let peakTokens = 0
  let longestTaskMs = 0
  let totalTurns = 0
  let totalSteps = 0
  let cacheReadTokens = 0
  let uncachedInputTokens = 0
  let cacheWriteTokens = 0
  let outputTokens = 0
  for (const session of sessions) {
    totalTokens += session.tokens
    totalTurns += session.turns
    totalSteps += session.steps
    if (session.tokens > peakTokens) peakTokens = session.tokens
    if (session.durationMs > longestTaskMs) longestTaskMs = session.durationMs
    cacheReadTokens += session.cacheReadTokens
    cacheWriteTokens += session.cacheWriteTokens
    uncachedInputTokens += session.inputTokens - session.cacheReadTokens - session.cacheWriteTokens
    outputTokens += session.outputTokens
    const key = dayKey(session.at)
    perDay.set(key, (perDay.get(key) ?? 0) + session.tokens)
  }
  const activeDays = [...perDay.keys()].sort()
  const today = startOfDay(Date.now())
  const start = today - (HEATMAP_DAYS - 1) * 86400000
  const cells = []
  for (let at = start; at <= today; at += 86400000) {
    const key = dayKey(at)
    cells.push({ date: key, tokens: perDay.get(key) ?? 0 })
  }
  return {
    generatedAt: Date.now(),
    totals: {
      sessions: sessions.length,
      tokens: totalTokens,
      peakTokens,
      longestTaskMs,
      activeDays: activeDays.length,
      turns: totalTurns,
      steps: totalSteps,
    },
    streak: streaks(activeDays),
    composition: { cacheReadTokens, uncachedInputTokens, cacheWriteTokens, outputTokens },
    recent: sessions.slice(0, 8).map((session) => ({
      title: session.title.slice(0, 60),
      tokens: session.tokens,
      at: session.at,
      turns: session.turns,
    })),
    heatmap: { days: HEATMAP_DAYS, cells },
  }
}

function jsonResponse(value) {
  return new Response(JSON.stringify(value), {
    status: 200,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  })
}

const inject = ['connection']

function apply(ctx) {
  try {
    fs.writeFileSync(
      MARKER,
      JSON.stringify({ appliedAt: new Date().toISOString(), pid: process.pid }, null, 2),
    )
  } catch {
    // The marker is diagnostics only; never fail the plugin because of it.
  }

  const connection = Reflect.get(ctx, 'connection')
  const diagnostics = {
    hasConnection: connection !== undefined && connection !== null,
    hasFetch: connection?.fetch !== undefined,
    hasRegister: connection?.fetch?.register !== undefined,
    registered: false,
    error: null,
  }
  try {
    if (connection?.fetch?.register !== undefined) {
      connection.fetch.register({
        path: DASHBOARD_PATH,
        methods: ['GET'],
        requestBody: 'buffered',
        fetch: async () => jsonResponse(buildDashboard()),
      })
      diagnostics.registered = true
    }
  } catch (error) {
    diagnostics.error = String((error && error.message) || error)
  }
  try {
    fs.writeFileSync(MARKER, JSON.stringify({ appliedAt: new Date().toISOString(), pid: process.pid, diagnostics }, null, 2))
  } catch {
    // diagnostics only
  }
}

module.exports = { name: 'dsh-codex-ui', inject, apply, buildDashboard, DASHBOARD_PATH }
