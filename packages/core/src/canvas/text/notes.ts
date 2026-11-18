import type { Canvas } from 'canvaskit-wasm'

import type { Fill, SceneNode } from '@open-pencil/scene-graph'
import { noteBody } from '@open-pencil/scene-graph/generated'

import {
  drawNoteBodyCoverage,
  drawNoteTextCoverage,
  isNoteRasterExport,
  noteRasterFor,
  type NoteRaster
} from '#core/canvas/note-raster'
import type { SkiaRenderer } from '#core/canvas/renderer'
import type { NodePaintContext } from '#core/canvas/scene/types'
import { fontManager } from '#core/text/fonts'

import { noteStrikeMatches, noteStrikeOutline } from './note-strike'
import { textNodeToOutlinePath } from './outlines'

/** Draw generated Note bodies with shaped glyph outlines and vector coverage. */
export function drawNoteFill(
  { r: renderer, canvas, node, graph }: NodePaintContext,
  fill: Fill
): boolean {
  const rasterFill = fill.type === 'SOLID' && (!fill.blendMode || fill.blendMode === 'NORMAL')
  if (node.type !== 'TEXT') {
    if (
      !rasterFill ||
      node.childIds.length !== 1 ||
      node.independentCorners ||
      node.cornerSmoothing !== 0 ||
      !isNoteRasterExport(canvas) ||
      !noteBody(graph, node)
    ) {
      return false
    }
    const raster = noteRasterFor(renderer.ck, canvas)
    return !!raster && drawNoteBodyCoverage(raster, node, renderer.fillPaint)
  }

  const parent = node.parentId && graph.getNode(node.parentId)
  if (!parent || noteBody(graph, parent)?.id !== node.id) return false
  const raster = rasterFill ? noteRasterFor(renderer.ck, canvas) : null
  return drawNoteText(renderer, canvas, node, raster)
}

function drawNoteText(
  renderer: SkiaRenderer,
  canvas: Canvas,
  node: SceneNode,
  raster: NoteRaster | null
): boolean {
  const mediumFont =
    raster &&
    node.fontFamily === 'Instrument Sans' &&
    node.fontWeight === 500 &&
    !node.italic &&
    !node.opticalSizeFromFontSize &&
    node.fontVariations.length === 0 &&
    node.styleRuns.length === 0 &&
    fontManager.bundledData(node.fontFamily, 'Medium')
  const path = textNodeToOutlinePath(
    renderer,
    node,
    'pixel',
    mediumFont && noteStrikeMatches(mediumFont)
      ? (glyph) =>
          glyph.source?.fontData === mediumFont
            ? noteStrikeOutline(glyph.id, glyph.fontSize)
            : undefined
      : undefined
  )
  if (!path) return false
  try {
    if (!raster || !drawNoteTextCoverage(raster, path, renderer.fillPaint)) {
      canvas.drawPath(path, renderer.fillPaint)
    }
  } finally {
    path.delete()
  }
  return true
}
