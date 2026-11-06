import type { SceneGraph } from '../graph'
import { LayoutWrites } from '../layout/writes'
import type { NodePreviewObserver } from '../preview'
import { markSourceFieldsEdited } from '../source-metadata'
import type { SceneNode } from '../types'

/** Scopes that graph methods check while a caller's callback runs; scopes nest. */
type GraphScope =
  | 'preview'
  | 'sourceMetadata'
  | 'importedState'
  | 'layout'
  | 'derivedLayout'
  | 'iconPaints'

/** Nested mutation scopes and layout's delayed updates share one lifetime. */
export class GraphMutationScopes {
  constructor(private readonly graph: SceneGraph) {}
  private readonly scopeDepths: Record<GraphScope, number> = {
    preview: 0,
    sourceMetadata: 0,
    importedState: 0,
    layout: 0,
    derivedLayout: 0,
    iconPaints: 0
  }
  private previewObservers: NodePreviewObserver[] = []
  importedIdGenerator: (() => string) | undefined
  private layoutWrites: LayoutWrites | null = null

  private withScope<T>(scope: GraphScope, fn: () => T): T {
    this.scopeDepths[scope]++
    try {
      return fn()
    } finally {
      this.scopeDepths[scope]--
    }
  }

  runPreviewUpdates(fn: () => void, beforeUpdate?: NodePreviewObserver): void {
    if (beforeUpdate) this.previewObservers.push(beforeUpdate)
    try {
      this.withScope('preview', fn)
    } finally {
      if (beforeUpdate) this.previewObservers.pop()
    }
  }

  preserveSourceMetadataDuring<T>(fn: () => T): T {
    return this.withScope('sourceMetadata', fn)
  }

  get isPreservingSourceMetadata(): boolean {
    return this.scopeDepths.sourceMetadata > 0
  }

  applyImportedStateDuring<T>(fn: () => T, idGenerator?: () => string): T {
    const previousGenerator = this.importedIdGenerator
    this.importedIdGenerator = idGenerator ?? previousGenerator
    try {
      return this.withScope('importedState', () => this.graph.preserveSourceMetadataDuring(fn))
    } finally {
      this.importedIdGenerator = previousGenerator
    }
  }

  get isApplyingImportedState(): boolean {
    return this.scopeDepths.importedState > 0
  }

  applyDerivedLayoutDuring(fn: () => void): void {
    this.withScope('derivedLayout', fn)
  }

  get isApplyingDerivedLayout(): boolean {
    return this.scopeDepths.derivedLayout > 0
  }

  withLayoutMutations(fn: () => void): void {
    const outermost = this.scopeDepths.layout === 0
    this.scopeDepths.layout++
    if (outermost) this.layoutWrites = new LayoutWrites()
    try {
      fn()
    } finally {
      try {
        if (outermost) this.publishLayoutUpdates()
      } finally {
        this.scopeDepths.layout--
      }
    }
  }

  private publishLayoutUpdates(): void {
    const writes = this.layoutWrites
    this.layoutWrites = null
    if (!writes) return
    for (const [node, changes, edited] of writes.updates((nodeId) =>
      this.graph.nodes.get(nodeId)
    )) {
      markSourceFieldsEdited(node, edited)
      this.graph.emitter.emit('node:updated', node.id, changes)
    }
  }

  get isApplyingLayout(): boolean {
    return this.scopeDepths.layout > 0
  }

  get isPreviewing(): boolean {
    return this.scopeDepths.preview > 0
  }
  get isBufferingLayoutUpdates(): boolean {
    return this.layoutWrites !== null
  }

  notifyPreview(node: SceneNode, changes: Partial<SceneNode>): void {
    for (const observe of this.previewObservers) observe(node, changes)
  }

  withIconPaints(fn: () => void): void {
    if (this.scopeDepths.iconPaints > 0) return
    this.withScope('iconPaints', fn)
  }

  recordLayout(node: SceneNode, changes: Partial<SceneNode>): void {
    this.layoutWrites?.record(
      node,
      changes,
      this.scopeDepths.sourceMetadata === 0 && !this.graph.isApplyingDerivedLayout
    )
  }
}
