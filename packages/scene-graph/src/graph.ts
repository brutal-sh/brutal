import { omitBy } from 'es-toolkit/object'
import { isUndefined } from 'es-toolkit/predicate'

import { removeStaleBindings } from './bindings'
import { BufferedSceneEmitter } from './buffered-events'
import type { NodeCloneMode } from './copy'
import { bindNodeEvents } from './events'
import { LAYOUT_AFFECTING_KEYS } from './fields/layout'
import { withGeneratedFrameSize } from './generated'
import { generateUnusedEntityId, entityIdTaken } from './graph/ids'
import { indexInstance, unindexInstance, updateInstanceIndex } from './graph/indexes'
import { GraphMutationScopes } from './graph/scopes'
import { GraphTree } from './graph/tree'
import * as HitTest from './hit-test'
import { synchronizeIconPaints } from './icons/paints'
import { generateId } from './ids'
import * as Instances from './instances'
import { createDefaultNode } from './node-defaults'
import { updateNodePreview, type NodePreviewObserver } from './preview'
import type { Color, Rect, Vector } from './primitives'
import { styleDetachmentChanges } from './shared-styles'
import { markSourceFieldsEdited } from './source-metadata'
import { invalidateTextCaches } from './text/picture'
import type {
  DocumentColorSpace,
  EnabledLibraryBinding,
  NodeChangeObserver,
  NodeType,
  SceneGraphEventHandlers,
  SceneNode,
  Variable,
  VariableCollection,
  VariableType,
  VariableValue,
  VariableLiteral
} from './types'
import * as Variables from './variables'
import type { VariableModeFallback } from './variables'
import { normalizeVectorNetwork } from './vector-network'

export class SceneGraph {
  nodes = new Map<string, SceneNode>()
  images = new Map<string, Uint8Array>()
  variables = new Map<string, Variable>()
  variableCollections = new Map<string, VariableCollection>()
  activeMode = new Map<string, string>()
  rootId: string
  figKiwiVersion: number | null = null
  /** Deflated kiwi schema bytes from the original .fig file, preserved for roundtrip fidelity. */
  figSchemaDeflated: Uint8Array | null = null
  documentColorSpace: DocumentColorSpace = 'srgb'
  enabledLibraries = new Map<string, EnabledLibraryBinding>()
  readonly emitter = new BufferedSceneEmitter()
  private readonly scopes = new GraphMutationScopes(this)
  private readonly tree = new GraphTree(this, (componentId, instanceId) =>
    unindexInstance(this.instanceIndex, componentId, instanceId)
  )
  private readonly changeObservers = new Set<NodeChangeObserver>()
  positionPreviewVersion = 0
  instanceIndex = new Map<string, Set<string>>()
  /** Every connector in the graph, so routing need not scan every layer. */
  connectorIds = new Set<string>()

  constructor(private readonly idGenerator: () => string = generateId) {
    const root = createDefaultNode(this.idGenerator, 'FRAME', {
      name: 'Document',
      width: 0,
      height: 0
    })
    this.rootId = root.id
    this.nodes.set(root.id, root)

    this.addPage('Page 1')
  }
  addPage(name: string): SceneNode {
    return this.createNode('CANVAS', this.rootId, { name, width: 0, height: 0 })
  }

  getPages(includeInternal = false): SceneNode[] {
    return this.getChildren(this.rootId).filter(
      (n) => n.type === 'CANVAS' && (includeInternal || !n.internalOnly)
    )
  }
  getAllNodes(): Iterable<SceneNode> {
    return this.nodes.values()
  }
  getNode(id: string): SceneNode | undefined {
    return this.nodes.get(id)
  }
  onNodeEvents(handlers: SceneGraphEventHandlers): () => void {
    return bindNodeEvents(this.emitter, handlers)
  }

  /**
   * Tells `observer` about each node an edit adds and, before it changes, each node it is about
   * to change, so a recorder can keep the node as it was. Unlike node events these are never
   * buffered. Graph methods report the nodes they change; code that writes into a node directly
   * reports it with `willChangeNode` first.
   */
  observeNodeChanges(observer: NodeChangeObserver): () => void {
    this.changeObservers.add(observer)
    return () => this.changeObservers.delete(observer)
  }

