interface FontData {
  family: string
  fullName: string
  postscriptName: string
  style: string
  blob(): Promise<Blob>
}

interface Window {
  queryLocalFonts?(): Promise<FontData[]>
}

declare module '*?raw' {
  const content: string
  export default content
}

// The dependency declares only its package-root types, while Node needs its ESM entry.
declare module 'svg2pdf.js/dist/svg2pdf.es.min.js' {
  import type { svg2pdf as convertSVG } from 'svg2pdf.js'

  export const svg2pdf: typeof convertSVG
}
