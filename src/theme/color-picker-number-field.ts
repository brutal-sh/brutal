export default {
  slots: {
    root: 'flex h-6 min-w-0 items-center bg-input text-xs text-surface outline-none focus-within:ring-1 focus-within:ring-panel-focus',
    field: 'min-w-0 flex-1 border-0 bg-transparent px-2 py-1 text-xs outline-none',
    value: 'min-w-0 flex-1 truncate px-2 py-1 text-xs'
  }
} as const
