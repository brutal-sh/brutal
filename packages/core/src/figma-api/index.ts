import { fromUint8Array, isValid, toUint8Array } from 'js-base64'

import type { SceneGraph } from '@open-pencil/scene-graph'
import type { GroupFitOptions } from '@open-pencil/scene-graph/group-bounds'
import type { Rect, Vector } from '@open-pencil/scene-graph/primitives'

import type { SkiaRenderer } from '#core/canvas'
import { groupFitOptions } from '#core/canvas/boolean'
import { IS_BROWSER, type InterfaceTheme } from '#core/constants'
import { defaultIcons, type IconProvider } from '#core/icons'
import type { RasterCodec } from '#core/io/formats/raster'

import * as Creation from './creation'
import { FigmaDocumentState } from './document-state'
import { loadFigmaFont, fontFamilyVariationAxes, type FigmaFontNameInput } from './fonts'
import * as images from './images'
import type {
  FigmaBooleanOperationNode,
  FigmaComponentNode,
  FigmaComponentSetNode,
  FigmaConnectorNode,
  FigmaEllipseNode,
  FigmaFrameNode,
  FigmaGroupNode,
  FigmaLineNode,
  FigmaPolygonNode,
  FigmaRectangleNode,
  FigmaSectionNode,
  FigmaShapeWithTextNode,
  FigmaStarNode,
  FigmaTextNode,
  FigmaVectorNode
} from './node-types'
import { startPendingLayout } from './pending-layout'
import { MIXED, type FigmaNodeProxy, type FigmaFont, type NodeProxyHost } from './proxy'
import { newShapeWithText } from './shape-with-text'
import * as Structure from './structure'
import type { ExportImageOptions } from './types'
import { figmaUtil } from './util'
import { FigmaVariablesAPI } from './variables'

type ProxyNodes = ReadonlyArray<FigmaNodeProxy>
type OfficialNodes = ReadonlyArray<BaseNode>
type OfficialParent = BaseNode & ChildrenMixin
type InputNodes = Structure.NodeInputs
type InputParent = Structure.NodeParent

const noop = () => undefined

/** What a host passes to `FigmaAPI` beyond the document. */
export interface FigmaAPIOptions {
  /** Fetches the HTTP(S) URLs `figma.createImageAsync` loads; the global `fetch` by default. */
  fetch?: images.ImageFetch
}

export { FigmaNodeProxy } from './proxy'
export {
  getPageBackgrounds,
  setPageBackgrounds,
  hasStoredBackground,
  setDefaultPageBackground
} from './page-backgrounds'
export { capturePendingLayout, flushPendingLayout } from './pending-layout'
export type { FigmaEffect } from './effects'
export type { ExportImageOptions } from './types'
export { MAX_IMAGE_FETCH_BYTES, type ImageFetch } from './images'
export {
  FigmaVariable,
  FigmaVariableCollection,
  FigmaVariablesAPI,
  type FigmaComposedColor,
  type FigmaVariableAlias,
  type FigmaVariableValue
} from './variables'
export type {
  FigmaBooleanOperationNode,
  FigmaComponentNode,
  FigmaComponentSetNode,
  FigmaConnectorNode,
  FigmaEllipseNode,
  FigmaFrameNode,
  FigmaGroupNode,
  FigmaInstanceNode,
  FigmaLineNode,
  FigmaPolygonNode,
  FigmaRectangleNode,
  FigmaSectionNode,
  FigmaShapeWithTextNode,
  FigmaSlotNode,
  FigmaStarNode,
  FigmaTextNode,
  FigmaVectorNode
} from './node-types'
export type { FigmaFont, FigmaFontName } from './proxy'
export type { FigmaFontNameInput, FigmaVariationSettings } from './fonts'

