import { PREVIEW_PRESETS, type PreviewPreset } from './schema'

export interface PreviewBounds {
  x: number
  y: number
  width: number
  height: number
}

export interface PreviewViewport {
  bounds: PreviewBounds
  zoom: number
  viewport: { width: number; height: number }
}

/** CSS pixels and Tauri logical pixels share the main webview's unzoomed coordinate space. */
export function previewDockViewport(
  rect: PreviewBounds,
  preset: PreviewPreset['value'],
  windowWidth: number,
  windowHeight: number,
  zoom: number
): PreviewViewport | null {
  if (
    ![rect.x, rect.y, rect.width, rect.height, windowWidth, windowHeight, zoom].every(
      Number.isFinite
    )
  )
    return null
  const availableWidth = Math.floor(Math.min(rect.width, windowWidth - rect.x, 1920))
  const height = Math.floor(Math.min(rect.height, windowHeight - rect.y, 1200))
  if (rect.x < 0 || rect.y < 0 || availableWidth < 1 || height < 1) return null
  if (preset === 'desktop')
    return {
      bounds: { x: Math.floor(rect.x), y: Math.floor(rect.y), width: availableWidth, height },
      zoom: Math.min(1.5, Math.max(0.25, zoom)),
      viewport: {
        width: Math.floor(availableWidth / Math.min(1.5, Math.max(0.25, zoom))),
        height: Math.floor(height / Math.min(1.5, Math.max(0.25, zoom)))
      }
    }
  const device = PREVIEW_PRESETS.find((item) => item.value === preset)
  if (!device || availableWidth <= 16 || height <= 16) return null
  const fit = Math.min((availableWidth - 16) / device.width, (height - 16) / device.height)
  if (fit < 0.1) return null
  const width = device.width * fit
  const fittedHeight = device.height * fit
  return {
    bounds: {
      x: rect.x + (availableWidth - width) / 2,
      y: rect.y + (height - fittedHeight) / 2,
      width,
      height: fittedHeight
    },
    zoom: fit,
    viewport: { width: device.width, height: device.height }
  }
}

/** Native views sit above HTML portals, so hide while the editor owns an open overlay. */
export function hasPreviewOverlay(): boolean {
  return !!document.querySelector('[data-dismissable-layer]:not([data-state="closed"])')
}
