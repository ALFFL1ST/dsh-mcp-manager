/**
 * Wire contract between the host half (routes) and the browser half (client
 * api). Pure types only — imported by both halves, bundled into each, no
 * runtime identity to share.
 */

/** Route family served by the host half (loopback-only). */
export const MCP_API = {
  /** GET — the full panel status payload. */
  status: '/api/dsh-mcp-manager/status',
  /** POST — write the sample mcp-client config to `$DSH_HOME/mcp.example.yml`. */
  example: '/api/dsh-mcp-manager/example',
} as const

/** One live MCP server, derived from the registered `mcp__<server>__<tool>` tools. */
export interface McpServerRuntime {
  /** The server namespace (the mcp-client row's `serverName`). */
  serverName: string
  /** Number of tools currently registered for this server. */
  toolCount: number
  /** Up to a handful of tool names for display. */
  tools: string[]
}

/** One mcp-client row parsed out of a cordis file (plain line scan). */
export interface McpConfigRow {
  /** The row's `id`, when the scan found one. */
  id: string
  /** `config.serverName`, when found. */
  serverName: string
  /** `config.transport` — `stdio` or `streamable-http`. */
  transport: string
  /** `config.command` (stdio servers). */
  command: string
  /** `config.url` (streamable-http servers). */
  url: string
  /** Whether the row carries `disabled: true`. */
  disabled: boolean
}

/** One scanned configuration file. */
export interface McpConfigFile {
  /** Absolute path on the host machine. */
  path: string
  /** Short human label for the file's role. */
  label: string
  /** Whether the file exists and was read. */
  exists: boolean
  /** Read failure message; absent when the file was read or simply missing. */
  error?: string
  /** mcp-client rows found in the file (empty for none). */
  rows: McpConfigRow[]
}

/** The complete `/status` payload. */
export interface McpStatus {
  /** Live MCP servers (registered mcp__ tools), grouped by serverName. */
  runtime: McpServerRuntime[]
  /** Every deployment cordis file scanned, with its mcp-client rows. */
  files: McpConfigFile[]
  /** Ready-to-use sample config, written by the example route. */
  sample: string
}
