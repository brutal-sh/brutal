import { expect, test } from 'bun:test'

import { createPresentationSession } from '@/app/presentation/session'
import { createDeferred } from '@/app/runtime/deferred'

const slides = [
  { id: 'a', name: 'A', scale: 1 },
  { id: 'b', name: 'B', scale: 1 }
]
const png = new Uint8Array([137, 80, 78, 71])

async function settle() {
  await Promise.resolve()
  await Promise.resolve()
}

test('a slow previous slide cannot replace the selected slide and URLs are released', async () => {
  const first = createDeferred<Uint8Array<ArrayBuffer> | null>()
  const released: string[] = []
  const session = createPresentationSession({
    collectSlides: () => slides,
    renderSlide: (slide) => (slide.id === 'a' ? first.promise : Promise.resolve(png)),
    createURL: () => 'blob:second',
    revokeURL: (url) => released.push(url)
  })
  session.start()
  session.goTo(1)
  await settle()
  expect(session.imageURL.value).toBe('blob:second')
  first.resolve(png)
  await settle()
  expect(session.current.value?.id).toBe('b')
  expect(session.imageURL.value).toBe('blob:second')
  expect(released).toEqual([])
  session.dispose()
  expect(released).toEqual(['blob:second'])
})

test('closing invalidates in-flight work; renderer errors are recoverable', async () => {
  const pending = createDeferred<Uint8Array<ArrayBuffer> | null>()
  let renders = 0
  let urls = 0
  const released: string[] = []
  const session = createPresentationSession({
    collectSlides: () => slides,
    renderSlide: () => {
      renders++
      if (renders === 1) return pending.promise
      if (renders === 2) return Promise.reject(new Error('Export failed'))
      return Promise.resolve(png)
    },
    createURL: () => {
      urls++
      return 'blob:rendered'
    },
    revokeURL: (url) => released.push(url)
  })
  session.start()
  session.close()
  pending.resolve(png)
  await settle()
  expect(urls).toBe(0)
  session.start()
  await settle()
  expect(session.failed.value).toBe(true)
  await session.render()
  expect(session.failed.value).toBe(false)
  expect(session.loading.value).toBe(false)
  expect(urls).toBe(1)
  session.dispose()
  expect(released).toEqual(['blob:rendered'])
})
