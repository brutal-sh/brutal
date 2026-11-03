import { previewURL } from '../schema'

export function browserHistoryURL(input: string): string {
  if (!input.startsWith('file:')) return previewURL(input)
  const url = new URL(input)
  if (url.host || !url.pathname.toLowerCase().endsWith('.html'))
    throw new Error('Choose a local HTML export.')
  // History is a locator; reopening still requires native export authorization.
  return url.href
}