  /** Tells `observeNodeChanges` observers that `node` is about to change. */
  willChangeNode(node: SceneNode | undefined): void {
    if (!node) return
    for (const observer of this.changeObservers) observer.before(node)
  }

  countDescendants(nodeId: string): number {
    return this.tree.countDescendants(nodeId)
  }
  addVariable(variable: Variable): void {
    Variables.addVariable(this, variable)
  }
  removeVariable(id: string): void {
    Variables.removeVariable(this, id)
  }
  addCollection(collection: VariableCollection): void {
    Variables.addCollection(this, collection)
  }
  createVariable(
    name: string,
    type: VariableType,
    collectionId: string,
    value?: VariableValue
  ): Variable {
    return Variables.createVariable(
      this,
      () => this.generateEntityId(),
      name,
      type,
      collectionId,
      value
    )
  }

  createCollection(name: string): VariableCollection {
    // The collection and its default mode are both created before either is registered.
    const issued = new Set<string>()
    return Variables.createCollection(this, () => this.generateEntityId(issued), name)
  }

  createMode(collectionId: string, name: string, sourceModeId?: string): string | undefined {
    return Variables.createMode(
      this,
      () => this.generateEntityId(),
      collectionId,
      name,
      sourceModeId
    )
  }

  removeCollection(id: string): void {
    Variables.removeCollection(this, id)
  }

  getActiveModeId(collectionId: string): string {
    return Variables.getActiveModeId(this, collectionId)
  }

  getNodeVariableModeId(nodeId: string, collectionId: string): string {
    return Variables.getNodeVariableModeId(this, nodeId, collectionId)
  }

  setActiveMode(collectionId: string, modeId: string): void {
    Variables.setActiveMode(this, collectionId, modeId)
  }

  addMode(collectionId: string, modeId: string, name: string, sourceMode?: string): void {
    Variables.addMode(this, collectionId, modeId, name, sourceMode)
  }

  removeMode(collectionId: string, modeId: string): void {
    Variables.removeMode(this, collectionId, modeId)
  }

  renameMode(collectionId: string, modeId: string, name: string): void {
    Variables.renameMode(this, collectionId, modeId, name)
  }

  setDefaultMode(collectionId: string, modeId: string): void {
    Variables.setDefaultMode(this, collectionId, modeId)
  }

  resolveVariable(
    variableId: string,
    modeId?: string,
    visited?: Set<string>
  ): VariableLiteral | undefined {
    return Variables.resolveVariable(this, variableId, modeId, visited)
  }

  resolveColorVariable(variableId: string): Color | undefined {
    return Variables.resolveColorVariable(this, variableId)
  }

  resolveNumberVariable(variableId: string): number | undefined {
    return Variables.resolveNumberVariable(this, variableId)
  }

  resolveColorVariableForNode(
    nodeId: string,
    variableId: string,
    fallback?: VariableModeFallback
  ): Color | undefined {
    return Variables.resolveColorVariableForNode(this, nodeId, variableId, fallback)
  }

  resolveNumberVariableForNode(
    nodeId: string,
    variableId: string,
    fallback?: VariableModeFallback
  ): number | undefined {
    return Variables.resolveNumberVariableForNode(this, nodeId, variableId, fallback)
  }

  resolveVariableForNode(
    nodeId: string,
    variableId: string,
    fallback?: VariableModeFallback
  ): VariableLiteral | undefined {
    return Variables.resolveVariableForNode(this, nodeId, variableId, fallback)
  }

  resolveStringVariableForNode(
    nodeId: string,
    variableId: string,
    fallback?: VariableModeFallback
  ): string | undefined {
    return Variables.resolveStringVariableForNode(this, nodeId, variableId, fallback)
  }

  getVariablesForCollection(collectionId: string): Variable[] {
    return Variables.getVariablesForCollection(this, collectionId)
  }

  getVariablesByType(type: VariableType): Variable[] {
    return Variables.getVariablesByType(this, type)
  }

  bindVariable(nodeId: string, field: string, variableId: string): void {
    Variables.bindVariable(this, nodeId, field, variableId)
  }

