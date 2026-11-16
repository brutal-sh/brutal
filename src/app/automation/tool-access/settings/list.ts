import { computed, ref, watch, type Ref } from 'vue'

import { toolPolicyNames } from '@open-pencil/mcp/tools'

import type { ToolAccessEntry } from '../types'
import { toolAccessCategory } from './groups'

function toolAccessSelection(disabled: Ref<string[]>) {
  const disabledNames = computed(() => new Set(disabled.value))
  const isEnabled = (tool: ToolAccessEntry) =>
    !toolPolicyNames(tool.name).some((name) => disabledNames.value.has(name))
  function setEnabled(names: string[], enabled: boolean) {
    const next = new Set(disabled.value)
    for (const name of names.flatMap(toolPolicyNames)) {
      if (enabled) next.delete(name)
      else next.add(name)
    }
    disabled.value = [...next]
  }
  return { isEnabled, setEnabled }
}

/** Tool access is derived from the catalog and one controlled disabled-name model. */
export function useToolAccess(tools: Readonly<Ref<ToolAccessEntry[]>>, disabled: Ref<string[]>) {
  const search = ref('')
  const { isEnabled, setEnabled } = toolAccessSelection(disabled)
  const enabledCount = computed(() => tools.value.filter(isEnabled).length)
  const visibleTools = computed(() => {
    const query = search.value.trim().toLowerCase()
    return tools.value.filter(
      (tool) =>
        tool.name.toLowerCase().includes(query) || tool.description.toLowerCase().includes(query)
    )
  })

  const inspection = toolAccessCategory(tools, 'read', { isEnabled, setEnabled })
  const modification = toolAccessCategory(tools, 'write', { isEnabled, setEnabled })
  const expanded = ref({ read: true, write: true })
  watch(search, () => {
    expanded.value = { read: true, write: true }
  })
  const categories = { read: inspection, write: modification }
  const groups = computed(() =>
    (['read', 'write'] as const).map((effect) => ({
      effect,
      enabled: categories[effect].enabled.value,
      state: categories[effect].state.value,
      counts: categories[effect].counts.value,
      tools: visibleTools.value.filter((tool) => tool.effect === effect)
    }))
  )

  return {
    search,
    visibleTools,
    enabledCount,
    groups,
    expanded,
    inspectionEnabled: inspection.enabled,
    inspectionState: inspection.state,
    modificationEnabled: modification.enabled,
    modificationState: modification.state,
    setGroupEnabled: (effect: ToolAccessEntry['effect'], enabled: boolean) => {
      categories[effect].enabled.value = enabled
    },
    isEnabled,
    setToolEnabled: (name: string, enabled: boolean) => setEnabled([name], enabled)
  }
}
