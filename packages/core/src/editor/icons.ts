import { noop } from 'es-toolkit'

import type { SceneNode } from '@open-pencil/scene-graph'
import { BLACK } from '@open-pencil/scene-graph/constants'
import {
  hasIconFills,
  isIconModified,
  readIcon,
  type IconOptions
} from '@open-pencil/scene-graph/icons'
import { findInstanceAncestor } from '@open-pencil/scene-graph/instances'
import type { Color } from '@open-pencil/scene-graph/primitives'

import { DEFAULT_ICON_SIZE } from '#core/constants'
import { assertNodeEditable } from '#core/editor/capabilities'
import { prepareSlotEdits } from '#core/editor/components/slots'
import { restoreSubtree, snapshotSubtree } from '#core/editor/history/subtree'
import type { NodePreview, NodePreviewOptions } from '#core/editor/node-preview'
import type { EditorContext } from '#core/editor/types'
import { pushCreatedSubtreesUndo } from '#core/editor/undo'
import { MATERIAL_SYMBOLS_PREFIXES } from '#core/icons/material-symbols/font'
import { parseIconName } from '#core/icons/provider'
import { detachIcon, placeIcon, recolorIcon, swapIcon } from '#core/icons/render'
import type { IconData } from '#core/icons/types'
import { previewIconWeight } from '#core/icons/weight'

/**
 * Icon commands: insert, swap, and recolor, each one undo step. An icon is a frame of paths,
 * so inserting and swapping record the frame's whole subtree and swap between the copies.
 */
