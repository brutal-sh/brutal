<script setup lang="ts">
import { tv } from 'tailwind-variants'

import type { SceneNode } from '@open-pencil/scene-graph'
import { useEditorCommands } from '@open-pencil/vue/editor/commands'
import { useNoteMessages } from '@open-pencil/vue/i18n'

import { useEditorStore } from '@/app/editor/active-store'
import AppButton from '@/components/ui/button/AppButton.vue'
import theme from '@/theme/notes'

const { node, disabled } = defineProps<{ node: SceneNode; disabled: boolean }>()
const store = useEditorStore()
const notes = useNoteMessages()
const { getCommand } = useEditorCommands()
const createComponent = getCommand('selection.createComponent')
const styles = tv(theme)()
</script>

<template>
  <div v-if="node.type !== 'INSTANCE'" data-slot="selection-action" :class="styles.componentRow()">
    <AppButton
      v-if="node.type === 'COMPONENT'"
      variant="soft"
      size="xs"
      :class="styles.componentButton()"
      :disabled="disabled"
      @click="store.detachNoteComponent(node.id)"
    >
      <icon-lucide-diamond-minus class="size-3.5" />{{ notes.detachComponent }}
    </AppButton>
    <AppButton
      v-else
      variant="soft"
      size="xs"
      :class="styles.componentButton()"
      :disabled="disabled || !createComponent.enabled.value"
      @click="createComponent.run()"
    >
      <icon-lucide-diamond-plus class="size-3.5" />{{ notes.createComponent }}
    </AppButton>
  </div>
</template>
