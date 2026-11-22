import type { SceneNode } from '@open-pencil/scene-graph'

import type { SkiaRenderer } from '#core/canvas/renderer'
import { changesShaping } from '#core/canvas/text/paragraph/inputs'
import { AI_DONE_DURATION_MS } from '#core/constants'

export function invalidateScenePicture(r: SkiaRenderer): void {
  r.scenePicture?.delete()
  r.scenePicture = null
  r.scenePictureVersion = -1
  r.scenePictureFontGeneration = -1
  r.sceneBacking?.image.delete()
  r.sceneBacking = null
  r.sceneBackingBuild?.surface.delete()
  r.sceneBackingBuild = null
}

export function clearSubtreePictureCache(r: SkiaRenderer): void {
  for (const entry of r.subtreePictureCache.values()) entry.picture.delete()
  r.subtreePictureCache.clear()
  r.subtreePictureCachePageId = null
  r.subtreePictureCacheSceneVersion = -1
  r.subtreePictureCachePositionPreviewVersion = -1
  r.subtreePictureCacheFontGeneration = -1
}

export function invalidateAllPictures(r: SkiaRenderer): void {
  r.textPreparationCache.clear()
  invalidateScenePicture(r)
  r.tiledScene.invalidateStructure()
  for (const pic of r.nodePictureCache.values()) pic?.delete()
  r.nodePictureCache.clear()
  r.nodePictureCacheGenerations.clear()
  r.effectRasterCache.clear()
  clearSubtreePictureCache(r)
}

export function invalidateNodePicture(
  r: SkiaRenderer,
  nodeId: string,
  changedKeys?: readonly (keyof SceneNode)[]
): void {
  r.textPreparationCache.deleteNode(nodeId, {
    keepShaping: changedKeys !== undefined && !changesShaping(changedKeys)
  })
  r.effectRasterCache.delete(nodeId)
  const pic = r.nodePictureCache.get(nodeId)
  if (pic) {
    pic.delete()
    r.nodePictureCache.delete(nodeId)
    r.nodePictureCacheGenerations.delete(nodeId)
  }
  const subtree = r.subtreePictureCache.get(nodeId)
  if (subtree) {
    subtree.picture.delete()
    r.subtreePictureCache.delete(nodeId)
  }
}

export function flashNode(r: SkiaRenderer, nodeId: string): void {
  r._flashes.push({ nodeId, startTime: performance.now() })
}

const MAX_AI_EDIT_CUES = 12

export function aiMarkActive(r: SkiaRenderer, nodeIds: string[]): void {
  const now = performance.now()
  for (const id of nodeIds.slice(-MAX_AI_EDIT_CUES)) {
    r._aiDoneFlashes.delete(id)
    r._aiActiveNodes.set(id, now)
  }
}

export function aiMarkDone(r: SkiaRenderer, nodeIds: string[]): void {
  aiFlashDone(
    r,
    nodeIds.filter((id) => r._aiActiveNodes.delete(id))
  )
}

export function aiFlashDone(r: SkiaRenderer, nodeIds: string[]): void {
  const now = performance.now()
  for (const id of nodeIds.slice(-MAX_AI_EDIT_CUES)) {
    r._aiDoneFlashes.delete(id)
    r._aiDoneFlashes.set(id, now)
  }
  for (const id of r._aiDoneFlashes.keys()) {
    if (r._aiDoneFlashes.size <= MAX_AI_EDIT_CUES) break
    r._aiDoneFlashes.delete(id)
  }
}

export function aiClearActive(r: SkiaRenderer): void {
  r._aiActiveNodes.clear()
}

export function aiClearAll(r: SkiaRenderer): void {
  r._aiActiveNodes.clear()
  r._aiDoneFlashes.clear()
}

export function hasActiveFlashes(r: SkiaRenderer): boolean {
  if (r._flashes.length > 0 || r._aiActiveNodes.size > 0) return true
  const now = performance.now()
  for (const start of r._aiDoneFlashes.values()) {
    if (now - start < AI_DONE_DURATION_MS) return true
  }
  return false
}
