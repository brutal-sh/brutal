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
        sub: ['pdf', 'svg', 'png', 'jpeg', 'webp'].map((format) => command(`export-${format}`))
      },
      command('export-snapshot'),
      command('guide-export-code'),
      command('guide-import-figma'),
      command('install-cli'),
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
  },
  {
    label: 'Window',
    macosOnly: true,
    items: [
      { id: 'window-minimize', label: 'Minimize' },
      { id: 'window-zoom', label: 'Zoom' },
      { type: 'separator' },
      command('toggle-theme'),
      { type: 'separator' },
      command('window-previous-tab'),
      command('window-next-tab'),
      command('move-tab-left'),
      command('move-tab-right'),
      { type: 'separator' },
      { id: 'window-front', label: 'Bring All to Front' },
      { type: 'separator' },
      { id: 'window-focus', label: 'Window' }
    ]
  },
  {
    label: 'Help',
    items: [
      'help-documentation',
      'help-prompts',
      'help-website',
      'help-cursor',
      'help-vscode',
      'help-release-notes',
      'help-report-issue',
      'help-support'
    ].map((id) => command(id))
  }
]

/** Preference synchronizers must not try to update commands absent from this presentation. */
export const NATIVE_MENU_IDS = new Set(
  NATIVE_MENU_SCHEMA.flatMap((group) => entries(group.items)).map((entry) => entry.id)
)
