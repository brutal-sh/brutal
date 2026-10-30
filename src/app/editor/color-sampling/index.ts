import { invoke } from '@tauri-apps/api/core'
import { platform } from '@tauri-apps/plugin-os'
import * as v from 'valibot'

import { tryParseColor } from '@open-pencil/scene-graph/color'
import type { Color } from '@open-pencil/scene-graph/primitives'

import { IS_BROWSER, IS_TAURI } from '@/constants'

export interface ScreenEyeDropper {
  open(): Promise<{ sRGBHex: string }>
}

const channelSchema = v.pipe(v.number(), v.finite(), v.minValue(0), v.maxValue(1))
const nativeColorSchema = v.nullable(v.tuple([channelSchema, channelSchema, channelSchema]))
const browserColorSchema = v.object({
  sRGBHex: v.pipe(v.string(), v.regex(/^#[0-9a-f]{6}$/i))
})

export function canSampleScreenColor(): boolean {
  if (IS_TAURI && platform() === 'macos') return true
  // oxlint-disable-next-line compat/compat -- Optional Chromium API; unsupported browsers keep the action disabled.
  return IS_BROWSER && typeof window.EyeDropper === 'function'
}

/** The system/browser sampler owns screen access and cancellation; no screen image is retained. */
export async function sampleScreenColor(): Promise<Color | null> {
  if (IS_TAURI && platform() === 'macos') {
    const color = v.parse(nativeColorSchema, await invoke<unknown>('sample_screen_color'))
    return color ? { r: color[0], g: color[1], b: color[2], a: 1 } : null
  }
  // oxlint-disable-next-line compat/compat -- Feature-detected before use; native macOS uses AppKit.
  const Sampler = window.EyeDropper
  if (!Sampler) throw new Error('Screen color sampling is unavailable.')
  try {
    const result = v.parse(browserColorSchema, await new Sampler().open())
    return tryParseColor(result.sRGBHex)
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return null
    throw error
  }
}
