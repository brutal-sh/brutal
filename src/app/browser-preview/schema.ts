import * as v from 'valibot'

export const MAX_CAPTURE_BYTES = 16 * 1024 * 1024
export const PREVIEW_PRESETS = [
  { value: 'desktop', label: 'Desktop', width: 1280, height: 800 },
  { value: 'phone', label: 'Phone', width: 390, height: 844 },
  { value: 'tablet', label: 'Tablet', width: 1180, height: 820 }
] as const

export type PreviewPreset = (typeof PREVIEW_PRESETS)[number]
export type PreviewAction = 'back' | 'forward' | 'reload' | 'focus' | 'close'

function isLocalAddress(value: string): boolean {
  return /^(?:localhost(?:[:/?#]|$)|(?:\d{1,3}\.){3}\d{1,3}(?:[:/?#]|$)|\[[:.\da-f]+\](?:[:/?#]|$))/i.test(
    value
  )
}

export function previewAddressLabel(input: string): string {
  try {
    const url = new URL(input)
    const defaultScheme = isLocalAddress(url.host) ? 'http:' : 'https:'
    const label =
      url.protocol === defaultScheme ? url.href.slice(url.protocol.length + 2) : url.href
    return url.pathname === '/' && !url.search && !url.hash ? label.replace(/\/$/, '') : label
  } catch {
    return input
  }
}

export function previewURL(input: string): string {
  let url: URL
  try {
    const value = input.trim()
    if (!value || /^[\\/]/.test(value)) throw new Error('Missing web address')
    const hostPort = /^(?:localhost|[\da-z-]+(?:\.[\da-z-]+)+):\d+(?:[/?#]|$)/i.test(value)
    const scheme = /^[a-z][a-z\d+.-]*:/i.test(value) && !hostPort
    url = new URL(scheme ? value : `${isLocalAddress(value) ? 'http' : 'https'}://${value}`)
  } catch {
    throw new Error('Enter a valid web address.')
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
  captureAvailable: v.boolean(),
  loading: v.optional(v.boolean(), false)
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
