import type { Canvas, CanvasKit, TypefaceFontProvider } from 'canvaskit-wasm'

import { type SceneNode, type Fill } from '@open-pencil/scene-graph'

import type { SkiaRenderer } from '#core/canvas/renderer'
import { textVerticalOffset, withTextParagraph } from '#core/canvas/text'
import { drawTextLayout } from '#core/canvas/text/decorations'
import { canDrawSavedText, drawDerivedText, drawsSavedText } from '#core/canvas/text/derived'
import { drawLaidOutEmoji, drawSavedEmoji } from '#core/canvas/text/emoji'
import type { TextPreparationCache } from '#core/canvas/text/preparation/cache'
import { shownText } from '#core/text/case'
import { mayHoldEmoji } from '#core/text/emoji'
import type { FontResolutionSettled } from '#core/text/resolver'
export interface FontReadinessRenderer {
  textPreparationCache?: TextPreparationCache
  ck?: CanvasKit
  fontProvider?: TypefaceFontProvider | null
  fontsLoaded?: boolean
  onFontResolutionSettled?: FontResolutionSettled
  trackFontDemand?: (node: SceneNode, key: string) => void
}

export interface TextRenderer extends FontReadinessRenderer {
  ck: CanvasKit
  fontProvider: TypefaceFontProvider | null
  fontsLoaded: boolean
}

function hasComplexTextFill(fill?: Fill): boolean {
  return fill !== undefined && fill.type !== 'SOLID'
}

function drawPaintedText(r: SkiaRenderer, canvas: Canvas, node: SceneNode): boolean {
  if (!r.fontsLoaded || !r.fontProvider) return false
  // Apply the shader directly to native glyphs: coverage layers add another rounding pass.
  return withTextParagraph(
    r,
    node,
    r.ck.Color4f(0, 0, 0, 1),
    {
      halfLeading: true,
      foregroundPaint: r.fillPaint
    },
    (paragraph, prepared) => {
      const y = textVerticalOffset(node, paragraph.getHeight())
      drawTextLayout(r.ck, canvas, node, prepared, y, r.fillPaint)
      return true
    }
  )
}

function drawResolvedPathText(
  r: SkiaRenderer,
  canvas: Canvas,
  node: SceneNode,
  options: { fontReadiness: ReturnType<SkiaRenderer['nodeFontReadiness']>; fill?: Fill }
): boolean {
  const { fontReadiness, fill } = options
  return (
    // Resolving the exact face must not replace curved glyph placement with a straight paragraph.
    fontReadiness !== 'exhausted' &&
    node.textPathData !== null &&
    drawDerivedText(r, canvas, node, fill)
  )
}

/** Whether the text is drawn from the editor's own layout, which leaves its emoji to be drawn. */
function drawsLaidOutText(r: SkiaRenderer, node: SceneNode): boolean {
  if (!r.fontsLoaded || !r.fontProvider || node.textPathData !== null) return false
  const readiness = r.nodeFontReadiness(node)
  return readiness !== 'pending' && readiness !== 'exhausted' && mayHoldEmoji(shownText(node))
}

/**
 * The emoji of a text, once whatever fills it has: over its saved glyphs' placeholder squares, or
 * over the blank squares the editor's layout gives them.
 */
export function drawTextEmoji(r: SkiaRenderer, canvas: Canvas, node: SceneNode): void {
  const saved = drawsSavedText(node)
  if (!saved && !drawsLaidOutText(r, node)) return
  canvas.save()
  if (saved) drawSavedEmoji(r, canvas, node)
  else {
    withTextParagraph(r, node, r.ck.BLACK, { halfLeading: true }, (paragraph) =>
      drawLaidOutEmoji(r, canvas, node, paragraph, textVerticalOffset(node, paragraph.getHeight()))
    )
  }
  canvas.restore()
}

function drawSavedText(r: SkiaRenderer, canvas: Canvas, node: SceneNode, fill?: Fill): boolean {
  return canDrawSavedText(node, fill) && drawDerivedText(r, canvas, node, fill)
}

function drawExhaustedText(r: SkiaRenderer, canvas: Canvas, node: SceneNode, fill?: Fill): void {
  if (node.textPicture && r.isTextPictureCurrent(node)) {
    const picture = r.ck.MakePicture(node.textPicture)
    if (picture) {
      canvas.drawPicture(picture)
      picture.delete()
      return
    }
  }
  drawDerivedText(r, canvas, node, fill)
}

function drawParagraphOrFont(r: SkiaRenderer, canvas: Canvas, node: SceneNode): void {
  if (r.fontsLoaded && r.fontProvider) {
    withTextParagraph(
      r,
      node,
      r.fillPaint.getColor(),
      { halfLeading: true },
      (paragraph, prepared) => {
        const paragraphY = textVerticalOffset(node, paragraph.getHeight())
        drawTextLayout(r.ck, canvas, node, prepared, paragraphY, r.fillPaint)
      }
    )
  } else if (r.textFont) {
    const fontSize = node.fontSize || r.DEFAULT_FONT_SIZE
    const paragraphY = textVerticalOffset(node, fontSize)
    canvas.drawText(shownText(node), 0, paragraphY + fontSize, r.fillPaint, r.textFont)
  }
}

export function renderText(r: SkiaRenderer, canvas: Canvas, node: SceneNode, fill?: Fill): void {
  const text = node.text
  if (!text) return

  canvas.save()

  if (drawSavedText(r, canvas, node, fill)) {
    canvas.restore()
    return
  }
  const fontReadiness = r.nodeFontReadiness(node)
  if (fontReadiness === 'pending') {
    canvas.restore()
    return
  }
  if (drawResolvedPathText(r, canvas, node, { fontReadiness, fill })) {
    canvas.restore()
    return
  }
  if (fontReadiness === 'exhausted') {
    drawExhaustedText(r, canvas, node, fill)
    canvas.restore()
    return
  }
  if (hasComplexTextFill(fill) && drawPaintedText(r, canvas, node)) {
    canvas.restore()
    return
  }
  drawParagraphOrFont(r, canvas, node)

  canvas.restore()
}
