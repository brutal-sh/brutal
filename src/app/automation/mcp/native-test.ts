import * as v from 'valibot'

const nativeTestConfigurationSchema = v.object({
  discoveryPath: v.string(),
  socketPath: v.string(),
  root: v.string(),
  port: v.pipe(v.number(), v.integer(), v.minValue(1024), v.maxValue(65535))
})
export type NativeTestMCPConfiguration = v.InferOutput<typeof nativeTestConfigurationSchema>

export async function loadNativeTestMCPConfiguration(
  invoke: (command: string) => Promise<unknown>
): Promise<NativeTestMCPConfiguration> {
  return v.parse(nativeTestConfigurationSchema, await invoke('native_test_mcp_configuration'))
}

/** The same test-owned routing values feed both HTTP probes and the spawned process. */
export function nativeTestMCPRoute(configuration: NativeTestMCPConfiguration) {
  return {
    httpURL: `http://127.0.0.1:${configuration.port}`,
    env: {
      PORT: String(configuration.port),
      OPENPENCIL_MCP_DISCOVERY_PATH: configuration.discoveryPath,
      OPENPENCIL_MCP_SOCKET: configuration.socketPath,
      OPENPENCIL_MCP_ROOT: configuration.root
    }
  }
}
