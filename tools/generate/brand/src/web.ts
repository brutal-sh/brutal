import { join } from 'node:path'

import {
  generateFaviconFiles,
  initFaviconIconSettings,
  stringToSvg as stringToSVG
} from '@realfavicongenerator/generate-favicon'
import sharp from 'sharp'

import { appArtwork, loadArtwork, monochrome } from './artwork.ts'

export type BrandFiles = Map<string, Buffer>

export async function generateWeb(root: string): Promise<BrandFiles> {
  const { adapter, main, micro, appIcon } = await loadArtwork(root)
  const app = appArtwork(appIcon, adapter)
  const maskable = appArtwork(appIcon, adapter, true)
  const icon = initFaviconIconSettings()
  icon.desktop.darkIconType = 'specific'
  // Use precomposed tiles with no generator background/clip transforms. This also
  // avoids SVG.js process-global clip IDs leaking into reproducible output.
  icon.touch.icon = stringToSVG(app, adapter)
  icon.webAppManifest.icon = stringToSVG(maskable, adapter)
  const generated = await generateFaviconFiles(
    { icon: stringToSVG(main, adapter), darkIcon: stringToSVG(main, adapter) },
    { icon, path: '/brand/', skipMetadataInjection: true },
    adapter
  )
  const files: BrandFiles = new Map()
  const appPNG = await sharp(join(root, 'assets/brand/brutal-app.png'))
    .resize(1024, 1024)
    .png()
    .toBuffer()
  files.set('brand/brutal-app.png', appPNG)
  for (const [name, content] of Object.entries(generated)) {
    // VitePWA owns the application's manifest; the docs are not an installable app.
    if (name === 'site.webmanifest' || name === 'web-app-manifest-192x192.png') continue
    let path = `brand/${name}`
    if (name === 'favicon.ico' || name === 'apple-touch-icon.png') path = name
    if (name === 'web-app-manifest-512x512.png') path = 'brand/pwa-maskable-512.png'
    files.set(
      path,
      content instanceof Blob ? Buffer.from(await content.arrayBuffer()) : Buffer.from(content)
    )
  }
  files.set('brand/app-icon.svg', Buffer.from(appIcon))
  files.set('brand/app-icon-1024.png', appPNG)
  files.set('brand/mark.svg', Buffer.from(main))
  files.set('brand/mark-dark.svg', Buffer.from(main))
  files.set('brand/mark-micro.svg', Buffer.from(micro))
  files.set('brand/mark-micro-dark.svg', Buffer.from(micro))
  files.set('brand/mark-mono.svg', Buffer.from(monochrome(main, adapter)))
  files.set('brand/mark-mono-dark.svg', Buffer.from(monochrome(main, adapter)))
  for (const size of [192, 512]) {
    files.set(`brand/pwa-${size}.png`, await sharp(appPNG).resize(size, size).png().toBuffer())
  }
  return files
}
