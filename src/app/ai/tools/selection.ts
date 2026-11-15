import type { EditorToolCall } from './runner'

/** Selection is a view action; document layout and undo recording must not run for it. */
export function selectInEditor(call: EditorToolCall): { selected: string[] } {
  const { store, figma, def, args } = call
  if (call.isLive?.() === false || figma.graph !== store.graph)
    throw new Error('The target document changed or closed before selection')
  if (figma.currentPageId !== store.state.currentPageId)
    throw new Error('The target page is no longer visible in this document')

  def.execute(figma, args)
  store.select(figma.currentPage.selection.map((node) => node.id))
  return { selected: [...store.state.selectedIds] }
}
