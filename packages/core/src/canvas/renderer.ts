import type { SceneGraph } from '@open-pencil/scene-graph'
import type { RenderColorSpace } from '@open-pencil/scene-graph/color'
import type { Rect } from '@open-pencil/scene-graph/primitives'

import * as Defaults from '#core/constants'
import type { EditorState } from '#core/editor/types'
import { RenderProfiler } from '#core/profiler'

import { createImageCache } from './images/cache'
import { ImagePreviewCache } from './images/previews'
import { LabelCache } from './labels/cache'
import { LabelParagraphCache } from './labels/paragraph-cache'
import { NodePathCaches } from './paths/cache'
import { rendererChromeMethods } from './renderer/chrome'
import { createEditorStateRenderMethod, rendererDrawingMethods } from './renderer/drawing'
import * as RendererFonts from './renderer/fonts'
import { rendererGeometryMethods } from './renderer/geometry'
import { createRasterFallback, rendererImagesMethods } from './renderer/images'
import { installRendererMethods } from './renderer/install-methods'
import { rendererLabelsMethods } from './renderer/labels'
import { installRendererDomainMethods, type RendererDomainMethods } from './renderer/methods'
import { initializeRendererPaints } from './renderer/paints'
import { rendererResourcesMethods } from './renderer/resources'
import type { SceneBacking, SceneBackingBuild } from './renderer/retained-backing/types'
import type { SavedDecorationCache } from './text/decorations'
import { createDerivedGlyphPathCache, createGlyphSilhouetteCache } from './text/derived'
import { createEmojiImageCache } from './text/emoji'
import { TextPreparationCache } from './text/preparation/cache'
export type {
  MeasurementMode,
  PresenceCursor,
  RenderOverlays,
  RulerTheme,
  SelectionTheme
} from './renderer/types'
import type * as Skia from 'canvaskit-wasm'

export type { SubtreePictureCacheEntry, PendingFontNode } from './renderer/types'

import type { PlacedIssueMarker } from './issues/types'
import type { PlacedStatusLabel } from './labels/status'
import { EffectRasterCache } from './renderer/effect-raster-cache'
import { TiledSceneController } from './renderer/tiles'
import type { TransientCanvasPreview } from './renderer/transient-previews'
import type * as RendererTypes from './renderer/types'

export type { LiveImageSource } from './renderer/images'

const rendererEditorStateRenderMethod = createEditorStateRenderMethod(() =>
  Defaults.IS_BROWSER ? window.devicePixelRatio || 1 : 1
)
const rendererRasterFallback = createRasterFallback(() =>
  Defaults.IS_BROWSER ? document.createElement('canvas') : null
)

