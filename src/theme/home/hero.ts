export default {
  slots: {
    root: 'relative mx-auto mt-10 mb-10 w-full max-w-3xl shrink-0',
    dismiss: 'absolute -top-8 right-0 text-muted',
    categories: 'mb-6 flex flex-wrap justify-center gap-2',
    category:
      'flex h-8 items-center gap-1.5 rounded-lg border border-menu-border px-2.5 text-xs font-medium text-muted hover:bg-hover focus-visible:outline-panel-focus data-[selected=true]:border-surface/60 data-[selected=true]:bg-surface/[0.08] data-[selected=true]:ring-1 data-[selected=true]:ring-surface/20 data-[selected=true]:text-surface',
    composerWrapper: 'relative isolate',
    composer: 'relative rounded-2xl border border-island-border bg-canvas',
    glow: 'pointer-events-none absolute -inset-4 -z-10 rounded-3xl bg-linear-to-r from-accent/10 via-warning/10 to-success/10 blur-2xl',
    input:
      'block min-h-20 w-full resize-none rounded-t-2xl bg-transparent px-4 py-4 text-base text-surface placeholder:text-muted focus:outline-none',
    footer: 'flex min-h-12 items-center gap-1 border-t border-menu-border px-3',
    imports: 'mt-7 grid grid-cols-1 gap-2 border-t border-menu-border pt-7 @md/home:grid-cols-3',
    import:
      'flex min-h-[68px] items-center justify-center gap-2 rounded-xl border border-menu-border px-3 text-xs font-medium text-muted hover:bg-hover focus-visible:outline-panel-focus disabled:opacity-50 @md/home:flex-col',
    attachment: 'relative size-14 overflow-hidden rounded-lg border border-menu-border',
    attachmentImage: 'size-full object-cover',
    attachmentRemove: 'absolute top-0 right-0 rounded-full bg-panel text-surface'
  }
} as const
