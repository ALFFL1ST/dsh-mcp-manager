/**
 * The MCP 服务 settings section (`settings.section` entry): live servers,
 * every deployment cordis file with its parsed mcp-client rows, and the
 * ready-to-use config sample with a one-click write to
 * `$DSH_HOME/mcp.example.yml`.
 */

import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import { McpApi } from './api.ts'
import type { McpStatus } from '../protocol.ts'
import css from './styles.module.css'

/** Composed props for the 'settings.section' slot entry. */
export type McpSettingsSectionProps = PropsRuntime<'settings.section'>

/** One shared API client for the settings surface. */
const api = new McpApi()

/** Load the status payload into the view state. */
function useStatus(): { data: McpStatus | null; error: string | null; load: () => Promise<void> } {
  const [data, setData] = useState<McpStatus | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = async (): Promise<void> => {
    try {
      const status = await api.status()
      setData(status)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  return { data, error, load }
}

/**
 * The settings page body. Reads the status once on mount; the write-example
 * button reports its outcome inline.
 * @param _props - the composed slot props (unused; state is view-local).
 */
export function McpSettingsSection(_props: McpSettingsSectionProps): ReactNode {
  const { data, error, load } = useStatus()
  const [writeMsg, setWriteMsg] = useState<string | null>(null)

  useEffect(() => { void load() }, [])

  const writeExample = async (): Promise<void> => {
    setWriteMsg('写入中…')
    try {
      const result = await api.writeExample()
      setWriteMsg(result.ok ? `已写入示例文件: ${result.path}` : `写入失败: ${result.error ?? '未知错误'}`)
    } catch (err) {
      setWriteMsg(`写入失败: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  const servers = data?.runtime ?? []
  const files = data?.files ?? []
  const sample = data?.sample ?? ''

  return (
    <div className={css.page}>
      <section>
        <h2 className={css.h2}>当前运行的 MCP 服务器</h2>
        {servers.length === 0 ? (
          <p className={css.muted}>
            当前没有运行中的 MCP 服务器。在下方配置文件里添加 mcp-client 行并触发热更新后即会启动。
          </p>
        ) : (
          servers.map(server => (
            <div key={server.serverName} className={css.card}>
              <div className={css.row}>
                <span className={css.serverName}>{server.serverName}</span>
                <span className={`${css.tag} ${css.tagOk}`}>{server.toolCount} 个工具</span>
              </div>
              {server.tools.length > 0 ? (
                <div className={css.tools}>{server.tools.join(' · ')}</div>
              ) : null}
            </div>
          ))
        )}
      </section>

      <section>
        <h2 className={css.h2}>MCP 配置文件</h2>
        {error !== null ? <p className={css.error}>{error}</p> : null}
        {files.map(file => (
          <div key={file.path} className={css.card}>
            <div className={css.path}>{file.path}{file.label !== '' ? `（${file.label}）` : ''}</div>
            {file.error !== undefined ? <p className={css.error}>读取失败: {file.error}</p> : null}
            {file.exists && file.rows.length === 0 ? (
              <p className={css.muted}>该文件未包含 MCP 配置行。</p>
            ) : null}
            {file.rows.map((row, index) => (
              <div key={String(index)} className={css.row}>
                <span className={css.tag}>{row.id !== '' ? row.id : '(无 id)'}</span>
                <span className={css.serverName}>{row.serverName !== '' ? row.serverName : '(未解析)'}</span>
                {row.transport !== '' ? <span className={css.tag}>{row.transport}</span> : null}
                {row.command !== '' ? <span className={css.tag}>cmd: {row.command}</span> : null}
                {row.url !== '' ? <span className={css.tag}>{row.url}</span> : null}
                {row.disabled ? <span className={css.tag}>已禁用</span> : null}
              </div>
            ))}
          </div>
        ))}
      </section>

      <section>
        <h2 className={css.h2}>可用的 MCP 配置文件格式</h2>
        <p className={css.muted}>
          在 cordis.yml / cordis.patch.yml 中每添加一行 mcp-client 插件即启用一个 MCP 服务器；
          模型可用的工具名形如 mcp__&lt;serverName&gt;__&lt;toolName&gt;。
        </p>
        <pre className={css.pre}>{sample}</pre>
        <button type="button" className={css.primaryButton} onClick={() => void writeExample()}>
          把示例写入 $DSH_HOME/mcp.example.yml
        </button>
        {writeMsg !== null ? <p className={css.muted}>{writeMsg}</p> : null}
      </section>
    </div>
  )
}
