import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { expect, within } from 'storybook/test'

import AISetupConnection from './AISetupConnection.vue'
import {
  account,
  agentSetup,
  codexToolsUnavailable,
  connectionDefaults,
  connectionState,
  detected,
  piSetup,
  type ConnectionStoryArgs
} from './stories/connection-fixtures'

const meta = {
  title: 'App/Settings/AI Setup/Connection',
  args: connectionDefaults,
  render: (args) => ({
    components: { AISetupConnection },
    setup: () => ({
      args,
      state: connectionState(args.account)
    }),
    template:
      '<div class="w-[30rem] max-w-full"><AISetupConnection v-bind="args" :state="state" /></div>'
  })
} satisfies Meta<ConnectionStoryArgs>

export default meta
type Story = StoryObj<typeof meta>

export const OpenRouterSignIn: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByRole('button', { name: 'Sign in with OpenRouter' })).toBeVisible()
    await expect(canvas.getByLabelText('API Key')).toBeVisible()
  }
}
export const OpenRouterWaiting: Story = {
  args: { signInStatus: 'waiting' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByRole('status')).toBeVisible()
    await expect(canvas.queryByRole('button', { name: 'Sign in with OpenRouter' })).toBeNull()
  }
}
export const OpenRouterVerifying: Story = { args: { signInStatus: 'verifying' } }
export const OpenRouterSignedIn: Story = {
  args: { account: { label: 'Brutal', freeTier: false } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByRole('status')).toHaveTextContent('Signed in to OpenRouter')
    await expect(canvas.queryByLabelText('API Key')).toBeNull()
    await expect(canvas.queryByRole('button', { name: 'Test connection' })).toBeNull()
  }
}
export const OpenRouterSignedInWithoutCredits: Story = {
  args: { account: { label: 'Brutal', freeTier: true } }
}
export const OpenRouterPopupBlocked: Story = { args: { signInStatus: 'blocked' } }
export const OpenRouterFailed: Story = { args: { signInStatus: 'failed' } }
export const OpenRouterExpired: Story = { args: { signInStatus: 'expired' } }
export const SavedAPIKey: Story = {
  args: { providerID: 'anthropic', hasSavedKey: true, recommended: false }
}
export const LocalServer: Story = { args: { providerID: 'openai-compatible', recommended: false } }
export const CodingAgentInBrowser: Story = {
  args: {
    providerID: 'acp:claude-code',
    recommended: false,
    agentSetup: agentSetup({ supported: false })
  }
}
export const CodingAgentChecking: Story = {
  args: {
    providerID: 'acp:codex',
    recommended: false,
    agentSetup: agentSetup({ scanning: true, checked: false })
  }
}
export const CodingAgentInstalled: Story = {
  args: {
    providerID: 'acp:claude-code',
    recommended: false,
    agentSetup: agentSetup({ detected: detected('claude-code', 'available'), bridge: true })
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.queryByRole('button', { name: 'Install adapter' })).toBeNull()
    await expect(canvas.queryByText(/npm i -g/)).toBeNull()
    await expect(canvas.getByRole('button', { name: 'Check again' })).toBeVisible()
  }
}
export const CodingAgentNeedsAdapter: Story = {
  args: {
    providerID: 'acp:codex',
    recommended: false,
    agentSetup: agentSetup({ detected: detected('codex', 'needs-adapter') })
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByRole('button', { name: 'Install adapter' })).toBeVisible()
    await expect(
      canvas.getByText('Installing runs npm i -g @agentclientprotocol/codex-acp.')
    ).toBeVisible()
    await expect(canvas.getByRole('button', { name: 'Install MCP server' })).toBeVisible()
    await expect(canvas.getByRole('link', { name: 'Learn more' })).toHaveAttribute(
      'href',
      'https://brutal.sh/help/#codex'
    )
  }
}
export const CodingAgentNeedsNpm: Story = {
  args: {
    providerID: 'acp:claude-code',
    recommended: false,
    agentSetup: agentSetup({ detected: detected('claude-code', 'needs-adapter'), npm: false })
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByText('npm i -g @agentclientprotocol/claude-agent-acp')).toBeVisible()
    await expect(canvas.queryByRole('button', { name: 'Install adapter' })).toBeNull()
    await expect(canvas.getByText(/npm i -g @open-pencil\/mcp@/)).toBeVisible()
  }
}
export const CodingAgentSignedIn: Story = {
  args: {
    providerID: 'acp:claude-code',
    recommended: false,
    agentSetup: agentSetup({
      detected: detected('claude-code', 'available'),
      bridge: true,
      account: account({
        status: { kind: 'account', label: 'Claude Max', account: { email: 'ada@example.com' } },
        tools: { connected: true }
      })
    })
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByText(/Claude Max · ada@example\.com/)).toBeVisible()
    await expect(canvas.getByText(/Brutal tools · connected/)).toBeVisible()
    await expect(canvas.queryByRole('button', { name: 'Sign in' })).toBeNull()
  }
}
export const CodingAgentToolsUnreachable: Story = {
  args: {
    providerID: 'acp:codex',
    recommended: false,
    agentSetup: codexToolsUnavailable()
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByText(/Brutal tools · not reachable/)).toBeVisible()
    await expect(canvas.getByText(/Codex can’t reach Brutal’s tools/)).toBeVisible()
    await expect(canvas.getByText(/already defines an MCP server/)).toBeVisible()
  }
}
export const CodingAgentSignedOut: Story = {
  args: {
    providerID: 'acp:claude-code',
    recommended: false,
    agentSetup: agentSetup({
      detected: detected('claude-code', 'available'),
      bridge: true,
      account: account({})
    })
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByText(/not signed in/)).toBeVisible()
    await expect(canvas.getByRole('button', { name: 'Sign in' })).toBeVisible()
  }
}
export const CodingAgentSigningIn: Story = {
  args: {
    providerID: 'acp:claude-code',
    recommended: false,
    agentSetup: agentSetup({
      detected: detected('claude-code', 'available'),
      bridge: true,
      account: account({
        signingIn: true,
        signInURL: 'https://claude.com/cai/oauth/authorize',
        acceptsCode: true
      })
    })
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByText('Finish signing in in your browser.')).toBeVisible()
    await expect(canvas.getByRole('link', { name: /Open the sign-in page/ })).toBeVisible()
    await expect(canvas.getByRole('button', { name: 'Submit code' })).toBeDisabled()
    await expect(canvas.getByRole('button', { name: 'Cancel' })).toBeVisible()
  }
}
export const CodingAgentOtherAdapter: Story = {
  args: {
    providerID: 'acp:codex',
    recommended: false,
    agentSetup: agentSetup({
      detected: { ...detected('codex', 'available'), adapterPath: '/Users/ada/.bun/bin/codex-acp' },
      bridge: true,
      account: account({ status: null, adapter: { name: 'codex-acp', version: '0.10.0' } })
    })
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(
      canvas.getByText(/found \/Users\/ada\/\.bun\/bin\/codex-acp, another adapter/)
    ).toBeVisible()
    await expect(canvas.getByText('npm i -g @agentclientprotocol/codex-acp')).toBeVisible()
    await expect(canvas.queryByText(/Account/)).toBeNull()
  }
}
export const PiNeedsCompanion: Story = {
  args: {
    providerID: 'harness:pi',
    recommended: false,
    piSetup: piSetup({ defaultModel: 'openai-codex/gpt-5.6' })
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByRole('button', { name: 'Install companion' })).toBeVisible()
    await expect(canvas.getByText(/openai-codex\/gpt-5\.6/)).toBeVisible()
    await expect(canvas.queryByLabelText('API Key')).toBeNull()
  }
}
export const PiReady: Story = {
  args: {
    providerID: 'harness:pi',
    recommended: false,
    piSetup: piSetup({ companion: true, bridge: true, defaultModel: 'openai-codex/gpt-5.6' })
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.queryByRole('button', { name: 'Install companion' })).toBeNull()
    await expect(canvas.queryByText(/npm i -g/)).toBeNull()
  }
}
export const PiNeedsNpm: Story = {
  args: { providerID: 'harness:pi', recommended: false, piSetup: piSetup({ npm: false }) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByText(/npm i -g @open-pencil\/harness@/)).toBeVisible()
  }
}
export const PiOutdatedMCPFromBun: Story = {
  args: {
    providerID: 'harness:pi',
    recommended: false,
    piSetup: piSetup({
      companion: true,
      bridge: true,
      bridgeOutdated: true,
      bridgeCommand: 'bun add -g @open-pencil/mcp@0.15.1',
      defaultModel: 'openai-codex/gpt-5.6',
      error: 'canvas-install'
    })
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByText(/Brutal MCP server · update needed/)).toBeVisible()
    await expect(canvas.getByRole('button', { name: 'Update MCP server' })).toBeVisible()
    await expect(canvas.getByText('bun add -g @open-pencil/mcp@0.15.1')).toBeVisible()
  }
}

export const CopyStates: Story = {
  render: () => ({
    components: { AISetupConnection },
    setup: () => ({
      cases: [
        { id: 'blocked', args: OpenRouterPopupBlocked.args },
        { id: 'adapter', args: CodingAgentNeedsAdapter.args },
        { id: 'manual-mcp', args: CodingAgentNeedsNpm.args },
        {
          id: 'tools',
          args: { providerID: 'acp:codex', agentSetup: codexToolsUnavailable(null) }
        },
        { id: 'other-adapter', args: CodingAgentOtherAdapter.args },
        { id: 'pi', args: PiNeedsCompanion.args },
        {
          id: 'start-failed',
          args: {
            providerID: 'acp:codex',
            agentSetup: agentSetup({
              detected: detected('codex', 'available'),
              bridge: true,
              error: 'canvas-start'
            })
          }
        }
      ].map((entry) => ({ ...entry, args: { ...meta.args, ...entry.args } })),
      state: connectionState(null)
    }),
    template: `<div class="grid max-w-[30rem] gap-8">
      <section v-for="entry in cases" :key="entry.id" :data-copy-state="entry.id">
        <AISetupConnection v-bind="entry.args" :state="state" />
      </section>
    </div>`
  })
}
