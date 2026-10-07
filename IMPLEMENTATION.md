# Ergodic hierarchy visualiser

## Current implementation — 7 October 2026

Both standalone HTML files contain the same instrument. The user's original files remain in `originals/`. This revision also implements the user's explicit choice of examples that separate successive hierarchy levels.

### Partitions and colour

The selected partition defines both the starting labels and the current observation cells. Options are 1 × 2 (top/bottom halves), 2 × 2 and 4 × 4, giving 2, 4 or 16 colours. A spatial colour key sits beside the selector. Changing the partition recolours the same trajectories and recomputes all three measures. Cells mode shows the fraction of each starting-cell colour in each current cell.

`ErgodicModel.partition` constructs rectangular partitions and their initial labels. `metrics` uses a joint count table with one row per current cell and one column per starting cell. Normalised mutual information is the displayed coarse memory:

`M(n) = 1 − H(C₀ | Cₙ) / H(C₀)`.

The interpretation is the fraction of starting-cell information recovered from the current cell alone. It equals one for a reversible permutation of cells, and zero when starting and current cells are independent. The explanation compares the diversity of starting-cell labels in the whole sample with their diversity among particles sharing a current cell. It defines n and both cell variables, introduces q locally as the number of grid cells, and explains the two entropies as diversity of starting-cell labels.

Cell-return correlation uses the same partition, with q equal-area cells:

`R(n) = [q P(Cₙ = C₀) − 1] / (q − 1)`.

Under the invariant uniform measure, independent cells match with probability 1/q. R equals one when all cells match, zero at that independent return rate and −1/(q − 1) when none match. For 1 × 2 it exactly reproduces the former top/bottom sign correlation. It is the normalised sum of the cell-indicator autocovariances, without assigning arbitrary numeric scores to cell labels. A predictable permutation can preserve all memory while yielding negative or even zero R; R = 0 alone does not establish independence. All R graphs retain the shared −1 to 1 scale, including when the partition changes.

Time-average error is `D(n) = mean_particles [½ Σ_c |v_c(n) − 1/q|]`, where v_c(n) counts a particle's visits to cell c at steps 0 through n and divides by n + 1. Absolute deviations are taken separately for each particle before averaging, so a uniformly occupied ensemble of trapped particles still has positive error. At n = 0, D = 1 − 1/q. The error lies between zero and this upper bound, and tends to zero for almost every orbit of an ergodic transformation at any fixed finite partition. The displayed mean tends to zero for an almost-sure finite sample. No finite trajectory or single grid certifies ergodicity.

At the user's request, the shuffled-memory lines, their labels and explanatory copy have been removed, together with their computation and dedicated tests. The raw memory estimate is unchanged. A concise note about upward sampling bias remains in the methodology.

`measurementSeries` computes and caches the three integer-time curves for each map and partition. These calculations never enter animation frames. The legacy half-space correlation method remains as an independent reference for scientific checks.

Occupancy entropy stays out of the display: uniform area is invariant under these maps, so an initially uniform ensemble makes this curve nearly flat. Entropy-rate estimation has not been introduced. The underlying occupancy-entropy calculation remains available for scientific checks.

### Step failure and motion

The reported white non-ergodic panel was reproduced by making the first animation frame timestamp precede the click handler's recorded start time. The previous code requested a negative iterate and cleared the canvas before throwing on an undefined state array. The observed reproduction had time −0.0888 and a completely empty first canvas.

Elapsed animation time is now clamped at both ends, and the model defensively bounds requests to steps 0–64. A browser regression deliberately injects the earlier timestamp, checks that the first canvas retains pixels and that the step completes without a page error.

Shear and translation have natural continuous lifts; other maps use illustrative torus paths. Chacon and staircase update the horizontal coordinate during the first half of a step, then the vertical coordinate, so the two operations can be followed separately. These transitions preserve the exact map endpoints and are identified as illustrations in the methodology. Reduced-motion mode uses exact discrete states.

