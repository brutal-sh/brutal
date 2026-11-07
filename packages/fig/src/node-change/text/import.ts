import type { NodeChange } from '@open-pencil/kiwi/fig/codec'
import type {
  SceneNode,
  TextLength,
  TextAutoResize,
  TextAlignVertical,
  TextCase
} from '@open-pencil/scene-graph'
import { DEFAULT_FONT_FAMILY } from '@open-pencil/scene-graph/constants'
import { styleToWeight } from '@open-pencil/scene-graph/font-style'
import { OPEN_PENCIL_PLUGIN_DATA } from '@open-pencil/scene-graph/plugin-data'
import { pixelLength } from '@open-pencil/scene-graph/text'

import { convertFigmaDerivedTextGlyphs } from '../derived-text/glyphs'
import { convertFontFeatures } from '../font/features'
import { convertFontVariations } from '../font/variations'
import { convertFills } from '../paint'
import { readNodeChangePluginData } from '../plugin-data'
import { importStyleRuns } from '../style/runs'
import { importParagraphStyles } from './lines'
import {
  convertLetterSpacing,
  convertLineHeight,
  isFigmaAutoLineHeight,
  mapTextDecoration
} from './values'

/**
 * A text's line height. Figma writes auto as 100 percent, and OpenPencil once wrote none for
 * it; a text in auto lines up each line at its own font's height. Figma saves each line at the
 * larger of its line height and its tallest font's height, so a first line shorter than the
 * text's height in pixels was laid out at another one, which a style the text uses set. A first
 * line with a range of its own line height was laid out at the range's, not the text's.
 */
function importedTextLineHeight(nc: NodeChange): TextLength | null {
  if (!nc.lineHeight || isFigmaAutoLineHeight(nc.lineHeight)) return null
  const firstLine = nc.derivedTextData?.baselines?.[0]
  if (
    nc.lineHeight.units === 'PIXELS' &&
    firstLine !== undefined &&
    Number.isFinite(firstLine.lineHeight) &&
    firstLine.lineHeight < nc.lineHeight.value &&
    !rangeSetsLineHeight(nc, firstLine.firstCharacter, firstLine.endCharacter)
  )
    return pixelLength(firstLine.lineHeight)
  return convertLineHeight(nc.lineHeight)
}

/** Whether a character from `start` up to `end` has a line height from its range's style. */
function rangeSetsLineHeight(nc: NodeChange, start: number, end: number): boolean {
  const ids = new Set(
    (nc.textData?.styleOverrideTable ?? [])
      .filter((style) => style.lineHeight)
      .map((style) => style.styleID as number | undefined)
  )
  return (nc.textData?.characterStyleIDs ?? [])
    .slice(start, end)
    .some((id) => id !== 0 && ids.has(id))
}

type TextProps = Pick<
  SceneNode,
  | 'text'
  | 'fontSize'
  | 'fontFamily'
  | 'fontWeight'
  | 'italic'
  | 'textAlignHorizontal'
  | 'textAlignVertical'
  | 'textAutoResize'
  | 'textCase'
  | 'textDecoration'
  | 'textDecorationStyle'
  | 'textDecorationThickness'
  | 'textDecorationFills'
  | 'leadingTrim'
  | 'lineHeight'
  | 'letterSpacing'
  | 'maxLines'
  | 'textParagraphs'
  | 'listSpacing'
  | 'paragraphSpacing'
  | 'paragraphIndent'
  | 'hangingList'
  | 'styleRuns'
  | 'fontVariations'
  | 'opticalSizeFromFontSize'
  | 'fontFeatures'
  | 'textTruncation'
  | 'textDirection'
  | 'derivedLayout'
  | 'derivedTextGlyphs'
>

function convertTextDecorationProps(
  nc: NodeChange
): Pick<
  SceneNode,
  | 'textDecoration'
  | 'textDecorationStyle'
  | 'textDecorationThickness'
  | 'textDecorationFills'
  | 'textDecorationSkipInk'
  | 'textUnderlineOffset'
