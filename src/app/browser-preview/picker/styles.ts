import { colorToHex8, tryParseColor } from '@open-pencil/scene-graph/color'

import type { BrowserSelection } from './schema'

interface StyleValue {
  label: string
  display: string
  text: string
}
export interface BrowserStyleGroup {
  id:
    | 'layout'
    | 'position'
    | 'fill'
    | 'border'
    | 'radius'
    | 'padding'
    | 'margin'
    | 'typography'
    | 'opacity'
    | 'shadow'
  label: string
  values: StyleValue[]
}
const SIDES = ['top', 'right', 'bottom', 'left'] as const
const LAYOUT_FIELDS = [
  ['flex-direction', 'Direction'],
  ['justify-content', 'Justify'],
  ['align-items', 'Align'],
  ['gap', 'Gap']
] as const

function styleValue(styles: BrowserSelection['styles'], key: string, label: string): StyleValue {
  const text = styles[key] ?? ''
  const color = key.endsWith('color') ? tryParseColor(text) : null
  return { label, display: color ? colorToHex8(color).toLowerCase() : text, text }
}
function pixelValue(number: number, label: string): StyleValue {
  return { label, display: String(Math.round(number)), text: `${Math.round(number)}px` }
}
function spacingGroups(styles: BrowserSelection['styles']): BrowserStyleGroup[] {
  const groups: BrowserStyleGroup[] = []
  for (const spacing of ['padding', 'margin'] as const) {
    const top = styles[`${spacing}-top`] ?? '0px'
    const fields = SIDES.map((side) =>
      styleValue(styles, `${spacing}-${side}`, `${spacing} ${side}`)
    )
    if (!fields.some((field) => field.text && Number.parseFloat(field.text) !== 0)) continue
    const uniform = fields.every((field) => field.text === top)
    groups.push({
      id: spacing,
      label: spacing === 'padding' ? 'Padding' : 'Margin',
      values: uniform
        ? [{ label: spacing, text: top, display: top }]
        : fields.map((field, index) => ({
            ...field,
            display: `${SIDES[index]?.[0]?.toUpperCase()} ${field.display}`
          }))
    })
  }
  return groups
}
function typographyValues(styles: BrowserSelection['styles']): StyleValue[] {
  const fields = [
    styleValue(styles, 'font-family', 'Font family'),
    styleValue(styles, 'color', 'Color'),
    styleValue(styles, 'font-size', 'Font size'),
    styleValue(styles, 'line-height', 'Line height')
  ]
  if (styles['font-weight'] && styles['font-weight'] !== '400')
    fields.splice(3, 0, styleValue(styles, 'font-weight', 'Font weight'))
  if (styles['letter-spacing'] && styles['letter-spacing'] !== 'normal')
    fields.push(styleValue(styles, 'letter-spacing', 'Letter spacing'))
  return fields.filter((field) => !!field.text)
}
export function browserSelectionStyles(pick: BrowserSelection): BrowserStyleGroup[] {
  const styles = pick.styles
  const layout: StyleValue[] = [
    pixelValue(pick.box.width, 'Width'),
    pixelValue(pick.box.height, 'Height')
  ]
  const groups: BrowserStyleGroup[] = [
    { id: 'layout', label: 'Layout', values: layout },
    {
      id: 'position',
      label: 'Position',
      values: [pixelValue(pick.box.x, 'X'), pixelValue(pick.box.y, 'Y')]
    }
  ]
  const add = (id: BrowserStyleGroup['id'], label: string, values: StyleValue[]) => {
    if (values.length) groups.push({ id, label, values })
  }
  if (['flex', 'inline-flex', 'grid', 'inline-grid'].includes(styles.display ?? '')) {
    layout.push(styleValue(styles, 'display', 'Display'))
    for (const [key, label] of LAYOUT_FIELDS) {
      const field = styles[key]
      if (field && !['normal', '0px', 'row'].includes(field))
        layout.push(styleValue(styles, key, label))
    }
  }
  const background = tryParseColor(styles['background-color'] ?? '')
  if (background && background.a > 0)
    add('fill', 'Fill', [styleValue(styles, 'background-color', 'Background')])
  const widths = SIDES.map((side) => styleValue(styles, `border-${side}-width`, `Border ${side}`))
  if (widths.some((field) => Number.parseFloat(field.text) > 0)) {
    const top = styles['border-top-width'] ?? ''
    const values = widths.every((field) => field.text === top)
      ? [styleValue(styles, 'border-top-width', 'Border width')]
      : widths
    add('border', 'Border', [
      ...values,
      styleValue(styles, 'border-top-style', 'Border style'),
      styleValue(styles, 'border-top-color', 'Border color')
    ])
  }
  const corners = ['top-left', 'top-right', 'bottom-right', 'bottom-left']
  if (corners.some((corner) => Number.parseFloat(styles[`border-${corner}-radius`] ?? '0') > 0)) {
    const top = styles['border-top-left-radius'] ?? ''
    add(
      'radius',
      'Radius',
      corners.every((corner) => styles[`border-${corner}-radius`] === top)
        ? [styleValue(styles, 'border-top-left-radius', 'Radius')]
        : corners.map((corner) => styleValue(styles, `border-${corner}-radius`, `${corner} radius`))
    )
  }
  groups.push(...spacingGroups(styles))
  add('typography', 'Typography', typographyValues(styles))
  if (styles.opacity && styles.opacity !== '1')
    add('opacity', 'Opacity', [
      {
        label: 'Opacity',
        text: styles.opacity,
        display: `${Math.round(Number(styles.opacity) * 100)}%`
      }
    ])
  if (styles['box-shadow'] && styles['box-shadow'] !== 'none')
    add('shadow', 'Shadow', [styleValue(styles, 'box-shadow', 'Shadow')])
  return groups
}
export function browserSelectionCSS(pick: BrowserSelection): string {
  return [
    `width: ${Math.round(pick.box.width)}px;`,
    `height: ${Math.round(pick.box.height)}px;`,
    `/* viewport: x ${Math.round(pick.box.x)}px, y ${Math.round(pick.box.y)}px */`,
    ...Object.entries(pick.styles)
      .filter(([, value]) => value && !['none', 'normal', 'auto', '0px'].includes(value))
      .map(([key, value]) => `${key}: ${value};`)
  ].join('\n')
}
