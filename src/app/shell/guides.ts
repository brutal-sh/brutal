import { ref } from 'vue'

import { openExternalLink } from '@/app/shell/ui'
import { OPEN_PEN_CLI_GUIDE_URL } from '@/constants'

export const designCodeGuideOpen = ref(false)
export const figmaImportGuideOpen = ref(false)

export const guideMenuActions = {
  'guide-export-code': () => {
    designCodeGuideOpen.value = true
    void import('@/app/automation/mcp/runtime').then(({ refreshMCPRuntime }) => refreshMCPRuntime())
  },
  'guide-import-figma': () => {
    figmaImportGuideOpen.value = true
  },
  'install-cli': () => void openExternalLink(OPEN_PEN_CLI_GUIDE_URL)
}
