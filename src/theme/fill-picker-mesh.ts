export default {
  slots: {
    body: 'space-y-3',
    settings: 'grid grid-cols-2 gap-2',
    label: 'mb-2 block text-xs text-surface',
    gridPreview:
      'relative grid h-[84px] w-full cursor-pointer gap-0.5 rounded border border-border bg-canvas p-1 text-xs text-surface outline-none focus-visible:ring-1 focus-visible:ring-panel-focus',
    gridCell: 'rounded-sm border border-border',
    gridLabel: 'pointer-events-none absolute inset-0 flex items-center justify-center font-medium',
    gridSize: 'mb-2 block text-xs text-muted',
    gridChoices: 'grid grid-cols-5 gap-1 rounded border border-border bg-canvas p-1',
    gridChoice:
      'size-5 cursor-pointer rounded-sm border border-border bg-canvas data-[active]:bg-input focus-visible:ring-1 focus-visible:ring-panel-focus',
    palette: 'grid w-fit gap-0.5',
    color:
      'size-6 cursor-pointer rounded-md border border-border outline-none data-[active]:ring-2 data-[active]:ring-panel-focus focus-visible:ring-2 focus-visible:ring-panel-focus',
    selected: 'space-y-2 pt-1',
    selectedRow:
      'flex h-6 items-center justify-between gap-2 rounded-md bg-input pl-2 text-xs text-muted',
    selectedColor: 'flex items-center justify-between gap-2 text-xs text-muted',
    selectedSwatch:
      'size-4 rounded-sm border border-border data-[mixed]:bg-[conic-gradient(from_180deg,#ef4444,#eab308,#22c55e,#06b6d4,#3b82f6,#a855f7,#ef4444)]',
    action: 'h-6 bg-input text-surface'
  }
}
