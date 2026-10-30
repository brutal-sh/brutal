import { describe, expect, test } from 'bun:test'

import { mcpServerSetupPrompt, needsMCPInstall } from '@/app/automation/mcp/setup-prompt'

describe('MCP server setup prompt', () => {
  test('offers the prompt only for reasons an install fixes', () => {
    expect(needsMCPInstall({ code: 'not-installed' })).toBe(true)
    expect(needsMCPInstall({ code: 'outdated', detail: '0.15.1' })).toBe(true)
    expect(needsMCPInstall({ code: 'timeout' })).toBe(false)
  })

  test('asks the agent to install and verify the version that matches the app', () => {
    const prompt = mcpServerSetupPrompt({ code: 'outdated', detail: '0.15.1' })
    expect(prompt).toContain('`bun run setup:local-runtime`')
    expect(prompt).toContain('`openpen-mcp-http --version` prints 0.0.0-test')
    expect(prompt).toContain('found version 0.15.1 installed')
    expect(prompt).toContain('the installed standalone bridge runs independently')
  })

  test('never suggests installing the upstream companion', () => {
    const prompt = mcpServerSetupPrompt({ code: 'not-installed' })
    expect(prompt).not.toContain('npm i -g')
    expect(prompt).toContain('Do not install the upstream @open-pencil/mcp package')
  })

  test('explains a missing command when nothing is installed', () => {
    expect(mcpServerSetupPrompt({ code: 'not-installed' })).toContain(
      'could not find the `openpen-mcp-http` command'
    )
  })
})
