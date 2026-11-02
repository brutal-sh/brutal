import { expect, test } from 'bun:test'

import type { BrowserSelection } from '@/app/browser-preview/picker/schema'
import { browserSelectionCSS, browserSelectionStyles } from '@/app/browser-preview/picker/styles'

const pick: BrowserSelection = {
  tag: 'p',
  id: 'first',
  classes: 'message',
  box: { x: 12.5, y: 20, width: 200, height: 50 },
  path: [
    { tag: 'body', id: '' },
    { tag: 'p', id: 'first' }
  ],
  styles: {
    display: 'block',
    'background-color': 'rgba(0, 0, 0, 0)',
    'font-family': 'Inter',
    color: 'rgb(255, 255, 255)',
    'font-size': '16px',
    'font-weight': '400',
    'line-height': '25.6px',
    opacity: '1',
    'box-shadow': 'none'
  }
}

test('selected paragraph projects dimensions, position and type without empty paint groups', () => {
  const groups = browserSelectionStyles(pick)
  expect(groups.map((group) => group.id)).toEqual(['layout', 'position', 'typography'])
  expect(groups[0]?.values.map((value) => value.text)).toEqual(['200px', '50px'])
  expect(groups[1]?.values[0]?.text).toBe('13px')
  expect(groups[2]?.values.find((value) => value.label === 'Color')?.display).toBe('#ffffff')
  expect(browserSelectionCSS(pick)).toContain('line-height: 25.6px;')
  expect(browserSelectionCSS(pick)).toContain('width: 200px;')
})

test('uniform margin collapses and independent padding retains sides and copied values', () => {
  const selected = {
    ...pick,
    styles: {
      ...pick.styles,
      'margin-top': '16px',
      'margin-right': '16px',
      'margin-bottom': '16px',
      'margin-left': '16px',
      'padding-top': '2px',
      'padding-right': '4px',
      'padding-bottom': '6px',
      'padding-left': '8px'
    }
  }
  const groups = browserSelectionStyles(selected)
  expect(groups.find((group) => group.id === 'margin')?.values.map((value) => value.text)).toEqual([
    '16px'
  ])
  const padding = groups.find((group) => group.id === 'padding')?.values
  expect(padding?.map((value) => value.display)).toEqual(['T 2px', 'R 4px', 'B 6px', 'L 8px'])
  expect(padding?.map((value) => value.text)).toEqual(['2px', '4px', '6px', '8px'])
})

test('opaque fill, opacity and shadows preserve the copied CSS values', () => {
  const selected = {
    ...pick,
    styles: {
      ...pick.styles,
      'background-color': 'rgb(61, 153, 255)',
      opacity: '0.5',
      'box-shadow': 'rgb(0, 0, 0) 0px 2px 4px 0px'
    }
  }
  const groups = browserSelectionStyles(selected)
  expect(groups.find((group) => group.id === 'fill')?.values[0]?.display).toBe('#3d99ff')
  expect(groups.find((group) => group.id === 'opacity')?.values[0]).toEqual({
    label: 'Opacity',
    display: '50%',
    text: '0.5'
  })
  expect(groups.find((group) => group.id === 'shadow')?.values[0]?.text).toBe(
    selected.styles['box-shadow']
  )
})
