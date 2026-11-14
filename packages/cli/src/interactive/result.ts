/** Core read tools can return an error value instead of throwing. */
export function assertInteractiveResult(value: unknown): void {
  if (value && typeof value === 'object' && 'error' in value && typeof value.error === 'string')
    throw new Error(value.error)
}
