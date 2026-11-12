import type { Surface, TypefaceFontProvider } from 'canvaskit-wasm'

import type { SceneNode, SceneGraph } from '@open-pencil/scene-graph'

import type { SkiaRenderer } from '#core/canvas/renderer'
import * as RendererFonts from '#core/canvas/renderer/fonts'
import { destroyRenderer, releaseLiveImages } from '#core/canvas/renderer/lifecycle'
import * as RendererState from '#core/canvas/renderer/state'

export const rendererResourcesMethods = {
  getFontProvider(): TypefaceFontProvider | null {
    return RendererFonts.getFontProvider(this)
  },

  isDestroyed(): boolean {
    return this.destroyed
  },

  async loadFonts(onFallbackFontsLoaded?: () => void): Promise<void> {
    await RendererFonts.loadFonts(this, onFallbackFontsLoaded)
  },

  syncFontGeneration(): void {
    RendererFonts.syncFontGeneration(this)
  },

  trackFontDemand(node: SceneNode, key: string): void {
    RendererFonts.trackFontDemand(this, node, key)
  },

  isTextPictureCurrent(node: SceneNode): boolean {
    return RendererFonts.isTextPictureCurrent(this, node)
  },

  async prepareForExport(graph: SceneGraph, pageId: string, nodeIds: string[]): Promise<void> {
    return RendererFonts.prepareForExport(this, graph, pageId, nodeIds)
  },

  replaceSurface(surface: Surface): void {
    // The replacement may have made another GL context current.
    this.surface.flush()
    this.tiledScene.destroy()
    // Live textures belong to the old surface's context, so they go before it does.
    releaseLiveImages(this)
    this.surface.delete()
    this.surface = surface
    this.sceneBackingAllocationFailed = false
    this.invalidateScenePicture()
  },

  invalidateScenePicture(): void {
    RendererState.invalidateScenePicture(this)
  },

  invalidateAllPictures(): void {
    RendererState.invalidateAllPictures(this)
  },

  invalidateNodePicture(nodeId: string, changedKeys?: readonly (keyof SceneNode)[]): void {
    RendererState.invalidateNodePicture(this, nodeId, changedKeys)
  },

  flashNode(nodeId: string): void {
    RendererState.flashNode(this, nodeId)
  },

  aiMarkActive(nodeIds: string[]): void {
    RendererState.aiMarkActive(this, nodeIds)
  },

  aiMarkDone(nodeIds: string[]): void {
    RendererState.aiMarkDone(this, nodeIds)
  },

  aiFlashDone(nodeIds: string[]): void {
    RendererState.aiFlashDone(this, nodeIds)
  },

  aiClearActive(): void {
    RendererState.aiClearActive(this)
  },

  aiClearAll(): void {
    RendererState.aiClearAll(this)
  },

  get hasActiveFlashes(): boolean {
    return RendererState.hasActiveFlashes(this)
  },

  invalidateVectorPath(nodeId: string): void {
    this.nodePaths.invalidate(nodeId)
  },

  destroy(): void {
    destroyRenderer(this)
  }
} satisfies ThisType<SkiaRenderer>
