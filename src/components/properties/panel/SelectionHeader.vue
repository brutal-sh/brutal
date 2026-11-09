<script setup lang="ts">
import { computed } from 'vue'
import IconComponent from '~icons/lucide/component'

import { getNodeEditCapability } from '@open-pencil/core'
import type { SceneNode } from '@open-pencil/scene-graph'
import { noteOfNode, isNoteInstanceCopy } from '@open-pencil/scene-graph/generated'
import { scriptOfNode } from '@open-pencil/scene-graph/scripts'
import { useEditorCommands } from '@open-pencil/vue/editor/commands'
import { useInlineRename } from '@open-pencil/vue/editor/inline-rename'
import { useNoteMessages, usePanelMessages } from '@open-pencil/vue/i18n'

import { useEditorStore } from '@/app/editor/active-store'
import { openLibraryReview, useLibraryService } from '@/app/libraries'
import { COMPONENT_TYPES, sceneNodeIcon, toolIcons } from '@/components/icons'
import InstanceUpdateAction from '@/components/properties/component-properties/instance-update/InstanceUpdateAction.vue'
import PropertyBindButton from '@/components/properties/component-properties/PropertyBindButton.vue'
import PropertyBoundField from '@/components/properties/component-properties/PropertyBoundField.vue'
import { usePropertyBinding } from '@/components/properties/component-properties/usePropertyBinding'
import LayerTypeMenu from '@/components/properties/LayerTypeMenu.vue'
import SelectionActionsControl from '@/components/properties/SelectionActionsControl.vue'
import TextContentControl from '@/components/properties/text-content/TextContentControl.vue'
import IconButton from '@/components/ui/button/IconButton.vue'
import AppInput from '@/components/ui/input/AppInput.vue'
import Tip from '@/components/ui/overlay/Tip.vue'
import PanelHeader from '@/components/ui/panel/PanelHeader.vue'

const {
  node,
  advanced = true,
  collapsible = false
} = defineProps<{
  node: SceneNode
  advanced?: boolean
  collapsible?: boolean
}>()
const collapsed = defineModel<boolean>('collapsed', { default: false })
const store = useEditorStore()
const panels = usePanelMessages()
const notes = useNoteMessages()
const libraryService = useLibraryService()
const { getCommand } = useEditorCommands()
const goToMainComponent = getCommand('selection.goToMainComponent')
const detachInstance = getCommand('selection.detachInstance')
const rename = useInlineRename((id, name) => store.renameNode(id, name))
const swapBinding = usePropertyBinding('INSTANCE_SWAP')
const swapLinked = computed(() => !!swapBinding.definition.value)
const isComponentType = computed(
  () => COMPONENT_TYPES.has(node.type) && !isNoteInstanceCopy(store.graph, node)
)
const isNote = computed(() => !!noteOfNode(node))
const selectedIcon = computed(() => {
  if (isNote.value && node.type === 'COMPONENT') return IconComponent
  if (isNote.value && !isComponentType.value) return toolIcons.RECTANGLE
  return sceneNodeIcon(node)
})
const canAddVariant = computed(
  () => !store.state.readOnly && getNodeEditCapability(store.graph, node.id).editable
)
function openSelectedInstanceReview() {
  if (node.type !== 'INSTANCE' || !node.componentId) return
  const component = store.graph.getNode(node.componentId)
  const identity = component?.librarySource?.identity
  if (!identity) return
  openLibraryReview({
    libraryId: identity.libraryId,
    assetKey: identity.assetKey,
    instanceIds: [node.id],
    initialInstanceId: node.id
  })
}
</script>

<template>
  <PanelHeader :component="isComponentType">
    <template #icon>
      <LayerTypeMenu
        v-if="
          advanced &&
          !isNote &&
          (node.type === 'FRAME' || node.type === 'GROUP' || node.type === 'SECTION')
        "
        :node="node"
        :icon="selectedIcon"
      />
      <Tip v-else :label="isNote ? notes.title : node.type">
        <span
          role="img"
          :aria-label="isNote ? notes.title : scriptOfNode(node) ? 'Script' : node.type"
          :data-note-component="isNote && isComponentType"
          class="contents data-[note-component=true]:text-note-component"
        >
          <component :is="selectedIcon" class="size-3.5" />
        </span>
      </Tip>
    </template>
    <span role="heading" aria-level="2" :aria-label="node.name" class="min-w-0">
      <!-- A swap linked to a property shows the property in place of the layer, as Figma does. -->
      <PropertyBoundField v-if="swapLinked" field="INSTANCE_SWAP" compact />
      <AppInput
        v-else
        :key="node.id"
        :model-value="node.name"
        aria-label="Layer name"
        :readonly="store.state.readOnly"
        data-property="name"
        class="border-transparent bg-transparent font-normal shadow-none data-[note-component=true]:text-note-component"
        :data-note-component="isNote && isComponentType"
        :disabled="!getNodeEditCapability(store.graph, node.id).editable"
        @focus="rename.start(node.id, node.name)"
        @blur="rename.commit(node.id, $event)"
        @keydown="rename.onKeydown"
        @keydown.esc="($event.target as HTMLInputElement).value = node.name"
      />
    </span>
    <template #actions>
      <IconButton
        v-if="
          (node.type === 'COMPONENT' && !scriptOfNode(node) && !isNote) ||
          node.type === 'COMPONENT_SET'
        "
        :label="panels.addVariant"
        data-test-id="add-variant"
        :disabled="!canAddVariant"
        @click="store.addVariant(node.id)"
      >
        <icon-lucide-diamond-plus class="size-3.5" />
      </IconButton>
      <PropertyBindButton v-if="node.type === 'INSTANCE' && !isNote" field="INSTANCE_SWAP" />
      <TextContentControl v-if="node.type === 'TEXT'" :node-id="node.id" :text="node.text" />
      <InstanceUpdateAction
        v-if="node.type === 'INSTANCE' && !isNote"
        :node="node"
        :editor="store"
        :service="libraryService"
        @review="openSelectedInstanceReview"
      />
      <SelectionActionsControl v-if="advanced" />
      <IconButton
        v-if="collapsible && !advanced"
        :label="collapsed ? 'Expand inspector' : 'Collapse inspector'"
        :aria-expanded="!collapsed"
        @click="collapsed = !collapsed"
      >
        <icon-lucide-panel-right-open v-if="collapsed" class="size-3.5" />
        <icon-lucide-panel-right v-else class="size-3.5" />
      </IconButton>
      <template v-if="node.type === 'INSTANCE' && (!isNote || detachInstance.enabled.value)">
        <IconButton
          :label="goToMainComponent.label"
          data-test-id="instance-go-to-main"
          @click="goToMainComponent.run()"
        >
          <icon-lucide-crosshair class="size-3.5" />
        </IconButton>
        <IconButton
          :label="detachInstance.label"
          data-test-id="instance-detach"
          :disabled="!canAddVariant || !detachInstance.enabled.value"
          @click="detachInstance.run()"
        >
          <icon-lucide-unlink class="size-3.5" />
        </IconButton>
      </template>
    </template>
  </PanelHeader>
</template>
