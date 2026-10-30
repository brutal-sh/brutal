import type { Editor } from '@open-pencil/core'
import { captureClipboardSnapshot } from '@open-pencil/core/clipboard'
import { readFigFile } from '@open-pencil/core/io/formats/fig'
import { IMPORTABLE_RASTER_TYPES, isSVGFile } from '@open-pencil/scene-graph/images'
import type { Vector } from '@open-pencil/scene-graph/primitives'

/** Insert into the chosen document through the same undoable operations as paste/drop. */
export async function importCanvasFile(
  editor: Editor,
  file: File,
  point: Vector,
  isCurrent: () => boolean
): Promise<void> {
  function checkDestination() {
    if (editor.state.readOnly) throw new Error('Choose an editable design before importing.')
    if (!isCurrent()) throw new Error('The import destination changed. Choose Import again.')
  }
  checkDestination()
  if (file.name.toLowerCase().endsWith('.fig')) {
    const graph = await readFigFile(file, { populate: 'all' })
    checkDestination()
    const pages = graph.getPages()
    if (pages.length !== 1)
      throw new Error(
        'Import currently accepts single-page Figma files. Use Open for this file to preserve all pages.'
      )
    const children = graph.getChildren(pages[0].id)
    if (!children.length) throw new Error('This Figma file has no layers to import.')
    await editor.pasteSnapshot(captureClipboardSnapshot(graph, children), point)
    return
  }
  if (!IMPORTABLE_RASTER_TYPES.has(file.type) && !isSVGFile(file))
    throw new Error('Choose a supported image, SVG, or single-page Figma file.')
  const before = new Set(editor.state.selectedIds)
  await editor.placeFiles([file], point.x, point.y, checkDestination)
  if (![...editor.state.selectedIds].some((id) => !before.has(id)))
    throw new Error(
      'No layers were imported. Check the file and wait for the canvas to finish loading.'
    )
}
