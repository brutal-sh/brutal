<script setup lang="ts">
import { tv } from 'tailwind-variants'

import {
  browserHistory,
  updatingBrowserHistory,
  clearBrowserHistory,
  removeBrowserVisit
} from '@/app/browser-preview/history/storage'
import { previewAddressLabel } from '@/app/browser-preview/schema'
import PointerIcon from '@/components/icons/PointerIcon.vue'
import AppButton from '@/components/ui/button/AppButton.vue'
import IconButton from '@/components/ui/button/IconButton.vue'
import { OPEN_PEN_HELP_URL, OPEN_PEN_WEBSITE_URL } from '@/constants'
import theme from '@/theme/browser-preview'

const { busy } = defineProps<{ busy: boolean }>()
const emit = defineEmits<{ navigate: [url: string]; focusAddress: [] }>()
const ui = tv(theme)()
</script>

<template>
  <div :class="ui.landing()">
    <div :class="ui.content()">
      <div :class="ui.introduction()">
        <div :class="ui.mark()"><icon-lucide-globe class="size-7" /></div>
        <h2 :class="ui.heading()">Import from the web</h2>
        <p :class="ui.description()">
          Open a live site or your localhost dev server, then bring it onto the canvas as editable
          layers.
        </p>
        <AppButton
          variant="outline"
          :class="ui.enter()"
          :disabled="busy"
          @click="emit('focusAddress')"
          >Enter a URL</AppButton
        >
      </div>
      <div :class="ui.features()">
        <div :class="ui.feature()">
          <div :class="ui.featureIcon()"><icon-lucide-panels-top-left class="size-5" /></div>
          <div>
            <h3 :class="ui.featureTitle()">Import the full page</h3>
            <p :class="ui.featureDescription()">Reproduce it as frames, text, and images.</p>
          </div>
        </div>
        <div :class="ui.feature()">
          <div :class="ui.featureIcon()"><PointerIcon class="size-5" /></div>
          <div>
            <h3 :class="ui.featureTitle()">Import an element</h3>
            <p :class="ui.featureDescription()">
              Select an element and reproduce its editable layers.
            </p>
          </div>
        </div>
        <div :class="ui.feature()">
          <div :class="ui.featureIcon()"><icon-lucide-image class="size-5" /></div>
          <div>
            <h3 :class="ui.featureTitle()">Import a screenshot</h3>
            <p :class="ui.featureDescription()">
              Drop a PNG onto the canvas or send it to the agent.
            </p>
          </div>
        </div>
      </div>
      <div :class="ui.suggestions()">
        <div :class="ui.historyHeading()">
          <h3 :class="ui.suggestionsHeading()">
            <icon-lucide-gallery-vertical-end class="size-4" />{{
              browserHistory.length ? 'Recent' : 'Suggested'
            }}
          </h3>
          <AppButton
            v-if="browserHistory.length"
            variant="ghost"
            size="xs"
            class="h-6 px-1 text-xs text-muted"
            :disabled="updatingBrowserHistory"
            @click="clearBrowserHistory"
            >Clear All</AppButton
          >
        </div>
        <div :class="ui.historyRows()">
          <div v-for="entry in browserHistory" :key="entry.url" class="group relative">
            <AppButton
              variant="ghost"
              :class="ui.historyRow()"
              :disabled="busy"
              @click="emit('navigate', entry.url)"
              ><icon-lucide-globe class="size-3.5 shrink-0" /><span class="truncate">{{
                previewAddressLabel(entry.url)
              }}</span
              ><icon-lucide-arrow-right :class="ui.historyArrow()"
            /></AppButton>
            <IconButton
              :label="`Remove ${previewAddressLabel(entry.url)} from history`"
              :class="ui.historyRemove()"
              :disabled="updatingBrowserHistory"
              @click="removeBrowserVisit(entry.url)"
              ><icon-lucide-x class="size-3.5"
            /></IconButton>
          </div>
          <template v-if="!browserHistory.length">
            <AppButton
              v-for="url in [OPEN_PEN_WEBSITE_URL, OPEN_PEN_HELP_URL]"
              :key="url"
              variant="ghost"
              :class="ui.historyRow()"
              :disabled="busy"
              @click="emit('navigate', url)"
              ><icon-lucide-globe class="size-3.5 shrink-0" /><span class="truncate">{{ url }}</span
              ><icon-lucide-arrow-right :class="ui.historyArrow()"
            /></AppButton>
          </template>
        </div>
      </div>
      <p :class="ui.privacy()">
        Pages run locally on your Mac. Passwords and form values are excluded from editable imports.
      </p>
    </div>
  </div>
</template>
