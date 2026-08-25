import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { candidateFiles, scanRows } from '../src/scan.ts'

/** A throwaway deployment home for candidateFiles tests. */
function fakeHome(): string {
  const home = mkdtempSync(join(tmpdir(), 'dsh-mcp-test-'))
  mkdirSync(join(home, 'profiles', 'web'), { recursive: true })
  mkdirSync(join(home, 'profiles', 'node_modules'), { recursive: true })
  writeFileSync(join(home, 'profiles', 'web', 'cordis.yml'), '[]')
  writeFileSync(join(home, 'profiles', 'web', 'cordis.patch.yml'), '[]')
  writeFileSync(join(home, 'profiles', 'node_modules', 'cordis.patch.yml'), '[]')
  return home
}

const savedHome = process.env.DSH_HOME

afterEach(() => {
  if (savedHome === undefined) delete process.env.DSH_HOME
  else process.env.DSH_HOME = savedHome
})

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

describe('candidateFiles', () => {
  it('scans real profiles but skips node_modules directories', () => {
    const home = fakeHome()
    try {
      process.env.DSH_HOME = home
      const files = candidateFiles()
      const labels = files.map(file => file.label)
      expect(labels).toContain('部署补丁层')
      expect(labels).toContain('web 配置')
      expect(labels).toContain('web 补丁层')
      expect(labels).not.toContain('node_modules 配置')
      expect(labels).not.toContain('node_modules 补丁层')
    } finally {
      rmSync(home, { recursive: true, force: true })
    }
  })
})
