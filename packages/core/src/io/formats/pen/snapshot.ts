import { toUint8Array } from 'js-base64'

import { isLegacyStroke, writePenDocument, type PenOverride } from '@open-pencil/pen'
import type { SceneGraph } from '@open-pencil/scene-graph'
import { scriptOfNode, withScript } from '@open-pencil/scene-graph/scripts'

import { extractExportGraph } from '#core/io/subgraph'
import type { ExportAsset, ExportResult, IOData } from '#core/io/types'

export interface PenSnapshotResult extends ExportResult {
  /** Original references for the dependency preview; archive paths remain generated and safe. */
  sources: ReadonlyMap<string, string>
}

/** Export dependencies beside a relocatable document; JavaScript sources are keyed by node ID. */
export function exportPenSnapshot(
  graph: SceneGraph,
  scriptSources: ReadonlyMap<string, string> = new Map()
): PenSnapshotResult {
  const assets: ExportAsset[] = []
  const paths = new Map<string, string>()
  const sources = new Map<string, string>()
  function asset(
    key: string,
    folder: 'images' | 'shaders' | 'scripts',
    extension: string,
    content: IOData
  ) {
    const identity = `${folder}\0${key}`
    const existing = paths.get(identity)
    if (existing) return existing
    // Generated paths cannot inherit absolute paths, traversal or collisions from source URLs.
    const path = `${folder}/${assets.length + 1}.${extension}`
    paths.set(identity, path)
    assets.push({ path, content })
    return path
  }
  const snapshotGraph = scriptSources.size
    ? extractExportGraph(graph, { scope: 'document' }).graph
    : graph
  for (const node of snapshotGraph.getAllNodes()) {
    const script = scriptOfNode(node)
    if (!script?.uri) continue
    const source = scriptSources.get(node.id)
    if (source === undefined)
      throw new Error(
        `Snapshot cannot bundle linked Script sources: ${node.name}. Choose its source file first.`
      )
    if (new TextEncoder().encode(source).byteLength > 256_000)
      throw new Error('Snapshot Script sources must be no larger than 256 KB.')
    const path = asset(JSON.stringify([script.uri, source]), 'scripts', 'js', source)
    sources.set(path, script.uri)
    snapshotGraph.updateNode(node.id, { pluginData: withScript(node, { ...script, uri: path }) })
  }
  const penDocument = writePenDocument(snapshotGraph)
  function paints(value: PenOverride['fill']) {
    for (const paint of Array.isArray(value) ? value : [value]) {
      if (!paint || typeof paint !== 'object') continue
      if (paint.type === 'shader' && typeof paint.openPenSource === 'string') {
        const source = typeof paint.url === 'string' ? paint.url : ''
        if (!source && !paint.openPenSource) continue
        const path = asset(
          JSON.stringify([source, paint.openPenSource]),
          'shaders',
          'glsl',
          paint.openPenSource
        )
        paint.url = path
        if (source) sources.set(path, source)
        delete paint.openPenSource
      } else if (paint.type === 'image' && typeof paint.url === 'string') {
        const match = /^data:image\/(png|jpeg|gif|webp);base64,([A-Za-z0-9+/=]+)$/.exec(paint.url)
        if (!match) throw new Error('Snapshot image is not a supported embedded resource.')
        paint.url = asset(paint.url, 'images', match[1], toUint8Array(match[2]))
      }
    }
  }
  function visit(node: PenOverride) {
    paints(node.fill)
    paints(isLegacyStroke(node.stroke) ? node.stroke.fill : node.stroke)
    for (const child of node.children ?? []) visit(child)
    for (const override of Object.values(node.descendants ?? {})) visit(override)
  }
  for (const node of penDocument.children) visit(node)
  return {
    format: 'pen',
    mimeType: 'application/json',
    extension: 'pen',
    encoding: 'utf8',
    data: `${JSON.stringify(penDocument, null, 2)}\n`,
    assets,
    sources
  }
}
