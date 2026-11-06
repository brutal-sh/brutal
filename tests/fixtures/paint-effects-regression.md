# Paint effects regression fixture

`paint-effects-regression.fig` contains one fixed page and 100 nodes covering linear/radial
gradients, layered fills, drop/inner shadows, blur, text effects, blend modes, alpha masks and
independent corners. It keeps canvas color-space tests independent of the changing app tour.

The specimen comes from the MIT-licensed OpenPencil paint sample at upstream commit
`f8d2dbc7e671ebe962745ee0657653e05813d7c4`: `src/app/demo/paint/{section,samples}.ts` and
`src/app/demo/sections/example.ts`. The repository's upstream license and notices apply.
It is implementation regression data, not a Pen.app design reference or parity acceptance.

Generated with the current Core renderer, measured Inter text and FIG exporter. An independent
FIG parse verifies the page count, masks, blend modes and effects before use. The source paint
functions are not restored to the product. The fixed page has an explicit sRGB background.
