import { isAbsolute } from 'pathe'
import { filename } from 'pathe/utils'

import {
  exportHTMLBundle,
  sceneNodeToDesignDocument,
  type DesignDocument,
  type DesignNode
} from '@open-pencil/dom-css/export'
import { isDocumentAssetPath } from '@open-pencil/pen'
import type { SceneGraph } from '@open-pencil/scene-graph'

import type { ExportAsset, HTMLExportOptions } from '#core/io/types'
import { exportWebFontFaceAssets } from '#core/text/web-font/assets'

import { vectorElement } from './vectors'

function absoluteImagePath(path: string | undefined, source: string): string | undefined {
  if (!path || !isAbsolute(path) || path.startsWith('//') || path.startsWith('\\\\'))
    return undefined
  const base = new URL('file:///')
  base.pathname = encodeURI(path.replace(/\\/g, '/')).replace(/[?#]/g, encodeURIComponent)
  return new URL(source, base).href
}

function imagePaths(node: DesignNode, options: HTMLExportOptions): DesignNode {
  if (node.type !== 'element') return node
  const scene = node.sourceSceneNode
  const hash = scene?.fills[0]?.imageHash
  const retained = scene?.fills[0]?.imageSource
  const source = retained?.hash === hash ? retained?.url : undefined
  let src: string | undefined
  if (node.tagName === 'img' && source && isDocumentAssetPath(source)) {
    src = source
      .replace(/\\/g, '/')
      .replace(/^\.\//, '')
      .split('/')
      .map(encodeURIComponent)
      .join('/')
    if (options.assets === 'absolute') src = absoluteImagePath(options.documentPath, src)
  }
  return {
    ...node,
    attrs: src ? { ...node.attrs, src } : node.attrs,
    children: node.children.map((child) => imagePaths(child, options))
  }
}

function designDocument(
  graph: SceneGraph,
  nodeIds: string[],
  options: HTMLExportOptions
): DesignDocument {
  return {
    type: 'document',
    sourceGraph: graph,
    children: nodeIds.flatMap((id) =>
      sceneNodeToDesignDocument(graph, id, {
        vectorElement,
        includeSourceIds: options.includeLayerIds ?? true,
        includeSourceNames: options.includeLayerNames ?? false
      }).children.map((child) =>
        options.assets === 'relative' || options.assets === 'absolute'
          ? imagePaths(child, options)
          : child
      )
    )
  }
}

/** `card.html` keeps its external files in `card.assets/` next to it, whatever the path style. */
function assetBasePath(fileName: string | undefined): string {
  const name = fileName && filename(fileName)
  return `${name || 'export'}.assets`
}

export async function renderNodesToHTML(
  graph: SceneGraph,
  nodeIds: string[],
  options: HTMLExportOptions = {},
  fileName?: string
): Promise<{ html: string; assets: ExportAsset[] }> {
  const bundle = await exportHTMLBundle(designDocument(graph, nodeIds, options), {
    center: options.center,
    html: options.html,
    style: options.style,
    assets: options.assets === 'external' ? 'external' : 'inline',
    fonts:
      options.fonts === 'assets'
        ? async (fonts, basePath) =>
            (await exportWebFontFaceAssets({ fonts, assetBasePath: basePath })).assets
        : 'none',
    assetBasePath: assetBasePath(fileName)
  })
  const page = bundle.files.find((file) => file.path === bundle.entrypoint)
  if (typeof page?.content !== 'string') throw new Error('HTML export produced no page')
  return { html: page.content, assets: bundle.files.filter((file) => file !== page) }
}
