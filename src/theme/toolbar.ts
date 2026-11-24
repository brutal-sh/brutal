const toolbarTheme = {
  slots: {
    desktopRoot:
      'absolute top-1/2 left-2 z-10 flex max-h-[calc(100%-12rem)] -translate-y-1/2 flex-col items-center gap-2',
    desktopRail:
      'scrollbar-none flex w-9 flex-col items-center gap-1 overflow-y-auto rounded-[20px] border border-island-border bg-panel p-[3px]',
    button:
      'flex size-8 cursor-pointer items-center justify-center border border-transparent bg-transparent text-muted transition-colors outline-none focus-visible:ring-1 focus-visible:ring-panel-focus',
    icon: 'size-4',
    flyoutGroup: 'flex items-center',
    flyoutTrigger:
      'flex h-8 w-3 cursor-pointer items-center justify-center border-none bg-transparent text-muted transition-colors outline-none data-[state=open]:bg-hover data-[state=open]:text-surface focus-visible:ring-1 focus-visible:ring-panel-focus',
    flyoutTriggerIcon: 'size-2.5',
    flyoutContent: '',
    flyoutItem: 'h-7 pr-2 pl-1.5 py-0 text-xs md:cursor-default md:rounded-md',
    flyoutItemIndicator: 'flex size-3 shrink-0 items-center justify-center',
    flyoutItemIcon: 'size-4 text-muted',
    flyoutItemLabel: 'flex-1',
    navigationAction:
      'flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-full border border-border bg-panel text-muted shadow-sm outline-none select-none focus-visible:ring-1 focus-visible:ring-panel-focus disabled:pointer-events-none',
    navigationIcon: 'size-3.5',
    action:
      'flex size-8 cursor-pointer items-center justify-center rounded-full border-none bg-transparent text-muted transition-colors outline-none select-none active:bg-hover active:text-surface focus-visible:ring-1 focus-visible:ring-panel-focus',
    actionIcon: 'size-4'
  },
  variants: {
    active: {
      true: {
        button: 'bg-accent text-on-accent'
      },
      false: {}
    },
    mobile: {
      true: {
        button: 'rounded-[6px] select-none',
        flyoutTrigger: 'rounded-[6px] select-none active:bg-hover active:text-surface'
      },
      false: {
        button: 'size-7 shrink-0 rounded-full border border-transparent text-surface',
        flyoutGroup: 'shrink-0 flex-col',
        flyoutTrigger: 'h-3 w-7 shrink-0 rounded-full hover:bg-hover hover:text-surface',
        flyoutItemIndicator: '-mr-1'
      }
    },
    disabled: {
      true: {
        navigationAction: 'pointer-events-none'
      },
      false: {}
    }
  },
  compoundVariants: [
    {
      active: true,
      mobile: false,
      class: {
        button: 'border-input bg-tool-active text-surface'
      }
    },
    {
      active: false,
      mobile: true,
      class: {
        button: 'active:bg-hover'
      }
    },
    {
      active: false,
      mobile: false,
      class: {
        button: 'hover:bg-hover hover:text-surface'
      }
    }
  ],
  defaultVariants: {
    active: false,
    mobile: false,
    disabled: false
  }
}

export type ToolbarTheme = typeof toolbarTheme
export default toolbarTheme
