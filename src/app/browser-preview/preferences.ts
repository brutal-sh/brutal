import { useLocalStorage } from '@vueuse/core'
import * as v from 'valibot'
import { ref } from 'vue'

import {
  browserViewportPreferencesSchema,
  type BrowserViewportPreferences,
  type PreviewPreset
} from './schema'

const DEFAULT_VIEWPORT: BrowserViewportPreferences = {
  preset: 'desktop',
  zoom: 0.5,
  responsiveZoom: 0.5
}
export const browserViewportPreferenceError = ref('')

export function readBrowserViewportPreferences(text: string): BrowserViewportPreferences {
  const result = v.safeParse(
    v.pipe(v.string(), v.parseJson(), browserViewportPreferencesSchema),
    text
  )
  return result.success ? result.output : { ...DEFAULT_VIEWPORT }
}

export const browserViewportPreferences = useLocalStorage<BrowserViewportPreferences>(
  'open-pen:browser-viewport',
  { ...DEFAULT_VIEWPORT },
  {
    writeDefaults: false,
    flush: 'sync',
    serializer: { read: readBrowserViewportPreferences, write: JSON.stringify },
    onError: () => {
      browserViewportPreferenceError.value =
        'The browser viewport choice could not be saved. It remains available for this session.'
    }
  }
)

export function saveBrowserViewport(preset: PreviewPreset['value'], zoom: number) {
  browserViewportPreferenceError.value = ''
  browserViewportPreferences.value = v.parse(browserViewportPreferencesSchema, {
    preset,
    zoom,
    responsiveZoom: preset === 'desktop' ? zoom : browserViewportPreferences.value.responsiveZoom
  })
  return browserViewportPreferences.value
}
