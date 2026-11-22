import { useTimeoutFn } from '@vueuse/core'

import type { Editor } from '@open-pencil/core'
import { AI_DONE_DURATION_MS } from '@open-pencil/core/constants'

import { animationsEnabled } from '@/app/shell/motion'

export function createFlashActions(editor: Editor) {
  let frame: number | null = null

  function repaint() {
    for (const renderer of editor.canvasRenderers)
      renderer.aiMotionEnabled = animationsEnabled.value
    editor.requestRepaint()
  }

  const expiry = useTimeoutFn(repaint, AI_DONE_DURATION_MS, { immediate: false })

  function schedule() {
    if (
      frame === null &&
      editor.canvasRenderers.some((renderer) =>
        animationsEnabled.value ? renderer.hasActiveFlashes : renderer._flashes.length > 0
      )
    ) {
      frame = requestAnimationFrame(() => {
        frame = null
        repaint()
        schedule()
      })
    }
  }

  function flashNodes(nodeIds: string[]) {
    if (!editor.renderer) return
    for (const id of nodeIds) editor.renderer.flashNode(id)
    repaint()
    schedule()
  }

  function aiMarkActive(nodeIds: string[]) {
    if (!nodeIds.length || !editor.canvasRenderers.length) return
    for (const renderer of editor.canvasRenderers) renderer.aiMarkActive(nodeIds)
    repaint()
    schedule()
  }

  function aiClearActive() {
    for (const renderer of editor.canvasRenderers) renderer.aiClearActive()
    repaint()
  }

  function aiFlashDone(nodeIds: string[]) {
    if (!nodeIds.length || !editor.canvasRenderers.length) return
    for (const renderer of editor.canvasRenderers) renderer.aiFlashDone(nodeIds)
    repaint()
    schedule()
    // Reduced motion keeps a stationary outline until this repaint clears it.
    expiry.start()
  }

  function clearEditCues() {
    expiry.stop()
    for (const renderer of editor.canvasRenderers) renderer.aiClearAll()
  }
  const stopGraphListener = editor.onEditorEvent('graph:replaced', () => {
    clearEditCues()
    repaint()
  })

  function disposeFlashes() {
    stopGraphListener()
    if (frame !== null) cancelAnimationFrame(frame)
    clearEditCues()
  }

  return { flashNodes, aiMarkActive, aiClearActive, aiFlashDone, disposeFlashes }
}