export class SkiaRenderer {
  ck: Skia.CanvasKit
  surface: Skia.Surface
  declare fillPaint: Skia.Paint
  diamondGradientEffect: Skia.RuntimeEffect | null = null
  pixelGridEffect: Skia.RuntimeEffect | null = null
  declare strokePaint: Skia.Paint
  declare selectionPaint: Skia.Paint
  declare parentOutlinePaint: Skia.Paint
  declare snapPaint: Skia.Paint
  declare auxFill: Skia.Paint
  declare auxStroke: Skia.Paint
  declare opacityPaint: Skia.Paint
  declare effectLayerPaint: Skia.Paint
  imageFilterCache = new Map<string, Skia.ImageFilter | null>()
  maskFilterCache = new Map<number, Skia.MaskFilter | null>()
  _tmpColor = new Float32Array(4)
  _tmpRect = new Float32Array(4)
  textFont: Skia.Font | null = null
  labelFont: Skia.Font | null = null
  sizeFont: Skia.Font | null = null
  /** Inter SemiBold at 11 px, which Figma sets the padding and gap values on the canvas in. */
  valueFont: Skia.Font | null = null
  sectionTitleFont: Skia.Font | null = null
  componentLabelFont: Skia.Font | null = null
  fontMgr: Skia.FontMgr | null = null
  fontProvider: Skia.TypefaceFontProvider | null = null
  fontsLoaded = false
  fontGeneration = 0
  onFontResolutionSettled: RendererTypes.FontResolutionListener | undefined
  pendingFontNodes = new Map<string, RendererTypes.PendingFontNode>()
  textPictureGenerations = new Map<string, { data: Uint8Array; generation: number }>()
  readonly transientPreviews = new Map<string, TransientCanvasPreview>()
  imageCache = createImageCache()
  /**
   * Images drawn in place of stored ones while they play, such as a shader's live frames, each
   * with the surface whose GL context holds its texture.
   */
  readonly liveImages = new Map<string, { image: Skia.Image; surface: Skia.Surface }>()
  viewportImageRendering = false
  imageMemoryGraph: SceneGraph | null = null
  imageMemoryPage: string | null = null
  onImagePreviewReady: (() => void) | null = null
  readonly imagePreviews = new ImagePreviewCache(() => this.onImagePreviewReady?.())
  nodePaths = new NodePathCaches()
  /** Path-text glyph silhouettes (stroke-and-union, font units) keyed by blob hash + relative weight. */
  glyphSilhouetteCache = createGlyphSilhouetteCache()
  derivedGlyphPathCache = createDerivedGlyphPathCache()
  derivedDecorationCache: SavedDecorationCache = new WeakMap()
  /** Images of the emoji saved text draws, by what drew them and the emoji. */
  emojiImageCache = createEmojiImageCache()
  renderingSceneBacking = false
  scenePicture: Skia.SkPicture | null = null
  scenePictureVersion = -1
  scenePictureFontGeneration = -1
  scenePicturePositionPreviewVersion = -1
  scenePicturePageId: string | null = null
  sceneBacking: SceneBacking | null = null
  sceneBackingPreviewUntil = 0
  sceneBackingNeedsCrispRender = false
  sceneBackingAllocationFailed = false
  sceneBackingBuild: SceneBackingBuild | null = null
  sceneBackingAverageRecordMs = 40
  sceneBackingAverageViewportIntervalMs = 80
  sceneBackingLastViewportEventAt = 0
  navigationPhase: EditorState['navigation']['phase'] = 'idle'
  navigationGeneration = 0
  /** The document is read-only: selections draw without handles to drag. */
  readOnly = false
  tiledSceneEnabled = false
  /**
   * What an empty sticky note shows while it is edited on this canvas, in the interface language;
   * null for a canvas that draws only the document, such as an export.
   */
  stickyPlaceholder: string | null = null
  /** What an empty connector label shows while it is typed into; null draws nothing. */
  connectorLabelPlaceholder: string | null = null
  tracksSceneSettlement = true
  /** Colour space this renderer's surface presents; colours convert into it when painting. */
  presentationColorSpace: RenderColorSpace = 'srgb'
  tiledScenePending = false
  tiledSceneCovered = false
  lastSceneViewport: { panX: number; panY: number; zoom: number } | null = null
  nodePictureCache = new Map<string, Skia.SkPicture | null>()
  nodePictureCacheGenerations = new Map<string, number>()
  effectRasterCache = new EffectRasterCache()
  subtreePictureCache = new Map<string, RendererTypes.SubtreePictureCacheEntry>()
  subtreePictureCachePageId: string | null = null
  subtreePictureCacheSceneVersion = -1
  subtreePictureCachePositionPreviewVersion = -1
  subtreePictureCacheFontGeneration = -1
  readonly labelCache = new LabelCache()
  readonly labelParagraphCache = new LabelParagraphCache(undefined, undefined, {
    onMissingGlyphs: (missing) => RendererFonts.resolveLabelFontCoverage(this, missing)
  })
  readonly textPreparationCache = new TextPreparationCache()
  readonly tiledScene = new TiledSceneController()
  readonly profiler: RenderProfiler

  declare rulerBgPaint: Skia.Paint
  declare rulerTickPaint: Skia.Paint
  declare rulerTextPaint: Skia.Paint
  declare rulerHlPaint: Skia.Paint
  declare rulerBadgePaint: Skia.Paint
  declare rulerLabelPaint: Skia.Paint
  declare penPathPaint: Skia.Paint
  declare penLiveStrokePaint: Skia.Paint
  /** The pencil stroke being drawn; its colour and width are set per frame. */
  declare pencilStrokePaint: Skia.Paint
  declare penHandlePaint: Skia.Paint
  declare penVertexFill: Skia.Paint
  declare penVertexStroke: Skia.Paint

