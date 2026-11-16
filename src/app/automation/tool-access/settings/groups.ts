import { computed, type Ref } from 'vue'

import type { ToolAccessEntry } from '../types'

interface CategoryAccess {
  isEnabled: (tool: ToolAccessEntry) => boolean
  setEnabled: (names: string[], enabled: boolean) => void
}

export function toolAccessCategory(
  tools: Readonly<Ref<ToolAccessEntry[]>>,
  effect: ToolAccessEntry['effect'],
  access: CategoryAccess
) {
  const members = computed(() => tools.value.filter((tool) => tool.effect === effect))
  const count = computed(() => members.value.filter(access.isEnabled).length)
  return {
    enabled: computed({
      get: () => count.value > 0,
      set: (enabled: boolean) =>
        access.setEnabled(
          members.value.map((tool) => tool.name),
          enabled
        )
    }),
    state: computed<'mixed' | 'idle'>(() =>
      count.value > 0 && count.value < members.value.length ? 'mixed' : 'idle'
    ),
    counts: computed(() => ({ enabled: count.value, total: members.value.length }))
  }
}
