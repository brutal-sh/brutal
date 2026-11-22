import { omit } from 'es-toolkit'

import type { PresenceCursor } from '@open-pencil/core/canvas'
import { getAxisAlignedWorldBounds } from '@open-pencil/scene-graph/coordinate'
import { computeBounds } from '@open-pencil/scene-graph/geometry'
import type { Vector } from '@open-pencil/scene-graph/primitives'

import type { EditorStore } from '@/app/editor/active-store'
import { animationsEnabled } from '@/app/shell/motion'

import {
  agentGlide,
  CURSOR_GLIDE_MS,
  FOLLOW_GLIDE_MS,
  glideAt,
  retarget,
  type Glide
} from './motion'

/** A cursor with the identity it keeps between updates, so it can glide rather than jump. */
type IdentifiedCursor = PresenceCursor & { id: string }
export type TrackedCursor = IdentifiedCursor & { editSequence?: number }

interface CursorMotion {
  anchor: Vector
  editSequence?: number
  glide: Glide
}

interface ViewGlide {
  center: Glide
  fromZoom: number
  toZoom: number
  /** Applies one step; the registry marks it as following's own viewport change. */
  move: (x: number, y: number, zoom: number) => void
}

interface Motion {
  targets: IdentifiedCursor[]
  glides: Map<string, CursorMotion>
  view: ViewGlide | null
  frame: number | null
}

const motions = new WeakMap<EditorStore, Motion>()

function motionOf(store: EditorStore): Motion {
  let motion = motions.get(store)
  if (!motion) {
    motion = { targets: [], glides: new Map(), view: null, frame: null }
    motions.set(store, motion)
  }
  return motion
}

function canAnimate(): boolean {
  return animationsEnabled.value && typeof requestAnimationFrame === 'function'
}

export function agentWorkBounds(
  store: EditorStore,
  { selection, outline }: Pick<PresenceCursor, 'selection' | 'outline'>,
  pageId: string
) {
  const layers = (selection ?? []).flatMap((id) => {
    const node = store.graph.getNode(id)
    return node && store.graph.pageOf(id) === pageId
      ? [getAxisAlignedWorldBounds(node, store.graph)]
      : []
  })
  // Streaming previews put the element the agent is pointing at last.
  return layers.length > 0 ? computeBounds(layers) : outline?.at(-1)
}

function schedule(store: EditorStore, motion: Motion): void {
  if (motion.frame !== null) return
  motion.frame = requestAnimationFrame(() => {
    motion.frame = null
    step(store, motion, performance.now())
  })
}

/** Draws every cursor where its glide is now, moves a following view, and asks for the next frame. */
function step(store: EditorStore, motion: Motion, now: number): void {
  let moving = false
  const animate = canAnimate()
  if (!animate) motion.glides.clear()
  store.state.presenceCursors = motion.targets.map((cursor) => {
    const entry = motion.glides.get(cursor.id)
    if (!entry) return cursor
    const { point, done } = glideAt(entry.glide, now)
    if (!done) moving = true
    return { ...cursor, x: point.x, y: point.y }
  })
  store.requestRepaint()
  const view = motion.view
  if (view && !animate) {
    motion.view = null
    view.move(view.center.to.x, view.center.to.y, view.toZoom)
  } else if (view) {
    const { point, done } = glideAt(view.center, now)
    const t = done ? 1 : (now - view.center.start) / view.center.duration
    // Zoom changes by ratio, so it eases evenly whether it doubles or halves.
    const zoom = view.fromZoom * (view.toZoom / view.fromZoom) ** Math.min(1, Math.max(0, t))
    view.move(point.x, point.y, zoom)
    if (done) motion.view = null
    else moving = true
  }
  if (moving) schedule(store, motion)
}

/**
 * Show people's and agents' cursors at `targets`. Each one glides from where it is drawn now;
 * a new one appears in place. With animations off, they move at once.
 */
export function showCursors(store: EditorStore, targets: TrackedCursor[]): void {
  const motion = motionOf(store)
  const now = performance.now()
  motion.targets = targets.map((cursor) => omit(cursor, ['editSequence']))
  if (!canAnimate()) {
    step(store, motion, now)
    return
  }
  const ids = new Set(targets.map((cursor) => cursor.id))
  for (const id of motion.glides.keys()) if (!ids.has(id)) motion.glides.delete(id)
  for (const cursor of targets) {
    const anchor = { x: cursor.x, y: cursor.y }
    const previous = motion.glides.get(cursor.id)
    const { editSequence } = cursor
    if (
      previous?.anchor.x === anchor.x &&
      previous.anchor.y === anchor.y &&
      previous.editSequence === editSequence
    )
      continue
    const bounds =
      editSequence !== undefined && editSequence !== previous?.editSequence
        ? agentWorkBounds(store, cursor, store.state.currentPageId)
        : undefined
    const glide = bounds
      ? agentGlide(previous?.glide, anchor, bounds, now, store.state.zoom)
      : retarget(previous?.glide, anchor, now, CURSOR_GLIDE_MS)
    motion.glides.set(cursor.id, { anchor, editSequence, glide })
  }
  step(store, motion, now)
}

/** The world point at the center of the view. */
function viewCenter(store: EditorStore): Vector {
  const screen = store.viewportCanvasCenter()
  return {
    x: (screen.x - store.state.panX) / store.state.zoom,
    y: (screen.y - store.state.panY) / store.state.zoom
  }
}

/**
 * Pan the view so `point` is centered, at `zoom`, gliding there from where it looks now. `move`
 * applies each step. With animations off, the view moves at once.
 */
export function glideViewTo(
  store: EditorStore,
  point: Vector,
  zoom: number,
  move: (x: number, y: number, zoom: number) => void
): void {
  const motion = motionOf(store)
  if (!canAnimate()) {
    motion.view = null
    move(point.x, point.y, zoom)
    return
  }
  const now = performance.now()
  const current = motion.view
    ? { center: glideAt(motion.view.center, now).point, zoom: store.state.zoom }
    : { center: viewCenter(store), zoom: store.state.zoom }
  if (current.center.x === point.x && current.center.y === point.y && current.zoom === zoom) return
  motion.view = {
    center: { from: current.center, to: point, start: now, duration: FOLLOW_GLIDE_MS },
    fromZoom: current.zoom,
    toZoom: zoom,
    move
  }
  schedule(store, motion)
}

/** Stop a view glide in place, as when following ends. */
export function stopViewGlide(store: EditorStore): void {
  motionOf(store).view = null
}
