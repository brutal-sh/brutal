export default {
  slots: {
    dimensions: 'mb-1.5 text-[11px] text-muted',
    componentRow: 'border-b border-border px-3 pb-2',
    componentButton: 'w-full justify-center font-normal',
    palette: '-mx-0.5 grid grid-cols-8',
    preset:
      'group flex h-7 min-w-0 items-center justify-center rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-layout-marker disabled:pointer-events-none disabled:opacity-50',
    swatch:
      'size-5 rounded-full border border-note-swatch group-data-[selected=true]:ring-2 group-data-[selected=true]:ring-layout-marker',
    colorRow: 'mt-1.5 grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-center gap-1.5',
    colorLabel: 'text-[11px] text-muted',
    colorField: 'flex h-7 min-w-0 items-center gap-1.5 rounded bg-panel-field px-1.5',
    colorTrigger:
      'size-5 shrink-0 rounded border border-border focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-layout-marker disabled:pointer-events-none',
    hex: 'h-auto min-w-0 flex-1 border-0 bg-transparent px-0 font-mono text-[11px] shadow-none',
    fields: 'contents'
  }
}