  panX = 0
  panY = 0
  zoom = 1
  dpr = 1
  viewportWidth = 0
  viewportHeight = 0
  showRulers = true
  pageColor = Defaults.CANVAS_BG_COLOR
  rulerTheme: RendererTypes.RulerTheme | null = null
  /** Selection chrome, set from editor state each frame through {@link setSelectionTheme}. */
  selectionTheme: RendererTypes.SelectionTheme = Defaults.DEFAULT_SELECTION_THEME
  pageId: string | null = null
  /** Issue markers placed in the last overlay pass; hit testing reads the same layout. */
  issueMarkers: PlacedIssueMarker[] = []
  /** Status labels drawn in the last label pass; clicks on them open the status menu. */
  statusLabels: PlacedStatusLabel[] = []
  /** Screen rectangles of UI floating over this canvas, which overlays such as edge pins avoid. */
  overlayObstacles: readonly Rect[] = []

  boundEffectLayersToViewport = false
  worldViewport = { x: 0, y: 0, w: 0, h: 0 }
  _nodeCount = 0
  _culledCount = 0
  _flashes: Array<{ nodeId: string; startTime: number }> = []
  _flashPaint: Skia.Paint | null = null
  aiMotionEnabled = true
  _aiActiveNodes = new Map<string, number>()
  _aiDoneFlashes = new Map<string, number>()

  readonly DEFAULT_FONT_SIZE = Defaults.DEFAULT_FONT_SIZE
  readonly COMPONENT_SET_BORDER_WIDTH = Defaults.COMPONENT_SET_BORDER_WIDTH
  readonly COMPONENT_SET_DASH = Defaults.COMPONENT_SET_DASH
  readonly COMPONENT_SET_DASH_GAP = Defaults.COMPONENT_SET_DASH_GAP

