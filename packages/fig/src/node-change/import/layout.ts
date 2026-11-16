import type { NodeChange } from '@open-pencil/kiwi/fig/codec'
import type {
  SceneNode,
  LayoutMode,
  AxisSizingMode,
  LayoutAlign,
  LayoutAlignSelf,
  LayoutCounterAlign,
  ConstraintType
} from '@open-pencil/scene-graph'
import { OPEN_PENCIL_PLUGIN_DATA } from '@open-pencil/scene-graph/plugin-data'

import { readNodeChangePluginData } from '../plugin-data'
import { convertFigmaTransformProps } from './geometry'

function mapStackMode(mode?: string): LayoutMode {
  switch (mode) {
    case 'HORIZONTAL':
      return 'HORIZONTAL'
    case 'VERTICAL':
      return 'VERTICAL'
    default:
      return 'NONE'
  }
}

export function mapStackSizing(sizing?: string): AxisSizingMode {
  switch (sizing) {
    case 'RESIZE_TO_FIT':
    case 'RESIZE_TO_FIT_WITH_IMPLICIT_SIZE':
      return 'HUG'
    default:
      return 'FIXED'
  }
}

export function mapStackJustify(justify?: string): LayoutAlign {
  switch (justify) {
    case 'CENTER':
      return 'CENTER'
    case 'MAX':
      return 'MAX'
    case 'SPACE_BETWEEN':
    case 'SPACE_EVENLY':
      return 'SPACE_BETWEEN'
    default:
      return 'MIN'
  }
}

export function mapStackCounterAlign(align?: string): LayoutCounterAlign {
  switch (align) {
    case 'CENTER':
      return 'CENTER'
    case 'MAX':
      return 'MAX'
    case 'STRETCH':
      return 'STRETCH'
    case 'BASELINE':
      return 'BASELINE'
    default:
      return 'MIN'
  }
}

export function mapAlignSelf(align?: string): LayoutAlignSelf {
  switch (align) {
    case 'MIN':
      return 'MIN'
    case 'CENTER':
      return 'CENTER'
    case 'MAX':
      return 'MAX'
    case 'STRETCH':
      return 'STRETCH'
    case 'BASELINE':
      return 'BASELINE'
    default:
      return 'AUTO'
  }
}

export function mapConstraint(c?: string): ConstraintType {
  switch (c) {
    case 'CENTER':
      return 'CENTER'
    case 'MAX':
      return 'MAX'
    case 'STRETCH':
      return 'STRETCH'
    case 'SCALE':
      return 'SCALE'
    default:
      return 'MIN'
  }
}
function convertLayoutPadding(
  nc: NodeChange
): Pick<SceneNode, 'paddingTop' | 'paddingBottom' | 'paddingLeft' | 'paddingRight'> {
  const basePadding = nc.stackPadding ?? 0
  return {
    paddingTop: nc.stackVerticalPadding ?? basePadding,
    paddingBottom: nc.stackPaddingBottom ?? basePadding,
    paddingLeft: nc.stackHorizontalPadding ?? basePadding,
    paddingRight: nc.stackPaddingRight ?? basePadding
  }
}

function visibleContainerDerivedLayout(
  nc: NodeChange,
  layoutMode: SceneNode['layoutMode'],
  primaryAxisSizing: SceneNode['primaryAxisSizing'],
  counterAxisSizing: SceneNode['counterAxisSizing']
): SceneNode['derivedLayout'] | undefined {
  const hasHugAxis = primaryAxisSizing === 'HUG' || counterAxisSizing === 'HUG'
  const hasVisiblePaint =
    (nc.fillPaints?.some((paint) => paint.visible !== false) ?? false) ||
    (nc.strokePaints?.some((paint) => paint.visible !== false) ?? false)
  if (layoutMode === 'NONE' || !hasHugAxis || !hasVisiblePaint) return undefined

  const { x, y, width, height } = convertFigmaTransformProps(nc)
  return { x, y, width, height }
}

function minimumSizeDimension(size: NodeChange['minSize'], axis: 'x' | 'y'): number | null {
  const value = size?.value?.[axis]
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null
}

