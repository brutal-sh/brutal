import { describe, expect, test } from 'bun:test'

import {
  documentNameFromFigPath,
  downloadNameFromPath,
  documentDownloadName
} from '@/app/document/io/names'

describe('document names from paths', () => {
  test('take the last segment of POSIX and Windows paths alike', () => {
    expect(documentNameFromFigPath('/Users/me/Landing page.fig')).toBe('Landing page')
    expect(documentNameFromFigPath('C:\\Users\\me\\Landing page.FIG')).toBe('Landing page')
    expect(downloadNameFromPath('C:\\Users\\me\\Landing page.fig')).toBe('Landing page.fig')
  })

  test('fall back to Untitled for a path with no file name', () => {
    expect(documentNameFromFigPath('')).toBe('Untitled')
    expect(downloadNameFromPath('')).toBe('Untitled.fig')
  })

  test('retain writable document formats and convert other imports to .fig', () => {
    expect(documentDownloadName('Landing.fig', 'fig')).toBe('Landing.fig')
    expect(documentDownloadName('Landing.pen', 'pen')).toBe('Landing.pen')
    expect(documentDownloadName('Landing', 'html')).toBe('Landing.fig')
  })
})
