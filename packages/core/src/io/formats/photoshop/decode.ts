import { getLayerImageData, initializeCanvas, readPsd, type Layer } from 'ag-psd'
import { encode } from 'fast-png'

const MAX_FILE_BYTES = 32 * 1024 * 1024
const MAX_PNG_BYTES = 48 * 1024 * 1024
const MAX_PIXELS = 24_000_000
const MAX_LAYER_SIDE = 4096
const RGB_MODE = 3

initializeCanvas(
  () => {
    throw new Error('Photoshop layer decoding requires raw pixels.')
  },
  (width, height) => ({
    width,
    height,
    data: new Uint8ClampedArray(width * height * 4),
    colorSpace: 'srgb',
    pixelFormat: 'rgba-unorm8'
  })
)

interface LayerStyle {
  name: string
  visible: boolean
  opacity: number
}

export type PhotoshopLayer = LayerStyle &
  (
    | { kind: 'group'; children: PhotoshopLayer[]; isolated: boolean }
    | { kind: 'image'; x: number; y: number; width: number; height: number; png?: Uint8Array }
  )

export interface PhotoshopArtwork {
  width: number
  height: number
  layers: PhotoshopLayer[]
}

export type PhotoshopLayersResult = { artwork: PhotoshopArtwork } | { reason: string }

class CompositeRequiredError extends Error {
  override name = 'CompositeRequiredError'
}

function hasCustomBlendingRanges(ranges: Layer['blendingRanges']): boolean {
  if (!ranges) return false
  const values = [
    ranges.compositeGrayBlendSource,
    ranges.compositeGraphBlendDestinationRange,
    ...ranges.ranges.flatMap(({ sourceRange, destRange }) => [sourceRange, destRange])
  ]
  return values.some((range) => range.some((value, index) => value !== (index < 2 ? 0 : 255)))
}

function checkLayerFeatures(layer: Layer): void {
  if ([layer.text, layer.vectorFill, layer.vectorStroke, layer.vectorOrigination].some(Boolean))
    throw new CompositeRequiredError('The file contains text or shape layers.')
  if ([layer.mask, layer.realMask, layer.vectorMask, layer.clipping].some(Boolean))
    throw new CompositeRequiredError('The file contains layer masks or clipping.')
  if (
    [layer.artboard, layer.adjustment, layer.placedLayer, layer.filterEffectsMasks?.length].some(
      Boolean
    )
  )
    throw new CompositeRequiredError('The file contains artboards, adjustments, or smart objects.')
  if (
    (layer.effects && layer.effects.disabled !== true) ||
    (layer.fillOpacity !== undefined && layer.fillOpacity !== 1) ||
    layer.knockout ||
    hasCustomBlendingRanges(layer.blendingRanges) ||
    layer.channelBlendingRestrictions?.length ||
    (layer.blendMode && layer.blendMode !== 'normal' && layer.blendMode !== 'pass through')
  )
    throw new CompositeRequiredError(
      'The file uses layer styles or blending that need its composite.'
    )
}

interface DecodeBudget {
  layers: number
  pixels: number
  output: number
}

function decodeLayer(layer: Layer, budget: DecodeBudget, depth: number): PhotoshopLayer {
  if (++budget.layers > 256 || depth > 24)
    throw new CompositeRequiredError('The layer count or nesting exceeds the import limit.')
  checkLayerFeatures(layer)
  const style = { name: layer.name || 'Layer', visible: !layer.hidden, opacity: layer.opacity ?? 1 }
  if (layer.children) {
    if (layer.blendMode === 'pass through' && style.opacity !== 1)
      throw new CompositeRequiredError('The file uses a pass-through group with reduced opacity.')
    return {
      ...style,
      kind: 'group',
      isolated: layer.blendMode === 'normal',
      children: layer.children.map((child) => decodeLayer(child, budget, depth + 1))
    }
  }
  const x = layer.left ?? 0
  const y = layer.top ?? 0
  const width = (layer.right ?? 0) - x
  const height = (layer.bottom ?? 0) - y
  if (width < 1 || height < 1)
    return { ...style, kind: 'image', x, y, width: Math.max(0, width), height: Math.max(0, height) }
  const png = encodeLayerPixels(layer, { width, height }, budget)
  return { ...style, kind: 'image', x, y, width, height, png }
}

function encodeLayerPixels(
  layer: Layer,
  { width, height }: { width: number; height: number },
  budget: DecodeBudget
): Uint8Array {
  budget.pixels += width * height
  if (Math.max(width, height) > MAX_LAYER_SIDE || budget.pixels > MAX_PIXELS)
    throw new CompositeRequiredError('The layer bitmap size exceeds the import limit.')
  const image = getLayerImageData(layer)
  if (
    !image ||
    image.width !== width ||
    image.height !== height ||
    image.data.byteLength !== width * height * 4
  )
    throw new CompositeRequiredError('A layer has unreadable pixel data.')
  const data = new Uint8Array(image.data.buffer, image.data.byteOffset, image.data.byteLength)
  const png = encode({ width, height, data })
  budget.output += png.byteLength
  if (budget.output > MAX_PNG_BYTES)
    throw new CompositeRequiredError('The encoded layer images exceed the import limit.')
  return png
}

// shortcut: recognize the exact IEC sRGB profile found in Photoshop exports, until other profiles can be converted to sRGB.
async function isSRGB(profile: Uint8Array | undefined): Promise<boolean> {
  if (!profile) return true
  if (profile.byteLength !== 3144) return false
  const digest = await crypto.subtle.digest('SHA-256', new Uint8Array(profile))
  const hex = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join(
    ''
  )
  return hex === '3f6d674174f3804eb0dabdac90ae17486e898c5063a66f861c116ea033da8301'
}

export async function decodePhotoshopLayers(bytes: ArrayBuffer): Promise<PhotoshopLayersResult> {
  try {
    if (bytes.byteLength < 26 || bytes.byteLength > MAX_FILE_BYTES)
      return { reason: 'The file exceeds the layer import limits or has an invalid header.' }
    const header = new DataView(bytes)
    if (header.getUint16(22) !== 8 || header.getUint16(24) !== RGB_MODE)
      return { reason: 'Editable layers require an 8-bit RGB file.' }
    const psd = readPsd(bytes, {
      useRawData: true,
      skipCompositeImageData: true,
      skipLinkedFilesData: true,
      skipThumbnail: true,
      imageResourcesWhitelist: ['iccProfile'],
      totalMemoryLimit: 48 * 1024 * 1024
    })
    const { width, height, children } = psd
    if (width < 1 || height < 1 || width * height > MAX_PIXELS || Math.max(width, height) > 100_000)
      return { reason: 'The Photoshop canvas exceeds the layer import limit.' }
    if (psd.artboards || psd.globalLayerMaskInfo)
      return { reason: 'The document uses artboards or a global layer mask.' }
    if (!(await isSRGB(psd.imageResources?.iccProfile)))
      return { reason: 'The document uses an unsupported color profile.' }
    if (!children?.length) return { reason: 'The file has no separate layers.' }
    const budget = { layers: 0, pixels: 0, output: 0 }
    const layers = children.map((layer) => decodeLayer(layer, budget, 0))
    if (budget.output === 0) return { reason: 'The file has no readable layer images.' }
    return { artwork: { width, height, layers } }
  } catch (error) {
    return {
      reason:
        error instanceof CompositeRequiredError
          ? error.message
          : 'The layer data could not be read.'
    }
  }
}
