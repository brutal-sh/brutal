import type { ExtractedPage } from './dom/schema'

export const BROWSER_HEIGHT_HANDLE_HEIGHT = 16
export const BROWSER_MIN_SURFACE_HEIGHT = 240

/** Retain editable descendants while the import root clips them at the requested page height. */
export function clipBrowserPage(page: ExtractedPage, height?: number): ExtractedPage {
  if (height === undefined) return page
  if (!Number.isFinite(height) || height <= 0)
    throw new Error('Choose a positive, finite browser import height.')
  return height < page.height ? { ...page, height } : page
}