// TODO(figma-api): Implement the full official PluginAPI interface once our compatibility
// layer covers all required node-specific return types and unsupported APIs are modeled explicitly.
export class FigmaAPI implements NodeProxyHost {
  readonly graph: SceneGraph
  readonly #document: FigmaDocumentState
  private _renderer: SkiaRenderer | null = null
  /** The interface theme new sections take their fill from, as in Figma. */
  theme: InterfaceTheme = 'light'

  readonly mixed = MIXED
  /** Figma's color and Markdown helpers, as `figma.util`. */
  readonly util: UtilAPI = figmaUtil
  /** The document's variables and collections, as Figma's `figma.variables`. */
  readonly variables: FigmaVariablesAPI

  /** How `createImageAsync` fetches HTTP(S) URLs; a host passes one that gets past CORS. */
  readonly #fetch: images.ImageFetch

  constructor(graph: SceneGraph, options: FigmaAPIOptions = {}) {
    this.graph = graph
    this.#fetch = options.fetch ?? ((input, init) => fetch(input, init))
    this.variables = new FigmaVariablesAPI(graph)
    startPendingLayout(graph)
    this.#document = new FigmaDocumentState(graph, this, () => ({
      width: IS_BROWSER ? window.innerWidth : 1280,
      height: IS_BROWSER ? window.innerHeight : 720
    }))
  }

  setRenderer(renderer: SkiaRenderer | null): void {
    this._renderer = renderer
  }

  get groupFitOptions(): GroupFitOptions {
    return groupFitOptions(this._renderer, this.graph)
  }

  get currentPageId(): string {
    return this.#document.currentPageId
  }

  wrapNode(id: string): FigmaNodeProxy {
    return this.#document.wrapNode(id)
  }

  get root(): FigmaNodeProxy {
    return this.wrapNode(this.graph.rootId)
  }

  get currentPage(): FigmaNodeProxy & { selection: FigmaNodeProxy[] } {
    return this.#document.currentPage
  }

  set currentPage(page: FigmaNodeProxy) {
    this.#document.currentPage = page
  }

  getNodeById(id: string): FigmaNodeProxy | null {
    const node = this.graph.getNode(id)
    return node ? this.wrapNode(id) : null
  }

  /** The async lookup that Figma requires in dynamic-page mode; same result as getNodeById. */
  async getNodeByIdAsync(id: string): Promise<FigmaNodeProxy | null> {
    return this.getNodeById(id)
  }

  /**
   * The page switch Figma requires in dynamic-page mode, which sets `currentPage`. As in Figma, a
   * missing node throws at once and a node that is no page rejects.
   */
  setCurrentPageAsync(page: FigmaNodeProxy): Promise<void>
  setCurrentPageAsync(page: PageNode): Promise<void>
  // Scripts are not type-checked, so the call checks for a missing node as Figma does.
  setCurrentPageAsync(page: PageNode | FigmaNodeProxy | null | undefined): Promise<void> {
    if (page == null) throw new Error(`in setCurrentPageAsync: Expected node, got ${String(page)}`)
    if (Structure.rawNode(this, page).type !== 'CANVAS') {
      return Promise.reject(new Error('figma.setCurrentPageAsync expects a PageNode'))
    }
    this.#document.currentPageId = Structure.nodeId(page)
    return Promise.resolve()
  }

  // --- Node Creation ---

  /** New layers start as the editor's tools make them, which is how Figma's plugin API makes them. */
  createFrame(): FigmaFrameNode {
    return Creation.createNode(this, 'FRAME') as FigmaFrameNode
  }

  createRectangle(): FigmaRectangleNode {
    return Creation.createNode(this, 'RECTANGLE') as FigmaRectangleNode
  }

  createEllipse(): FigmaEllipseNode {
    return Creation.createNode(this, 'ELLIPSE') as FigmaEllipseNode
  }

  createText(): FigmaTextNode {
    return Creation.createText(this)
  }

  createLine(): FigmaLineNode {
    return Creation.createNode(this, 'LINE') as FigmaLineNode
  }

  createPolygon(): FigmaPolygonNode {
    return Creation.createNode(this, 'POLYGON') as FigmaPolygonNode
  }

  createStar(): FigmaStarNode {
    return Creation.createNode(this, 'STAR') as FigmaStarNode
  }

  createShapeWithText(): FigmaShapeWithTextNode {
    return this.wrapNode(newShapeWithText(this).id) as FigmaShapeWithTextNode
  }

  createVector(): FigmaVectorNode {
    return Creation.createNode(this, 'VECTOR') as FigmaVectorNode
  }

  /** The layers Figma makes from SVG markup, on the current page at its origin. */
  // eslint-disable-next-line open-pencil/no-mixed-case-acronym-identifiers -- Figma Plugin API name.
  createNodeFromSvg(svg: string): FigmaFrameNode {
    return Creation.createSVGFrame(this, svg)
  }

  /**
   * A connector as Figma's plugin API makes one: "Connector line", free from the page origin to
   * 200 px right of it, with no start cap and an arrow at the end.
   */
  createConnector(): FigmaConnectorNode {
    return Creation.createConnectorNode(this)
  }

  createComponent(): FigmaComponentNode {
    return Creation.createNode(this, 'COMPONENT') as FigmaComponentNode
  }

  createSection(): FigmaSectionNode {
    return Creation.createNode(this, 'SECTION') as FigmaSectionNode
  }

  createPage(): FigmaNodeProxy {
    return Creation.createPage(this)
  }

  // --- Grouping ---

  group(nodes: ProxyNodes, parent: FigmaNodeProxy, index?: number): FigmaGroupNode
  group(nodes: OfficialNodes, parent: OfficialParent, index?: number): GroupNode
  group(nodes: InputNodes, parent: InputParent, index?: number): FigmaGroupNode {
    return Structure.groupNodes(this, nodes, parent, index)
  }

  ungroup(node: FigmaNodeProxy): FigmaNodeProxy[]
  ungroup(node: SceneNode & ChildrenMixin): Array<SceneNode>
  ungroup(node: (SceneNode & ChildrenMixin) | FigmaNodeProxy): Array<SceneNode> | FigmaNodeProxy[] {
    return Structure.ungroup(this, node)
  }

  createComponentFromNode(node: FigmaNodeProxy): FigmaNodeProxy {
    return Structure.createComponent(this, node)
  }

  combineAsVariants(
    nodes: ReadonlyArray<FigmaComponentNode>,
    parent: FigmaNodeProxy,
    index?: number
  ): FigmaComponentSetNode
  combineAsVariants(
    nodes: ReadonlyArray<ComponentNode>,
    parent: OfficialParent,
    index?: number
  ): ComponentSetNode
  combineAsVariants(
    nodes: ReadonlyArray<ComponentNode | FigmaComponentNode>,
    parent: InputParent,
    index?: number
  ): FigmaComponentSetNode {
    return Structure.combineVariants(this, nodes, parent, index)
  }

  // --- Boolean Operations ---

  union(nodes: ProxyNodes, parent: FigmaNodeProxy, index?: number): FigmaBooleanOperationNode
  union(nodes: OfficialNodes, parent: OfficialParent, index?: number): BooleanOperationNode
  union(nodes: InputNodes, parent: InputParent, index?: number): FigmaBooleanOperationNode {
    return Structure.booleanOperation(this, 'UNION', nodes, { parent, index })
  }

  subtract(nodes: ProxyNodes, parent: FigmaNodeProxy, index?: number): FigmaBooleanOperationNode
  subtract(nodes: OfficialNodes, parent: OfficialParent, index?: number): BooleanOperationNode
  subtract(nodes: InputNodes, parent: InputParent, index?: number): FigmaBooleanOperationNode {
    return Structure.booleanOperation(this, 'SUBTRACT', nodes, { parent, index })
  }

  intersect(nodes: ProxyNodes, parent: FigmaNodeProxy, index?: number): FigmaBooleanOperationNode
  intersect(nodes: OfficialNodes, parent: OfficialParent, index?: number): BooleanOperationNode
  intersect(nodes: InputNodes, parent: InputParent, index?: number): FigmaBooleanOperationNode {
    return Structure.booleanOperation(this, 'INTERSECT', nodes, { parent, index })
  }

  exclude(nodes: ProxyNodes, parent: FigmaNodeProxy, index?: number): FigmaBooleanOperationNode
  exclude(nodes: OfficialNodes, parent: OfficialParent, index?: number): BooleanOperationNode
  exclude(nodes: InputNodes, parent: InputParent, index?: number): FigmaBooleanOperationNode {
    return Structure.booleanOperation(this, 'EXCLUDE', nodes, { parent, index })
  }

  // --- Flatten ---

  flatten(nodes: ProxyNodes, parent?: FigmaNodeProxy, index?: number): FigmaVectorNode
  flatten(nodes: OfficialNodes, parent?: OfficialParent, index?: number): VectorNode
  flatten(nodes: InputNodes, parent?: InputParent, index?: number): FigmaVectorNode {
    return Structure.flatten(this, this._renderer, nodes, { parent, index })
  }

  // --- Viewport ---

  get viewport(): {
    center: Vector
    zoom: number
    scrollAndZoomIntoView: (nodes: readonly { absoluteBoundingBox: Rect }[]) => void
  } {
    return this.#document.viewport
  }

  set viewport(v: { center: Vector; zoom: number }) {
    this.#document.viewport = v
  }

  createImage(data: Uint8Array): Image {
    return images.createImage(this.graph, data)
  }

  getImageByHash(hash: string): Image | null {
    return images.imageByHash(this.graph, hash)
  }

  /** Fetches the image at `src` through the host's `fetch` and stores it as `createImage` does. */
  createImageAsync(src: string): Promise<Image> {
    return images.fetchImage(this.graph, src, this.#fetch)
  }

  // --- Stubs ---

  /** Loads the font so text measures and draws with it from then on; rejects as Figma does. */
  async loadFontAsync(fontName: FigmaFontNameInput): Promise<void> {
    await loadFigmaFont(fontName)
  }

  /**
   * The axis tags a variable family takes in `variationSettings`, or `null` for a static family.
   * Figma answers for any family it lists; OpenPencil reads the axes from a file the family has
   * loaded, so a family has to be loaded first.
   */
  getFontFamilyVariationAxes(family: string): string[] | null {
    return fontFamilyVariationAxes(family)
  }

  async listAvailableFontsAsync(): Promise<FigmaFont[]> {
    // Default: pure browser / test contexts have no enumeration surface.
    // Desktop hosts override this to return system + bundled fonts.
    return []
  }

  base64Encode(data: Uint8Array): string {
    return fromUint8Array(data)
  }

  base64Decode(data: string): Uint8Array {
    if (!isValid(data)) throw new TypeError('Invalid Base64 string')
    return toUint8Array(data)
  }

  notify(message: string): { cancel: () => void } {
    if (typeof console !== 'undefined') console.warn(`[figma.notify] ${message}`)
    return { cancel: noop }
  }

  /**
   * A script is one call rather than a plugin with a lifetime, so nothing closes; the message is
   * shown as Figma shows it, through `notify`.
   */
  closePlugin(message?: string): void {
    if (message) this.notify(message)
  }

  /** Every page is already in memory. */
  async loadAllPagesAsync(): Promise<void> {
    return undefined
  }

  commitUndo(): void {
    return undefined
  }

  triggerUndo(): void {
    return undefined
  }

  exportImage?: (nodeIds: string[], options: ExportImageOptions) => Promise<Uint8Array | null>
  /** Where icon tools search and fetch icons; hosts may pass a self-hosted or bundled set. */
  icons: IconProvider = defaultIcons
  rasterCodec?: RasterCodec
  /** The document as it was before the current AI run first edited `pageId`, or null if unedited. */
  changeBaseline?: (pageId: string) => SceneGraph | null
}
