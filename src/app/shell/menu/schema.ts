import type { EditorCommandId } from '@open-pencil/vue/editor/commands'

import { ARRANGE_MENU, EDIT_MENU, OBJECT_MENU, TEXT_MENU } from './catalog/editing'
import { FILE_MENU, SETTINGS_MENU_ITEM } from './catalog/file'
import { VIEW_MENU } from './catalog/view'

export type AppMenuTarget = 'all' | 'browser' | 'native'

export type AppMenuIcon =
  | 'download'
  | 'eye'
  | 'file'
  | 'folder-open'
  | 'layers'
  | 'pencil'
  | 'redo'
  | 'save'
  | 'settings'
  | 'type'
  | 'variables'
  | 'undo'
  | 'zoom-in'
  | 'zoom-out'

export type AppMenuPaletteLabel =
  | 'exportSelectionAsPNG'
  | 'exportSelectionAsSVG'
  | 'exportSelectionAsPPTX'
  | 'exportSelectionAsDrawIO'
  | 'exportSelectionAsFig'

export interface AppMenuPaletteMetadata {
  icon?: AppMenuIcon
  label?: AppMenuPaletteLabel
  description?: string
  keywords?: string[]
}

export type AppMenuHandler = 'editor' | 'shell'

/** A feature an item waits for: it shows only while the feature is available (`./features`). */
/** Items shown only for a document backed by a file on disk. */
export type AppMenuFeature = 'local-file' | 'cloud-document'

export interface AppMenuActionItem {
  type?: 'item'
  id: string
  label: string
  shortcut?: string
  accelerator?: string
  command?: EditorCommandId
  checkbox?: boolean
  target?: AppMenuTarget
  handler?: AppMenuHandler
  feature?: AppMenuFeature
  palette?: AppMenuPaletteMetadata
  sub?: AppMenuEntry[]
}

export interface AppMenuSeparatorItem {
  type: 'separator'
  target?: AppMenuTarget
}

export type AppMenuEntry = AppMenuActionItem | AppMenuSeparatorItem

export interface AppMenuGroupSchema {
  label: string
  macosOnly?: true
  target?: AppMenuTarget
  paletteIcon?: AppMenuIcon
  items: AppMenuEntry[]
}

export const APP_MENU_SCHEMA = [
  FILE_MENU,
  EDIT_MENU,
  VIEW_MENU,
  OBJECT_MENU,
  TEXT_MENU,
  ARRANGE_MENU,
  {
    label: 'Help',
    items: [
      { id: 'help-documentation', label: 'Brutal Documentation', handler: 'shell' },
      { id: 'help-prompts', label: 'Prompt Gallery & Tips', handler: 'shell' },
      { id: 'help-website', label: 'Brutal Website', handler: 'shell' },
      { id: 'help-cursor', label: 'Cursor Setup…', handler: 'shell' },
      { id: 'help-vscode', label: 'VS Code Setup…', handler: 'shell' },
      { id: 'help-support', label: 'Support & Feedback', handler: 'shell' }
    ]
  }
] satisfies AppMenuGroupSchema[]

/**
 * Custom entries in the macOS application menu.
 *
 * Placement stays in Rust because the OS-predefined items (About, Services, Hide)
 * sit between them. Only the labels and accelerators are shared here.
 */
export const APP_MENU_APP_ITEMS = [
  { id: 'about', label: 'About Brutal' },
  { id: 'check-updates', label: 'Check for Updates…' },
  SETTINGS_MENU_ITEM,
  { id: 'quit', label: 'Quit Brutal', shortcut: 'MOD+Q' }
] satisfies AppMenuActionItem[]
