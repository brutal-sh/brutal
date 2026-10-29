export default {
  base: 'flex h-7 cursor-pointer items-center gap-1.5 rounded border-none px-3 text-[11px] font-medium transition-colors outline-none focus-visible:ring-1 focus-visible:ring-panel-focus',
  variants: {
    connection: {
      idle: 'bg-transparent text-surface hover:bg-hover',
      joining:
        'animate-pulse motion-reduce:animate-none border border-warning-border bg-warning-bg text-warning',
      // Still a share action when connected; your avatar shows the room is live.
      connected: 'bg-transparent text-surface hover:bg-hover'
    }
  },
  defaultVariants: { connection: 'idle' }
} as const
