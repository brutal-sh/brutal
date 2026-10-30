export default {
  slots: {
    root: 'group min-w-0',
    trigger:
      'min-w-0 w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 disabled:opacity-50',
    preview:
      'flex aspect-[8/5] items-center justify-center overflow-hidden rounded-t-2xl border border-b-0 border-menu-border bg-panel transition-colors group-hover:border-panel-focus',
    image: 'size-full object-contain p-4',
    fallback: 'size-8 text-muted/40',
    icon: 'size-4 shrink-0 text-primary',
    body: 'min-w-0 flex-1',
    title: 'flex min-w-0 items-center gap-1.5',
    name: 'block min-w-0 truncate text-xs font-semibold',
    status: 'flex shrink-0 items-center gap-1 text-muted',
    metadata: 'mt-1 block truncate text-[11px] text-muted',
    trailingMetadata: 'hidden shrink-0 text-[10px] text-muted sm:inline',
    actions: 'flex shrink-0 items-center gap-1'
  },
  variants: {
    view: {
      grid: {
        trigger: 'overflow-hidden rounded-2xl',
        body: 'flex min-h-[60px] flex-col justify-center rounded-b-2xl border border-t-0 border-menu-border bg-home-card-footer px-3 py-2',
        trailingMetadata: 'hidden sm:hidden'
      },
      list: {
        root: 'flex items-center border-b border-menu-border last:border-b-0 hover:bg-hover',
        trigger: 'flex min-h-14 items-center gap-3 px-3 py-2 sm:min-h-0 sm:px-4 sm:py-3',
        metadata: 'sm:hidden'
      }
    }
  },
  defaultVariants: { view: 'grid' }
} as const