### Layout and interaction

- Six simulations and all six definitions stay visible. Subtitles and the note below the simulations have been removed.
- One toolbar controls time, display, partition and speed. The tracked particle has a 20-pixel diameter ring, a white surround, a 3.5-pixel dark stroke and an enlarged centre, in every map. Mouse and keyboard tracking are retained.
- Full screen removes page chrome while preserving plot size on entry. At the tested 1440 × 1100 viewport, all six 420-pixel plots fit. Shorter screens can still require vertical scrolling. A viewport overlay provides a fallback when embedded browsers deny native full screen; surrounding content becomes inert, and Escape restores the ordinary view. Resizing remains responsive.
- Each definition has three graphs with shared scales, giving eighteen plots in total. At wide desktop widths the definition and three graphs share a row. At intermediate widths the definition sits above its graphs; narrow screens stack the graphs. There is no separate Mixing section. Weak and strong mixing each define their own conditional probability and limiting condition.
- The entropy explanation sits within Coarse memory, in normal-size prose.
- Methodology and references share one native disclosure, with ordinary full-width paragraphs. Export buttons were removed.
- The six map explanations now sit under “Maps used above” in this disclosure. The rows beside the graphs focus on the general conditions.

The design follows the existing Berkson, Simpson, Kac ring and Swarm references, using EB Garamond, a white surface, small system-font controls, fine rules and unboxed plots. Reference screenshots remain under `verification/reference-*`.

### Definitions and editorial changes

The agreed sentence–equation–terms pattern is applied to all three measurements. The explanations use starting cells, without colour analogies, uncertainty/saving terminology or the discarded bits example. q follows the return-correlation equation. The zero value of R is correctly described as the independent return rate 1/q, not zero returns.

The shared notation above the hierarchy defines T, its iterates, the probability measure μ, uniform area measure, invariance, starting point x and observation count N. The count symbol # is explained directly beneath the ergodic equation. Non-ergodicity uses measure explicitly. Ergodicity counts visits directly instead of using an indicator function. The prose uses “almost every” without a μ prefix or an extra explanation of this standard term.

Each condition begins with a one-sentence summary. Mixing uses parentheses in T⁻ⁿ(B) and defines it as the set of starting points that reach B after n steps. Weak and strong mixing each use the full measure-overlap formula for arbitrary fixed measurable A and B. Weak mixing averages the absolute difference from μ(A)μ(B) over time; strong mixing requires that difference to tend to zero at every sufficiently late iterate. Conditional p_n and tolerance terminology have been removed. Every formula, including weak and strong mixing, occupies one line without scrolling. The desktop definition column has a 400 px minimum. Native MathML is measured after font loading and on resize; only formulas exceeding the available width are scaled down to fit. Measurement includes individual symbol bounds to account for browser minimum script sizes. No symbols are clipped or hidden.

K uses positive conditional entropy of the present region label given its entire past, for every nontrivial finite measurable partition. This is equivalent to completely positive entropy and K for the invertible transformations on standard probability spaces considered here (Hasselblatt–Katok, Theorem 3.7.12). Bernoulli uses a finite or countable generating partition: labels are jointly independent and the full two-sided record determines the state up to a null set. Its equation factors every finite consecutive block probability into the product of region measures. Measure preservation makes the process stationary, so this also establishes independence at arbitrary distinct integer times. The i.i.d. description is a Markov process; this claim concerns the specified observation scheme. The explanations define the remaining symbols directly.

Explanatory paragraphs below equations now use the same size and colour as the main explanation. All six example-map descriptions remain in the experiment disclosure. The Stanford Encyclopedia reference remains linked.

### Search indexing

The standalone page has a descriptive title, search description, explicit index/follow metadata, one h1, semantic headings and crawlable reference links. Explanations and typeset equations are built into the HTML and do not require JavaScript. The two standalone filenames are identical copies.