  unbindVariable(nodeId: string, field: string): void {
    Variables.unbindVariable(this, nodeId, field)
  }

  getChildren(id: string): SceneNode[] {
    return this.tree.getChildren(id)
  }

  isContainer(id: string): boolean {
    return this.tree.isContainer(id)
  }

  isDescendant(childId: string, ancestorId: string): boolean {
    return this.closest(childId, (node) => node.id === ancestorId) !== undefined
  }

  /**
   * The node itself or its nearest ancestor that matches. The walk visits at most as many nodes
   * as the graph holds, so a parent cycle in bad data cannot hang it.
   */
  closest(id: string, match: (node: SceneNode) => boolean): SceneNode | undefined {
    return this.tree.closest(id, match)
  }

  /**
   * The page a node is on: the node itself for a page, its nearest page ancestor otherwise, and
   * null for the document root or a node on no page.
   */
  pageOf(id: string): string | null {
    return this.tree.pageOf(id)
  }

  clearAbsPosCache(): void {
    return this.tree.clearAbsPosCache()
  }

  getAbsolutePosition(id: string): Vector {
    return this.tree.getAbsolutePosition(id)
  }

  getAbsoluteBounds(id: string): Rect {
    return this.tree.getAbsoluteBounds(id)
  }
  /**
   * An ID no entity uses; `issued` also excludes IDs handed out earlier in the same creation.
   * A generator that returns more taken IDs than the graph holds must be repeating itself, so
   * it counts as exhausted then; a fixed cap would reject a sequence walking past a large import.
   */
  private generateEntityId(issued?: Set<string>): string {
    return generateUnusedEntityId(
      this,
      () => (this.scopes.importedIdGenerator ?? this.idGenerator)(),
      issued
    )
  }
  /** Whether a node, variable, collection, or mode has this id. */
  isEntityIdTaken(id: string): boolean {
    return entityIdTaken(this, id)
  }
  private registerNode(node: SceneNode, parentId: string | null): SceneNode {
    node.parentId = parentId
    this.nodes.set(node.id, node)
    if (node.type === 'CONNECTOR') this.connectorIds.add(node.id)
    for (const observer of this.changeObservers) observer.created(node)
    if (node.type === 'INSTANCE' && node.componentId)
      indexInstance(this.instanceIndex, node.componentId, node.id)
    this.synchronizeIconPaints(node)
    this.emitter.emit('node:created', node)
    return node
  }
  /** Publish synchronous graph events only after the supplied mutation succeeds. */
  withBufferedEvents<T>(action: () => T): T {
    return this.emitter.batch(action)
  }

  createNode(type: NodeType, parentId: string, overrides: Partial<SceneNode> = {}): SceneNode {
    const node = createDefaultNode(() => this.generateEntityId(), type, overrides)
    const parent = this.nodes.get(parentId)
    this.willChangeNode(parent)
    parent?.childIds.push(node.id)
    return this.registerNode(node, parentId)
  }
  createNodeWithId(
    id: string,
    type: NodeType,
    parentId: string | null,
    overrides: Partial<SceneNode> = {}
  ): SceneNode {
    const node = createDefaultNode(() => id, type, overrides)
    // `overrides` may be another node's snapshot, ID included.
    node.id = id
    const parent = parentId ? this.nodes.get(parentId) : undefined
    if (parent && !parent.childIds.includes(id)) {
      this.willChangeNode(parent)
      parent.childIds.push(id)
    }
    return this.registerNode(node, parentId)
  }

  runPreviewUpdates(fn: () => void, beforeUpdate?: NodePreviewObserver): void {
    this.scopes.runPreviewUpdates(fn, beforeUpdate)
  }
  preserveSourceMetadataDuring<T>(fn: () => T): T {
    return this.scopes.preserveSourceMetadataDuring(fn)
  }
  get isPreservingSourceMetadata(): boolean {
    return this.scopes.isPreservingSourceMetadata
  }

  applyImportedStateDuring<T>(fn: () => T, idGenerator?: () => string): T {
    return this.scopes.applyImportedStateDuring(fn, idGenerator)
  }

  get isApplyingImportedState(): boolean {
    return this.scopes.isApplyingImportedState
  }

