import type { Size } from '@open-pencil/scene-graph/primitives'

function placeholderContents(size: Size, scale: number, top: number) {
  return [
    {
      type: 'path',
      id: 'code',
      width: 16 * scale,
      height: 16 * scale,
      x: (size.width - 16 * scale) / 2,
      y: top + 4 * scale,
      viewBox: [0, 0, 24, 24],
      geometry: 'M 16 6 L 22 12 L 16 18 M 8 6 L 2 12 L 8 18',
      stroke: { thickness: scale, fill: '#1F9947', cap: 'round', join: 'round' }
    },
    {
      type: 'text',
      id: 'message',
      content: 'No script file selected',
      textGrowth: 'fixed-width-height',
      fontFamily: 'Inter',
      fontSize: 10 * scale,
      fontWeight: 500,
      lineHeight: 1,
      x: 0,
      y: top + 24 * scale,
      width: size.width,
      height: 10 * scale,
      textAlign: 'center',
      fill: '#1F9947'
    }
  ]
}

export function scriptPlaceholderDocument(size: Size) {
  const scale = Math.min(1, Math.max(0, size.width - 16) / 200, Math.max(0, size.height - 16) / 38)
  const top = (size.height - 38 * scale) / 2
  return {
    version: '2.21',
    children: [
      {
        type: 'rectangle',
        id: 'background',
        width: size.width,
        height: size.height,
        fill: '#36B25F1A',
        stroke: '#36B25F',
        strokeWidth: 1,
        strokeAlignment: 'inner'
      },
      ...placeholderContents(size, scale, top)
    ]
  }
}
