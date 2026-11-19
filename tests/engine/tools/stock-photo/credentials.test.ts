import { expect, test } from 'bun:test'

import {
  getActiveProvider,
  setActiveStockPhotoProvider,
  setPexelsAPIKey,
  setUnsplashAccessKey
} from '#core/tools/stock-photo/providers'

import { getTool, setupToolTest, type ToolResult } from '#tests/helpers/tools'

test.each(['pexels', 'unsplash'])('%s resolves credentials only when searching', async (name) => {
  const previous = getActiveProvider()?.name ?? null
  const setCredential = name === 'pexels' ? setPexelsAPIKey : setUnsplashAccessKey
  let reads = 0

  try {
    setCredential(async () => {
      reads++
      return null
    })
    setActiveStockPhotoProvider(name)
    const provider = getActiveProvider()
    if (!provider) throw new Error('Missing registered provider')
    expect(reads).toBe(0)

    await expect(
      provider.search('forest', {
        perPage: 1,
        orientation: 'landscape',
        targetDim: 100
      })
    ).rejects.toThrow('not configured')
    expect(reads).toBe(1)
  } finally {
    setCredential(null)
    setActiveStockPhotoProvider(previous)
  }
})

test('clearing stock credentials keeps only available providers active', () => {
  const previous = getActiveProvider()?.name ?? null
  const getTestKey = async () => null

  try {
    setUnsplashAccessKey(getTestKey)
    setPexelsAPIKey(getTestKey)
    expect(getActiveProvider()?.name).toBe('pexels')

    setPexelsAPIKey(null)
    expect(getActiveProvider()?.name).toBe('unsplash')

    setUnsplashAccessKey(null)
    expect(getActiveProvider()).toBeNull()

    setPexelsAPIKey(getTestKey)
    expect(getActiveProvider()?.name).toBe('pexels')
  } finally {
    setPexelsAPIKey(null)
    setUnsplashAccessKey(null)
    setActiveStockPhotoProvider(previous)
  }
})

test('stock photo leaves the placeholder editable when no provider is configured', async () => {
  const previous = getActiveProvider()?.name ?? null
  try {
    setActiveStockPhotoProvider(null)
    const { figma, graph } = setupToolTest()
    const placeholder = figma.createRectangle()
    const fills = structuredClone(graph.getNode(placeholder.id)?.fills)
    const result = (await getTool('stock_photo').execute(figma, {
      requests: JSON.stringify([{ id: placeholder.id, query: 'forest' }])
    })) as ToolResult
    expect(result.error).toContain('Keep the image placeholder and continue the design')
    expect(graph.getNode(placeholder.id)?.fills).toEqual(fills)
  } finally {
    setActiveStockPhotoProvider(previous)
  }
})
