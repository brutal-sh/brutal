import type { AppMenuGroupSchema } from '../schema'

export const VIEW_MENU = {
  label: 'View',
  paletteIcon: 'eye',
  items: [
    { id: 'inspector-design', label: 'Design properties' },
    { id: 'inspector-advanced', label: 'Advanced properties' },
    { id: 'inspector-code', label: 'Code editor' },
    { id: 'inspector-lint', label: 'Design checks' },
    { type: 'separator' },
    {
      id: 'view.zoom100',
      label: 'Zoom to 100%',
      command: 'view.zoom100'
    },
    {
      id: 'view.zoomFit',
      label: 'Zoom to Fit',
      command: 'view.zoomFit'
    },
    {
      id: 'view.zoomSelection',
      label: 'Zoom to Selection',
      command: 'view.zoomSelection'
    },
    { id: 'zoom-in', label: 'Zoom In', shortcut: 'MOD+=' },
    { id: 'zoom-out', label: 'Zoom Out', shortcut: 'MOD+-' },
    { type: 'separator' },
    {
      id: 'view.zoomPreviousFrame',
      label: 'Zoom to Previous Frame',
      command: 'view.zoomPreviousFrame'
    },
    { id: 'view.zoomNextFrame', label: 'Zoom to Next Frame', command: 'view.zoomNextFrame' },
    { id: 'view.previousPage', label: 'Previous Page', command: 'view.previousPage' },
    { id: 'view.nextPage', label: 'Next Page', command: 'view.nextPage' },
    { type: 'separator' },
    { id: 'view-split-right', label: 'Split Right' },
    { id: 'view-split-down', label: 'Split Down' },
    { type: 'separator' },
    {
      id: 'variables',
      label: 'Variables…',
      palette: {
        icon: 'variables',
        keywords: ['tokens', 'design tokens', 'css variables', 'collections', 'modes', 'theme']
      }
    },
    { type: 'separator' },
    { id: 'view-rulers', label: 'Rulers', checkbox: true, shortcut: 'SHIFT+R' },
    // Figma's View › Pixel grid, shown once zoomed in far enough.
    { id: 'view-pixel-grid', label: 'Pixel Grid', checkbox: true, shortcut: "SHIFT+'" },
    {
      id: 'view-multiplayer-cursors',
      label: 'Multiplayer Cursors',
      checkbox: true,
      shortcut: 'ALT+MOD+\\'
    },
    { id: 'view-design-issues', label: 'Design Issues', checkbox: true, handler: 'shell' },
    { id: 'view-comments', label: 'Comments', checkbox: true, shortcut: 'SHIFT+C' },
    { type: 'separator' },
    {
      id: 'theme',
      label: 'Theme',
      sub: [
        { id: 'theme-light', label: 'Light', checkbox: true, handler: 'shell' },
        { id: 'theme-dark', label: 'Dark', checkbox: true, handler: 'shell' },
        { id: 'theme-auto', label: 'Auto', checkbox: true, handler: 'shell' }
      ]
    },
    { id: 'language', label: 'Language', target: 'browser' },
    { type: 'separator' },
    {
      id: 'preferences',
      label: 'Preferences',
      sub: [
        {
          id: 'snap-geometry',
          label: 'Snap to Geometry',
          checkbox: true,
          handler: 'shell'
        },
        {
          id: 'snap-objects',
          label: 'Snap to Objects',
          checkbox: true,
          handler: 'shell'
        },
        {
          id: 'snap-pixel-grid',
          label: 'Snap to Pixel Grid',
          checkbox: true,
          shortcut: "MOD+SHIFT+'",
          handler: 'shell'
        }
      ]
    },
    { type: 'separator' },
    { id: 'toggle-ui', label: 'Toggle UI', shortcut: 'MOD+\\' },
    {
      id: 'agent-chat-text-size',
      label: 'Agent Chat Text Size',
      sub: [
        { id: 'agent-text-small', label: 'Small', checkbox: true, handler: 'shell' },
        { id: 'agent-text-medium', label: 'Medium', checkbox: true, handler: 'shell' },
        { id: 'agent-text-large', label: 'Large', checkbox: true, handler: 'shell' }
      ]
    },
    { id: 'toggle-preview', label: 'Preview', shortcut: 'MOD+ALT+↩' },
    { type: 'separator' },
    { id: 'profiler', label: 'Profiler', checkbox: true, target: 'browser' },
    {
      id: 'dev-tools',
      label: 'Developer Tools',
      accelerator: 'CmdOrCtrl+Alt+I',
      target: 'native'
    }
  ]
} satisfies AppMenuGroupSchema
