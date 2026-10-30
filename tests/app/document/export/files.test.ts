import { expect, test } from 'bun:test'

import { strFromU8, unzipSync } from 'fflate'

import { bundleExportFiles, type ExportedFile } from '@/app/document/export/files'

function document(name: string, css: string): ExportedFile {
  return {
    fileName: name,
    format: 'HTML',
    ext: '.html',
    mime: 'text/html',
    bytes: new TextEncoder().encode('<link rel="stylesheet" href="export.assets/site.css">'),
    assets: [{ path: 'export.assets/site.css', content: css }]
  }
}
test('HTML bundles retain the page and relative asset paths', () => {
  const zip = unzipSync(bundleExportFiles([document('Card.html', 'body{color:red}')]))
  expect(strFromU8(zip['Card.html'])).toContain('export.assets/site.css')
  expect(strFromU8(zip['export.assets/site.css'])).toBe('body{color:red}')
})
test('multiple HTML exports keep their different styles in separate folders', () => {
  const zip = unzipSync(
    bundleExportFiles([document('Card.html', 'red'), document('Card.html', 'blue')])
  )
  expect(strFromU8(zip['Card.html/export.assets/site.css'])).toBe('red')
  expect(strFromU8(zip['Card (2).html/export.assets/site.css'])).toBe('blue')
})
test.each(['../escape', '/absolute', 'a//b', 'a/./b', 'a\\b', 'C:drive', 'a\u0000b'])(
  'rejects unsafe exported asset path %s',
  (path) => {
    const file = document('Card.html', 'red')
    file.assets = [{ path, content: 'unsafe' }]
    expect(() => bundleExportFiles([file])).toThrow('Invalid export asset path')
  }
)
test('rejects duplicate asset paths instead of overwriting content', () => {
  const file = document('Card.html', 'red')
  file.assets?.push({ path: 'export.assets/site.css', content: 'blue' })
  expect(() => bundleExportFiles([file])).toThrow('Duplicate export asset path')
})
