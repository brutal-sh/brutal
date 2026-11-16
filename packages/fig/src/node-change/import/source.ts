import type { NodeChange } from '@open-pencil/kiwi/fig/codec'
import { guidToString } from '@open-pencil/kiwi/fig/guid'
import type { SceneNode } from '@open-pencil/scene-graph'
import { createDefaultSourceMetadata } from '@open-pencil/scene-graph/node-defaults'

function extractFigmaLayoutMetadata(nc: NodeChange): SceneNode['source']['fig']['layout'] {
  return {
    stackMode: nc.stackMode,
    stackSpacing: nc.stackSpacing,
    stackPadding: nc.stackPadding,
    stackPaddingRight: nc.stackPaddingRight,
    stackPaddingBottom: nc.stackPaddingBottom,
    stackCounterAlign: nc.stackCounterAlign,
    stackJustify: nc.stackJustify,
    stackCounterAlignItems: nc.stackCounterAlignItems,
    stackPrimaryAlignItems: nc.stackPrimaryAlignItems,
    stackPrimarySizing: nc.stackPrimarySizing,
    stackCounterSizing: nc.stackCounterSizing,
    stackVerticalPadding: nc.stackVerticalPadding,
    stackHorizontalPadding: nc.stackHorizontalPadding,
    stackWrap: nc.stackWrap,
    stackPositioning: nc.stackPositioning,
    stackChildPrimaryGrow: nc.stackChildPrimaryGrow,
    stackChildAlignSelf: nc.stackChildAlignSelf,
    stackCounterSpacing: nc.stackCounterSpacing,
    bordersTakeSpace: nc.bordersTakeSpace as boolean | undefined,
    stackReverseZIndex: nc.stackReverseZIndex as boolean | undefined
  }
}

export function extractOccurrenceMetadata(nc: NodeChange): SceneNode['source'] {
  const source = createDefaultSourceMetadata()
  source.fig.layout = extractFigmaLayoutMetadata(nc)
  return source
}

export function extractSourceMetadata(nc: NodeChange, blobs: Uint8Array[]): SceneNode['source'] {
  return {
    format: 'fig',
    id: nc.guid ? guidToString(nc.guid) : null,
    orderKey: nc.parentIndex?.position ?? null,
    editedFields: [],
    fig: {
      ...extractFigmaRawGeometry(nc, blobs),
      ...extractFigmaSymbolMetadata(nc, blobs),
      layout: extractFigmaLayoutMetadata(nc)
    }
  }
}
interface RawSymbolData {
  symbolOverrides?: unknown[]
  uniformScaleFactor?: number
}
interface PreservedFigmaBlob {
  __openPencilFigmaBlob: Uint8Array
}

function preserveBlobIndex(index: number, blobs: Uint8Array[]): number | PreservedFigmaBlob {
  const blob: unknown = blobs[index]
  if (blob == null) return index
  return {
    __openPencilFigmaBlob:
      blob instanceof Uint8Array
        ? blob
        : new Uint8Array(Object.values(blob as Record<string, number>))
  }
}

function preserveFigmaPayloadBlobs(value: unknown, blobs: Uint8Array[]): unknown {
  if (value instanceof Uint8Array) return value
  if (Array.isArray(value)) return value.map((item) => preserveFigmaPayloadBlobs(item, blobs))
  if (!value || typeof value !== 'object') return value
  const result: Record<string, unknown> = {}
  for (const [key, child] of Object.entries(value)) {
    if ((key === 'commandsBlob' || key === 'vectorNetworkBlob') && typeof child === 'number') {
      result[key] = preserveBlobIndex(child, blobs)
    } else {
      result[key] = preserveFigmaPayloadBlobs(child, blobs)
    }
  }
  return result
}

