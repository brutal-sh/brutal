import type { ExtractedPage } from '@/app/browser-preview/dom/schema'

export function extractedFixture(): ExtractedPage {
  return {
    version: 1,
    requestId: 'f3892dde-cf21-4a40-8cc2-9f0d96d65a52',
    url: 'https://example.test/',
    title: 'Imported page',
    width: 800,
    height: 600,
    viewportWidth: 800,
    viewportHeight: 600,
    background: 'rgb(255, 255, 255)',
    diagnostics: [],
    nodes: [
      {
        id: 'node-0',
        parentId: null,
        type: 'element',
        tag: 'body',
        path: 'body',
        box: { x: 0, y: 0, width: 800, height: 600 },
        style: { 'background-color': 'rgb(20, 30, 40)' }
      },
      {
        id: 'node-1',
        parentId: 'node-0',
        type: 'element',
        tag: 'section',
        path: 'body/section[0]',
        box: { x: 24, y: 30, width: 320, height: 100 },
        style: { 'background-color': 'rgb(240, 10, 20)' }
      },
      {
        id: 'node-2',
        parentId: 'node-1',
        type: 'text',
        tag: 'text',
        path: 'body/section[0]/text()[0]',
        text: 'Editable heading',
        box: { x: 40, y: 46, width: 200, height: 24 },
        style: { 'font-family': 'Inter', 'font-size': '20px', color: 'rgb(255, 255, 255)' }
      }
    ]
  }
}
