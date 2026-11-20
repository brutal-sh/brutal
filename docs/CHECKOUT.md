# Private fork fixture delivery

The current Brutal checkout uses Git LFS for twelve test fixtures and font subsets.
The tracked `.lfsconfig` points to this private repository's GitHub LFS endpoint.
The fixtures retain their upstream licenses, names and attribution; this changes delivery only.
It does not rename compatible packages, protocols or serialized files.

Use Git LFS with your existing GitHub repository access when cloning. If a checkout was made
with smudging disabled, `git lfs pull origin` retrieves the current fixture contents.
Do not replace the retained `.fig`/font data with pointer text or bypass the fixture checks.

The initial mirror is limited to the twelve current object IDs, totaling 154,786,405 bytes.
It does not upload every object from branch history. Historical checkouts retain the endpoint
configuration recorded by those revisions and are outside this current-checkout acceptance.

[DELIVERY-LFS](https://trello.com/c/cvzyZ7Hw) has executed own-endpoint upload and an independent
fresh-storage download of all twelve objects. The shallow local source clone starts with only
LFS pointers, empty storage and no reference directory; actual GitHub LFS pull downloads all
twelve, every SHA-256 and size matches, and `git lfs fsck` passes. Independent review also
checks the retained files and endpoint configuration, without another network run.
The source Git clone is local and shallow; remote Git-history completeness is not established.
The canvas candidate and native limits are recorded in [CANVAS-LIFECYCLE.md](CANVAS-LIFECYCLE.md).
