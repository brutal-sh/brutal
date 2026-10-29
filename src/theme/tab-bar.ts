const tabBarTheme = {
  slots: {
    root: 'flex h-9 shrink-0 items-end border-b border-border bg-canvas',
    // Sized by its tabs until the bar runs out of room; then it scrolls and fades the clipped side.
    scroller:
      'scrollbar-none h-full min-w-0 scroll-px-8 overflow-x-auto data-overflow-end:mask-r-from-[calc(100%-2rem)] data-overflow-start:mask-l-from-[calc(100%-2rem)]',
    list: 'flex h-full items-end',
    item: 'group/tab flex h-full max-w-48 min-w-24 items-center border-r border-border pr-3',
    trigger:
      'flex h-full min-w-0 cursor-pointer touch-manipulation items-center gap-1.5 px-3 text-[11px] transition-colors outline-none select-none focus-visible:ring-1 focus-visible:ring-panel-focus',
    icon: 'size-3 shrink-0 opacity-50',
    label: 'min-w-0 flex-1 truncate',
    close:
      'flex size-6 shrink-0 cursor-pointer touch-manipulation items-center justify-center rounded transition-opacity group-hover/tab:opacity-100 hover:bg-hover focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-panel-focus sm:size-4',
    closeIcon: 'size-3',
    dirtyDot: 'size-1.5 shrink-0 rounded-full bg-accent',
    newTab:
      'flex size-6 shrink-0 cursor-pointer touch-manipulation items-center justify-center self-center rounded text-muted transition-colors outline-none hover:bg-hover hover:text-surface focus-visible:ring-1 focus-visible:ring-panel-focus ms-1.75',
    newIcon: 'size-4',
    scroll:
      'flex size-6 shrink-0 cursor-pointer touch-manipulation items-center justify-center self-center rounded text-muted transition-colors outline-none hover:bg-hover hover:text-surface focus-visible:ring-1 focus-visible:ring-panel-focus mx-0.5 data-start:order-first',
    scrollIcon: 'size-3.5'
  },
  variants: {
    mobile: {
      true: {},
      false: {
        root: 'inline-flex h-[42px] w-max max-w-full min-w-0 items-center gap-1 rounded-[24px] border border-border bg-panel px-2 shadow-sm',
        scroller: 'h-8',
        list: 'items-center gap-1',
        item: 'h-8 rounded-full border-r-0 pr-1',
        trigger: 'rounded-full text-xs',
        close: 'size-6 rounded-full sm:size-6',
        newTab: 'size-7 rounded-full ms-0',
        scroll: 'rounded-full'
      }
    },
    // Home stays pinned first; desktop shows the app name and mobile keeps the compact icon.
    home: {
      true: {
        item: 'max-w-none min-w-0 pr-0',
        trigger: 'px-3.5'
      }
    },
    active: {
      true: {
        item: 'bg-panel text-surface',
        trigger: 'bg-panel text-surface',
        close: 'opacity-100'
      },
      false: {
        item: 'text-muted hover:text-surface',
        trigger: 'text-muted hover:text-surface',
        close: 'opacity-0'
      }
    }
  },
  compoundVariants: [
    {
      mobile: false,
      active: true,
      class: {
        item: 'bg-hover',
        trigger: 'bg-transparent'
      }
    },
    {
      mobile: false,
      home: true,
      class: {
        item: 'pr-0',
        trigger: 'px-2.5 font-medium'
      }
    }
  ],
  defaultVariants: {
    mobile: false,
    active: false,
    home: false
  }
}

export type TabBarTheme = typeof tabBarTheme
export default tabBarTheme
