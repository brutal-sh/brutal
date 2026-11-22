import type { Rect, Vector } from '@open-pencil/scene-graph/primitives'

/** How long a cursor takes to glide to where its owner last moved it. */
export const CURSOR_GLIDE_MS = 180
/** How long the view takes to pan to where the followed person or agent went. */
export const FOLLOW_GLIDE_MS = 260
const AGENT_GLIDE_MS = 550

/** A move from one point to another that started at `start` and lasts `duration` ms. */
export interface Glide {
  from: Vector
  to: Vector
  start: number
  duration: number
  controls?: [Vector, Vector]
}

/** Fast start, gentle stop, so a cursor catches up quickly and settles without overshooting. */
export function easeOutCubic(t: number): number {
  const clamped = Math.min(1, Math.max(0, t))
  return 1 - (1 - clamped) ** 3
}

/** Where a glide is at `now`, and whether it has arrived. */
export function glideAt(glide: Glide, now: number): { point: Vector; done: boolean } {
  const t = glide.duration > 0 ? (now - glide.start) / glide.duration : 1
  const k = easeOutCubic(t)
  const { from, to, controls } = glide
  if (controls) {
    const [first, second] = controls
    const remaining = 1 - k
    const start = remaining ** 3
    const lead = 3 * remaining ** 2 * k
    const turn = 3 * remaining * k ** 2
    const end = k ** 3
    return {
      point: {
        x: from.x * start + first.x * lead + second.x * turn + to.x * end,
        y: from.y * start + first.y * lead + second.y * turn + to.y * end
      },
      done: t >= 1
    }
  }
  return {
    point: {
      x: from.x + (to.x - from.x) * k,
      y: from.y + (to.y - from.y) * k
    },
    done: t >= 1
  }
}

/** A short cursor pass around the nearest corner, with screen-sized movement at any zoom. */
export function agentGlide(
  previous: Glide | undefined,
  anchor: Vector,
  bounds: Rect,
  now: number,
  zoom: number
): Glide {
  const horizontal = anchor.x - bounds.x <= bounds.width / 2 ? 1 : -1
  const vertical = anchor.y - bounds.y <= bounds.height / 2 ? 1 : -1
  const x = horizontal === 1 ? bounds.x : bounds.x + bounds.width
  const y = vertical === 1 ? bounds.y : bounds.y + bounds.height
  const gap = 12 / zoom
  const sweep = Math.min(bounds.width * 0.6, 120 / zoom)
  const travel = Math.min(bounds.height * 0.45, 64 / zoom)
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    return retarget(previous, anchor, now, CURSOR_GLIDE_MS)
  }
  return {
    from: previous ? glideAt(previous, now).point : anchor,
    to: { x: x - horizontal * gap, y: y + vertical * travel },
    controls: [
      { x: x + horizontal * sweep, y: y - vertical * gap * 3 },
      { x: x - horizontal * gap * 4, y: y - vertical * gap }
    ],
    start: now,
    duration: AGENT_GLIDE_MS
  }
}

/**
 * A glide to `to` that starts wherever the previous one is now, so frequent updates never make a
 * cursor jump back. Without a previous glide the point simply appears at `to`.
 */
export function retarget(
  previous: Glide | undefined,
  to: Vector,
  now: number,
  duration: number
): Glide {
  if (!previous) return { from: to, to, start: now, duration: 0 }
  if (previous.to.x === to.x && previous.to.y === to.y) return previous
  return { from: glideAt(previous, now).point, to, start: now, duration }
}
