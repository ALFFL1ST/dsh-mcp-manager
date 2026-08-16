/**
 * The MCP button and live-server panel rendered in `conversation.composer.dock`
 * — the band directly under the composer card. Collapsed: a small status
 * button with a green dot + server count. Expanded: the running MCP servers
 * (grouped from the registered mcp__* tools) with a refresh control.
 */

import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import { McpApi } from './api.ts'
import type { McpStatus } from '../protocol.ts'
import css from './styles.module.css'

/** Composed props for the 'conversation.composer.dock' slot entry. */
export type McpDockProps = PropsRuntime<'conversation.composer.dock'>

/** One shared API client for the dock surface. */
const api = new McpApi()

/** Load the status payload into the three view states. */
function useStatus(): { data: McpStatus | null; loading: boolean; error: string | null; load: () => Promise<void> } {
  const [data, setData] = useState<McpStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = async (): Promise<void> => {
    setLoading(true)
    setError(null)
    try {
      const status = await api.status()
      setData(status)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  return { data, loading, error, load }
}

/**
 * The composer-dock entry: MCP status button plus expandable server panel.
 * @param _props - the composed slot props (unused; state is view-local).
 */
export function McpDock(_props: McpDockProps): ReactNode {
  const [open, setOpen] = useState(false)
  const { data, loading, error, load } = useStatus()

  useEffect(() => {
    if (open && data === null) void load()
  }, [open])

  const servers = data?.runtime ?? []
  const count = servers.length

  return (
    <div className={css.dock}>
      <button
        type="button"
        className={css.button}
        onClick={() => setOpen(!open)}
        title="查看当前运行的 MCP 服务器"
      >
        <span className={count > 0 ? `${css.dot} ${css.dotOn}` : css.dot} />
        <span>MCP</span>
        {count > 0 ? <span className={css.badge}>{count}</span> : null}
      </button>
      {open ? (
        <div className={css.panel}>
          <div className={css.head}>
            <span className={css.title}>当前运行的 MCP 服务器</span>
            <button type="button" className={css.refresh} onClick={() => void load()} disabled={loading}>
              {loading ? '加载中…' : '刷新'}
            </button>
          </div>
          {error !== null ? <div className={css.error}>{error}</div> : null}
          {count === 0 && !loading ? (
            <div className={css.empty}>
              当前没有正在运行的 MCP 服务器。
              <br />
              在 cordis.patch.yml 中按「设置 → MCP 服务」页面的格式添加 mcp-client 行即可启用。
            </div>
          ) : null}
          {servers.map(server => (
            <div key={server.serverName} className={css.server}>
              <div className={css.serverHead}>
                <span className={css.serverName}>{server.serverName}</span>
                <span className={css.chip}>{server.toolCount} 个工具</span>
              </div>
              {server.tools.length > 0 ? (
                <div className={css.tools}>{server.tools.join('  ')}</div>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}
