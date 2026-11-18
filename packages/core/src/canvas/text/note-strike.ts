import { inflateSync } from 'fflate'
import { toUint8Array } from 'js-base64'

import type { OutlineCommand } from '#core/text/font/glyphs'

import strikeData from './note-strike-data.json' with { type: 'json' }

// Generate with bun tools/generate/note-strike/src/generate.ts.
// The derived outline data uses the font's licence in packages/core/assets/InstrumentSans-OFL.txt.
/** Instrument Sans Medium's 26.6 outlines at Skia's unhinted 64-pixel path strike. */
function readStrike() {
  const raw = inflateSync(toUint8Array(strikeData.words))
  const words = new DataView(raw.buffer, raw.byteOffset, raw.byteLength)
  const count = words.getUint16(0, true)
  const offsets = new Uint32Array(count + 1)
  let offset = 2
  for (let glyphId = 0; glyphId < count; glyphId++) {
    offsets[glyphId] = offset + 2
    offset += 2 + words.getUint16(offset, true) * 2
  }
  offsets[count] = raw.length + 2
  return { words, offsets }
}

let strike: ReturnType<typeof readStrike> | undefined
const tableDirectory = toUint8Array(strikeData.tableDirectory)

/** Decline the strike when a host serves a different file under the bundled font's name. */
export function noteStrikeMatches(fontData: ArrayBuffer): boolean {
  return (
    fontData.byteLength === strikeData.fontBytes &&
    new Uint8Array(fontData, 0, tableDirectory.length).every(
      (value, index) => value === tableDirectory[index]
    )
  )
}

export function noteStrikeOutline(glyphId: number, fontSize: number): OutlineCommand[] | undefined {
  const { words, offsets } = (strike ??= readStrike())
  if (glyphId < 0 || glyphId >= offsets.length - 1) return undefined

  const scale = fontSize / (64 * 64)
  let offset = offsets[glyphId]
  const end = offsets[glyphId + 1] - 2
  const read = () => {
    const value = words.getInt16(offset, true)
    offset += 2
    return value
  }
  const commands: OutlineCommand[] = []
  while (offset < end) {
    const verb = words.getInt16(offset, true)
    offset += 2
    switch (verb) {
      case 0:
        commands.push({ type: 'M', x: read() * scale, y: read() * scale })
        break
      case 1:
        commands.push({ type: 'L', x: read() * scale, y: read() * scale })
        break
      case 2:
        commands.push({
          type: 'Q',
          x1: read() * scale,
          y1: read() * scale,
          x: read() * scale,
          y: read() * scale
        })
        break
      case 5:
        commands.push({ type: 'Z' })
        break
      default:
        return undefined
    }
  }
  return commands
}
