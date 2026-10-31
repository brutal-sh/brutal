import { APP_MENU_SCHEMA } from './schema'
import type { AppMenuActionItem, AppMenuEntry, AppMenuGroupSchema } from './schema'

function entries(items: AppMenuEntry[]): AppMenuActionItem[] {
  return items.flatMap((entry) =>
    entry.type === 'separator' ? [] : [entry, ...entries(entry.sub ?? [])]
  )
}

const commands = new Map(
  APP_MENU_SCHEMA.flatMap((group) => entries(group.items)).map((entry) => [entry.id, entry])
)

function command(id: string, label?: string): AppMenuActionItem {
  const entry = commands.get(id)
  if (!entry) throw new Error(`Native menu refers to an unknown command: ${id}`)
  return { ...entry, ...(label ? { label } : {}) }
}

/** The native menu is a presentation of the command catalog, not its source of membership. */
export const NATIVE_MENU_SCHEMA: AppMenuGroupSchema[] = [
  {
    label: 'File',
    items: [
      { ...command('new', 'New File'), shortcut: 'MOD+SHIFT+N' },
      command('open'),
      command('open-recent'),
      command('browse-files', 'Home'),
      command('import-canvas'),
      {
        ...command('export-selection', 'Export Selection to…'),
        sub: ['pdf', 'png', 'jpeg', 'webp'].map((format) => command(`export-${format}`))
      },
      command('export-snapshot'),
      command('save'),
      command('save-as'),
      command('close'),
      // macOS keeps Settings in its application menu; other platforms need this entry.
      command('settings')
    ]
  },
  {
    label: 'Edit',
    items: [
      'edit.undo',
      'edit.redo',
      'cut',
      'copy',
      'paste',
      'selection.delete',
      'selection.selectAll'
    ].map((id) => command(id))
  },
  {
    label: 'View',
    items: [
      command('toggle-ui', 'Show/Hide UI'),
      command('agent-chat-text-size'),
      { type: 'separator' },
      { id: 'toggle-fullscreen', label: 'Toggle Full Screen' }
    ]
  }
]

/** Preference synchronizers must not try to update commands absent from this presentation. */
export const NATIVE_MENU_IDS = new Set(
  NATIVE_MENU_SCHEMA.flatMap((group) => entries(group.items)).map((entry) => entry.id)
)
