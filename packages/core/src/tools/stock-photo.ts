import * as v from 'valibot'

import { defineTool } from './schema'
import { applyPhoto } from './stock-photo/apply'
import { getActiveProvider } from './stock-photo/providers'
import { parsePhotoRequests } from './stock-photo/requests'

export { applyPhoto, type PhotoRequest, type PhotoResult } from './stock-photo/apply'
export { parsePhotoRequests } from './stock-photo/requests'
export {
  getStockPhotoProviders,
  registerStockPhotoProvider,
  setActiveStockPhotoProvider,
  setPexelsAPIKey,
  setUnsplashAccessKey,
  type StockPhotoProvider,
  type StockPhotoResult
} from './stock-photo/providers'

export const stockPhoto = defineTool({
  name: 'stock_photo',

  description:
    'Search a configured Pexels or Unsplash provider and apply photos to leaf image placeholders or closed areas. ' +
    'Pass a JSON array; each item is {id, query, index?, orientation?}. ' +
    'Containers with content, text, lines, and structural nodes are rejected.',
  execution: { kind: 'async', mutation: 'document' },
  capabilities: ['document:write', 'network:access'],
  input: v.strictObject({
    requests: v.pipe(
      v.string(),
      v.description(
        'JSON array: [{"id":"0:5","query":"mountain sunset"},{"id":"0:8","query":"business team","orientation":"square"}]'
      )
    )
  }),
  execute: async (figma, { requests }) => {
    const provider = getActiveProvider()
    if (!provider) {
      return {
        error:
          'No stock photo provider is configured. Keep the image placeholder and continue the design. For stock photos, configure Pexels or Unsplash in Settings → Image services.'
      }
    }

    const reqs = parsePhotoRequests(requests)
    if ('error' in reqs) return reqs

    const results = await Promise.all(reqs.map((request) => applyPhoto(figma, provider, request)))
    const ok = results.filter((result) => result.photo).length

    return { applied: ok, failed: results.length - ok, provider: provider.name, results }
  }
})
