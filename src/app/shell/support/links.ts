import { APP_RELEASE_VERSION } from '@/app/runtime/version'

export const BRUTAL_SUPPORT_URL = 'https://github.com/brutal-sh/brutal-feedback'
export const BRUTAL_RELEASES_URL = `${BRUTAL_SUPPORT_URL}/releases`

export function brutalBugReportURL(title?: string): string {
  const url = new URL(`${BRUTAL_SUPPORT_URL}/issues/new`)
  url.searchParams.set('template', 'bug.yml')
  if (title) url.searchParams.set('title', title)
  url.searchParams.set('version', APP_RELEASE_VERSION)
  return url.href
}
