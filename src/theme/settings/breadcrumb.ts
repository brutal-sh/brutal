import linkTheme from '@/theme/link'

/** The path in the Settings window's title while an editor is open. */
export default {
  slots: {
    root: 'flex min-w-0 items-center gap-1.5',
    section: 'shrink-0 text-muted',
    step: [linkTheme.slots.base, 'min-h-6 shrink-0 whitespace-nowrap text-primary'],
    separator: 'size-3.5 shrink-0 text-muted',
    current: 'min-w-0 truncate font-semibold text-surface'
  }
}