The confirmed publishing destinations are the website route `/fun/ergodic-hierarchy/` and GitHub Pages for `DavidFreeborn/ergodic-hierarchy`. The website is the canonical URL. The website integration adds an Interactive Tools entry and sitemap registration. Actual Google indexing is outside the build/deployment checks. Google does not guarantee inclusion: [technical requirements](https://developers.google.com/search/docs/essentials/technical), [indexing FAQ](https://developers.google.com/search/help/crawling-index-faq).

### Scientific examples and their separation

All maps share 1,400 initial points from a seeded, complete 40 × 35 stratification, the same starting partition, integer horizon and playback speed. Their six state arrays and trajectories are independent.

| Panel | Transformation | Reason it stops at that level |
| --- | --- | --- |
| Non-ergodic | Horizontal shear | The lower half is an invariant set of probability 1/2. |
| Ergodic | Translation by `(sqrt(2) − 1, sqrt(3) − 1)` modulo one | Rational independence gives ergodicity; nonconstant eigenfunctions exclude weak mixing. |
| Weak mixing | Chacon × Chacon | Chacon is weakly mixing but not strongly mixing. Weak mixing is preserved under this product; the Chacon factor excludes strong mixing. |
| Strong mixing | Staircase × Staircase | The staircase is mixing and has entropy zero. Both properties pass to the product; entropy zero excludes K. |
| K | Kalikow's T,T⁻¹ transformation | The classical random-walk-in-scenery system is K but not Bernoulli. |
| Bernoulli | Binary baker map | Its binary coding is a two-sided independent fair-bit shift. |

The previous identical cat-map examples were removed. These classifications concern the mathematical transformations, not a visual test of their finite traces. Their square-coordinate representations differ; no ordering of the plots' geometric complexity or observed correlation speed is implied.

### Adaptive cutting and stacking

Chacon cuts into three and puts one spacer above the middle column. The staircase uses `r_s = s + 1` cuts at stage `s ≥ 1`, with `j` spacers above column `j = 0, …, r_s − 1`. Its heights obey `h_s = r_s h_(s−1) + r_s(r_s−1)/2`, with `h_0 = 1`.

The staircase's unnormalised initial width is one. After stage s, its width is `1/(s+1)!`, and the total measure approaches `1 + (1/2) Σ_(j≥0) 1/j! = 1 + e/2`. Dividing the initial width by this quantity places the construction in the unit interval. Its cut counts tend to infinity while `r_s²/h_(s−1) → 0`, meeting the restricted-growth mixing criterion. Finite-measure rank-one transformations have entropy zero; the two-coordinate product also has zero entropy.

`rankOne` computes level addresses recursively instead of allocating an enormous tower. For each initial coordinate, it increases the stage until the point is in the tower and its level index plus 64 is strictly below the height. All requested steps then follow already-defined partial translations and agree with every later refinement. No top-to-bottom wrap or periodic closure is used in a displayed trajectory. The materialised legacy `tower` routine remains solely as an independent numerical reference.

For the default sample, Chacon needs stages 8–11 and the staircase stages 6–9. The former stage-8 cyclic approximation disagreed with stage 9 on up to 21 of 1,400 points at an iterate. The adaptive Chacon paths agree with a stage-12 calculation to 2.3 × 10⁻¹⁶. Tests also refine every displayed Chacon and staircase coordinate by at least one stage and check all 65 positions.

The weak panel's fine structure is therefore a property of the repeated cuts, rather than an injected random shuffle. Separating its horizontal and vertical animation improves legibility without changing the integer-time transformation.

### Kalikow coding

The published transformation acts on two independent two-sided fair-bit sequences `(a,b)` as `(σa, σ^(2a₀−1)b)`. A real coordinate encodes a sequence in index order `0,+1,−1,+2,−2,…`. This rearrangement of independent binary digits identifies the product sequence space with the uniform square, up to null sets.

At iterate n, the driver is shifted by n and the scenery by the walk position `S_n = Σ_(j=0)^(n−1)(2a_j−1)`. The displayed x and y are the first 53 bits of these two shifted codes. Initial 192-bit strings cover every digit requested over 64 steps, including the most extreme possible walk. Missing bits cause an explicit error rather than padding or fresh randomness. Every revisit to the same scenery location reproduces exactly the same y coordinate.

For the top/bottom observable, the population autocorrelation is the probability the walk returns to zero: zero at odd n, and `binomial(2m,m)/2^(2m)` at `n = 2m`. The numerical trace is checked against this independent analytic result. The baker map retains its 192-bit binary arithmetic and non-collapse checks.

### Mathematical sources

- [Creutz, Ergodic Theory of Group Actions](https://www.dcreutz.com/publications/Ergodic_Theory_of_Group_Actions.pdf): Chacon and weak mixing.
- [Creutz and Silva, Mixing on Rank-One Transformations](https://arxiv.org/abs/math/0603553): staircase mixing and restricted growth.
- [Robinson and Şahin, Rank-one Zᵈ actions and directional entropy](https://bpb-us-e1.wpmucdn.com/blogs.gwu.edu/dist/2/115/files/2016/03/RobinsonSahinDirEnt-1crhfso.pdf): rank-one entropy-zero property.
- [Kalikow, T,T⁻¹ transformation is not loosely Bernoulli](https://annals.math.princeton.edu/1981/115-2/p07), Annals of Mathematics 115 (1982): K but not Bernoulli.
- [Hoffman, The scenery factor of the T,T⁻¹ transformation is not loosely Bernoulli](https://sites.math.washington.edu/~hoffman/publications/scenery.pdf): explicit state space, measure and map formula.

## Build and checks

`npm run build` embeds source, the bundled font and build-time KaTeX MathML into both HTML files. They require no network connection or runtime library. Model, content, rendering and styles remain separate in `src/`.

`npm test` runs numerical and Chromium browser checks. `PLAYWRIGHT_CHROMIUM_EXECUTABLE` may specify a browser; otherwise the installed or cached Windows Chromium is used. Current results are in `verification/results.json`.

Checks cover all six trajectories being distinct, analytic translation and random-walk correlations, fixed-scenery revisits, sufficient binary precision, baker non-collapse, independent materialisations of both towers, adaptive paths avoiding closure, agreement under refinement, interpolation endpoints, partition labels and counts, memory under permutation/independence, the negative-timestamp regression, both display modes, point following, full screen, keyboard controls and reduced motion. Theorems establishing the hierarchy properties come from the cited sources; finite numerical tests validate their implementation.

The measurement tests cover analytical identity/permutation/independence cases for all three grids; equality with legacy half-correlation on 1 × 2; independently recounted orbit histories across all maps and grids; and trapped and cyclic-orbit counterexamples. Browser checks verify all eighteen curves, partition-dependent updates, cache reuse, current values and integer-step cursor behaviour during fractional animation. They also verify removal of baselines and the separate Mixing section, relocation of all six examples, and the Stanford Encyclopedia link. The full suite passes 21 scientific checks and the interaction/layout checks.

Rendered layouts and mathematical-token bounds are checked at 1440, 768, 390, 320 and 720 CSS pixels; the last also uses 2× density as a 200%-zoom equivalent. All equations are checked for absence of multiline tables, symbol clipping and horizontal overflow at every tested viewport. No horizontal document overflow or page errors were observed. Screenshots for this revision use `verification/partition-*`. The full suite used Chromium 151. Additional engine checks cover Firefox 155 and WebKit 26.6 at 1440, 1000, 768, 390 and 320 px, including visible equations, all grids, both displays, stepping and keyboard tracking. This is not an accessibility certification.

Graph-origin clarification: all series already began at n=0. Added a fine vertical origin axis and explicit step ticks at 0, 32 and 64. Browser checks verify every series starts at exactly the same SVG x-coordinate as its origin axis, zero tick and zero label across all tested widths.
