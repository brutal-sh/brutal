import { bindCanvasInput } from '#vue/canvas/input/bind'
import { createCanvasInputState, type CanvasInputOptions } from '#vue/canvas/input/state'

type CanvasInputArguments = [
  canvasRef: CanvasInputOptions['canvasRef'],
  editor: CanvasInputOptions['editor'],
  hitTestSectionTitle: CanvasInputOptions['hitTestSectionTitle'],
  hitTestComponentLabel: CanvasInputOptions['hitTestComponentLabel'],
  hitTestFrameTitle: CanvasInputOptions['hitTestFrameTitle'],
  onCursorMove?: CanvasInputOptions['onCursorMove'],
  onActivate?: CanvasInputOptions['onActivate'],
  isEnabled?: CanvasInputOptions['isEnabled'],
  /** How far wheel and pinch zoom move per event; 1 is the default rate. */
  zoomSpeed?: CanvasInputOptions['zoomSpeed']
]

/**
 * Wires selection, drawing, transforms, text editing and scoped pointer input to an Brutal canvas.
 * Intended for editor shell components that own the canvas.
 */
export function useCanvasInput(
  ...[
    canvasRef,
    editor,
    hitTestSectionTitle,
    hitTestComponentLabel,
    hitTestFrameTitle,
    onCursorMove,
    onActivate,
    isEnabled = () => true,
    zoomSpeed = () => 1
  ]: CanvasInputArguments
) {
  const state = createCanvasInputState({
    canvasRef,
    editor,
    hitTestSectionTitle,
    hitTestComponentLabel,
    hitTestFrameTitle,
    onCursorMove,
    onActivate,
    isEnabled,
    zoomSpeed
  })
  return bindCanvasInput(state)
}

// Preserve the positional SDK entry point's arity metadata as well as its call contract.
Object.defineProperty(useCanvasInput, 'length', { value: 7 })
