/**
 * Browser-side API client for the /api/dsh-mcp-manager route family — plain
 * same-origin fetch, the only data access path the panel components use.
 */

import { MCP_API, type McpStatus } from '../protocol.ts'

/** Error carrying the route's JSON error message. */
export class McpApiError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'McpApiError'
  }
}

/** Parse a JSON response or throw an McpApiError. */
async function readJson<T>(response: Response): Promise<T> {
  let body: unknown
  try {
    body = await response.json()
  } catch {
    throw new McpApiError(`HTTP ${response.status}: invalid JSON response`)
  }
  if (!response.ok) {
    const message = typeof body === 'object' && body !== null && typeof (body as { error?: unknown }).error === 'string'
      ? (body as { error: string }).error
      : `HTTP ${response.status}`
    throw new McpApiError(message)
  }
  return body as T
}

/** The browser half's only data entry point. */
export class McpApi {
  /** Fetch the full panel status (live servers + config files + sample). */
  async status(): Promise<McpStatus> {
    const response = await fetch(MCP_API.status)
    return await readJson<McpStatus>(response)
  }

  /** Write the sample config to `$DSH_HOME/mcp.example.yml`. */
  async writeExample(): Promise<{ ok: boolean; path: string; error?: string }> {
    const response = await fetch(MCP_API.example, { method: 'POST' })
    return await readJson<{ ok: boolean; path: string; error?: string }>(response)
  }
}
