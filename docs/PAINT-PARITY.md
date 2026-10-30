# Paint inspector comparison

Target: installed `/Applications/Pen.app` 1.2.21. Inspection date: 2026-10-30. This records observed behavior on an independent synthetic spacing fixture; it is not whole-inspector acceptance. Vendor captures/resources remain private in ignored `local-evidence/`.

| State | Actual Pen observation | Open Pen acceptance |
| --- | --- | --- |
| Single selected frame | No inherited Selection colors section between Effects and Code | Hidden in compact single inspector; Advanced retains it. Absent in installed compact single inspector; Advanced retains it; mixed-selection editing regression passed |
| Paint popup width | Shipped measurement includes `w-[264px]`; live popup agrees | Width changed from 240 to 264 CSS pixels; full visual comparison pending |
| Category controls | Color, Gradient, Image, Shader; separate eyedropper control | Category strip stretched; eyedropper layout/behavior remains open |
| Gradient type | Linear, Radial, Angular, Mesh | Linear/Radial/Angular implemented; inherited Diamond differs; Mesh absent |
| Initial conversion | Gray/red/translucent red become opaque black/white; saved gray gradient runs bottom to top; Gradient→Color resets to opaque D9D9D9 | Source/unit, eight browser paths and installed native conversion/Save/Undo/Redo executed; reference red/alpha serialization remains unverified |
| Gradient body | Full-width type chooser, ramp and stop rows | Chooser expanded; remaining spacing/borders/type controls need comparison |
| Stop color | Swatch opens a separate color popup | Existing reusable color picker now nested; Browser and installed native edit/dismiss paths executed |
| Nested Escape | Closes stop-color popup and returns to gradient popup | Browser and native nested Escape retain parent editor |
| Minimum stops | Remove from two to one; final remaining stop has no remove action | Shared minimum changed to one; active-index and valid swatch/ramp handling tested; Linear/Radial/Angular browser pixels checked; native Linear Save/reopen and actual Pen interoperability executed |
| Color format | RGBA shown in reference popup | Format labels, channels, units and layout still differ; full comparison open |
| Blend selector | Present inside paint popup | Current compact paint UI requires matching this placement and every mode |
| Outer Escape | A solid edit from D9D9D9 to 11D9D9 remained after Escape in actual Pen | Inherited cancellation was a mismatch; Close/commit behavior executed in browser fill/stroke checks and installed native Save/reopen |
| Paint history | Popup changes can be undone on the synthetic reference | Undo granularity across category switches, channel edits and stop removal still needs exact comparison |

The one-stop unit check exposed a reactive ordering error in the inherited removal action: it computed selection from the already-updated array. The action now derives the remaining array and valid selected index before publishing the update. One-stop swatch/ramp CSS uses a solid color, avoiding an invalid one-color CSS gradient. The final browser path edited a stop through the nested popup, dismissed it, removed the other stop, closed the parent and read the actual scene pixel as [17, 0, 255, 255]. This establishes that named rendered path; it does not close full paint parity.

Private captures: `pen-color-popup-reference.png`, `pen-gradient-menu-reference.png`, `pen-gradient-stop-popup-reference.png`. Synthetic reference mutations were undone; the original user design was not edited. The test reference tab may retain a dirty marker from earlier audit history; no source-file Save was performed for these paint experiments.

Native pre-Escape-correction check: separate stop popup, RGB edit to 1100FF, nested Escape, removal to one stop, and the painted preview were observed. The saved-output check found outer Escape rolled back to the starting solid; that correctly remains a gap until the correction is delivered and rerun. Actual Pen was then checked directly: changing red to 17 retained 11D9D9 after Escape. Private evidence: pen-paint-escape-retains-color.txt.

Final native correction: nested RGB edit to 1100FF, nested Escape, removal to one stop, outer Escape, Save, close and Recents reopen retained one stop. The saved JSON was inspected independently. Actual Pen.app opened the same file and rendered the 300×100 frame with the expected gradient. Private captures: native-gradient-one-stop-reopened.png and pen-openpen-one-stop-interchange.png. Five focused fill/stroke browser workflows passed, plus the later single-stop Linear/Radial/Angular pixel run and the mixed-selection color regression on a managed development server. Source/Vue/test types, scoped lint, architecture and test placement passed. Full paint parity remains open.

Conversion-default continuation: three live Pen cases (gray, red and translucent red) reset to opaque black/white. Gradient→Color reset to opaque D9D9D9. The saved gray-only reference confirms rotation 0 / size.height 1 and bottom-to-top direction. Later reference Save attempts did not update red/alpha; a fresh Save As proof was absent. Those later serialization claims remain unverified. Open Pen conversion now starts fresh without stale gradient data, using shared geometry helpers; Figma conversion defaults remain unchanged. Nine gradient/conversion unit checks passed with 35 assertions; eight browser paths passed, including top/bottom painted pixels, return to gray and Undo.

Installed conversion acceptance: opened #FF000080 at 50%, changed to Gradient, observed opaque black/white, saved and independently inspected rotation 0, opacity 1 and stops #000000/#FFFFFF. Capture: native-conversion-gradient-default.png. Converted back to Color, saved #D9D9D9; native Undo restored Gradient and dirty state, Redo restored gray and the clean saved tab. The earlier one-stop native/interchange checks remain separate from these defaults.
