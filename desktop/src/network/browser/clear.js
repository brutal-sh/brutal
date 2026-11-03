// Runs in WebKit's client world: page scripts cannot replace the storage APIs used here.
if (location.origin !== expectedOrigin) throw new Error('The browser page changed.')
const databases = await indexedDB.databases()
const cache = globalThis.caches
const names = cache ? await cache.keys() : []
const registrations = navigator.serviceWorker ? await navigator.serviceWorker.getRegistrations() : []
if (databases.length > 512 || names.length > 512 || registrations.length > 512)
  throw new Error('This site has too many stored entries to clear in one operation.')
if (location.origin !== expectedOrigin) throw new Error('The browser page changed.')
localStorage.clear()
sessionStorage.clear()
await Promise.all([
  ...databases.filter(database => database.name).map(database => new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(database.name)
    request.onsuccess = () => resolve()
    request.onerror = request.onblocked = () => reject(new Error('A site database is still open.'))
  })),
  ...names.map(name => cache.delete(name)),
  ...registrations.map(registration => registration.unregister())
])
if (location.origin !== expectedOrigin) throw new Error('The browser page changed.')
return true
