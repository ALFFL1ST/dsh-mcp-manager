/**
 * Browser-half entry for the dsh-mcp-manager plugin — runs inside the dsh
 * web GUI. Registers two surfaces on the shell's slot system:
 * - `conversation.composer.dock`: the MCP button + live-server panel under
 *   the composer card;
 * - `settings.section`: the MCP 服务 settings page (config files + sample
 *   format).
 *
 * Export discipline (client plugin rule): the /client surface carries what
 * cordis loading needs plus types only — all value exports stay internal.
 */

import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
// Type-only: pulls the conversation shell's SlotMap merge ('conversation.composer.dock').
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
// Type-only: pulls the settings shell's SlotMap merge ('settings.section').
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import { McpDock } from './McpDock.tsx'
import { McpSettingsSection } from './McpSettingsSection.tsx'

/** Required services (fiber inject waiting — the slot service must be up first). */
export const inject = ['slots']

/** Type-only surface (export discipline: no value exports beyond the plugin contract). */
export type { McpDockProps } from './McpDock.tsx'
export type { McpSettingsSectionProps } from './McpSettingsSection.tsx'

/**
 * Mount the composer-dock entry and the settings section.
 * @param ctx - client root context carrying the slot service.
 */
export function apply(ctx: ClientContext): void {
  ctx.slots.inject('conversation.composer.dock', () => ctx.slots.register(
    { name: 'conversation.composer.dock', id: 'mcp-manager-dock', order: 200, label: 'MCP 服务' },
    McpDock,
  ))

  ctx.slots.inject('settings.section', () => ctx.slots.register(
    { name: 'settings.section', id: 'mcp-manager', order: 25, label: 'MCP 服务' },
    McpSettingsSection,
  ))
}
