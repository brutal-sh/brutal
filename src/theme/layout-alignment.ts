const layoutAlignmentTheme = {
  slots: {
    grid: 'grid w-fit grid-cols-3 gap-0.5 rounded bg-panel-field p-0.5',
    cell: 'flex size-6 cursor-pointer items-center justify-center rounded border-0 text-[11px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50',
    dot: 'size-1.5 rounded-full bg-current'
  },
  variants: {
    active: {
      true: { cell: 'bg-accent/10 text-primary' },
      false: { cell: 'text-muted hover:bg-hover hover:text-surface' }
    },
    compact: {
      true: {
        grid: 'w-full grid-rows-3 gap-1 rounded-sm px-0 py-0.5',
        cell: 'h-5 w-6.5 rounded-[1px] bg-transparent text-panel-foreground hover:bg-panel-field-hover hover:text-panel-foreground'
      },
      false: {}
    },
    marker: {
      default: {},
      point: { dot: 'size-0.5 rounded-none' },
      selected: { dot: 'size-2 rounded-[2px]' },
      horizontalEdge: { dot: 'h-2.5 w-0.5 rounded-[2px]' },
      horizontalCenter: { dot: 'h-1.5 w-0.5 rounded-[2px]' },
      verticalEdge: { dot: 'h-0.5 w-2.5 rounded-[2px]' },
      verticalCenter: { dot: 'h-0.5 w-1.5 rounded-[2px]' }
    },
    disabled: {
      true: { cell: 'pointer-events-none opacity-50' },
      false: {}
    }
  },
  compoundVariants: [
    {
      compact: true,
      active: true,
      class: { cell: 'bg-transparent text-layout-marker hover:text-layout-marker' }
    }
  ],
  defaultVariants: {
    active: false,
    disabled: false
  }
}

export type LayoutAlignmentTheme = typeof layoutAlignmentTheme
export default layoutAlignmentTheme
