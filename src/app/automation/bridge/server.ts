/** Connect the live editor to its authenticated local automation bridge. */
import { randomHex } from '@open-pencil/scene-graph/random'

import { makeFigmaFromStore } from '@/app/automation/bridge/figma-factory'
import type { AutomationFiles } from '@/app/automation/bridge/file-handlers'
import { createAutomationCommandHandlers } from '@/app/automation/bridge/handlers'
import { createAutomationMessages } from '@/app/automation/bridge/messages'
import type { EditorStore } from '@/app/editor/active-store'

/**
 * The MCP server's `/files/`, beside the socket the app connects to, where a browser app reads and
 * writes the paths the file tools name. Each folder is one URL segment, so the URL ends in the
 * file's own name; a leading separator stays as an empty segment, as in a Windows share's `\\`.
 */
export function automationFiles(automationURL: string, token: string): AutomationFiles {
  const base = new URL(automationURL.replace(/^ws/, 'http'))
  return {
    url: (path) => new URL(`/files/${path.split(/[\\/]/).map(encodeURIComponent).join('/')}`, base),
    headers: { authorization: `Bearer ${token}` }
  }
}

class AutomationConnection {
  private ws: WebSocket | null = null
  private reconnectTimer: ReturnType<typeof setTimeout> | undefined
  private intentionalDisconnect = false
  private closeMessages: (() => void) | undefined
  private readonly handlers: ReturnType<typeof createAutomationCommandHandlers>

  constructor(
    private readonly getStore: () => EditorStore,
    readonly token: string,
    private readonly url: string
  ) {
    this.handlers = createAutomationCommandHandlers(makeFigmaFromStore, automationFiles(url, token))
  }

  connect = () => {
    let socket: WebSocket
    try {
      socket = new WebSocket(this.url)
      this.ws = socket
    } catch (error) {
      console.error(
        '[Automation] WebSocket constructor failed:',
        error instanceof Error ? error.message : error
      )
      this.scheduleReconnect()
      return
    }
    const messages = createAutomationMessages(socket, (command, args, signal) =>
      this.handlers.handleRequest(this.getStore(), command, args, signal)
    )
    this.closeMessages = messages.abort
    socket.onopen = () => {
      console.debug('[Automation] WebSocket connected to MCP server')
      socket.send(JSON.stringify({ type: 'register', token: this.token }))
    }
    socket.onmessage = messages.receive
    socket.onclose = (event) => {
      if (this.ws === socket) this.ws = null
      messages.close()
      if (this.intentionalDisconnect || event.code === 1000) return
      console.warn('[Automation] WebSocket closed:', `code=${event.code} reason=${event.reason}`)
      this.scheduleReconnect()
    }
    socket.onerror = (event) => {
      console.warn('[Automation] WebSocket error:', event)
      socket.close()
    }
  }

  private scheduleReconnect = () => {
    clearTimeout(this.reconnectTimer)
    this.reconnectTimer = setTimeout(this.connect, 2000)
  }

  disconnect = () => {
    this.intentionalDisconnect = true
    clearTimeout(this.reconnectTimer)
    this.closeMessages?.()
    this.ws?.close()
    this.ws = null
  }
}

export function connectAutomation(
  getStore: () => EditorStore,
  authToken: string | null = null,
  automationURL = __OPENPENCIL_LOCAL_AUTOMATION_URL__
) {
  const connection = new AutomationConnection(getStore, authToken ?? randomHex(32), automationURL)
  connection.connect()
  return { disconnect: connection.disconnect, token: connection.token }
}
