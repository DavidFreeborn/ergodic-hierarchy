# Release audit — 7 October 2026

## Scientific accuracy

- Retained six independently computed examples that separate successive levels; the transformations and supporting sources are documented in IMPLEMENTATION.md.
- The adaptive rank-one paths agree under further refinement and never close the top of a finite tower. No random shuffling replaces a mathematical map.
- The selected grid controls initial labels, current cells and all three diagnostics. Return correlation uses the invariant uniform baseline; mutual information is empirical and subject to finite-sample upward bias. Time-average error averages individual total-variation errors after absolute values are taken.
- Applied the accepted weak/strong mixing distinction and partition-based Bernoulli explanation. Bernoulli requires a finite or countable generating partition and joint independence, not merely pairwise independence. Invariant sets and generating codings are defined modulo null sets.
- All curves begin exactly at step zero. Each SVG path, origin axis, zero tick and zero label has the same horizontal coordinate.

## Code and performance

- Model, authored content, presentation and build remain separate. Formatted maintained source and verification scripts consistently.
- Reused interpolation buffers, pre-grouped particles by initial label and removed entropy calculations from cell drawing. Cached measurement series remain outside animation frames. Hover redraws occur only when the followed point changes.
- Regression tests compare reused buffers with independent interpolation outputs for all six maps and multiple fractional times.
- On this Windows machine in headless Chromium, 1,400 particles, six 420px panels and the 4×4 partition: animation callback median/p95 was 1.7/2.3 ms in Points and 0.7/1.0 ms in Cells (96 sampled frames each). These are callback costs, not GPU timings or guarantees for other devices.
- Build-time KaTeX updated to 0.19.0. npm audit reports zero known advisories. The approximately 143 KiB standalone page has no runtime dependencies or network requests. It includes the licensed font and native MathML.

## Verification

- 21 numerical/model checks and the full Chromium interaction suite pass.
- Chromium layouts: 1440, 768, 390, 320 and 720 CSS px; the last checks reduced viewport reflow at 2× density.
- Firefox and WebKit checks: 1440, 1000, 768, 390 and 320 px; equations, page bounds, controls, partitions, modes and keyboard tracking pass.
- Every equation stays on one line with no scrolling or clipped symbols. At 320px the longest formula scales to approximately 13.4–14.2px, depending on engine.
- Shared website navigation, bundled font, footer, focus visibility, reduced motion and font licence preserved.
- Website typecheck and build pass (three pre-existing informational hints elsewhere); 26 tool/genealogy, nine analytics-consent and four evolution-clock tests pass. SEO and link/asset validation have zero warnings or errors.
- Publication targets: GitHub Pages and the canonical website route. The website adds its ordinary consent-controlled analytics at build time; the standalone release has none.

## Limits

The simulation is a 64-step finite sample; it does not establish infinite-time hierarchy properties or estimate entropy rates. Interpolation between integer steps is illustrative. The 16 starting-cell colours follow the explicit design request; some are difficult to distinguish with colour-vision deficiencies. Physical touch hardware, screen-reader narration and native browser zoom shortcuts were not tested. Google inclusion cannot be guaranteed by technical indexability checks.
