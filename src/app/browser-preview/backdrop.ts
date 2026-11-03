import { ref, shallowRef } from 'vue'

async function decodeBackdrop(src: string) {
  const image = new Image()
  image.src = src
  await image.decode()
}

/** One decoded frame remains under editor popups while the native page yields its surface. */
export function createBrowserBackdrop(
  capture: () => Promise<Uint8Array<ArrayBuffer>>,
  decode: (src: string) => Promise<void> = decodeBackdrop
) {
  const src = shallowRef<string | null>(null)
  const pending = ref(false)
  let revision = 0
  let disposed = false

  function clear() {
    revision++
    pending.value = false
    if (src.value) URL.revokeObjectURL(src.value)
    src.value = null
  }

  return {
    src,
    pending,
    async prepare(isCurrent: () => boolean) {
      if (disposed) return false
      const request = ++revision
      pending.value = true
      let candidate: string | undefined
      try {
        const captured = await capture()
        if (disposed || request !== revision || !isCurrent()) return false
        candidate = URL.createObjectURL(new Blob([captured], { type: 'image/png' }))
        await decode(candidate)
        if (disposed || request !== revision || !isCurrent()) return false
        if (src.value) URL.revokeObjectURL(src.value)
        src.value = candidate
        candidate = undefined
        return true
      } finally {
        if (candidate) URL.revokeObjectURL(candidate)
        if (request === revision) pending.value = false
      }
    },
    clear,
    dispose() {
      disposed = true
      clear()
    }
  }
}
