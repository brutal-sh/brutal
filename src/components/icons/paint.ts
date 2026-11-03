import { maskIcon } from './mask'

export const OpacityIcon = maskIcon(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none" stroke="black" stroke-linecap="round" stroke-linejoin="round"><defs><clipPath id="box"><rect x="2.5" y="2.5" width="11" height="11" rx="2.5"/></clipPath></defs><g clip-path="url(#box)"><path d="M2.5 13.5L13.5 2.5V13.5Z" fill="black" fill-opacity=".3" stroke="none"/><path d="M2.5 13.5L13.5 2.5"/></g><rect x="2.5" y="2.5" width="11" height="11" rx="2.5"/></svg>'
)

/** Paint and tangent glyphs drawn independently from the observed native controls. */
export const PaintColorIcon = maskIcon(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none" stroke="black"><path d="M1 1H15V15H1Z"/><path d="M3 3H13V13H3Z" fill="black" stroke="none"/></svg>'
)
export const PaintGradientIcon = maskIcon(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none" stroke="black"><path d="M1 1H15V15H1Z"/><path d="M3 5L5 3M3 9L9 3M3 13L13 3M7 13L13 7M11 13L13 11"/></svg>'
)
export const PaintShaderIcon = maskIcon(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none" stroke="black"><path d="M1 1H15V15H1Z"/><path d="M3 10C5 2 11 14 13 6"/></svg>'
)
export const MeshMirroredIcon = maskIcon(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none" stroke="black" stroke-linecap="round"><path d="M2 14Q8 2 14 14M4 8H12"/><circle cx="3" cy="8" r="1.5" fill="white"/><circle cx="13" cy="8" r="1.5" fill="white"/><rect x="6.5" y="6.5" width="3" height="3" fill="white"/></svg>'
)
export const MeshIndependentIcon = maskIcon(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none" stroke="black" stroke-linecap="round"><path d="M2 14Q8 2 14 14M4 8H8L12 4"/><circle cx="3" cy="8" r="1.5" fill="white"/><circle cx="13" cy="3" r="1.5" fill="white"/><rect x="6.5" y="6.5" width="3" height="3" fill="white"/></svg>'
)
