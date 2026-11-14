import type { Page } from '@playwright/test'
import { isValid, toUint8Array } from 'js-base64'
import * as v from 'valibot'

const imageSchema = v.object({
  mimeType: v.literal('image/png'),
  base64: v.pipe(
    v.string(),
    v.check((value: string) => isValid(value))
  ),
  byteLength: v.number(),
  width: v.number(),
  height: v.number()
})

export function readCLIImage(stdout: string) {
  const value = v.parse(
    v.pipe(v.string(), v.parseJson(), imageSchema),
    stdout.trim().split('\n').at(-1) ?? ''
  )
  const bytes = toUint8Array(value.base64)
  if (bytes.length !== value.byteLength) throw new Error('CLI image length mismatch')
  return { bytes, width: value.width, height: value.height }
}

/** Browser's image decoder, independent of the editor's CanvasKit encoder. */
export async function decodeOwnedPNG(page: Page, bytes: Uint8Array) {
  return page.evaluate(
    async (bytes) => {
      const image = await createImageBitmap(
        new Blob([new Uint8Array(bytes)], { type: 'image/png' })
      )
      try {
        const canvas = document.createElement('canvas')
        canvas.width = image.width
        canvas.height = image.height
        const context = canvas.getContext('2d')
        if (!context) throw new Error('Owned PNG decoder unavailable')
        context.drawImage(image, 0, 0)
        return {
          width: image.width,
          height: image.height,
          pixels: [...context.getImageData(0, 0, image.width, image.height).data]
        }
      } finally {
        image.close()
      }
    },
    [...bytes]
  )
}
