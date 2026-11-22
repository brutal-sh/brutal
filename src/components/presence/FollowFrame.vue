<script setup lang="ts">
import { useEventListener } from '@vueuse/core'
import { tv } from 'tailwind-variants'
import { computed } from 'vue'

import { useI18n } from '@open-pencil/vue/i18n'

import type { FollowedLabel } from '@/app/presence/registry'
import { isEditing } from '@/app/shell/keyboard/focus'
import followFrameTheme from '@/theme/collaboration/follow-frame'

const followFrame = tv(followFrameTheme)

const { followed } = defineProps<{ followed: FollowedLabel }>()
const emit = defineEmits<{ stop: [] }>()

const { collaboration: messages } = useI18n()
const ui = followFrame()

const text = computed(() =>
  followed.owner
    ? messages.value.followingAgent({ agent: followed.name, owner: followed.owner })
    : messages.value.followingPerson({ name: followed.name })
)

// Escape stops following, unless something else took it or you are typing.
useEventListener(window, 'keydown', (event: KeyboardEvent) => {
  if (event.key === 'Escape' && !event.defaultPrevented && !isEditing(event)) emit('stop')
})
</script>

<template>
  <div data-test-id="follow-frame" :class="ui.root()">
    <div role="status" :class="ui.status()">
      <icon-lucide-sparkle v-if="followed.kind === 'agent'" aria-hidden="true" :class="ui.icon()" />
      <span :class="ui.label()">{{ text }}</span>
    </div>
    <button
      type="button"
      data-test-id="follow-stop"
      :aria-label="messages.stopFollowingShort"
      :class="ui.stop()"
      @click="emit('stop')"
    >
      <icon-lucide-x aria-hidden="true" :class="ui.icon()" />
    </button>
  </div>
</template>
