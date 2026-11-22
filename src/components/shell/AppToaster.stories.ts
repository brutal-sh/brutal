import type { Meta, StoryObj } from '@storybook/vue3-vite'

import { useI18n } from '@open-pencil/vue/i18n'

import { brutalReleaseNotesURL } from '@/app/shell/support/links'
import { toast } from '@/app/shell/ui'
import AppButton from '@/components/ui/button/AppButton.vue'

import AppToaster from './AppToaster.vue'

const meta = {
  title: 'App/Shell/Notifications',
  component: AppToaster
} satisfies Meta<typeof AppToaster>

export default meta
type Story = StoryObj<typeof meta>

export const UpToDateWithReleaseNotes: Story = {
  render: () => ({
    components: { AppButton, AppToaster },
    setup() {
      const { updates } = useI18n()
      return {
        showNotice: () =>
          toast.info(updates.value.upToDate, {
            label: updates.value.fullReleaseNotes,
            href: brutalReleaseNotesURL('0.16.0-beta.14')
          })
      }
    },
    template: `
      <AppToaster />
      <AppButton class="mt-20" @click="showNotice">Show update notice</AppButton>
    `
  })
}
