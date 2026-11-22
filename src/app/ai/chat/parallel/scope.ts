import type { FigmaAPI } from '@open-pencil/core/figma-api'
import type { ToolDef } from '@open-pencil/core/tools'

import type { EditorStore } from '@/app/editor/active-store'
import { getTabById } from '@/app/tabs'

export const VERSION_WIDTH = 560
export const VERSION_HEIGHT = 720
export const VERSION_GAP = 48

export interface DesignVersionTarget {
  store: EditorStore
  graph: EditorStore['graph']
  documentId: string
  pageId: string
  title: string
  x: number
  y: number
  committed: boolean
}

const targets = new Map<string, DesignVersionTarget>()

export function bindDesignVersion(chat: string, target: DesignVersionTarget): void {
  targets.set(chat, target)
}

export function releaseDesignVersion(chat: string): void {
  targets.delete(chat)
}

export function designVersionForChat(chat: unknown): DesignVersionTarget | undefined {
  return typeof chat === 'string' ? targets.get(chat) : undefined
}

export function designVersionIsOpen(target: DesignVersionTarget): boolean {
  return (
    getTabById(target.documentId)?.store === target.store &&
    !target.store.state.readOnly &&
    target.store.graph === target.graph &&
    target.graph.getNode(target.pageId)?.type === 'CANVAS'
  )
}

/** Give this version its own clipped frame in the same undo entry as the actual render. */
async function renderVersion(
  tool: ToolDef,
  target: DesignVersionTarget,
  figma: FigmaAPI,
  jsx: unknown
): Promise<unknown> {
  if (target.committed) throw new Error('This agent already committed its design version.')
  if (!designVersionIsOpen(target)) throw new Error('The design version’s document was closed.')
  const frame = figma.createFrame()
  frame.name = target.title
  frame.x = target.x
  frame.y = target.y
  frame.resize(VERSION_WIDTH, VERSION_HEIGHT)
  frame.clipsContent = true
  frame.fills = []
  try {
    const result = await tool.execute(figma, { jsx, parent_id: frame.id, x: 0, y: 0 })
    target.committed = true
    return result
  } catch (error) {
    frame.remove()
    throw error
  }
}

export function designVersionRender(tool: ToolDef, target: DesignVersionTarget): ToolDef {
  return { ...tool, execute: (figma, args) => renderVersion(tool, target, figma, args.jsx) }
}
