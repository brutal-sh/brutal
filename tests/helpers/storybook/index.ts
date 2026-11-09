import type { APIRequestContext } from '@playwright/test'
import * as v from 'valibot'

const storyIndexSchema = v.object({
  entries: v.record(v.string(), v.object({ id: v.string(), type: v.string() }))
})

export async function storyEntries(request: APIRequestContext) {
  const text = await (await request.get('/index.json')).text()
  const index = v.parse(v.pipe(v.string(), v.parseJson(), storyIndexSchema), text)
  return Object.values(index.entries).filter((entry) => entry.type === 'story')
}
