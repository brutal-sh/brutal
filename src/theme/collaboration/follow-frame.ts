/** Shows who the canvas is following and lets the user stop. */
export default {
  slots: {
    root: 'absolute top-2 left-1/2 z-30 flex max-w-[calc(100%-1rem)] -translate-x-1/2 items-center gap-1 rounded-full border border-island-border bg-panel py-0.5 pr-0.5 pl-2.5 text-[11px] font-medium text-surface shadow-sm',
    status: 'flex min-w-0 items-center gap-1.5',
    icon: 'size-3 shrink-0',
    label: 'min-w-0 truncate',
    stop: 'flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-full text-panel-foreground outline-none hover:bg-hover hover:text-surface focus-visible:ring-1 focus-visible:ring-panel-focus'
  }
} as const
