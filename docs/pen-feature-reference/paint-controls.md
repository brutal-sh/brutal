# Native paint-control detail

Reference: actual `/Applications/Pen.app`1.2.21, observed2026-10-30 on the independent synthetic blend fixture. OpenPencil is the implementation base, never the reference. This supplements the official-document catalog and does not close DRAW-08/09/11/12/13.

## Category and row states

Pen names the four paint categories Color, Gradient, Image and Shader, exposes them as toggles, and places the blend control in the popup header. Switching a solid to Gradient creates fresh opaque black/white stops; switching to Shader starts an enabled shader paint with an empty URL. Those category changes reset the paint blend to normal in the inspected reference. Screen-sampling integration and its unresolved native input check are in [EYEDROPPER-PARITY.md](../EYEDROPPER-PARITY.md). Color-format controls and all eighteen grouped blend options are detailed in [PAINT-PARITY.md](../PAINT-PARITY.md).

At100% opacity, Pen's focused paint row displays the full six-digit hex and100% in separate segments. Open Pen's hover variable trigger previously covered the last digit; it now sits before the opacity segment. Unresolved bindings keep a separate visible recovery trigger. The native corrected row and variable-picker open/Escape path were observed. Exact iconography and every row width/state remain unaccepted.

## Mesh

The gradient chooser contains Linear, Radial, Angular and Mesh. Mesh opens with Grid2×2 cells, Mirrored handles selected, Outline On and nine color buttons plus Shuffle Colors. Its grid popup is a5×5 cell selector. The default serialized paint is type `mesh_gradient`, columns3, rows3, nine colors and nine normalized points at0,0.5,1 on each axis: the display's2×2 cells correspond to3×3 points. No explicit handles are present in that default. Native resize and shuffle probes now establish the reset/repeat/permutation rules. Independent editing, handles and format code are under verification; [Mesh evidence](../MESH-PARITY.md) distinguishes executed paths from remaining native/render/design acceptance.

Observed default colors repeat coral/violet/cyan/gold across the nine points. The mesh canvas draws draggable color handles and connecting lines. Private evidence: pen-mesh-grid-reference.png and the document API read of the synthetic fill. No vendor code or asset is part of Open Pen.

## Shader and Goodies

The Shader category starts with a path-or-URL field, a file action, six suggestion buttons, Shader Gallery and an agent-generation tip. An empty selection writes an enabled shader paint with an empty URL. Open Pen's inherited WebGPU preset panel has a different model and layout; it is not accepted as a substitute.

Shader Gallery opens Goodies with Featured, Styles, Design Systems, Scripts and Shaders tabs. The inspected Shaders tab contains75 named groups and375 examples, five per group. Each example exposes Use Shader Example, Add Shader Fill, Apply Shader Effect and Copy Fill. Its main action can apply to a selection or insert an editable example, according to the exposed help. That help is a reference claim; insertion, clipboard and shader-effect results were not executed in this pass. Gallery membership is version-specific. Independent equivalents, source loading, editable uniforms, animation, failures, export and save/reopen remain open.

Private evidence: pen-shader-gallery-ax.txt and pen-shader-gallery-reference.png. The reference's temporary Mesh/Shader category changes were undone; the fill was confirmed restored to #CC9933/Linear Dodge without saving those experiments.
