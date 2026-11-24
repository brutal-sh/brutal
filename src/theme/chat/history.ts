import { motionStyles } from '@/theme/motion/styles'
import { floatingSurface } from '@/theme/overlay'

export default {
  slots: {
    root: 'shrink-0 border-b border-border',
    header: 'flex min-w-0 items-center gap-1 px-2 py-1.5',
    trigger:
      'flex min-w-0 flex-1 items-center gap-1 rounded px-1.5 py-1 text-left text-xs text-surface hover:bg-hover disabled:opacity-50',
    title: 'min-w-0 flex-1 truncate',
    recent:
      'hidden min-w-0 max-w-32 shrink truncate rounded px-1.5 py-1 text-xs text-muted hover:bg-hover hover:text-surface focus-visible:outline-panel-focus disabled:opacity-50 @min-[350px]/history:inline-block',
    create: 'h-8 gap-1 pl-2 pr-2.5 text-[13px]',
    icon: 'size-3.5 shrink-0',
    content: ['z-50 w-80 max-w-[calc(100vw-1rem)] p-2', floatingSurface, motionStyles.floating],
    browser: 'min-h-0',
    input:
      'w-full rounded border border-border bg-input px-2 py-1.5 text-xs outline-none focus:border-panel-focus',
    scope: 'my-2 flex gap-1',
    scopeButton:
      'flex-1 rounded px-2 py-1 text-xxs text-muted hover:bg-hover data-[active=true]:bg-hover data-[active=true]:text-surface',
    list: 'max-h-64 space-y-0.5 overflow-y-auto',
    row: 'flex w-full items-center gap-2 rounded px-2 py-2 text-left hover:bg-hover focus-visible:outline-panel-focus data-[selected=true]:bg-hover',
    detail: 'block truncate text-2xs text-muted',
    label: 'block truncate text-xs',
    empty: 'px-2 py-4 text-center text-xs text-muted',
    form: 'space-y-2 border-t border-border p-2',
    actions: 'flex justify-end gap-1'
  },
  variants: {
    inline: {
      true: {
        browser: 'flex min-h-0 flex-1 flex-col px-3 pt-3 pb-2',
        list: 'max-h-none flex-1'
      }
    },
    floating: {
      true: {
        root: '@container/history rounded-xl border border-island-border bg-panel shadow-sm',
        header: 'px-1.5 py-1',
        trigger: 'min-w-0 bg-hover font-medium'
      }
    },
    docked: {
      true: {
        root: 'border-border/50',
        header: 'gap-2 px-3 pt-2.5 pb-3.5',
        trigger:
          'h-8 gap-2 rounded-md border border-border px-3 text-[13px] text-muted focus-visible:outline-panel-focus'
      }
    }
  }
} as const
