import { computed, type ComputedRef, type Ref } from 'vue'

import type { SceneNode } from '@open-pencil/scene-graph'
import { createDefaultNode } from '@open-pencil/scene-graph/node-defaults'

import type { EditorStore } from '@/app/editor/active-store'
import type { EnabledLibraryAsset, LibraryService } from '@/app/libraries'

import { findAssetPage } from './page'

export type AssetView = 'grid' | 'list'

export type LocalAsset = {
  id: string
  name: string
  node: SceneNode
  componentId: string | null
  variants: Array<{ name: string; values: string[] }>
  variantCount: number
  hasConflicts: boolean
  sourceLibraryKey: string | null
  description: string
  docsURL: string | null
  libraryId: string | null
  revisionId: string | null
  assetKey: string | null
  libraryName: string | null
  pageId: string
  pageName: string
}

export type AssetGroup = {
  pageId: string
  pageName: string
  assets: LocalAsset[]
}

export function useAssetCatalog(
  editor: EditorStore,
  service: LibraryService,
  query: Ref<string>,
  pageLabel: () => string
) {
  const graphNodes = computed(() => ({
    sceneVersion: editor.state.sceneVersion,
    nodes: [...editor.graph.nodes.values()]
  }))
  const assetNodes = computed(() =>
    graphNodes.value.nodes.filter(
      (node) => node.type === 'COMPONENT' || node.type === 'COMPONENT_SET'
    )
  )
  const pages = computed(() => assetPages(editor, assetNodes.value))
  const assets = computed<LocalAsset[]>(() => [
    ...localAssets(editor, assetNodes.value, pages, pageLabel),
    ...service.enabledAssets.value.map(remoteAsset)
  ])
  const filteredAssets = computed(() => filterAssets(assets.value, query.value))
  const assetGroups = computed(() => groupAssets(filteredAssets.value))
  return { assets, filteredAssets, assetGroups }
}

function assetPages(editor: EditorStore, nodes: SceneNode[]) {
  const pages = new Map<string, Pick<SceneNode, 'id' | 'name'>>()
  for (const node of nodes) {
    const page = findAssetPage(node, editor.graph)
    if (page) pages.set(node.id, { id: page.id, name: page.name })
  }
  return pages
}

function componentSetVariantInfo(editor: EditorStore, componentSetId: string) {
  return [...editor.collectVariantOptions(componentSetId)].map(([name, values]) => ({
    name,
    values: [...values].sort((a, b) => a.localeCompare(b))
  }))
}

function localAssets(
  editor: EditorStore,
  nodes: SceneNode[],
  pages: ComputedRef<Map<string, Pick<SceneNode, 'id' | 'name'>>>,
  pageLabel: () => string
) {
  return nodes
    .filter((node) => !node.librarySource?.readOnly)
    .filter((node) => {
      if (node.type === 'COMPONENT_SET') return true
      const parent = node.parentId ? editor.graph.getNode(node.parentId) : null
      return parent?.type !== 'COMPONENT_SET'
    })
    .map((node) => localAsset(editor, node, pages.value.get(node.id), pageLabel))
    .sort((a, b) => a.name.localeCompare(b.name))
}

function localAsset(
  editor: EditorStore,
  node: SceneNode,
  page: Pick<SceneNode, 'id' | 'name'> | undefined,
  pageLabel: () => string
): LocalAsset {
  const defaultVariant =
    node.type === 'COMPONENT_SET' ? editor.getDefaultVariantForComponentSet(node.id) : node
  const conflicts =
    node.type === 'COMPONENT_SET' ? editor.getComponentSetVariantConflicts(node.id) : []
  const variants = node.type === 'COMPONENT_SET' ? componentSetVariantInfo(editor, node.id) : []
  const containingPage = page ?? { id: editor.state.currentPageId, name: pageLabel() }
  return {
    id: node.id,
    name: node.name,
    node,
    componentId: defaultVariant?.id ?? null,
    variants,
    variantCount: node.type === 'COMPONENT_SET' ? node.childIds.length : 0,
    hasConflicts: conflicts.length > 0,
    sourceLibraryKey: node.sourceLibraryKey,
    description: node.symbolDescription,
    docsURL: node.symbolLinks[0]?.uri ?? null,
    libraryId: null,
    revisionId: null,
    assetKey: null,
    libraryName: null,
    pageId: containingPage.id,
    pageName: containingPage.name
  }
}

function remoteAsset({
  libraryId,
  libraryName,
  revisionId,
  asset
}: EnabledLibraryAsset): LocalAsset {
  return {
    id: `${libraryId}:${asset.key}`,
    name: asset.name,
    node: createDefaultNode(() => asset.sourceNodeId, asset.type, {
      name: asset.name,
      symbolDescription: asset.description,
      sourceLibraryKey: asset.key
    }),
    componentId: null,
    variants: [],
    variantCount: 0,
    hasConflicts: false,
    sourceLibraryKey: asset.key,
    description: asset.description,
    docsURL: null,
    libraryId,
    revisionId,
    assetKey: asset.key,
    libraryName,
    pageId: `library:${libraryId}`,
    pageName: libraryName
  }
}

function filterAssets(assets: LocalAsset[], query: string) {
  const normalized = query.trim().toLowerCase()
  if (!normalized) return assets
  return assets.filter((asset) => asset.name.toLowerCase().includes(normalized))
}

function groupAssets(assets: LocalAsset[]): AssetGroup[] {
  const groups = new Map<string, AssetGroup>()
  for (const asset of assets) {
    const group = groups.get(asset.pageId) ?? {
      pageId: asset.pageId,
      pageName: asset.pageName,
      assets: []
    }
    group.assets.push(asset)
    groups.set(asset.pageId, group)
  }
  return [...groups.values()].sort((a, b) => a.pageName.localeCompare(b.pageName))
}
