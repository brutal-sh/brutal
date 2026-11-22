export default {
  slots: {
    trigger:
      'flex min-w-0 max-w-full items-center gap-1 rounded px-1.5 py-0.5 text-2xs text-muted hover:bg-hover hover:text-surface focus-visible:ring-1 focus-visible:ring-current focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50',
    triggerIcon: 'size-3 shrink-0',
    triggerValue: 'min-w-0 truncate',
    triggerChevron: 'size-2.5 shrink-0',
    capability: 'size-3 shrink-0 text-muted',
    footerIcon: 'size-3 shrink-0'
  }
} as const
