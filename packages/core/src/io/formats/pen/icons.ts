import { groupBy } from 'es-toolkit'

import type { PenIconRequest, PenIconSource } from '@open-pencil/pen'

import { drawIcon, type IconData, type IconProvider } from '#core/icons'

const PEN_ICON_SIZE = 24
const optionsKey = (options: Record<string, number> | undefined) => JSON.stringify(options ?? null)
const requestKey = ({ name, options }: PenIconRequest) => `${name}\0${optionsKey(options)}`

/** Preload source requests, then collect exact variants resolved by the reader's overrides. */
export async function loadPenIcons(requests: readonly PenIconRequest[], provider: IconProvider) {
  const glyphs = new Map<string, IconData>()
  const seen = new Set<string>()
  const missing = new Map<string, PenIconRequest>()

  async function load(requests: readonly PenIconRequest[]) {
    for (const request of requests) seen.add(requestKey(request))
    const groups = groupBy(requests, (request) => optionsKey(request.options))
    await Promise.all(
      Object.values(groups).map(async (group) => {
        const found = await provider
          .icons(
            group.map(({ name }) => name),
            PEN_ICON_SIZE,
            group[0]?.options
          )
          .catch(() => new Map<string, IconData>())
        for (const [name, icon] of found)
          glyphs.set(requestKey({ name, options: group[0]?.options }), icon)
      })
    )
  }

  const source: PenIconSource = {
    draw(graph, frameId, name, size, color, options) {
      const request = { name, options }
      const key = requestKey(request)
      const icon = glyphs.get(key)
      if (!icon) {
        if (!seen.has(key)) missing.set(key, request)
        return false
      }
      drawIcon(graph, frameId, icon, size, color)
      return true
    }
  }
  await load(requests)
  return {
    source,
    async loadMissing() {
      if (!missing.size) return false
      const requests = [...missing.values()]
      missing.clear()
      await load(requests)
      return true
    }
  }
}
