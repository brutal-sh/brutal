<script setup lang="ts">
import { TabsContent, TabsList, TabsRoot, TabsTrigger } from 'reka-ui'
import { tv } from 'tailwind-variants'
import { computed } from 'vue'

import { useDesignCheckMessages, useI18n } from '@open-pencil/vue/i18n'

import { useAIChat } from '@/app/ai/chat/use'
import { isVersionHistoryOpen } from '@/app/cloud/integration'
import { useEditorStore } from '@/app/editor/active-store'
import { countIssues } from '@/app/editor/design-check/issues'
import ChatPanel from '@/components/chat/ChatPanel.vue'
import { CloudVersionHistory } from '@/components/cloud/integration'
import AppButton from '@/components/ui/button/AppButton.vue'
import propertiesTabsTheme from '@/theme/panel/properties-tabs'

import CodePanel from './CodePanel.vue'
import CommentsPanel from './comments/CommentsPanel.vue'
import DesignCheckPanel from './design-check/DesignCheckPanel.vue'
import DesignPanel from './DesignPanel.vue'
import ZoomDropdown from './editor/ZoomDropdown.vue'

const { agentOnLeft = false } = defineProps<{ agentOnLeft?: boolean }>()
const propertiesTabs = tv(propertiesTabsTheme)

const { activeTab, advancedProperties } = useAIChat()
function backToDesign() {
  activeTab.value = 'design'
  advancedProperties.value = false
}
const { panels } = useI18n()
const checkMessages = useDesignCheckMessages()
const store = useEditorStore()

const tabStyles = propertiesTabs()
/** The Comment tool turns the sidebar into the comments list, as in Figma; the tabs keep their state. */
const commenting = computed(() => store.state.activeTool === 'COMMENT')
/** Version history takes the sidebar while it is open, for the document and a version alike. */
const history = computed(() => isVersionHistoryOpen(store))

/** Errors and warnings on the current page; suggestions do not earn an indicator. */
const problemCount = computed(() => {
  const snapshot = store.designCheck.snapshot.value
  if (!snapshot || snapshot.pageId !== store.state.currentPageId) return null
  const counts = countIssues(snapshot.issues)
  return { total: counts.error + counts.warning, severity: counts.error > 0 ? 'error' : 'warning' }
})
</script>

<template>
  <aside
    data-test-id="properties-panel"
    class="flex min-w-0 flex-1 flex-col overflow-hidden bg-panel"
    :class="{ 'border-l border-border': !agentOnLeft }"
    style="contain: paint layout style"
  >
    <CloudVersionHistory v-if="history" />
    <CommentsPanel v-else-if="commenting" />
    <div v-if="agentOnLeft" v-show="!commenting && !history" class="flex min-h-0 flex-1 flex-col">
      <AppButton
        v-if="activeTab === 'code' || activeTab === 'lint' || advancedProperties"
        class="m-2 self-start"
        aria-label="Back to design properties"
        @click="backToDesign"
      >
        <icon-lucide-arrow-left class="size-3.5" />Design properties
      </AppButton>
      <div
        v-show="activeTab === 'design' || activeTab === 'ai'"
        class="flex min-h-0 flex-1 flex-col"
      >
        <DesignPanel :advanced="advancedProperties" />
      </div>
      <div v-show="activeTab === 'code'" class="flex min-h-0 flex-1 flex-col">
        <CodePanel :active="activeTab === 'code'" />
      </div>
      <div v-show="activeTab === 'lint'" class="flex min-h-0 flex-1 flex-col">
        <DesignCheckPanel :active="activeTab === 'lint'" />
      </div>
    </div>
    <TabsRoot
      v-if="!agentOnLeft"
      v-show="!commenting && !history"
      :model-value="agentOnLeft && activeTab === 'ai' ? 'design' : activeTab"
      @update:model-value="
        (value) => {
          if (value === 'design' || value === 'code' || value === 'ai' || value === 'lint')
            activeTab = value
        }
      "
      class="flex min-h-0 flex-1 flex-col"
    >
      <TabsList :class="tabStyles.list()">
        <TabsTrigger
          value="design"
          data-test-id="properties-tab-design"
          :class="tabStyles.trigger()"
        >
          {{ panels.design }}
        </TabsTrigger>
        <TabsTrigger value="code" data-test-id="properties-tab-code" :class="tabStyles.trigger()">
          <icon-lucide-code :class="tabStyles.icon()" aria-hidden="true" />
          <span :class="tabStyles.label()">{{ panels.code }}</span>
        </TabsTrigger>
        <TabsTrigger
          v-if="!agentOnLeft"
          value="ai"
          data-test-id="properties-tab-ai"
          :class="tabStyles.trigger()"
        >
          <icon-lucide-sparkles :class="tabStyles.icon()" aria-hidden="true" />
          <span :class="tabStyles.label()">{{ panels.ai }}</span>
        </TabsTrigger>
        <TabsTrigger
          value="lint"
          data-test-id="properties-tab-lint"
          :aria-label="
            problemCount?.total
              ? `${checkMessages.tab}, ${checkMessages.tabCount({ count: problemCount.total })}`
              : checkMessages.tab
          "
          :class="tabStyles.trigger()"
        >
          <!-- Errors and warnings tint the icon, which costs no room in a full row. -->
          <icon-lucide-list-checks
            :data-severity="problemCount?.total ? problemCount.severity : undefined"
            :class="tabStyles.icon()"
            aria-hidden="true"
          />
          <span :class="tabStyles.label()">{{ checkMessages.tab }}</span>
        </TabsTrigger>
        <ZoomDropdown v-if="!agentOnLeft && activeTab === 'design'" />
      </TabsList>

      <TabsContent
        value="design"
        class="flex min-h-0 flex-1 flex-col"
        :force-mount="true"
        :hidden="activeTab !== 'design' && !(agentOnLeft && activeTab === 'ai')"
      >
        <DesignPanel />
      </TabsContent>

      <TabsContent
        value="code"
        class="flex min-h-0 flex-1 flex-col"
        :force-mount="true"
        :hidden="activeTab !== 'code'"
      >
        <CodePanel :active="activeTab === 'code'" />
      </TabsContent>

      <TabsContent
        value="lint"
        class="flex min-h-0 flex-1 flex-col"
        :force-mount="true"
        :hidden="activeTab !== 'lint'"
      >
        <DesignCheckPanel :active="activeTab === 'lint'" />
      </TabsContent>

      <TabsContent
        v-if="!agentOnLeft"
        value="ai"
        class="flex min-h-0 flex-1 flex-col"
        :force-mount="true"
        :hidden="activeTab !== 'ai'"
      >
        <ChatPanel />
      </TabsContent>
    </TabsRoot>
  </aside>
</template>
