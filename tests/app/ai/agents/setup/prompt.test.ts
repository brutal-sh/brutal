import { expect, test } from 'bun:test'

import { codingAgentSetupPrompt } from '@/app/ai/agents/setup/prompt'

test('sets up Codex with a working bridge without asking for a checkout', () => {
  const prompt = codingAgentSetupPrompt('codex', true)
  expect(prompt).toContain('@agentclientprotocol/codex-acp')
  expect(prompt).toContain('Sign in in Open Pen')
  expect(prompt).not.toContain('setup:local-runtime')
  expect(prompt).not.toContain('openpen-mcp-http')
})

test('gives the appropriate recovery path for a missing bridge', () => {
  const prompt = codingAgentSetupPrompt('codex', false)
  expect(prompt).toContain('bun run setup:local-runtime')
  expect(prompt).toContain('For the packaged Mac beta, reinstall')
})
