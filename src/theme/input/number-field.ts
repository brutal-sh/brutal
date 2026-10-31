import { panelFieldBase } from '../panel/field/base'

const numberFieldTheme = {
  slots: {
    root: [
      panelFieldBase,
      'group flex min-h-6 flex-1 cursor-ew-resize items-center text-[11px] tabular-nums data-[disabled]:cursor-auto data-[editing]:cursor-auto'
    ],
    leading:
      'flex shrink-0 items-center justify-center self-stretch px-[5px] text-muted select-none [&>*]:pointer-events-none',
    field:
      'min-w-0 flex-1 cursor-text border-none bg-transparent pr-1.5 font-[inherit] text-[11px] text-surface outline-none',
    display: 'flex min-w-0 flex-1 items-center overflow-hidden text-[11px] select-none',
    mixed: 'flex-1 text-muted',
    value: 'min-w-0 flex-1 truncate text-surface',
    range: 'pointer-events-none absolute inset-y-0 left-0 rounded bg-number-range-progress',
    rangeHandle:
      'absolute right-1.5 top-1/2 h-3.5 w-[3px] -translate-y-1/2 rounded-full bg-number-range-handle',
    trailing: 'flex shrink-0 items-center self-stretch',
    suffix: 'shrink-0 pr-1.5 text-muted'
  },
  variants: {
    range: {
      true: {
        root: 'relative overflow-hidden border-0 bg-number-range-track focus-visible:ring-1 focus-visible:ring-panel-focus hover:bg-number-range-track focus:bg-number-range-track focus-within:bg-number-range-track',
        leading: 'z-1 flex-1 justify-start text-surface',
        display: 'z-1 w-14 flex-none cursor-text',
        field: 'z-1',
        value: 'text-right'
      }
    },
    /** A trailing control, such as the variable button, brings its own spacing after the unit. */
    suffix: {
      true: { display: 'pr-0', suffix: 'pr-0.5' },
      false: { display: 'pr-1.5' }
    }
  }
}

export type NumberFieldTheme = typeof numberFieldTheme
export default numberFieldTheme
