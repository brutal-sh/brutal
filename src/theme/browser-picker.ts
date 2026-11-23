import linkTheme from '@/theme/link'

export default {
  slots: {
    button: 'size-7 rounded-[8px]',
    breadcrumbs:
      'scrollbar-none flex shrink-0 items-center gap-1 overflow-x-auto border-b border-menu-border py-1 pr-2 pl-3',
    crumb: [
      linkTheme.slots.base,
      'h-6 shrink-0 rounded px-1.5 py-0 text-[11px] font-normal text-primary data-[active=true]:bg-accent data-[active=true]:font-medium data-[active=true]:text-on-accent data-[active=true]:no-underline'
    ],
    chevron: 'size-3 shrink-0 text-muted',
    styles:
      'scrollbar-none flex shrink-0 items-center gap-1.5 overflow-x-auto border-t border-menu-border px-2 py-1.5',
    group: 'flex shrink-0 items-center gap-0.5',
    value:
      'h-5 shrink-0 rounded px-0.5 py-0 text-[11px] font-normal hover:bg-accent/15 hover:text-accent disabled:opacity-40',
    icon: 'size-3 shrink-0 text-muted',
    muted: 'text-[11px] text-muted'
  }
}
