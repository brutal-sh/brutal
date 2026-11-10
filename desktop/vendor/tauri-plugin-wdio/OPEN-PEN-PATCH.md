# Open Pen native-test companion patch

The published 1.3.0 crate declares `MIT OR Apache-2.0` but omits license text.
This repository-local copy selects MIT and supplies the upstream root LICENSE
from the crate's recorded source commit
`53d8569e7db3706a814f1fa6d6e779f2b22d0333`, verified against its Git blob hash.
The original SPDX declaration and upstream metadata are preserved. This copy
is used only by Open Pen's optional native-test feature.

Semantic changes are confined to commands.rs and the explicit Tauri unstable
API feature; desktop.rs only loses a trailing blank line. The
companion uses the same physical-window/same-label-primary-webview rule as
the patched embedded driver. Caller injection and script evaluation use
Webview; discovery and focus state use the registered physical window.
Child and bare windows are excluded from the window lists.

Original sources, checksum and native controls are recorded in the Open Pen
NATIVE-DRIVER-MULTIWEBVIEW.md record and private evidence. Global dependency
source and existing JavaScript service changes are not edited.
