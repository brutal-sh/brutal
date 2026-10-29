import * as v from 'valibot'

export const MAX_CAPTURE_BYTES = 16 * 1024 * 1024
export const PREVIEW_PRESETS = [
  { value: 'desktop', label: 'Desktop', width: 1280, height: 800 },
  { value: 'tablet', label: 'Tablet', width: 768, height: 1024 },
  { value: 'phone', label: 'Phone', width: 390, height: 844 }
] as const

export type PreviewPreset = (typeof PREVIEW_PRESETS)[number]
export type PreviewAction = 'back' | 'forward' | 'reload' | 'focus' | 'close'

export function previewURL(input: string): string {
  let url: URL
  try {
    url = new URL(input.trim())
  } catch {
    throw new Error('Enter a full http:// or https:// address.')
  }
  if (!['http:', 'https:'].includes(url.protocol) || !url.hostname) {
    throw new Error('Only HTTP and HTTPS pages can be previewed.')
  }
  if (url.username || url.password) throw new Error('Remove credentials from the address.')
  if (url.hostname === 'tauri.localhost')
    throw new Error('The editor cannot be opened as a preview.')
  return url.href
}

export const previewStatusSchema = v.object({
  url: v.string(),
  title: v.string(),
  width: v.number(),
  height: v.number(),
  captureAvailable: v.boolean()
})
export type PreviewStatus = v.InferOutput<typeof previewStatusSchema>

export function captureBytes(input: unknown): Uint8Array<ArrayBuffer> {
  if (!(input instanceof ArrayBuffer)) throw new Error('The browser returned an invalid image.')
  const bytes = new Uint8Array(input)
  if (bytes.length > MAX_CAPTURE_BYTES) throw new Error('The captured image is too large.')
  const signature = [137, 80, 78, 71, 13, 10, 26, 10]
  if (!signature.every((byte, i) => bytes[i] === byte)) {
    throw new Error('The browser did not return a PNG image.')
  }
  return bytes
}
