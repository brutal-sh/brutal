import {
  getAbsolutePosition,
  getNodeLocalMatrix,
  getParentWorldMatrix,
  isTranslationOnly,
  localTransformFromWorld
} from '../coordinate'
import { cloneNodeProps } from '../copy'
import type { SceneGraph } from '../graph'
import { remapInstanceOverrideState } from '../instances/overrides'
import Matrix from '../matrix'
import { CONTAINER_TYPES } from '../node-defaults'
import type { Rect, Vector } from '../primitives'
import { markSourceFieldsEdited } from '../source-metadata'
import type { SceneNode } from '../types'

/** Hierarchy queries, world-preserving moves, deletion and subtree copies. */
export class GraphTree {
  private readonly absPosCache = new Map<string, Vector>()

  constructor(
    private readonly graph: SceneGraph,
    private readonly unindexInstance: (componentId: string, instanceId: string) => void
  ) {}

  countDescendants(nodeId: string): number {
    const node = this.graph.nodes.get(nodeId)
    if (!node) return 0
    let count = 0
    const stack = [...node.childIds]
    while (stack.length > 0) {
      const id = stack.pop()
      if (id === undefined) break
      count++
      const child = this.graph.nodes.get(id)
      if (child) {
        for (const childId of child.childIds) {
          stack.push(childId)
        }
      }
    }
    return count
  }

  getChildren(id: string): SceneNode[] {
    const node = this.graph.nodes.get(id)
    if (!node) return []
    return node.childIds
      .map((cid) => this.graph.nodes.get(cid))
      .filter((n): n is SceneNode => n !== undefined)
  }

  closest(id: string, match: (node: SceneNode) => boolean): SceneNode | undefined {
    let current = this.graph.nodes.get(id)
    for (let steps = 0; current && steps < this.graph.nodes.size; steps++) {
      if (match(current)) return current
      current = current.parentId ? this.graph.nodes.get(current.parentId) : undefined
    }
    return undefined
  }

  pageOf(id: string): string | null {
    return this.graph.closest(id, (node) => node.type === 'CANVAS')?.id ?? null
  }

  reparentNode(nodeId: string, newParentId: string): void {
    const node = this.graph.nodes.get(nodeId)
    if (!node || nodeId === this.graph.rootId) return
    if (this.graph.isDescendant(newParentId, nodeId)) return

    const oldParent = node.parentId ? this.graph.nodes.get(node.parentId) : undefined
    const newParent = this.graph.nodes.get(newParentId)
    if (!newParent) return
    if (node.parentId === newParentId) return

    const oldParentId = node.parentId
    this.graph.willChangeNode(node)
    this.graph.willChangeNode(oldParent)
    this.graph.willChangeNode(newParent)
    this.absPosCache.clear()

    const oldParentWorld = getParentWorldMatrix(oldParent, this.graph)
    const newParentWorld = getParentWorldMatrix(newParent, this.graph)

    if (oldParent) {
      oldParent.childIds = oldParent.childIds.filter((cid) => cid !== nodeId)
    }

    node.parentId = newParentId
    newParent.childIds.push(nodeId)

    if (isTranslationOnly(oldParentWorld) && isTranslationOnly(newParentWorld)) {
      node.x += oldParentWorld[2] - newParentWorld[2]
      node.y += oldParentWorld[5] - newParentWorld[5]
    } else {
      const world = Matrix.multiply(oldParentWorld, getNodeLocalMatrix(node))
      const local = localTransformFromWorld(node, world, newParentWorld)
      if (local) Object.assign(node, local)
    }

    this.graph.emitter.emit('node:reparented', nodeId, oldParentId, newParentId)
  }

