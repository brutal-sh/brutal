export default {
  slots: {
    root: '@container/browser flex min-h-0 min-w-0 flex-1 flex-col bg-panel text-panel-foreground',
    toolbar: 'flex h-[43px] shrink-0 items-center border-b border-menu-border px-2',
    navigation: 'flex shrink-0 items-center gap-0.5',
    address:
      'relative mx-2 h-7 min-w-0 flex-1 rounded-[14px] bg-panel-foreground/5 hover:bg-panel-foreground/8 focus-within:ring-1 focus-within:ring-panel-foreground/20 dark:bg-panel-foreground/15 dark:hover:bg-panel-foreground/20 dark:focus-within:ring-panel-foreground/35',
    input:
      'h-7 rounded-[14px] border-transparent bg-transparent pr-16 pl-8 text-xs font-medium text-panel-foreground shadow-none hover:border-transparent focus:border-transparent focus:ring-0',
    addressIcon: 'absolute top-1 left-1.5 size-5',
    addressActions: 'absolute top-1 right-1 flex h-5 items-center gap-1',
    viewport:
      'h-5 w-7 rounded-full bg-panel-foreground/6 hover:bg-panel-foreground/10 dark:bg-panel-foreground/15 dark:hover:bg-panel-foreground/25',
    closePage: 'size-5',
    importButton:
      'ml-1.5 mr-2 h-7 w-auto shrink-0 rounded-md border-0 bg-browser-action px-3 text-sm font-medium text-on-browser-action hover:bg-browser-action/90 disabled:opacity-25 @max-[460px]/browser:w-7 @max-[460px]/browser:px-0',
    importGlyph: 'hidden size-3.5 @max-[460px]/browser:block',
    importLabel: 'inline @max-[460px]/browser:hidden',
    separator: 'mx-2.5 h-4 w-px shrink-0 bg-menu-border',
    surface: 'relative min-h-0 flex-1 overflow-hidden bg-canvas',
    landing: 'absolute inset-0 overflow-auto border-x border-island-border bg-panel',
    content: 'mx-auto flex min-h-full w-full max-w-[720px] flex-col px-5 py-14',
    introduction: 'text-center',
    mark: 'mx-auto flex size-14 items-center justify-center rounded-2xl bg-panel-foreground text-panel',
    heading: 'mt-4 text-lg font-semibold',
    description: 'mx-auto mt-1 max-w-[440px] text-base leading-relaxed text-muted',
    enter: 'mt-6 h-8 gap-2 px-4',
    features: 'mt-12 grid grid-cols-1 gap-2 @[381px]/browser:grid-cols-3',
    feature:
      'flex items-start gap-3 p-2 text-left @[381px]/browser:flex-col @[381px]/browser:items-center @[381px]/browser:text-center',
    featureIcon:
      'flex size-9 shrink-0 items-center justify-center rounded-lg bg-panel-foreground/12',
    featureTitle: 'text-sm font-medium',
    featureDescription: 'mt-1 text-sm text-muted',
    suggestions: 'mt-6',
    historyHeading: 'mb-3 flex items-center justify-between gap-2',
    suggestionsHeading: 'flex items-center gap-2.5 text-sm font-medium',
    historyRows: 'flex flex-col gap-1.5',
    historyRow:
      'relative h-auto min-h-[42px] w-full justify-start gap-2 rounded-[10px] border border-panel-foreground/7 px-3 py-2.5 pr-[68px] text-sm font-medium leading-5 hover:border-panel-foreground/12 dark:border-panel-foreground/12 dark:hover:border-panel-foreground/20',
    historyArrow: 'absolute top-1/2 right-3 size-3.5 -translate-y-1/2 text-muted',
    historyRemove:
      'absolute top-1/2 right-[34px] size-[22px] -translate-y-1/2 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100',
    privacy: 'mx-auto mt-6 max-w-[390px] text-center text-[11px] text-muted/80'
  }
}
