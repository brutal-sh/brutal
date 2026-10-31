/** Shared worker-result and host-reference materialization limits. */
export const SCRIPT_LIMITS = {
  outputBytes: 2_000_000,
  elements: 1_000,
  depth: 100,
  arrayLength: 1_000,
  objectKeys: 1_000,
  stringLength: 100_000
} as const
