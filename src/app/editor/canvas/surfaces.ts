import { MAX_VISIBLE_CANVAS_PANES } from '@/app/editor/panes/split-tree'

type CanvasLayer = 'scene' | 'overlays'
const idle: Record<CanvasLayer, HTMLCanvasElement[]> = { scene: [], overlays: [] }
const leased = new WeakMap<HTMLCanvasElement, CanvasLayer>()
const lost = new WeakSet<HTMLCanvasElement>()

/** Browser contexts belong to the window; document renderers only borrow their canvases. */
export function acquireEditorCanvas(layer: CanvasLayer): HTMLCanvasElement {
  let canvas = idle[layer].pop()
  while (canvas && lost.has(canvas)) canvas = idle[layer].pop()
  if (!canvas) {
    canvas = document.createElement('canvas')
    const element = canvas
    canvas.addEventListener('webglcontextlost', () => lost.add(element))
  }
  leased.set(canvas, layer)
  delete canvas.dataset.ready
  delete canvas.dataset.surfaceError
  return canvas
}

/** Called after Skia resources and the CanvasKit context handle have been released. */
export function releaseEditorCanvas(canvas: HTMLCanvasElement): void {
  const layer = leased.get(canvas)
  if (!layer) throw new Error('Editor canvas is not leased')
  leased.delete(canvas)
  canvas.remove()
  const ready = canvas.dataset.ready === '1'
  delete canvas.dataset.ready
  canvas.width = 1
  canvas.height = 1
  if (!lost.has(canvas) && idle[layer].length < MAX_VISIBLE_CANVAS_PANES) idle[layer].push(canvas)
  else if (ready && !lost.has(canvas)) {
    const context = canvas.getContext('webgl2') ?? canvas.getContext('webgl')
    context?.getExtension('WEBGL_lose_context')?.loseContext()
  }
}
