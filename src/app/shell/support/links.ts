export const BRUTAL_SUPPORT_URL = 'https://github.com/brutal-sh/open-pen-feedback'
export const BRUTAL_RELEASES_URL = `${BRUTAL_SUPPORT_URL}/releases`

export function brutalBugReportURL(title?: string): string {
  const url = new URL(`${BRUTAL_SUPPORT_URL}/issues/new`)
  url.searchParams.set('template', 'bug.yml')
  if (title) url.searchParams.set('title', title)
  const version = typeof __OPENPENCIL_APP_VERSION__ === 'string' ? __OPENPENCIL_APP_VERSION__ : ''
  url.searchParams.set('version', version)
  return url.href
}