  declare drawHoverHighlight: RendererDomainMethods['drawHoverHighlight']
  declare drawMeasurements: RendererDomainMethods['drawMeasurements']
  declare drawEnteredContainer: RendererDomainMethods['drawEnteredContainer']
  declare drawSelection: RendererDomainMethods['drawSelection']
  declare drawNodeSelection: RendererDomainMethods['drawNodeSelection']
  declare drawSelectionLabels: RendererDomainMethods['drawSelectionLabels']
  declare drawParentFrameOutlines: RendererDomainMethods['drawParentFrameOutlines']
  declare drawNodeOutline: RendererDomainMethods['drawNodeOutline']
  declare drawGroupBounds: RendererDomainMethods['drawGroupBounds']
  declare getRotatedCorners: RendererDomainMethods['getRotatedCorners']
  declare drawHandle: RendererDomainMethods['drawHandle']
  declare drawSnapGuides: RendererDomainMethods['drawSnapGuides']
  declare drawSnapMarks: RendererDomainMethods['drawSnapMarks']
  declare drawMarquee: RendererDomainMethods['drawMarquee']
  declare drawFlashes: RendererDomainMethods['drawFlashes']
  declare drawLayoutInsertIndicator: RendererDomainMethods['drawLayoutInsertIndicator']
  declare drawAutoLayoutHover: RendererDomainMethods['drawAutoLayoutHover']
  declare drawTextEditOverlay: RendererDomainMethods['drawTextEditOverlay']
  declare drawNodeEditOverlay: RendererDomainMethods['drawNodeEditOverlay']
  declare drawPenOverlay: RendererDomainMethods['drawPenOverlay']
  declare drawPencilOverlay: RendererDomainMethods['drawPencilOverlay']
  declare drawPresenceCursors: RendererDomainMethods['drawPresenceCursors']
  declare drawRulers: RendererDomainMethods['drawRulers']
  declare drawFrameTitles: RendererDomainMethods['drawFrameTitles']
  declare drawSectionTitles: RendererDomainMethods['drawSectionTitles']
  declare drawComponentLabels: RendererDomainMethods['drawComponentLabels']
  declare renderNodeSelf: RendererDomainMethods['renderNodeSelf']
  declare renderNode: RendererDomainMethods['renderNode']
  declare renderSection: RendererDomainMethods['renderSection']
  declare renderComponentSet: RendererDomainMethods['renderComponentSet']
  declare renderShape: RendererDomainMethods['renderShape']
  declare renderShapeUncached: RendererDomainMethods['renderShapeUncached']
  declare paintShapeContent: RendererDomainMethods['paintShapeContent']
  declare renderEffects: RendererDomainMethods['renderEffects']
  declare renderText: RendererDomainMethods['renderText']
  declare drawNodeFill: RendererDomainMethods['drawNodeFill']
  declare applyFill: RendererDomainMethods['applyFill']
  declare applyGradientFill: RendererDomainMethods['applyGradientFill']
  declare applyImageFill: RendererDomainMethods['applyImageFill']
  declare drawNodeStroke: RendererDomainMethods['drawNodeStroke']
  declare drawStrokeWithAlign: RendererDomainMethods['drawStrokeWithAlign']
  declare drawRRectStrokeWithAlign: RendererDomainMethods['drawRRectStrokeWithAlign']
  declare drawIndividualSideStrokes: RendererDomainMethods['drawIndividualSideStrokes']
  declare strokeNodeShape: RendererDomainMethods['strokeNodeShape']
  declare makeNodeShapePath: RendererDomainMethods['makeNodeShapePath']
  declare makePolygonPath: RendererDomainMethods['makePolygonPath']
  declare makeRRect: RendererDomainMethods['makeRRect']
  declare makeRRectWithSpread: RendererDomainMethods['makeRRectWithSpread']
  declare clipNodeShape: RendererDomainMethods['clipNodeShape']
  declare getVectorPaths: RendererDomainMethods['getVectorPaths']
  declare getFillGeometry: RendererDomainMethods['getFillGeometry']
  declare getStrokeGeometry: RendererDomainMethods['getStrokeGeometry']
  declare getCachedDropShadow: RendererDomainMethods['getCachedDropShadow']
  declare getCachedBlur: RendererDomainMethods['getCachedBlur']
  declare getCachedDecalBlur: RendererDomainMethods['getCachedDecalBlur']
  declare getCachedMaskBlur: RendererDomainMethods['getCachedMaskBlur']
  declare applyClippedBlur: RendererDomainMethods['applyClippedBlur']
  declare color4f: typeof rendererGeometryMethods.color4f
  declare ltrb: typeof rendererGeometryMethods.ltrb

  declare selColor: typeof rendererChromeMethods.selColor
  declare selForegroundColor: typeof rendererChromeMethods.selForegroundColor
  declare setSelectionTheme: typeof rendererChromeMethods.setSelectionTheme
  declare compColor: typeof rendererChromeMethods.compColor
  declare slotColor: typeof rendererChromeMethods.slotColor
  declare outlineColor: typeof rendererChromeMethods.outlineColor
  declare outlineForegroundColor: typeof rendererChromeMethods.outlineForegroundColor
  declare isInComponent: typeof rendererChromeMethods.isInComponent
  declare isComponentType: typeof rendererChromeMethods.isComponentType
  declare isRectangularType: typeof rendererGeometryMethods.isRectangularType
  declare effectOverflow: typeof rendererGeometryMethods.effectOverflow

  constructor(ck: Skia.CanvasKit, surface: Skia.Surface, gl?: WebGL2RenderingContext | null) {
    this.ck = ck
    this.surface = surface
    this.profiler = new RenderProfiler(ck, gl ?? null)
    initializeRendererPaints(this)
  }
  declare getFontProvider: typeof rendererResourcesMethods.getFontProvider
  declare isDestroyed: typeof rendererResourcesMethods.isDestroyed
  declare loadFonts: typeof rendererResourcesMethods.loadFonts
  declare syncFontGeneration: typeof rendererResourcesMethods.syncFontGeneration
  declare trackFontDemand: typeof rendererResourcesMethods.trackFontDemand
  declare isTextPictureCurrent: typeof rendererResourcesMethods.isTextPictureCurrent
  declare prepareForExport: typeof rendererResourcesMethods.prepareForExport
  declare replaceSurface: typeof rendererResourcesMethods.replaceSurface
  declare invalidateScenePicture: typeof rendererResourcesMethods.invalidateScenePicture
  declare invalidateAllPictures: typeof rendererResourcesMethods.invalidateAllPictures

