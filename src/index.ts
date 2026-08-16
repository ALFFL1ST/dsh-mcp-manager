/**
 * dsh-mcp-manager — host half.
 *
 * Serves the /api/dsh-mcp-manager route family (loopback-only):
 * - GET  /status   live MCP servers (from the registered mcp__* tools) plus
 *                  every deployment cordis file scanned for mcp-client rows,
 *                  plus the ready-to-use sample config;
 * - POST /example  writes the sample config to `$DSH_HOME/mcp.example.yml`.
 *
 * The browser half (./client) renders the composer-dock button and the
 * settings section. Everything rides official NPM SDK packages — no dsh
 * source changes.
 */

import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-host-webserver'
import type {} from '@deepseek-ai/dsh-tools'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { writeFileSync } from 'node:fs'
import { MCP_API, type McpStatus } from './protocol.ts'
import { SAMPLE_YAML, candidateFiles, exampleFilePath, readConfigFile, scanRows } from './scan.ts'

/** Stable cordis plugin name. */
export const name = 'mcp-manager'

/** Services required before the routes can mount. */
export const inject = ['webServer', 'tools']

/** Tool-name prefix every mcp-client server publishes under. */
const MCP_TOOL_PREFIX = 'mcp__'

/** How many tool names each runtime entry keeps for display. */
const MAX_TOOLS_SHOWN = 8

/**
 * Group the registered mcp__* tools by their server namespace. The mcp-client
 * rows land in the profile composition, so their tools register globally and
 * the global `schemas()` view sees them.
 * @param ctx - the host plugin context carrying the tools registry.
 */
function runtimeServers(ctx: Context): McpStatus['runtime'] {
  const schemas = ctx.tools.schemas()
  const byServer = new Map<string, McpStatus['runtime'][number]>()
  for (const schema of schemas) {
    const toolName = schema.name
    if (typeof toolName !== 'string' || !toolName.startsWith(MCP_TOOL_PREFIX)) continue
    const rest = toolName.slice(MCP_TOOL_PREFIX.length)
    const separator = rest.indexOf('__')
    const serverName = separator > 0 ? rest.slice(0, separator) : rest
    let entry = byServer.get(serverName)
    if (entry === undefined) {
      entry = { serverName, toolCount: 0, tools: [] }
      byServer.set(serverName, entry)
    }
    entry.toolCount += 1
    if (entry.tools.length < MAX_TOOLS_SHOWN) entry.tools.push(toolName)
  }
  return [...byServer.values()]
}

/** Assemble the full status payload (fresh reads on every request). */
function statusPayload(ctx: Context): McpStatus {
  const files = candidateFiles().map(({ path, label }) => {
    const text = readConfigFile(path)
    const entry: McpStatus['files'][number] = {
      path,
      label,
      exists: text !== undefined,
      rows: text !== undefined ? scanRows(text) : [],
    }
    return entry
  })
  return { runtime: runtimeServers(ctx), files, sample: SAMPLE_YAML }
}

/**
 * Loopback literal check plus browser same-origin markers. The routes expose
 * deployment file paths, so LAN-exposed dsh web deployments must not serve
 * them to remote clients.
 */
function isLoopbackRequest(request: IncomingMessage): boolean {
  const address = request.socket.remoteAddress
  if (address !== '127.0.0.1' && address !== '::1' && address !== '::ffff:127.0.0.1') return false
  const host = request.headers.host
  if (typeof host !== 'string') return false
  let hostUrl: URL
  try {
    hostUrl = new URL(`http://${host}`)
  } catch {
    return false
  }
  if (hostUrl.hostname !== '127.0.0.1' && hostUrl.hostname !== 'localhost' && hostUrl.hostname !== '[::1]') return false
  if (request.headers['sec-fetch-site'] === 'cross-site') return false
  const origin = request.headers.origin
  if (origin === undefined) return true
  try {
    return new URL(origin).host === hostUrl.host
  } catch {
    return false
  }
}

/** One JSON response. */
function writeJson(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body)
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'referrer-policy': 'no-referrer' })
  res.end(payload)
}

/**
 * Mount the MCP manager routes.
 * @param ctx - host plugin context carrying webServer/tools.
 */
export function apply(ctx: Context): void {
  const statusDispose = ctx.webServer.register({
    kind: 'exact',
    path: MCP_API.status,
    handler: (req, res) => {
      if (!isLoopbackRequest(req)) {
        writeJson(res, 403, { error: 'forbidden: loopback-only' })
        return
      }
      if (req.method !== 'GET') {
        writeJson(res, 405, { error: `method not allowed: ${req.method ?? ''}` })
        return
      }
      writeJson(res, 200, statusPayload(ctx))
    },
  })

  const exampleDispose = ctx.webServer.register({
    kind: 'exact',
    path: MCP_API.example,
    handler: (req, res) => {
      if (!isLoopbackRequest(req)) {
        writeJson(res, 403, { error: 'forbidden: loopback-only' })
        return
      }
      if (req.method !== 'POST') {
        writeJson(res, 405, { error: `method not allowed: ${req.method ?? ''}` })
        return
      }
      const path = exampleFilePath()
      try {
        writeFileSync(path, SAMPLE_YAML, 'utf8')
        writeJson(res, 200, { ok: true, path })
      } catch (error) {
        writeJson(res, 500, { ok: false, path, error: error instanceof Error ? error.message : String(error) })
      }
    },
  })

  ctx.effect(() => () => {
    statusDispose()
    exampleDispose()
  }, 'mcp-manager: routes')
}
