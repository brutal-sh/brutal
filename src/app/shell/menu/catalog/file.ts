import type { AppMenuActionItem, AppMenuGroupSchema } from '../schema'

/** Settings…, where each platform expects it: the macOS application menu, otherwise File. */
export const SETTINGS_MENU_ITEM = {
  id: 'settings',
  label: 'Settings…',
  shortcut: 'MOD+,',
  accelerator: 'CmdOrCtrl+,'
} satisfies AppMenuActionItem

export const FILE_MENU = {
  label: 'File',
  paletteIcon: 'file',
  items: [
    { id: 'new', label: 'New', shortcut: 'MOD+N' },
    { id: 'open', label: 'Open…', shortcut: 'MOD+O' },
    { id: 'open-recent', label: 'Open Recent', target: 'native' },
    { id: 'import-canvas', label: 'Import Image/SVG/Figma…' },
    { id: 'export-snapshot', label: 'Export Snapshot…', palette: { icon: 'download' } },
    { id: 'guide-export-code', label: 'Guide: How to Export Design to Code…', handler: 'shell' },
    { id: 'guide-import-figma', label: 'Guide: How to Import from Figma…', handler: 'shell' },
    { id: 'install-cli', label: 'Install Open Pen CLI…', handler: 'shell' },
    { id: 'browse-files', label: 'Browse Files…', handler: 'shell' },
    { id: 'open-tour', label: 'Open the Tour', handler: 'shell' },
    {
      id: 'diagnostics',
      label: 'Diagnostics…',
      handler: 'shell',
      palette: { keywords: ['log', 'report', 'bug', 'problem', 'troubleshoot'] }
    },
    { type: 'separator' },
    { id: 'save', label: 'Save', shortcut: 'MOD+S' },
    { id: 'save-as', label: 'Save As…', shortcut: 'MOD+SHIFT+S' },
    { id: 'save-to', label: 'Save To…' },
    {
      id: 'save-version',
      label: 'Save to Version History…',
      shortcut: 'ALT+MOD+S',
      feature: 'cloud-document'
    },
    { id: 'version-history', label: 'Show Version History', feature: 'cloud-document' },
    { type: 'separator' },
    {
      id: 'export-selection',
      label: 'Export Selection',
      palette: { icon: 'download' },
      shortcut: 'MOD+SHIFT+E',
      sub: [
        { id: 'export-pdf', label: 'PDF', palette: { icon: 'download' } },
        { id: 'export-jpeg', label: 'JPEG', palette: { icon: 'download' } },
        { id: 'export-webp', label: 'WebP', palette: { icon: 'download' } },
        {
          id: 'export-png',
          label: 'PNG',
          palette: { icon: 'download', label: 'exportSelectionAsPNG' }
        },
        {
          id: 'export-svg',
          label: 'SVG',
          palette: { icon: 'download', label: 'exportSelectionAsSVG' }
        },
        {
          id: 'export-pptx',
          label: 'PPTX',
          palette: { icon: 'download', label: 'exportSelectionAsPPTX' }
        },
        {
          id: 'export-drawio',
          label: 'draw.io',
          palette: { icon: 'download', label: 'exportSelectionAsDrawIO' }
        },
        {
          id: 'export-fig',
          label: '.fig',
          palette: { icon: 'download', label: 'exportSelectionAsFig' }
        }
      ]
    },
    { type: 'separator' },
    { id: 'autosave', label: 'Autosave', checkbox: true, feature: 'local-file' },
    { id: 'close', label: 'Close Tab', shortcut: 'MOD+W' },
    // ⌃Tab on every platform, as in Figma's desktop app, so it is not a MOD shortcut.
    { id: 'previous-tab', label: 'Select Previous Tab', accelerator: 'Ctrl+Shift+Tab' },
    { id: 'next-tab', label: 'Select Next Tab', accelerator: 'Ctrl+Tab' },
    {
      id: 'window-previous-tab',
      label: 'Show Previous Tab',
      target: 'native',
      handler: 'shell',
      accelerator: 'Cmd+Shift+['
    },
    {
      id: 'window-next-tab',
      label: 'Show Next Tab',
      target: 'native',
      handler: 'shell',
      accelerator: 'Cmd+Shift+]'
    },
    {
      id: 'move-tab-left',
      label: 'Move Tab Left',
      target: 'native',
      handler: 'shell',
      accelerator: 'Ctrl+Shift+PageUp'
    },
    {
      id: 'move-tab-right',
      label: 'Move Tab Right',
      target: 'native',
      handler: 'shell',
      accelerator: 'Ctrl+Shift+PageDown'
    },
    { id: 'toggle-theme', label: 'Toggle Light/Dark Mode', target: 'native', handler: 'shell' },
    // Windows, Linux, and the browser menu; macOS shows it in the application menu instead.
    { type: 'separator' },
    { ...SETTINGS_MENU_ITEM, handler: 'shell' }
  ]
} satisfies AppMenuGroupSchema
