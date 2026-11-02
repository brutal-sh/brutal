export default {
  base: 'scrollbar-thin flex-1 overflow-x-hidden overflow-y-auto pb-4',
  variants: {
    compact: {
      true: [
        '[--color-surface:var(--color-panel-foreground)]',
        '[&>header]:border-0 [&>header]:pr-3.5 [&>header]:pl-4',
        '[&>header_input[data-property=name]]:h-6 [&>header_input[data-property=name]]:border-0 [&>header_input[data-property=name]]:px-0 [&>header_input[data-property=name]]:text-[11px]',
        '[&>[data-slot=selection-action]]:border-0 [&>[data-slot=selection-action]]:pr-3.5 [&>[data-slot=selection-action]]:pl-4',
        '[&>[data-inspector-section=context]]:border-t [&>[data-inspector-section=context]]:border-b-0',
        '[&>section]:grid [&>section]:grid-cols-1 [&>section]:gap-1.5 [&>section]:border-t [&>section]:border-b-0 [&>section]:border-panel-foreground/6 [&>section]:py-2 [&>section]:pr-3.5 [&>section]:pl-4',
        '[&>section:has(>[data-slot=content]:not(:empty))]:pb-[15px]',
        '[&>section>[data-slot=content]:empty]:hidden',
        '[&>section>[data-slot=header]]:h-[22px] [&>section>[data-slot=header]>[data-slot=title]]:font-medium [&>section>[data-slot=header]>[data-slot=actions]]:h-[22px]',
        '[&_[data-slot=item][data-property]]:py-0'
      ],
      false: ''
    }
  }
}
