import { join } from 'node:path'

import { stringToSvg as stringToSVG } from '@realfavicongenerator/generate-favicon'
import type { ImageAdapter } from '@realfavicongenerator/generate-favicon'
import { getNodeImageAdapter } from '@realfavicongenerator/image-adapter-node'
import { fromUint8Array } from 'js-base64'
import sharp from 'sharp'

import { brand } from './config.ts'

export async function loadArtwork(root: string) {
  const adapter = await getNodeImageAdapter()
  const source = sharp(join(root, 'assets/brand/open-pen-app.png'))
  async function image(size: number) {
    const png = await source.clone().resize(size, size).png().toBuffer()
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><image width="${size}" height="${size}" href="data:image/png;base64,${fromUint8Array(png)}"/></svg>`
  }
  return { adapter, main: await image(256), micro: await image(16), appIcon: await image(1024) }
}

export function monochrome(source: string, adapter: ImageAdapter) {
  const svg = stringToSVG(source, adapter)
  const filter = svg.defs().element('filter').attr('id', 'open-pen-monochrome')
  filter.element('feColorMatrix').attr({ type: 'saturate', values: '0' })
  for (const image of svg.find('image')) image.attr('filter', 'url(#open-pen-monochrome)')
  return svg.svg()
}

/** Touch icons are opaque; the maskable mark stays inside the platform's safe circle. */
export function appArtwork(source: string, adapter: ImageAdapter, maskable = false) {
  const svg = adapter.createSvg().size(1024, 1024).viewbox(0, 0, 1024, 1024)
  svg.rect(1024, 1024).fill(brand.background)
  const scale = maskable ? brand.maskableScale : 1
  const mark = stringToSVG(source, adapter).size(1024 * scale, 1024 * scale)
  mark.move((1024 * (1 - scale)) / 2, (1024 * (1 - scale)) / 2)
  svg.add(mark)
  return svg.svg()
}
