import type { Page } from '@playwright/test'

/** Inspect only the current runner-owned browser context's recovery bytes. */
export function recoveryBytes(page: Page, corrupt = false) {
  return page.evaluate(async (corruptSnapshot) => {
    const opening = indexedDB.open('open-pencil-recovery')
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      opening.onsuccess = () => resolve(opening.result)
      opening.onerror = () => reject(opening.error)
    })
    try {
      const transaction = database.transaction('fig', corruptSnapshot ? 'readwrite' : 'readonly')
      const store = transaction.objectStore('fig')
      const keys = store.getAllKeys()
      const values = store.getAll()
      const finished = new Promise<void>((resolve, reject) => {
        transaction.oncomplete = () => resolve()
        transaction.onerror = () => reject(transaction.error)
        transaction.onabort = () => reject(transaction.error)
      })
      if (corruptSnapshot) {
        keys.onsuccess = () => {
          if (keys.result.length !== 1) {
            transaction.abort()
            return
          }
          const key = keys.result[0]
          if (key !== undefined) store.put(new Uint8Array([1, 2, 3]), key)
        }
      }
      await finished
      const stored: unknown[] = values.result
      return Promise.all(
        stored.map(async (value) => {
          let bytes: unknown = value
          if (value instanceof Blob) bytes = new Uint8Array(await value.arrayBuffer())
          else if (value instanceof ArrayBuffer) bytes = new Uint8Array(value)
          if (!(bytes instanceof Uint8Array)) throw new Error('Unexpected recovery binary')
          const digest = await crypto.subtle.digest('SHA-256', new Uint8Array(bytes))
          return {
            bytes: bytes.byteLength,
            digest: Array.from(new Uint8Array(digest), (byte) =>
              byte.toString(16).padStart(2, '0')
            ).join('')
          }
        })
      )
    } finally {
      database.close()
    }
  }, corrupt)
}

export async function seedRecovery(page: Page) {
  await page.evaluate(async () => {
    const store = window.openPencil?.getStore?.()
    if (!store) throw new Error('Open Pen editor unavailable')
    const id = store.createShape('RECTANGLE', 120, 120, 240, 140)
    store.updateNode(id, { name: 'Recovery retention fixture' })
    await store.persistRecoveryNow()
  })
}
