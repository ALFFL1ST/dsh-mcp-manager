/**
 * Deployment config discovery and naive mcp-client row scanning.
 *
 * The dsh-native way to enable an MCP server is one
 * `@deepseek-ai/dsh-mcp-client` plugin row per server in a cordis file.
 * This module finds the deployment's cordis files (no YAML parser — the
 * rows are extracted with a bounded line scan, good enough for display)
 * and owns the sample config text.
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import type { McpConfigRow } from './protocol.ts'

/** The deployment config home (`$DSH_HOME`, defaulting to `~/.dsh`). */
export function configHome(): string {
  const env = process.env.DSH_HOME?.trim()
  if (env !== undefined && env !== '') return env
  return join(homedir(), '.dsh')
}

/** The path the example route writes the sample config to. */
export function exampleFilePath(): string {
  return join(configHome(), 'mcp.example.yml')
}

/** One config-file candidate with its display label. */
export interface ConfigCandidate {
  path: string
  label: string
}

/**
 * The deployment cordis files to scan: the home patch layer plus every
 * profile's `cordis.yml` / `cordis.patch.yml`. Missing directories are fine
 * (the payload marks each file's own `exists` state).
 */
export function candidateFiles(): ConfigCandidate[] {
  const home = configHome()
  const candidates: ConfigCandidate[] = [
    { path: join(home, 'cordis.patch.yml'), label: '部署补丁层' },
  ]
  const profiles = join(home, 'profiles')
  let entries: string[] = []
  try {
    entries = readdirSync(profiles, { withFileTypes: true })
      .filter(entry => entry.isDirectory())
      .map(entry => entry.name)
  } catch {
    entries = []
  }
  for (const profile of entries.sort()) {
    candidates.push({ path: join(profiles, profile, 'cordis.yml'), label: `${profile} 配置` })
    candidates.push({ path: join(profiles, profile, 'cordis.patch.yml'), label: `${profile} 补丁层` })
  }
  return candidates
}

/** Read a file as text, or undefined when it does not exist / is unreadable. */
export function readConfigFile(path: string): string | undefined {
  try {
    return readFileSync(path, 'utf8')
  } catch {
    return undefined
  }
}

/**
 * Extract every mcp-client row from one cordis file with a bounded line
 * scan. Each match anchors on the `@deepseek-ai/dsh-mcp-client` package
 * name line, walks back for `id`/`disabled`, and forward for the config
 * keys. Best-effort display data — not a YAML parser.
 * @param text - the cordis file content.
 * @returns the parsed rows in file order.
 */
export function scanRows(text: string): McpConfigRow[] {
  const rows: McpConfigRow[] = []
  const lines = text.split(/\r?\n/)
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (line.indexOf('@deepseek-ai/dsh-mcp-client') < 0) continue
    const row: McpConfigRow = { id: '', serverName: '', transport: '', command: '', url: '', disabled: false }
    for (let j = i; j >= Math.max(0, i - 12); j--) {
      const match = /^\s*-?\s*id:\s*(\S+)/.exec(lines[j])
      if (match !== null) {
        row.id = match[1]!.trim()
        break
      }
    }
    for (let j = i; j >= Math.max(0, i - 12); j--) {
      const match = /^\s*disabled:\s*(true|false)/.exec(lines[j])
      if (match !== null) {
        row.disabled = match[1] === 'true'
        break
      }
    }
    for (let j = i + 1; j < Math.min(lines.length, i + 30); j++) {
      const target = lines[j]
      const serverName = /^\s*serverName:\s*(\S+)/.exec(target)
      const transport = /^\s*transport:\s*(\S+)/.exec(target)
      const command = /^\s*command:\s*(\S+)/.exec(target)
      const url = /^\s*url:\s*(\S+)/.exec(target)
      if (serverName !== null) row.serverName = serverName[1]!.trim()
      else if (transport !== null) row.transport = transport[1]!.trim()
      else if (command !== null) row.command = command[1]!.trim()
      else if (url !== null) row.url = url[1]!.trim()
      if (row.serverName !== '' && row.transport !== '' && (row.command !== '' || row.url !== '')) break
    }
    rows.push(row)
  }
  return rows
}

/** Ready-to-use mcp-client config sample (also written by the example route). */
export const SAMPLE_YAML = [
  '# 可用的 MCP 配置格式：在 cordis.yml / cordis.patch.yml 中添加 mcp-client 行',
  '# 每行启用一个服务器；模型工具名形如 mcp__<serverName>__<toolName>',
  '- id: mcp-filesystem',
  "  name: '@deepseek-ai/dsh-mcp-client'",
  '  config:',
  '    serverName: filesystem   # 工具命名空间，部署内唯一，[A-Za-z0-9_-]{1,32}',
  '    transport: stdio         # 本地子进程 stdio 传输',
  '    command: npx',
  "    args: ['-y', '@modelcontextprotocol/server-filesystem', 'D:\\data']",
  '    # 可选: env / cwd / toolCallTimeoutMs(默认 60000) / failOnStartupError(默认 false)',
  '    #       reconnect: { enabled: true, initialDelayMs: 500, maxDelayMs: 30000, maxAttempts: 10 }',
  '',
  '- id: mcp-web',
  "  name: '@deepseek-ai/dsh-mcp-client'",
  '  config:',
  '    serverName: web',
  '    transport: streamable-http   # 远程 HTTP(S) 传输',
  '    url: http://127.0.0.1:8080/mcp',
  '    headers:',
  "      Authorization: !!js '`Bearer ${process.env.MCP_TOKEN}`'   # 用 !!js 从环境变量注入密钥",
].join('\n')

/** True when the path exists (used by tests and the route fence). */
export function pathExists(path: string): boolean {
  return existsSync(path)
}
