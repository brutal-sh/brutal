import { computed, ref, shallowRef } from 'vue'

import { presentationIndex, type PresentationSlide } from './slides'

interface PresentationDependencies {
  collectSlides: () => PresentationSlide[]
  renderSlide: (slide: PresentationSlide) => Promise<Uint8Array<ArrayBuffer> | null>
  createURL?: (blob: Blob) => string
  revokeURL?: (url: string) => void
}

/** Owns one rendered slide at a time; superseded renders never replace the active slide. */
export function createPresentationSession(deps: PresentationDependencies) {
  const open = ref(false)
  const slides = shallowRef<PresentationSlide[]>([])
  const index = ref(0)
  const imageURL = ref<string | null>(null)
  const loading = ref(false)
  const failed = ref(false)
  const current = computed(() => slides.value[index.value])
  const createURL = deps.createURL ?? URL.createObjectURL.bind(URL)
  const revokeURL = deps.revokeURL ?? URL.revokeObjectURL.bind(URL)
  let revision = 0

  function releaseImage() {
    if (imageURL.value) revokeURL(imageURL.value)
    imageURL.value = null
  }

  async function render() {
    const request = ++revision
    const slide = current.value
    failed.value = false
    if (!slide) return
    loading.value = true
    try {
      const bytes = await deps.renderSlide(slide)
      if (request !== revision || !open.value) return
      if (!bytes) throw new Error('Slide renderer unavailable')
      const nextURL = createURL(new Blob([bytes], { type: 'image/png' }))
      releaseImage()
      imageURL.value = nextURL
    } catch {
      if (request === revision && open.value) failed.value = true
    } finally {
      if (request === revision) loading.value = false
    }
  }

  function start() {
    releaseImage()
    slides.value = deps.collectSlides()
    index.value = 0
    loading.value = false
    failed.value = false
    open.value = true
    void render()
  }

  function goTo(next: number) {
    const target = presentationIndex(next, slides.value.length)
    if (!open.value || target === index.value) return
    index.value = target
    void render()
  }

  function close() {
    open.value = false
    revision++
  }

  function dispose() {
    close()
    releaseImage()
  }

  return {
    open,
    slides,
    index,
    current,
    imageURL,
    loading,
    failed,
    start,
    goTo,
    close,
    render,
    releaseImage,
    dispose
  }
}
