import { PREVIEW_PRESETS, type PreviewPreset } from './schema'

export interface PreviewBounds {
  x: number
  y: number
  width: number
  height: number
}

/** CSS pixels and Tauri logical pixels share the main webview's unzoomed coordinate space. */
export function previewDockBounds(
  rect: PreviewBounds,
  preset: PreviewPreset['value'],
  windowWidth: number,
  windowHeight: number
): PreviewBounds | null {
  if (![rect.x, rect.y, rect.width, rect.height, windowWidth, windowHeight].every(Number.isFinite))
    return null
  const availableWidth = Math.floor(Math.min(rect.width, windowWidth - rect.x, 1920))
  const height = Math.floor(Math.min(rect.height, windowHeight - rect.y, 1200))
  const limit =
    preset === 'desktop'
      ? availableWidth
      : (PREVIEW_PRESETS.find((device) => device.value === preset)?.width ?? availableWidth)
  const width = Math.min(availableWidth, limit)
  if (rect.x < 0 || rect.y < 0 || width < 1 || height < 1) return null
  return {
    x: Math.floor(rect.x + (availableWidth - width) / 2),
    y: Math.floor(rect.y),
    width,
    height
  }
}

/** Native views sit above HTML portals, so hide while the editor owns an open overlay. */
export function hasPreviewOverlay(): boolean {
  return !!document.querySelector('[data-dismissable-layer]:not([data-state="closed"])')
}
