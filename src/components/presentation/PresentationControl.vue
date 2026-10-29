<script setup lang="ts">
import { onScopeDispose } from 'vue'

import { useEditorStore } from '@/app/editor/active-store'
import { createPresentationSession } from '@/app/presentation/session'
import { collectPresentationSlides } from '@/app/presentation/slides'
import AppButton from '@/components/ui/button/AppButton.vue'
import AppDialog from '@/components/ui/dialog/AppDialog.vue'
import AppAlert from '@/components/ui/feedback/AppAlert.vue'
import AppPlaceholder from '@/components/ui/feedback/AppPlaceholder.vue'
import AppSkeleton from '@/components/ui/feedback/AppSkeleton.vue'

const store = useEditorStore()
const presentation = createPresentationSession({
  collectSlides: () => collectPresentationSlides(store.graph, store.state.currentPageId),
  renderSlide: (slide) => store.renderExportImage([slide.id], slide.scale, 'PNG')
})
const { open, slides, index, current, imageURL, loading, failed } = presentation
let trigger: HTMLElement | null = null

function start(event: MouseEvent) {
  trigger = event.currentTarget instanceof HTMLElement ? event.currentTarget : null
  presentation.start()
}

function restoreFocus(event: Event) {
  event.preventDefault()
  if (open.value) return
  presentation.releaseImage()
  trigger?.focus()
}

function onKeydown(event: KeyboardEvent) {
  if (event.altKey || event.ctrlKey || event.metaKey) return
  const targets: Record<string, number> = {
    ArrowRight: index.value + 1,
    ArrowDown: index.value + 1,
    ArrowLeft: index.value - 1,
    ArrowUp: index.value - 1,
    Home: 0,
    End: slides.value.length - 1
  }
  const target = targets[event.code]
  if (target === undefined) return
  event.preventDefault()
  event.stopPropagation()
  presentation.goTo(target)
}

onScopeDispose(presentation.dispose)
</script>

<template>
  <AppButton size="xs" @click="start">
    <template #leading><icon-lucide-presentation /></template>
    Present
  </AppButton>
  <AppDialog
    :open="open"
    heading="Presentation"
    description="Slides follow the top-to-bottom frame order in Layers. Use arrow keys, Home or End to navigate."
    close-label="Exit presentation"
    size="screen"
    height="screen"
    :ui="{ body: 'flex flex-col gap-3 overflow-hidden' }"
    @update:open="
      (value) => {
        if (!value) presentation.close()
      }
    "
    @close-auto-focus="restoreFocus"
    @keydown="onKeydown"
  >
    <AppPlaceholder
      v-if="!slides.length"
      label="No slides on this page"
      description="Add a frame to this page to present it. Hidden and nested frames are excluded. Reorder top-level frames in Layers to change the slide order."
    >
      <template #icon><icon-lucide-presentation /></template>
    </AppPlaceholder>
    <template v-else>
      <div
        class="flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-lg bg-canvas"
        :aria-busy="loading"
      >
        <AppAlert
          v-if="failed"
          tone="error"
          heading="Unable to render this slide"
          description="Try again, or choose another slide."
        >
          <template #actions
            ><AppButton variant="outline" @click="presentation.render"
              >Try again</AppButton
            ></template
          >
        </AppAlert>
        <AppSkeleton v-else-if="loading" class="h-full w-full" />
        <img
          v-else-if="imageURL && current"
          :src="imageURL"
          :alt="current.name"
          class="h-full w-full object-contain"
        />
      </div>
      <nav aria-label="Slides" class="flex shrink-0 gap-2 overflow-x-auto pb-1">
        <AppButton
          v-for="(slide, slideIndex) in slides"
          :key="slide.id"
          variant="outline"
          class="shrink-0 aria-[current=step]:border-primary aria-[current=step]:text-primary"
          :aria-current="slideIndex === index ? 'step' : undefined"
          :aria-label="`Slide ${slideIndex + 1}: ${slide.name}`"
          @click="presentation.goTo(slideIndex)"
          >{{ slideIndex + 1 }}. {{ slide.name }}</AppButton
        >
      </nav>
    </template>
    <template #footer>
      <p
        class="min-w-0 flex-1 truncate text-xs text-muted tabular-nums"
        role="status"
        aria-live="polite"
      >
        <template v-if="current"
          >{{ index + 1 }} / {{ slides.length }} · {{ current.name }}</template
        >
      </p>
      <AppButton
        variant="outline"
        :disabled="index === 0 || !slides.length"
        @click="presentation.goTo(index - 1)"
        >Previous slide</AppButton
      >
      <AppButton
        variant="outline"
        :disabled="index >= slides.length - 1"
        @click="presentation.goTo(index + 1)"
        >Next slide</AppButton
      >
    </template>
  </AppDialog>
</template>
