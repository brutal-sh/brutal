<script setup lang="ts">
import { DialogClose, DialogTitle } from 'reka-ui'

import { usePanelMessages } from '@open-pencil/vue/i18n'

import { openExternalLink } from '@/app/shell/ui'
import { nodeIcon } from '@/components/icons'
import AppButton from '@/components/ui/button/AppButton.vue'
import { AppDialogRoot, useDialogUI } from '@/components/ui/dialog'

import type { LocalAsset } from './catalog'

const { asset, previewSource, previewLoading } = defineProps<{
  asset: LocalAsset
  previewSource: string | undefined
  previewLoading: boolean
}>()
const open = defineModel<boolean>('open', { required: true })
const emit = defineEmits<{ insert: [] }>()
const panels = usePanelMessages()
const dialog = useDialogUI()
const primaryButton = { color: 'primary' as const, variant: 'solid' as const, size: 'md' as const }
</script>

<template>
  <AppDialogRoot v-model:open="open" size="lg" data-test-id="asset-details-dialog">
    <div class="flex items-center justify-between border-b border-border px-4 py-3">
      <div class="flex min-w-0 items-center gap-2">
        <component :is="nodeIcon(asset.node)" class="size-4 shrink-0 text-component" />
        <div class="min-w-0">
          <DialogTitle :class="dialog.title" class="truncate">{{ asset.name }}</DialogTitle>
          <p class="mt-0.5 text-[11px] text-muted">
            {{ asset.node.type === 'COMPONENT_SET' ? panels.componentSet : panels.component }}
            <span v-if="asset.variantCount > 0"> · {{ asset.variantCount }} variants</span>
          </p>
        </div>
      </div>
      <DialogClose
        data-test-id="asset-details-close"
        class="flex size-7 cursor-pointer items-center justify-center rounded border-none bg-transparent text-muted hover:bg-hover hover:text-surface"
      >
        <icon-lucide-x class="size-4" />
      </DialogClose>
    </div>

    <div class="grid min-h-0 grid-cols-[260px_1fr] gap-0">
      <div class="border-r border-border p-4">
        <div
          data-test-id="asset-details-preview"
          class="flex h-36 items-center justify-center overflow-hidden rounded-lg border border-border bg-canvas/60"
        >
          <img
            v-if="previewSource"
            data-test-id="asset-details-preview-image"
            :src="previewSource"
            :alt="`${asset.name} preview`"
            class="max-h-[120px] max-w-[210px] object-contain"
          />
          <div v-else class="text-center">
            <icon-lucide-loader-2
              v-if="previewLoading"
              class="mx-auto size-5 animate-spin motion-reduce:animate-none text-muted"
            />
            <component v-else :is="nodeIcon(asset.node)" class="mx-auto size-8 text-component" />
            <p class="mt-2 max-w-44 truncate text-xs font-medium text-surface">
              {{ asset.name }}
            </p>
          </div>
        </div>
        <AppButton
          v-bind="primaryButton"
          data-test-id="asset-details-insert"
          class="mt-3 w-full"
          @click="emit('insert')"
        >
          {{ panels.insertInstance }}
        </AppButton>
      </div>

      <div class="min-w-0 p-4">
        <section v-if="asset.description" class="mb-4">
          <h3 class="text-[11px] font-semibold text-muted">
            {{ panels.description }}
          </h3>
          <p data-test-id="asset-details-description" class="mt-1 text-xs leading-5 text-surface">
            {{ asset.description }}
          </p>
        </section>

        <section v-if="asset.sourceLibraryKey" class="mb-4">
          <h3 class="text-[11px] font-semibold text-muted">
            {{ panels.assetLibraryBadge }}
          </h3>
          <p data-test-id="asset-details-library" class="mt-1 break-all text-xs text-muted">
            {{ asset.sourceLibraryKey }}
          </p>
        </section>

        <section v-if="asset.docsURL" class="mb-4">
          <h3 class="text-[11px] font-semibold text-muted">
            {{ panels.documentation }}
          </h3>
          <AppButton
            color="primary"
            variant="link"
            size="xs"
            data-test-id="asset-details-docs"
            class="mt-1"
            @click="asset.docsURL ? openExternalLink(asset.docsURL) : undefined"
          >
            <icon-lucide-book-open class="size-3" />
            {{ panels.openDocs }}
          </AppButton>
        </section>

        <section v-if="asset.variants.length > 0">
          <h3 class="text-[11px] font-semibold text-muted">
            {{ panels.properties }}
          </h3>
          <div class="mt-2 flex flex-col gap-2">
            <div
              v-for="variant in asset.variants"
              :key="variant.name"
              data-test-id="asset-details-property"
              class="rounded border border-border bg-input/40 px-2 py-1.5"
            >
              <div class="text-xs font-medium text-surface">{{ variant.name }}</div>
              <div class="mt-1 text-[11px] text-muted">{{ variant.values.join(', ') }}</div>
            </div>
          </div>
        </section>
      </div>
    </div>
  </AppDialogRoot>
</template>
