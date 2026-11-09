import { expect, test } from 'bun:test'

import { SceneGraph } from '@open-pencil/scene-graph'
import { colorToRgba255, parseColor, contrastRatio } from '@open-pencil/scene-graph/color'
import {
  generatedFrameText,
  hasGeneratedContent,
  initializeNote,
  noteForeground
} from '@open-pencil/scene-graph/generated'

test('Note foreground matches the measured native gold and purple text colors', () => {
  expect(colorToRgba255(noteForeground(parseColor('#FEE484')))).toEqual({
    r: 79,
    g: 73,
    b: 48,
    a: 1
  })
  expect(colorToRgba255(noteForeground(parseColor('#C9B8F2')))).toEqual({
    r: 59,
    g: 53,
    b: 75,
    a: 1
  })
  for (const hex of ['#000000', '#FFFFFF', '#777777', '#FF0000', '#00FF00', '#0000FF']) {
    const background = parseColor(hex)
    expect(contrastRatio(background, noteForeground(background))).toBeGreaterThanOrEqual(4.6)
  }
})

test('Note owns one editable text body without a FigJam author or shadow', () => {
  const graph = new SceneGraph()
  const note = graph.createNode('FRAME', graph.getPages()[0].id)
  const body = initializeNote(graph, note, { definition: {}, content: 'Hello' })
  expect(hasGeneratedContent(note)).toBe(true)
  expect(generatedFrameText(graph, note)?.id).toBe(body.id)
  expect(note.effects).toEqual([])
  expect(graph.getChildren(note.id)).toHaveLength(1)
  expect(body).toMatchObject({
    fontFamily: 'Instrument Sans',
    fontSize: 15,
    fontWeight: 500,
    lineHeight: { unit: 'PIXELS', value: 22 }
  })
})
