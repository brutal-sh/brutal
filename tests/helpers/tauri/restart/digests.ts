export async function readNativeRecoveryDigests(session: WebdriverIO.Browser = browser) {
  return session.executeAsync<{ failure?: string; digests?: string[] }, []>(async (done) => {
    try {
      const opening = indexedDB.open('open-pencil-recovery')
      const database = await new Promise<IDBDatabase>((resolve, reject) => {
        opening.onsuccess = () => resolve(opening.result)
        opening.onerror = () => reject(opening.error)
      })
      try {
        const transaction = database.transaction('fig', 'readonly')
        const request = transaction.objectStore('fig').getAll()
        await new Promise<void>((resolve, reject) => {
          transaction.oncomplete = () => resolve()
          transaction.onerror = () => reject(transaction.error)
          transaction.onabort = () => reject(transaction.error)
        })
        const values: unknown[] = request.result
        const digests = await Promise.all(
          values.map(async (value) => {
            const bytes = value instanceof Blob ? await value.arrayBuffer() : value
            if (!(bytes instanceof ArrayBuffer) && !(bytes instanceof Uint8Array))
              throw new Error('Unexpected recovery bytes')
            const digest = await crypto.subtle.digest('SHA-256', new Uint8Array(bytes))
            return Array.from(new Uint8Array(digest), (byte) =>
              byte.toString(16).padStart(2, '0')
            ).join('')
          })
        )
        done({ digests: digests.toSorted() })
      } finally {
        database.close()
      }
    } catch (reason) {
      done({ failure: String(reason) })
    }
  })
}