  /**
   * Lays out what the document already holds: a page as it loads, or again once its fonts
   * arrive. What this writes derives from the document; an edit's own layout is not this.
   */
  applyDerivedLayoutDuring(fn: () => void): void {
    this.scopes.applyDerivedLayoutDuring(fn)
  }

  get isApplyingDerivedLayout(): boolean {
    return this.scopes.isApplyingDerivedLayout
  }

  /**
   * Runs `fn` as layout. Its updates are published once the outermost layout ends, still as
   * layout, and without values a pass changed and a later pass put back (`LayoutWrites`). Outside
   * derived layout, the positions and sizes it publishes count as edited, so formats save them.
   */
  withLayoutMutations(fn: () => void): void {
    this.scopes.withLayoutMutations(fn)
  }
  get isApplyingLayout(): boolean {
    return this.scopes.isApplyingLayout
  }
  updateNodePositionPreview(id: string, x: number, y: number): void {
    this.updateNodePreview(id, { x, y })
  }
  updateNodePreview(id: string, changes: Partial<SceneNode>): void {
    const node = this.nodes.get(id)
    if (node) changes = this.sizedChanges(node, changes)
    const appliedChanges = updateNodePreview(this, id, changes, (node, applied) => {
      this.scopes.notifyPreview(node, applied)
    })
    if (appliedChanges) {
      if (node)
        this.scopes.runPreviewUpdates(() => this.synchronizeIconPaints(node, appliedChanges))
      this.emitter.emit('node:previewUpdated', id, appliedChanges)
    }
  }

  updateNode(id: string, changes: Partial<SceneNode>): void {
    if (this.scopes.isPreviewing) {
      this.updateNodePreview(id, changes)
      return
    }

    const node = this.nodes.get(id)
    if (!node) return
    const defined = omitBy(changes, isUndefined)
    const detached = omitBy(styleDetachmentChanges(node, defined), isUndefined)
    this.applyNodeChanges(node, this.sizedChanges(node, detached))
  }

  /** A size set from outside layout, with what it also sets on a generated frame. */
  private sizedChanges(node: SceneNode, changes: Partial<SceneNode>): Partial<SceneNode> {
    return this.isApplyingLayout ? changes : withGeneratedFrameSize(node, changes)
  }

  /** Replay captured properties without dropping explicit undefined values or absent keys. */
  restoreNodeProperties(
    id: string,
    changes: Partial<SceneNode>,
    absent: readonly (keyof SceneNode)[]
  ): void {
    const node = this.nodes.get(id)
    if (node) this.applyNodeChanges(node, changes, absent)
  }

  private applyNodeChanges(
    node: SceneNode,
    changes: Partial<SceneNode>,
    absent: readonly (keyof SceneNode)[] = []
  ): void {
    const { id } = node
    this.willChangeNode(node)
    // Include removed keys in cache invalidation and update notifications.
    if (absent.length) {
      changes = { ...changes }
      for (const key of absent) Reflect.set(changes, key, undefined)
    }

    // Only clear absPosCache when layout-affecting properties change.
    // Fills, strokes, effects, plugin data changes do NOT affect absolute position.
    const affectsLayout = Object.keys(changes).some((k) => LAYOUT_AFFECTING_KEYS.has(k))
    if (affectsLayout) this.tree.clearAbsPosCache()
    updateInstanceIndex(this.instanceIndex, node, changes)
    if (node.type === 'TEXT') invalidateTextCaches(node, changes)
    if (!this.scopes.isPreservingSourceMetadata && !this.isApplyingLayout) {
      markSourceFieldsEdited(node, Object.keys(changes))
    }
    if (changes.vectorNetwork) {
      changes = { ...changes, vectorNetwork: normalizeVectorNetwork(changes.vectorNetwork) }
    }
    this.scopes.recordLayout(node, changes)
    Object.assign(node, changes)
    if (changes.fills) removeStaleBindings(node, 'fills', changes)
    if (changes.strokes) removeStaleBindings(node, 'strokes', changes)
    for (const key of absent) Reflect.deleteProperty(node, key)
    this.synchronizeIconPaints(node, changes)
    this.publishNodeUpdate(id, changes)
  }