function maximumSizeDimension(size: NodeChange['maxSize'], axis: 'x' | 'y'): number | null {
  const value = size?.value?.[axis]
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null
}

function targetAspectRatio(nc: NodeChange): SceneNode['targetAspectRatio'] {
  const value = nc.targetAspectRatio?.value
  if (!value || !Number.isFinite(value.x) || !Number.isFinite(value.y)) return null
  return { x: value.x, y: value.y }
}

type ImportedLayoutProps = Pick<
  SceneNode,
  | 'layoutMode'
  | 'itemSpacing'
  | 'paddingTop'
  | 'paddingBottom'
  | 'paddingLeft'
  | 'paddingRight'
  | 'primaryAxisSizing'
  | 'counterAxisSizing'
  | 'primaryAxisAlign'
  | 'counterAxisAlign'
  | 'layoutWrap'
  | 'counterAxisSpacing'
  | 'layoutPositioning'
  | 'layoutGrow'
  | 'layoutAlignSelf'
  | 'counterAxisAlignContent'
  | 'itemReverseZIndex'
  | 'strokesIncludedInLayout'
  | 'layoutDirection'
> &
  Partial<Pick<SceneNode, 'derivedLayout'>>

export function convertLayoutProps(nc: NodeChange): ImportedLayoutProps {
  const layoutMode = mapStackMode(nc.stackMode)
  const primaryAxisSizing =
    nc.stackPrimarySizing === undefined &&
    (layoutMode === 'HORIZONTAL' || layoutMode === 'VERTICAL')
      ? 'HUG'
      : mapStackSizing(nc.stackPrimarySizing)
  const counterAxisSizing = mapStackSizing(nc.stackCounterSizing)
  const derivedLayout = visibleContainerDerivedLayout(
    nc,
    layoutMode,
    primaryAxisSizing,
    counterAxisSizing
  )

  return {
    layoutMode,
    itemSpacing: nc.stackSpacing ?? 0,
    ...convertLayoutPadding(nc),
    primaryAxisSizing,
    counterAxisSizing,
    ...convertLayoutFlowProps(nc),
    ...convertLayoutChildProps(nc),
    ...(derivedLayout ? { derivedLayout } : {})
  }
}

function convertLayoutFlowProps(nc: NodeChange) {
  return {
    primaryAxisAlign: mapStackJustify(nc.stackPrimaryAlignItems ?? nc.stackJustify),
    counterAxisAlign: mapStackCounterAlign(nc.stackCounterAlignItems ?? nc.stackCounterAlign),
    layoutWrap: nc.stackWrap === 'WRAP' ? 'WRAP' : 'NO_WRAP',
    counterAxisSpacing: nc.stackCounterSpacing ?? 0
  } as const
}

function convertLayoutChildProps(nc: NodeChange) {
  return {
    layoutPositioning: nc.stackPositioning === 'ABSOLUTE' ? 'ABSOLUTE' : 'AUTO',
    layoutGrow: nc.stackChildPrimaryGrow ?? 0,
    layoutAlignSelf: mapAlignSelf(nc.stackChildAlignSelf),
    counterAxisAlignContent:
      (nc.stackCounterAlignContent as string) === 'SPACE_BETWEEN' ? 'SPACE_BETWEEN' : 'AUTO',
    itemReverseZIndex: (nc.stackReverseZIndex ?? false) as boolean,
    strokesIncludedInLayout: (nc.strokesIncludedInLayout ?? false) as boolean,
    layoutDirection: readNodeChangePluginData(nc, OPEN_PENCIL_PLUGIN_DATA.layoutDirection) ?? 'AUTO'
  } as const
}

export function convertDimensionProps(nc: NodeChange) {
  return {
    minWidth: minimumSizeDimension(nc.minSize, 'x'),
    maxWidth: maximumSizeDimension(nc.maxSize, 'x'),
    minHeight: minimumSizeDimension(nc.minSize, 'y'),
    maxHeight: maximumSizeDimension(nc.maxSize, 'y'),
    targetAspectRatio: targetAspectRatio(nc)
  }
}