export const FIGMA_RAW_NODE_FIELD_KEYS = [
  'styleIdForFill',
  'styleIdForStrokeFill',
  'styleIdForText',
  'styleIdForEffect',
  'styleIdForGrid',
  'styleType',
  'componentPropAssignments',
  'backgroundPaints',
  'layoutGrids',
  'exportSettings',
  'componentPropDefs',
  'componentPropRefs',
  'variantPropSpecs',
  'stateGroupPropertyValueOrders',
  'isStateGroup',
  'version',
  'sourceLibraryKey',
  'userFacingVersion',
  'description',
  'key',
  'sortPosition',
  'detachedSymbolId',
  'documentColorProfile',
  'variableConsumptionMap',
  'variableModeBySetMap',
  'parameterConsumptionMap',
  'editInfo',
  'backgroundColor',
  'blendMode',
  'pageType',
  'isPageDivider',
  'guides',
  'handoffStatusMap',
  'annotationCategories',
  'miterLimit',
  'mask',
  'maskType',
  'maskIsOutline',
  'strokeWeight',
  'strokeJoin',
  'borderStrokeWeightsIndependent',
  'borderTopWeight',
  'borderRightWeight',
  'borderBottomWeight',
  'borderLeftWeight',
  'minSize',
  'maxSize',
  'gridRows',
  'gridColumns',
  'gridRowAnchor',
  'gridColumnAnchor',
  'gridColumnsSizing',
  'gridRowsSizing',
  'gridChildVerticalAlign',
  'gridChildHorizontalAlign',
  'textAutoResize',
  'textAlignHorizontal',
  'textAlignVertical',
  'textData',
  'lineHeight',
  'fontName',
  'fontSize',
  'letterSpacing',
  'textTracking',
  'fontVersion',
  'emojiImageSet',
  'textUserLayoutVersion',
  'textExplicitLayoutVersion',
  'fontVariations',
  'detachOpticalSizeFromFontSize',
  'fontVariantCommonLigatures',
  'fontVariantContextualLigatures',
  'toggledOnOTFeatures',
  'toggledOffOTFeatures',
  'leadingTrim',
  'textDecorationFillPaints',
  'textUnderlineOffset',
  'textDecorationThickness',
  'textDecorationStyle',
  'semanticWeight',
  'semanticItalic',
  'maxLines',
  'textPathStart',
  'derivedTextData',
  'fillPaints',
  'strokePaints',
  'effects',
  'sectionStatusInfo',
  'prototypeStartNodeID',
  'prototypeInteractions',
  'transitionInfo',
  'codeSyntax',
  'lockMode',
  'slideThemeMap',
  'isSoftDeleted',
  'brushType',
  'scatterStrokeSettings',
  'vectorOperationVersion',
  'vectorData',
  'fillGeometry',
  'strokeGeometry'
] as const satisfies readonly (keyof NodeChange)[]

function extractFigmaRawGeometry(
  nc: NodeChange,
  blobs: Uint8Array[]
): Pick<SceneNode['source']['fig'], 'rawSize' | 'rawTransform' | 'rawNodeFields'> {
  const rawNodeFields: Record<string, unknown> = {}
  for (const key of FIGMA_RAW_NODE_FIELD_KEYS) {
    const value = nc[key]
    if (value !== undefined) rawNodeFields[key] = preserveFigmaPayloadBlobs(value, blobs)
  }
  return {
    rawSize: nc.size ? { ...nc.size } : null,
    rawTransform: nc.transform ? { ...nc.transform } : null,
    rawNodeFields
  }
}

function extractFigmaSymbolMetadata(
  nc: NodeChange,
  blobs: Uint8Array[]
): Pick<
  SceneNode['source']['fig'],
  | 'symbolOverrides'
  | 'componentPropAssignments'
  | 'derivedSymbolData'
  | 'derivedSymbolDataLayoutVersion'
  | 'uniformScaleFactor'
> {
  const sd = nc.symbolData as RawSymbolData | undefined
  return {
    symbolOverrides: preserveFigmaPayloadBlobs(sd?.symbolOverrides ?? [], blobs) as unknown[],
    componentPropAssignments: preserveFigmaPayloadBlobs(
      nc.componentPropAssignments ?? [],
      blobs
    ) as unknown[],
    derivedSymbolData: preserveFigmaPayloadBlobs(nc.derivedSymbolData ?? [], blobs) as unknown[],
    derivedSymbolDataLayoutVersion:
      typeof nc.derivedSymbolDataLayoutVersion === 'number'
        ? nc.derivedSymbolDataLayoutVersion
        : null,
    uniformScaleFactor: typeof sd?.uniformScaleFactor === 'number' ? sd.uniformScaleFactor : null
  }
}
