import { describe, expect, it } from 'vitest'
import { scanRows } from '../src/scan.ts'

const SAMPLE = [
  '# comment',
  '- insert:',
  '    - id: mcp-github',
  "      name: '@deepseek-ai/dsh-mcp-client'",
  '      config:',
  '        serverName: github',
  '        transport: stdio',
  '        command: npx',
  "        args: ['-y', '@modelcontextprotocol/server-github']",
  '',
  '    - id: mcp-web',
  '      disabled: true',
  "      name: '@deepseek-ai/dsh-mcp-client'",
  '      config:',
  '        serverName: web',
  '        transport: streamable-http',
  '        url: http://127.0.0.1:8080/mcp',
].join('\n')

describe('scanRows', () => {
  it('extracts every mcp-client row with id, serverName, transport and target', () => {
    const rows = scanRows(SAMPLE)
    expect(rows).toHaveLength(2)

    expect(rows[0]).toEqual({
      id: 'mcp-github',
      serverName: 'github',
      transport: 'stdio',
      command: 'npx',
      url: '',
      disabled: false,
    })
    expect(rows[1]).toEqual({
      id: 'mcp-web',
      serverName: 'web',
      transport: 'streamable-http',
      command: '',
      url: 'http://127.0.0.1:8080/mcp',
      disabled: true,
    })
  })

  it('ignores files without mcp-client rows', () => {
    expect(scanRows('# nothing here\n- id: other\n  name: \'@other/pkg\'')).toEqual([])
  })

  it('tolerates missing id and config keys', () => {
    const rows = scanRows("- name: '@deepseek-ai/dsh-mcp-client'\n  config:\n    serverName: only\n")
    expect(rows).toEqual([{
      id: '',
      serverName: 'only',
      transport: '',
      command: '',
      url: '',
      disabled: false,
    }])
  })
})
