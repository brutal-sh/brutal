import { controlHeight } from '@/theme/control'

export default {
  slots: {
    root: 'min-w-0 rounded-xl border border-border bg-input transition-colors hover:border-muted/60 focus-within:border-panel-focus focus-within:ring-1 focus-within:ring-accent/30',
    attachment: 'm-2 mb-0',
    control: 'min-w-0',
    toolbar: 'flex min-w-0 items-center gap-1 px-1.5 pb-1.5',
    model: 'min-w-0 flex-1',
    leading: '',
    actions: 'ml-auto flex shrink-0 items-center gap-1'
  },
  variants: {
    size: {
      xs: { toolbar: controlHeight.xs },
      sm: { toolbar: controlHeight.sm },
      md: { toolbar: controlHeight.md },
      lg: { toolbar: controlHeight.lg }
    },
    compact: {
      true: {
        root: 'grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-1 rounded-[22px] border-island-border bg-panel [[data-theme=light]_&]:bg-[#fcfcfb] @min-[460px]/composer:grid-cols-[auto_minmax(0,1fr)_minmax(0,8rem)_auto] @min-[460px]/composer:pr-2',
        attachment: 'col-span-full max-h-28 overflow-y-auto',
        toolbar: 'col-span-full px-1 pb-1 @min-[460px]/composer:contents',
        leading: 'flex items-center pl-1',
        model: 'max-w-52',
        actions: '@min-[460px]/composer:ml-0'
      }
    },
    disabled: {
      true: { root: 'opacity-60' }
    }
  },
  defaultVariants: {
    size: 'sm' as const,
    disabled: false
  }
}