export function createIconActions(
  ctx: EditorContext,
  beginNodePreview: (label: string, options?: NodePreviewOptions) => NodePreview
) {
  const drawingRequests = new Map<string, symbol>()
  async function fetchIcon(name: string, size: number, options?: IconOptions): Promise<IconData> {
    const icon = (await ctx.icons.icons([name], size, options)).get(name)
    if (!icon || icon.paths.length === 0) throw new Error(`Icon "${name}" not found`)
    return icon
  }

  /** Runs `change` on the icon `frameId`, undoably, putting back the subtree it had before. */
  function changeIcon(label: string, frameId: string, change: () => void): void {
    const frame = ctx.graph.getNode(frameId)
    const parentId = frame?.parentId
    if (!frame || !parentId) return
    const index = ctx.graph.getNode(parentId)?.childIds.indexOf(frameId) ?? -1
    const before = snapshotSubtree(ctx.graph, frameId)
    change()
    const after = snapshotSubtree(ctx.graph, frameId)
    const show = (snapshot: Map<string, SceneNode>) => () => {
      const root = snapshot.get(frameId)
      if (!root) return
      if (ctx.graph.getNode(frameId)) ctx.graph.deleteNode(frameId)
      restoreSubtree(ctx.graph, root, parentId, snapshot)
      if (index !== -1) ctx.graph.insertChildAt(frameId, parentId, index)
      ctx.requestRender()
    }
    ctx.undo.push({ label, forward: show(after), inverse: show(before) })
    ctx.requestRender()
  }

  /**
   * Places the icon `name` at the middle of the view, in the container being edited or the
   * page, or at a supplied parent-local position, and selects it. Returns null when its
   * document or explicit placement target is no longer editable after loading.
   */
  async function insertIcon(
    name: string,
    color: Color = BLACK,
    at?: { parentId: string; x: number; y: number; name?: string }
  ): Promise<string | null> {
    const graph = ctx.graph
    const pageId = ctx.state.currentPageId
    const target = at ? graph.getNode(at.parentId) : undefined
    const icon = await fetchIcon(name, DEFAULT_ICON_SIZE)
    // Opening another document while the icon loaded leaves nothing to insert it into.
    if (ctx.graph !== graph) return null
    if (
      at &&
      (ctx.state.readOnly ||
        ctx.state.currentPageId !== pageId ||
        !target ||
        graph.getNode(at.parentId) !== target ||
        graph.pageOf(at.parentId) !== pageId)
    )
      return null
    const { width, height } = ctx.getViewportSize()
    const parentId = at?.parentId ?? ctx.state.enteredContainerId ?? ctx.state.currentPageId
    const origin =
      parentId === ctx.state.currentPageId
        ? { x: 0, y: 0 }
        : ctx.graph.getAbsolutePosition(parentId)
    const x = (width / 2 - ctx.state.panX) / ctx.state.zoom - origin.x - DEFAULT_ICON_SIZE / 2
    const y = (height / 2 - ctx.state.panY) / ctx.state.zoom - origin.y - DEFAULT_ICON_SIZE / 2
    return ctx.undo.runBatch('Insert icon', () => {
      assertNodeEditable(graph, parentId)
      if (!prepareSlotEdits(ctx, [parentId])) return null
      const previousSelection = new Set(ctx.state.selectedIds)
      const frame = placeIcon(graph, parentId, icon, {
        size: DEFAULT_ICON_SIZE,
        color,
        overrides: at
          ? { x: at.x, y: at.y, ...(at.name !== undefined && { name: at.name }) }
          : { x: Math.round(x), y: Math.round(y) }
      })
      pushCreatedSubtreesUndo(ctx, 'Insert icon', [frame.id], previousSelection)
      ctx.setSelectedIds(new Set([frame.id]))
      ctx.requestRender()
      return frame.id
    })
  }

  async function loadIcon(
    frameId: string,
    name: string,
    options?: IconOptions,
    signal?: AbortSignal
  ) {
    const graph = ctx.graph
    const frame = graph.getNode(frameId)
    const parsed = parseIconName(name)
    const pageId = ctx.state.currentPageId
    const cancelled = () => ctx.state.readOnly || signal?.aborted
    if (!frame || !readIcon(frame) || !parsed || cancelled()) return undefined
    assertNodeEditable(graph, frameId)
    const size = Math.min(frame.width, frame.height)
    const request = Symbol('icon drawing request')
    drawingRequests.set(frameId, request)
    try {
      const loaded = (await ctx.icons.icons([name], size, options)).get(name)
      const icon = loaded ?? {
        prefix: parsed.prefix,
        name: parsed.iconName,
        width: size,
        height: size,
        paths: [],
        options
      }
      // Pending results belong to the exact editable icon and latest request that started them.
      if (
        ctx.graph !== graph ||
        graph.getNode(frameId) !== frame ||
        !readIcon(frame) ||
        cancelled() ||
        ctx.state.currentPageId !== pageId ||
        drawingRequests.get(frameId) !== request
      )
        return undefined
      assertNodeEditable(graph, frameId)
      return { graph, frame, icon }
    } finally {
      if (drawingRequests.get(frameId) === request) drawingRequests.delete(frameId)
    }
  }

  /** Draws only after loading; its synchronous apply owns the history step. */
  async function drawIcon(
    label: string,
    frameId: string,
    name: string,
    options?: IconOptions,
    signal?: AbortSignal
  ) {
    const loaded = await loadIcon(frameId, name, options, signal)
    if (
      !loaded ||
      ctx.graph !== loaded.graph ||
      ctx.graph.getNode(frameId) !== loaded.frame ||
      signal?.aborted
    )
      return
    changeIcon(label, frameId, () => swapIcon(loaded.graph, frameId, loaded.icon))
  }

  /**
   * Draws the icon `name` in the icon `frameId`, keeping its size, position, and color, and how
   * it is drawn when the new icon is from the same set.
   */
  async function swapIconGlyph(frameId: string, name: string, options?: IconOptions) {
    const frame = ctx.graph.getNode(frameId)
    const current = frame && readIcon(frame)
    const sameSet = current && parseIconName(current.name)?.prefix === parseIconName(name)?.prefix
    await drawIcon('Swap icon', frameId, name, options ?? (sameSet ? current.options : undefined))
  }

  async function setIconOptions(frameId: string, options: IconOptions, signal?: AbortSignal) {
    const frame = ctx.graph.getNode(frameId)
    const icon = frame && readIcon(frame)
    if (icon)
      await drawIcon(
        'Change icon options',
        frameId,
        icon.name,
        { ...icon.options, ...options },
        signal
      )
  }

  /** An owned Material weight edit; no global Undo batch remains open across provider work. */
  function beginIconWeightPreview(frameId: string) {
    const graph = ctx.graph
    const frame = graph.getNode(frameId)
    const identity = frame && readIcon(frame)
    const prefix = identity && parseIconName(identity.name)?.prefix
    if (!frame || !identity || !MATERIAL_SYMBOLS_PREFIXES.some((known) => known === prefix))
      return null
    assertNodeEditable(graph, frameId)
    if (isIconModified(graph, frame))
      throw new Error('Reset the edited icon before changing its weight')
    const preview = beginNodePreview('Change icon weight', { ownStep: true })
    let request: AbortController | null = null
    let pending = Promise.resolve()
    let ending = false
    let updating = false
    const protectedIds = new Set([frameId, ...frame.childIds])
    const instance = findInstanceAncestor(graph, frameId)
    if (instance) protectedIds.add(instance.id)
    const stopObserving = graph.observeNodeChanges({
      created: noop,
      before(node) {
        if (preview.closed) {
          stopObserving()
          return
        }
        if (!updating && protectedIds.has(node.id)) finish(true)
      }
    })
    const stopSettling = ctx.undo.onBeforeHistory(() => finish(true))

    function finish(commit: boolean) {
      ending = true
      request?.abort()
      stopObserving()
      stopSettling()
      if (commit && !ctx.state.readOnly) preview.commit()
      else preview.cancel()
    }

    return {
      get closed() {
        return preview.closed
      },
      update(weight: number) {
        if (ending || preview.closed) return Promise.resolve()
        if (!Number.isFinite(weight)) throw new RangeError('Icon weight must be finite')
        request?.abort()
        const owner = new AbortController()
        request = owner
        const options = { ...readIcon(frame)?.options, wght: weight }
        pending = (async () => {
          try {
            const loaded = await loadIcon(frameId, identity.name, options, owner.signal)
            if (!loaded || owner.signal.aborted || preview.closed || ctx.graph !== graph) return
            updating = true
            try {
              previewIconWeight(graph, frame, loaded.icon, preview.update)
            } finally {
              updating = false
            }
          } catch (error) {
            if (owner.signal.aborted || preview.closed) return
            finish(false)
            throw error
          }
        })()
        return pending
      },
      async commit() {
        if (ending || preview.closed) return
        ending = true
        await pending
        stopObserving()
        stopSettling()
        if (ctx.state.readOnly) preview.cancel()
        else preview.commit()
      },
      cancel: () => finish(false),
      finish: () => finish(true)
    }
  }

  /** Draws the icon `frameId` was placed as afresh, undoing edits to its paths. */
  async function resetIcon(frameId: string) {
    const frame = ctx.graph.getNode(frameId)
    const icon = frame && readIcon(frame)
    if (icon) await drawIcon('Reset icon', frameId, icon.name, icon.options)
  }

  /** Makes the icon `frameId` plain artwork that keeps its paths; see `detachIcon`. */
  function detachIconFrame(frameId: string) {
    const frame = ctx.graph.getNode(frameId)
    if (!frame || !readIcon(frame)) return
    changeIcon('Detach icon', frameId, () => detachIcon(ctx.graph, frameId))
  }

  /**
   * Sets the color of the icon `frameId`'s tinted paths. Only their paints are recorded, so a
   * color drag batched into one step stays cheap.
   */
  function setIconColor(frameId: string, color: Color) {
    const frame = ctx.graph.getNode(frameId)
    if (frame && hasIconFills(frame)) {
      const before = frame.fills
      recolorIcon(ctx.graph, frameId, color)
      const after = frame.fills
      const apply = (fills: typeof before) => () => {
        ctx.graph.updateNode(frameId, { fills })
        ctx.requestRender()
      }
      ctx.undo.push({ label: 'Change icon color', forward: apply(after), inverse: apply(before) })
      ctx.requestRender()
      return
    }
    const paints = () =>
      ctx.graph.getChildren(frameId).map(({ id, fills, strokes }) => ({ id, fills, strokes }))
    const before = paints()
    recolorIcon(ctx.graph, frameId, color)
    const after = paints()
    const apply = (state: typeof before) => () => {
      for (const { id, ...rest } of state) ctx.graph.updateNode(id, rest)
      ctx.requestRender()
    }
    ctx.undo.push({ label: 'Change icon color', forward: apply(after), inverse: apply(before) })
    ctx.requestRender()
  }

  return {
    /** Where the editor's icons come from, for pickers to search and preview. */
    iconProvider: ctx.icons,
    insertIcon,
    swapIconGlyph,
    setIconOptions,
    beginIconWeightPreview,
    resetIcon,
    detachIcon: detachIconFrame,
    setIconColor
  }
}
