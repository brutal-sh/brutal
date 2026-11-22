import { getActiveEditorStore } from '@/app/editor/active-store'
import { addAgent, renameAgent } from '@/app/presence/registry'

/** Test-only browser entrypoint: start an agent editing at a point on a named page. */
export function startTestAgent(
  pageName: string,
  x: number,
  y: number,
  identity?: { name: string; model: string }
) {
  const store = getActiveEditorStore()
  const page = store.graph.getPages().find((candidate) => candidate.name === pageName)
  if (!page) throw new Error(`Page not found: ${pageName}`)
  const agent = addAgent(store, 'chat', identity?.model, Boolean(identity))
  if (identity) renameAgent(store, agent.id, identity.name)
  agent.update({ status: 'editing', cursor: { x, y, pageId: page.id } })
  return { name: agent.name, pageId: page.id }
}
