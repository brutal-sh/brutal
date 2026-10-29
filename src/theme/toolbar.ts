const toolbarTheme = {
  slots: {
    desktopRoot:
      'absolute top-12 left-2 z-10 flex max-h-[calc(100%-3.5rem)] flex-col items-center gap-2',
    desktopRail:
      'scrollbar-none flex w-9 flex-col items-center gap-1 overflow-y-auto rounded-[18px] border border-border bg-panel p-px py-1 shadow-lg',
    button:
      'flex size-8 cursor-pointer items-center justify-center border-none bg-transparent text-muted transition-colors outline-none focus-visible:ring-1 focus-visible:ring-panel-focus',
    icon: 'size-4',
    flyoutGroup: 'flex items-center',
    flyoutTrigger:
      'flex h-8 w-3 cursor-pointer items-center justify-center border-none bg-transparent text-muted transition-colors outline-none data-[state=open]:bg-hover data-[state=open]:text-surface focus-visible:ring-1 focus-visible:ring-panel-focus',
    flyoutTriggerIcon: 'size-2.5',
    flyoutContent: '',
    flyoutItem: '',
    flyoutItemIndicator: 'flex size-3.5 shrink-0 items-center justify-center',
    flyoutItemIcon: 'size-3.5',
    flyoutItemLabel: 'flex-1',
    navigationAction:
      'flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-full border border-border bg-panel text-muted shadow-sm outline-none select-none focus-visible:ring-1 focus-visible:ring-panel-focus disabled:pointer-events-none',
    navigationIcon: 'size-3.5',
    action:
      'flex size-8 cursor-pointer items-center justify-center rounded-[6px] border-none bg-transparent text-muted transition-colors outline-none select-none active:bg-hover active:text-surface focus-visible:ring-1 focus-visible:ring-panel-focus',
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
        button: 'shrink-0 rounded-lg',
        flyoutGroup: 'shrink-0 flex-col',
        flyoutTrigger: 'h-6 w-8 shrink-0 rounded-lg hover:bg-hover hover:text-surface'
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
        button: 'bg-hover text-surface'
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
