import type { PreviewViewport } from './dock'

// shortcut: WebKit/Blink use 1/64 CSS px; remeasure when native layout engines change.
const CSS_LAYOUT_UNITS_PER_PIXEL = 64

function cssLength(value: number): number {
  return Math.trunc(Math.fround(value) * CSS_LAYOUT_UNITS_PER_PIXEL) / CSS_LAYOUT_UNITS_PER_PIXEL
}

/** Native doubles must match CSS lengths resolved relative to the same containing block. */
export function nativePreviewViewport(viewport: PreviewViewport | null): PreviewViewport | null {
  if (!viewport?.layoutOrigin) return viewport
  const { layoutOrigin, bounds, ...surface } = viewport
  return {
    ...surface,
    bounds: {
      x: layoutOrigin.x + cssLength(bounds.x - layoutOrigin.x),
      y: layoutOrigin.y + cssLength(bounds.y - layoutOrigin.y),
      width: cssLength(bounds.width),
      height: cssLength(bounds.height)
    }
  }
}
