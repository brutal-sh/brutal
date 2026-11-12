# Opened FIG page-panel fixture

The opened-document page-switch case tries to click a page while Agent is selected, so the Layers-owned page control is absent. It times out before the page-content and saved-state assertions. This is reproduced twice against unchanged published `2debd3365` runtime and twice against the external-change candidate. Both builds succeed; every candidate source byte and mode is restored after the original-source control.

The fixture now selects the existing Layers workspace tab before its original page click. The original file, page name, nonempty child-content, clean-state and close-without-save assertions remain. Production defaults, canonical configuration, deadlines and retries do not change.

Both original opened-document cases pass. The final affected recovery cohort passes all 34 cases in 289.660 seconds with zero skips, retries or flaky cases. This reaches the second FIG page and the original save-state checks; it does not accept complete FIG fidelity, native opening, Figma interoperability or Pen parity.

Private evidence: `local-evidence/claude-brand-review-2026-11-11/file09-opened-fig-control/{scope,result}.json`, `file09-opened-fig-trace-comparison.json`, `file09-fig-page-fixture-first.json` and `file09-recovery-final.json`. The original 33-case cohort's 32 passes and one fixture timeout remain retained.
