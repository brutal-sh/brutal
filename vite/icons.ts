import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { FileSystemIconLoader } from 'unplugin-icons/loaders'

import { POINTER_ARROW } from '@open-pencil/core/constants'

export const brutalIconCollection = {
  pointer: () => {
    const { size, path } = POINTER_ARROW
    return `<svg viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg"><path d="${path}" fill="currentColor"/></svg>`
  }
}

/**
 * Monochrome provider and agent logos from LobeHub, used as `<icon-ai-openai />` or
 * `~icons/ai/openai`. They draw with `currentColor` on a 24px grid, like Lucide.
 */
export function aiIconCollection() {
  const manifest = fileURLToPath(import.meta.resolve('@lobehub/icons-static-svg/package.json'))
  const icons = join(dirname(manifest), 'icons')
  // Titles would add tooltips and duplicate the accessible name of the label beside the logo.
  return FileSystemIconLoader(icons, (svg) => svg.replace(/<title>.*?<\/title>/, ''))
}