  insertChildAt(childId: string, parentId: string, index: number): void {
    const node = this.graph.nodes.get(childId)
    const newParent = this.graph.nodes.get(parentId)
    if (!node || !newParent || this.graph.isDescendant(parentId, childId)) return
    const previousParentId = node.parentId
    const oldParent = previousParentId ? this.graph.nodes.get(previousParentId) : undefined
    this.graph.willChangeNode(node)
    this.graph.willChangeNode(oldParent)
    this.graph.willChangeNode(newParent)
    if (oldParent) {
      oldParent.childIds = oldParent.childIds.filter((id) => id !== childId)
    }
    newParent.childIds = newParent.childIds.filter((id) => id !== childId)
    const at = Math.min(index, newParent.childIds.length)
    newParent.childIds.splice(at, 0, childId)
    node.parentId = parentId
    this.absPosCache.clear()
    this.graph.emitter.emit('node:reordered', childId, parentId, at, previousParentId)
  }

  deleteNode(id: string): void {
    const node = this.graph.nodes.get(id)
    if (!node || id === this.graph.rootId) return
    this.graph.willChangeNode(node)

    if (node.parentId) {
      const parent = this.graph.nodes.get(node.parentId)
      this.graph.willChangeNode(parent)
      if (parent) {
        parent.childIds = parent.childIds.filter((cid) => cid !== id)
      }
    }

    for (const childId of Array.from(node.childIds)) {
      this.graph.deleteNode(childId)
    }

    if (node.type === 'INSTANCE' && node.componentId) this.unindexInstance(node.componentId, id)
    this.graph.connectorIds.delete(id)
    this.graph.nodes.delete(id)
    this.graph.emitter.emit('node:deleted', id, node.parentId)
  }

  cloneTree(
    sourceId: string,
    parentId: string,
    overrides: Partial<SceneNode> = {},
    sourceGraph: SceneGraph = this.graph
  ): SceneNode | null {
    if (sourceGraph === this.graph && this.graph.isDescendant(parentId, sourceId)) return null
    const copies = new Map<string, SceneNode>()
    const copy = (
      id: string,
      parent: string,
      changes: Partial<SceneNode> = {}
    ): SceneNode | null => {
      const src = sourceGraph.nodes.get(id)
      if (!src) return null
      const props = cloneNodeProps(src, null)
      // A clone is local and has not been reviewed.
      if (props.source) props.source = { ...props.source, id: null, orderKey: null }
      props.status = null
      const clone = this.graph.createNode(src.type, parent, { ...props, ...changes })
      if (src.status) markSourceFieldsEdited(clone, ['status'])
      copies.set(id, clone)
      for (const childId of src.childIds) copy(childId, clone.id)
      return clone
    }
    const root = copy(sourceId, parentId, overrides)
    for (const node of copies.values()) {
      if (!node.instanceOverrides.self.size && !node.instanceOverrides.descendants.size) continue
      this.graph.updateNode(node.id, {
        instanceOverrides: remapInstanceOverrideState(node.instanceOverrides, {
          node: (id) => copies.get(id)?.id ?? id,
          component: (id) => id,
          variable: (id) => id
        })
      })
    }
    return root
  }

  flattenTree(parentId?: string, depth = 0): Array<{ node: SceneNode; depth: number }> {
    const id = parentId ?? this.graph.rootId
    const parent = this.graph.nodes.get(id)
    if (!parent) return []
    const result: Array<{ node: SceneNode; depth: number }> = []
    for (const childId of parent.childIds) {
      const child = this.graph.nodes.get(childId)
      if (!child) continue
      result.push({ node: child, depth })
      if (child.childIds.length > 0) result.push(...this.graph.flattenTree(childId, depth + 1))
    }
    return result
  }

  clearAbsPosCache(): void {
    this.absPosCache.clear()
  }

  getAbsolutePosition(id: string): Vector {
    const cached = this.absPosCache.get(id)
    if (cached) return cached

    const node = this.graph.getNode(id)
    if (!node) return { x: 0, y: 0 }

    const result = getAbsolutePosition(node, this.graph)
    this.absPosCache.set(id, result)
    return result
  }

  getAbsoluteBounds(id: string): Rect {
    const pos = this.graph.getAbsolutePosition(id)
    const node = this.graph.nodes.get(id)
    return {
      x: pos.x,
      y: pos.y,
      width: node?.width ?? 0,
      height: node?.height ?? 0
    }
  }

  isContainer(id: string): boolean {
    const node = this.graph.nodes.get(id)
    return node ? CONTAINER_TYPES.has(node.type) : false
  }
}
