<script setup lang="ts">
import { PopoverContent, PopoverPortal, PopoverRoot, PopoverTrigger } from 'reka-ui'
import { ref, useId } from 'vue'

import { useI18n } from '@open-pencil/vue/i18n'

import { openFileDialog } from '@/app/shell/menu/use'
import IconButton from '@/components/ui/button/IconButton.vue'
import AppInput from '@/components/ui/input/AppInput.vue'
import { usePopoverUI } from '@/components/ui/overlay/popover'

import HomeJoinRoom from './HomeJoinRoom.vue'

const { destination = null } = defineProps<{ destination?: string | null }>()
const emit = defineEmits<{ 'new-document': [] }>()
const query = defineModel<string>({ required: true })
const { menu, files } = useI18n()
const open = ref(false)
const inputId = useId()
const styles = usePopoverUI({ content: 'w-64 p-2' })
</script>
<template>
  <div class="flex items-center gap-1">
    <PopoverRoot v-model:open="open">
      <PopoverTrigger as-child
        ><IconButton :label="files.searchFiles" :aria-pressed="!!query"
          ><icon-lucide-search class="size-4" /></IconButton
      ></PopoverTrigger>
      <PopoverPortal
        ><PopoverContent side="bottom" align="end" :class="styles.content"
          ><label :for="inputId" class="sr-only">{{ files.searchFiles }}</label
          ><AppInput
            :id="inputId"
            v-model="query"
            type="search"
            name="file-search"
            autocomplete="off"
            :placeholder="files.searchFiles" /><HomeJoinRoom
            size="md"
            class="mt-2" /></PopoverContent
      ></PopoverPortal>
    </PopoverRoot>
    <IconButton :label="menu.open" data-test-id="home-open-file" @click="openFileDialog"
      ><icon-lucide-folder-open class="size-4"
    /></IconButton>
    <IconButton
      :label="destination ? files.newDesignIn({ place: destination }) : files.newDesign"
      data-test-id="home-new-document"
      @click="emit('new-document')"
      ><icon-lucide-plus class="size-4"
    /></IconButton>
  </div>
</template>
