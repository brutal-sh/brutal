export default {
  slots: {
    root: '@container/home flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-auto bg-canvas text-surface',
    content: 'flex w-full flex-col px-5 pb-8',
    navigation: 'mb-3 flex flex-wrap items-center gap-2',
    tabs: 'flex items-center gap-1',
    tab: 'rounded-full px-3 py-2 text-xs font-medium text-muted hover:bg-hover focus-visible:outline-panel-focus data-[state=active]:bg-hover data-[state=active]:text-surface',
    actions: 'ml-auto flex items-center gap-1',
    grid: 'grid grid-cols-[repeat(auto-fill,minmax(min(100%,280px),1fr))] gap-5',
    list: 'overflow-hidden rounded-xl border border-border'
  }
} as const
