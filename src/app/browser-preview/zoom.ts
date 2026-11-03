export const BROWSER_ZOOM_LEVELS = [0.25, 0.3, 0.5, 0.75, 0.9, 1, 1.25, 1.5] as const

export function nextBrowserZoom(current: number, direction: 1 | -1): number {
  return direction === 1
    ? (BROWSER_ZOOM_LEVELS.find((level) => level > current + 0.000001) ?? 1.5)
    : (BROWSER_ZOOM_LEVELS.findLast((level) => level < current - 0.000001) ?? 0.25)
}