  /**
   * Draws `source` wherever the image `hash` is painted, until it is set to null, and redraws
   * `nodeIds`, the layers that paint it. Frames of the same size reuse one texture. Returns
   * whether a live image is shown, which a browser that cannot upload `source` leaves false.
   */
  declare setLiveImage: typeof rendererImagesMethods.setLiveImage

  /**
   * Forgets the decoded image `hash` after its bytes were replaced, such as a shader's frame
   * rendered again, and redraws whatever showed it. Previews notice new bytes themselves.
   */
  declare forgetImage: typeof rendererImagesMethods.forgetImage

  /** Drops `nodeId`'s cached drawing; `changedKeys`, when known, lets text keep its glyph coverage. */
  declare invalidateNodePicture: typeof rendererResourcesMethods.invalidateNodePicture
  declare flashNode: typeof rendererResourcesMethods.flashNode
  declare aiMarkActive: typeof rendererResourcesMethods.aiMarkActive
  declare aiMarkDone: typeof rendererResourcesMethods.aiMarkDone
  declare aiFlashDone: typeof rendererResourcesMethods.aiFlashDone
  declare aiClearActive: typeof rendererResourcesMethods.aiClearActive
  declare aiClearAll: typeof rendererResourcesMethods.aiClearAll
  declare readonly hasActiveFlashes: typeof rendererResourcesMethods.hasActiveFlashes
  declare hitTestSectionTitle: typeof rendererLabelsMethods.hitTestSectionTitle
  declare hitTestComponentLabel: typeof rendererLabelsMethods.hitTestComponentLabel
  declare hitTestFrameTitle: typeof rendererLabelsMethods.hitTestFrameTitle
  declare renderSceneToCanvas: typeof rendererDrawingMethods.renderSceneToCanvas
  declare renderFromEditorState: typeof rendererEditorStateRenderMethod
  declare render: typeof rendererDrawingMethods.render
  declare invalidateVectorPath: typeof rendererResourcesMethods.invalidateVectorPath
  declare measureTextNode: typeof rendererDrawingMethods.measureTextNode
  declare nodeFontReadiness: typeof rendererDrawingMethods.nodeFontReadiness
  declare isNodeFontLoaded: typeof rendererDrawingMethods.isNodeFontLoaded
  declare buildTextPicture: typeof rendererDrawingMethods.buildTextPicture
  declare buildParagraph: typeof rendererDrawingMethods.buildParagraph
  declare resolveFillColorInfo: typeof rendererDrawingMethods.resolveFillColorInfo
  declare resolveFillColor: typeof rendererDrawingMethods.resolveFillColor
  declare resolveStrokeColorInfo: typeof rendererDrawingMethods.resolveStrokeColorInfo
  declare resolveStrokeColor: typeof rendererDrawingMethods.resolveStrokeColor
  declare screenToCanvas: typeof rendererGeometryMethods.screenToCanvas

  /**
   * Browser fallback for raster formats CanvasKit cannot encode itself
   * (this build returns null from `encodeToBytes` for JPEG/WEBP). Routes the
   * RGBA pixels through an HTMLCanvasElement so `toDataURL` does the encoding.
   * Returns null outside the browser or if encoding fails.
   */
  declare encodeRasterFallback: typeof rendererRasterFallback

  destroyed: boolean = false
  declare destroy: typeof rendererResourcesMethods.destroy
}

installRendererDomainMethods(SkiaRenderer.prototype)
installRendererMethods(SkiaRenderer.prototype, rendererChromeMethods)
installRendererMethods(SkiaRenderer.prototype, rendererGeometryMethods)
installRendererMethods(SkiaRenderer.prototype, rendererResourcesMethods)
installRendererMethods(SkiaRenderer.prototype, rendererLabelsMethods)
installRendererMethods(SkiaRenderer.prototype, rendererDrawingMethods)
installRendererMethods(SkiaRenderer.prototype, rendererImagesMethods)

installRendererMethods(SkiaRenderer.prototype, {
  renderFromEditorState: rendererEditorStateRenderMethod,
  encodeRasterFallback: rendererRasterFallback
})
