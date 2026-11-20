# Brutal patch to rfd 0.16.0

Source: https://crates.io/crates/rfd/0.16.0 (MIT; upstream LICENSE retained).
Registry archive SHA-256: a15ad77d9e70a92437d8f74c35d99b4e4691128df018833e99f90bcd36152672.

Only the macOS Save panel title setter differs: use NSSavePanel.setTitle instead of
NSSavePanel.setMessage. The existing setter renders an additional heading above
the filename; the editor requires a sheet title with the standard Save As label.
Open panels, alerts, filters, cancellation, paths and scope handling are unchanged.
The original packaged sources and metadata are retained except Cargo cache markers.

Recheck this patch when upgrading rfd. Verify a real Save As sheet's accessible
title and filename label, cancel, save-copy, refused write and successful retry.
