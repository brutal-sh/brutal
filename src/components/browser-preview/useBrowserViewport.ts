import { computed, watch, type Ref } from 'vue'

import type { BrowserPreviewSession } from '@/app/browser-preview/context'
import { previewDockViewport } from '@/app/browser-preview/dock'
import { browserViewportPreferences, saveBrowserViewport } from '@/app/browser-preview/preferences'
import { PREVIEW_PRESETS } from '@/app/browser-preview/schema'

export function useBrowserViewport(options: {
  surface: Ref<HTMLElement | null>
  open: Ref<boolean>
  preset: Ref<string>
  zoom: Ref<number>
}) {
  const { surface, open, preset, zoom } = options
  const selectedDevice = computed(
    () => PREVIEW_PRESETS.find((device) => device.value === preset.value) ?? PREVIEW_PRESETS[0]
  )
  const nextDevice = computed(
    () =>
      PREVIEW_PRESETS[
        (PREVIEW_PRESETS.indexOf(selectedDevice.value) + 1) % PREVIEW_PRESETS.length
      ] ?? PREVIEW_PRESETS[0]
  )
  function surfaceViewport() {
    if (!open.value || !surface.value) return null
    return previewDockViewport({
      rect: surface.value.getBoundingClientRect(),
      preset: selectedDevice.value.value,
      windowWidth: innerWidth,
      windowHeight: innerHeight,
      zoom: zoom.value
    })
  }
  function setZoom(value: number) {
    zoom.value = saveBrowserViewport(selectedDevice.value.value, value).zoom
  }
  function cycleDevice() {
    const device = nextDevice.value
    let value =
      device.value === 'desktop' ? browserViewportPreferences.value.responsiveZoom : zoom.value
    const rect = surface.value?.getBoundingClientRect()
    if (device.value !== 'desktop' && rect) {
      const fitted = previewDockViewport({
        rect,
        preset: device.value,
        windowWidth: innerWidth,
        windowHeight: innerHeight,
        zoom: value
      })
      if (fitted) value = Math.max(0.1, Math.min(value, fitted.zoom, 1.5))
    }
    const choice = saveBrowserViewport(device.value, value)
    preset.value = choice.preset
    zoom.value = choice.zoom
  }
  return { selectedDevice, nextDevice, surfaceViewport, setZoom, cycleDevice }
}

export function useBrowserViewportSession(
  session: BrowserPreviewSession,
  preset: Ref<string>,
  zoom: Ref<number>,
  changed: () => void
) {
  preset.value = session.preset
  watch(preset, (value) => {
    session.preset = value
    changed()
  })
  watch(zoom, (value) => {
    session.zoom = value
    changed()
  })
}