  private synchronizeIconPaints(node: SceneNode, changes?: Partial<SceneNode>): void {
    this.scopes.withIconPaints(() => synchronizeIconPaints(this, node, changes))
  }

  /** Publishes an update now, or leaves it to the running layout, which publishes once it ends. */
  private publishNodeUpdate(id: string, changes: Partial<SceneNode>): void {
    if (!this.scopes.isBufferingLayoutUpdates) this.emitter.emit('node:updated', id, changes)
  }

  reparentNode(nodeId: string, newParentId: string): void {
    return this.tree.reparentNode(nodeId, newParentId)
  }

  /**
   * Moves a node to `index` among `parentId`'s children, from wherever it was, without changing
   * its own coordinates. An index past the end appends; a move into the node itself or one of
   * its descendants is ignored.
   */
  insertChildAt(childId: string, parentId: string, index: number): void {
    return this.tree.insertChildAt(childId, parentId, index)
  }

  deleteNode(id: string): void {
    return this.tree.deleteNode(id)
  }

  hitTest(px: number, py: number, scopeId?: string): SceneNode | null {
    return HitTest.hitTest(this, px, py, scopeId)
  }

  /** `pad`, in canvas units, grows each shape's box, as Figma takes clicks just outside one. */
  hitTestDeep(px: number, py: number, scopeId?: string, pad = 0): SceneNode | null {
    return HitTest.hitTestDeep(this, px, py, scopeId, pad)
  }

  hitTestSelectable(
    px: number,
    py: number,
    scopeId: string,
    selectedIds: ReadonlySet<string>,
    pad = 0
  ): SceneNode | null {
    return HitTest.hitTestSelectable(this, px, py, scopeId, selectedIds, pad)
  }

  hitTestOpenContainer(px: number, py: number, scopeId: string): SceneNode | null {
    return HitTest.hitTestOpenContainer(this, px, py, scopeId)
  }

  isOpenContainer(nodeId: string): boolean {
    return HitTest.isOpenContainer(this, nodeId)
  }

  isPointInNode(nodeId: string, px: number, py: number): boolean {
    return HitTest.isPointInNode(this, nodeId, px, py)
  }

  hitTestDropTarget(
    px: number,
    py: number,
    excludeIds: ReadonlySet<string>,
    scopeId?: string,
    options?: HitTest.DropTargetOptions
  ): SceneNode | null {
    return HitTest.hitTestDropTarget(this, px, py, excludeIds, scopeId, options)
  }

  cloneTree(
    sourceId: string,
    parentId: string,
    overrides: Partial<SceneNode> = {},
    sourceGraph: SceneGraph = this
  ): SceneNode | null {
    return this.tree.cloneTree(sourceId, parentId, overrides, sourceGraph)
  }

  createInstance(
    componentId: string,
    parentId: string,
    overrides: Partial<SceneNode> = {}
  ): SceneNode | null {
    return Instances.createInstance(this, componentId, parentId, overrides)
  }

  populateInstanceChildren(
    instanceId: string,
    componentId: string,
    mode: NodeCloneMode = 'deep'
  ): void {
    Instances.populateInstanceChildren(this, instanceId, componentId, mode)
  }

  swapInstanceComponent(
    instanceId: string,
    componentId: string,
    options?: Instances.SwapInstanceOptions
  ): void {
    Instances.swapInstanceComponent(this, instanceId, componentId, options)
  }

  syncInstances(componentId: string): void {
    Instances.syncInstances(this, componentId)
  }

  syncInstancesTogether(componentIds: Iterable<string>): void {
    Instances.syncInstancesTogether(this, componentIds)
  }

  syncInstance(instanceId: string): void {
    Instances.syncInstance(this, instanceId)
  }

  detachInstance(instanceId: string): void {
    Instances.detachInstance(this, instanceId)
  }

  getMainComponent(instanceId: string): SceneNode | undefined {
    return Instances.getMainComponent(this, instanceId)
  }

  getInstances(componentId: string): SceneNode[] {
    return Instances.getInstances(this, componentId)
  }

  flattenTree(parentId?: string, depth = 0): Array<{ node: SceneNode; depth: number }> {
    return this.tree.flattenTree(parentId, depth)
  }
}