> {
  return {
    textDecoration: mapTextDecoration(nc.textDecoration),
    textDecorationStyle: (nc.textDecorationStyle ?? 'SOLID') as SceneNode['textDecorationStyle'],
    textDecorationThickness: nc.textDecorationThickness?.value ?? null,
    textDecorationFills: convertFills(nc.textDecorationFillPaints),
    textDecorationSkipInk: nc.textDecorationSkipInk ?? true,
    textUnderlineOffset: nc.textUnderlineOffset?.value ?? null
  }
}

function convertParagraphProps(
  nc: NodeChange
): Pick<
  SceneNode,
  'textParagraphs' | 'listSpacing' | 'paragraphSpacing' | 'paragraphIndent' | 'hangingList'
> {
  return {
    textParagraphs: importParagraphStyles(nc.textData?.lines, nc.textData?.styleOverrideTable),
    listSpacing: nc.listSpacing ?? 0,
    paragraphSpacing: nc.paragraphSpacing ?? 0,
    paragraphIndent: nc.paragraphIndent ?? 0,
    hangingList: nc.hangingList ?? false
  }
}

export function convertTextProps(nc: NodeChange, blobs: Uint8Array[]): TextProps {
  return {
    text: nc.textData?.characters ?? '',
    fontSize: nc.fontSize ?? 14,
    fontFamily: nc.fontName?.family ?? DEFAULT_FONT_FAMILY,
    fontWeight: styleToWeight(nc.fontName?.style ?? ''),
    italic: nc.fontName?.style.toLowerCase().includes('italic') ?? false,
    textAlignHorizontal: (nc.textAlignHorizontal ?? 'LEFT') as
      | 'LEFT'
      | 'CENTER'
      | 'RIGHT'
      | 'JUSTIFIED',
    textAlignVertical: (nc.textAlignVertical ?? 'TOP') as TextAlignVertical,
    textAutoResize: (nc.textAutoResize ?? 'NONE') as TextAutoResize,
    textCase: (nc.textCase ?? 'ORIGINAL') as TextCase,
    ...convertTextDecorationProps(nc),
    leadingTrim: (nc.leadingTrim ?? 'NONE') as SceneNode['leadingTrim'],
    lineHeight: importedTextLineHeight(nc),
    letterSpacing: convertLetterSpacing(nc.letterSpacing),
    maxLines: (nc.maxLines ?? null) as number | null,
    ...convertParagraphProps(nc),
    styleRuns: importStyleRuns(nc),
    fontVariations: convertFontVariations(nc),
    opticalSizeFromFontSize: nc.detachOpticalSizeFromFontSize !== true,
    fontFeatures: convertFontFeatures(nc),
    textTruncation: (nc.textTruncation as string) === 'ENDING' ? 'ENDING' : 'DISABLED',
    textDirection: readNodeChangePluginData(nc, OPEN_PENCIL_PLUGIN_DATA.textDirection) ?? 'AUTO',
    ...convertDerivedText(nc, blobs)
  }
}

function convertDerivedText(
  nc: NodeChange,
  blobs: Uint8Array[]
): Pick<SceneNode, 'derivedLayout' | 'derivedTextGlyphs' | 'derivedTextHeight'> {
  const layoutSize = nc.derivedTextData?.layoutSize
  return {
    derivedLayout: layoutSize ? { width: layoutSize.x, height: layoutSize.y } : null,
    derivedTextHeight: savedLinesHeight(nc),
    derivedTextGlyphs: convertFigmaDerivedTextGlyphs(
      nc.derivedTextData,
      blobs,
      nc.textData?.characters ?? ''
    )
  }
}

/**
 * How far the lines Figma saved reach: the bottom of the last one. Figma's layout size is the box
 * of a fixed-size text even when its lines draw past it, so the lines themselves tell.
 */
function savedLinesHeight(nc: NodeChange): number | null {
  const bottoms = (nc.derivedTextData?.baselines ?? []).map(
    (line) => (line.lineY ?? line.position.y - line.lineAscent) + line.lineHeight
  )
  return bottoms.length > 0 ? Math.max(...bottoms) : null
}
