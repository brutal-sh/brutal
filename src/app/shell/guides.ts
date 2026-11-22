import { ref } from 'vue'

import {
  BRUTAL_RELEASES_URL,
  BRUTAL_SUPPORT_URL,
  brutalBugReportURL
} from '@/app/shell/support/links'
import { openExternalLink } from '@/app/shell/ui'
import {
  OPEN_PEN_CLI_GUIDE_URL,
  OPEN_PEN_HELP_URL,
  OPEN_PEN_REPOSITORY_URL,
  OPEN_PEN_WEBSITE_URL
} from '@/constants'

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
  'install-cli': () => void openExternalLink(OPEN_PEN_CLI_GUIDE_URL),
  'help-documentation': () => void openExternalLink(OPEN_PEN_HELP_URL),
  'help-prompts': () =>
    void openExternalLink(`${OPEN_PEN_REPOSITORY_URL}/blob/HEAD/docs/PROMPTS.md`),
  'help-website': () => void openExternalLink(OPEN_PEN_WEBSITE_URL),
  'help-cursor': () =>
    void openExternalLink(
      `${OPEN_PEN_REPOSITORY_URL}/blob/HEAD/docs/EDITOR-INTEGRATIONS.md#cursor`
    ),
  'help-vscode': () =>
    void openExternalLink(
      `${OPEN_PEN_REPOSITORY_URL}/blob/HEAD/docs/EDITOR-INTEGRATIONS.md#vs-code`
    ),
  'help-report-issue': () => void openExternalLink(brutalBugReportURL()),
  'help-release-notes': () => void openExternalLink(BRUTAL_RELEASES_URL),
  'help-support': () => void openExternalLink(BRUTAL_SUPPORT_URL)
}
