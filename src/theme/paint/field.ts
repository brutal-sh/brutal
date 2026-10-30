export default {
  slots: {
    root: 'flex h-6 min-w-0 flex-1 items-center overflow-hidden rounded border border-transparent bg-panel-field text-[11px] transition-colors hover:bg-panel-field-hover focus-within:border-panel-focus focus-within:bg-panel-field-hover',
    preview: 'flex shrink-0 items-center pl-1',
    value: 'flex min-w-0 flex-1 items-center pl-1 pr-1',
    divider: 'h-4 w-px shrink-0 bg-muted/40',
    opacity: 'h-full w-10 flex-none shrink-0',
    binding: 'flex shrink-0 items-center pr-0.5'
  },
  variants: {
    compact: {
      true: {
        root: 'group/paint relative',
        value:
          '[&_input]:font-sans [&_[data-slot=pill]]:bg-transparent [&_[data-slot=pill]]:px-0 [&_[data-slot=pill]>span]:font-normal'
      },
      false: {}
    },
    bound: { true: {}, false: {} }
  },
  compoundVariants: [
    {
      compact: true,
      bound: false,
      class: {
        binding:
          'absolute right-0 bg-panel-field opacity-0 group-hover/paint:opacity-100 group-focus-within/paint:opacity-100 has-[[data-open]]:opacity-100'
      }
    }
  ]
}
