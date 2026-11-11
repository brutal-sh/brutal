<script setup lang="ts">
import { computed, onScopeDispose } from 'vue'

import { SceneGraph } from '@open-pencil/scene-graph'
import { createComponentPropertyId } from '@open-pencil/scene-graph/components'

import { provideTabEditorStore } from '@/app/editor/active-store'
import { createEditorStore } from '@/app/editor/session'
import AssetsPanel from '@/components/assets-panel/AssetsPanel.vue'

const { workspace = false } = defineProps<{ workspace?: boolean }>()
const editor = createEditorStore(new SceneGraph())
provideTabEditorStore(editor)
const pageId = editor.state.currentPageId
const set = editor.graph.createNode('COMPONENT_SET', pageId, {
  name: 'Button',
  width: 340,
  height: 120,
  sourceLibraryKey: 'fixture-library',
  symbolDescription: 'Reusable button component',
  symbolLinks: [{ uri: 'https://example.com/button', displayName: 'Button docs' }],
  componentPropertyDefinitions: [
    {
      id: createComponentPropertyId(),
      name: 'Type',
      type: 'VARIANT',
      defaultValue: 'Secondary',
      variantOptions: ['Primary', 'Secondary']
    }
  ]
})
for (const [index, name] of ['Primary', 'Secondary', 'Secondary'].entries())
  editor.graph.createNode('COMPONENT', set.id, {
    name: `Type=${name}`,
    x: index * 120,
    width: 96,
    height: 40,
    componentPropertyValues: { Type: name }
  })
editor.graph.createNode('COMPONENT', pageId, { name: 'Card', y: 240, width: 160, height: 100 })
const selectedName = computed(() => {
  void editor.state.sceneVersion
  const id = [...editor.state.selectedIds][0]
  const node = id ? editor.graph.getNode(id) : undefined
  return node?.componentId ? (editor.graph.getNode(node.componentId)?.name ?? '') : ''
})
onScopeDispose(() => editor.dispose())
</script>

<template>
  <div class="flex h-[560px] w-80 flex-col border border-border bg-panel">
    <AssetsPanel :workspace="workspace" />
  </div>
  <output aria-label="Inserted component" class="block text-sm">{{ selectedName }}</output>
</template>
