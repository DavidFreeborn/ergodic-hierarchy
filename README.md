# Ergodic hierarchy

A self-contained interactive comparison of six measure-preserving systems, with partition-based measurements and mathematical definitions.

- [Interactive visualiser](https://www.davidpeterwallisfreeborn.com/fun/ergodic-hierarchy/)
- [GitHub Pages](https://davidfreeborn.github.io/ergodic-hierarchy/)

## Develop and verify

Requires Node.js 24 or newer.

```sh
npm ci
npm run build
npx playwright install chromium
npm test
```

Open `dist/index.html` directly or serve the directory with a static web server. There are no runtime dependencies or third-party requests. KaTeX renders accessible MathML at build time; the font and application are embedded. `src/model.js` has no DOM dependency.

The build also updates the original standalone filenames. `dist` contains only the publishable page, font licence and `.nojekyll`. GitHub Actions runs the tests before deploying it to Pages.

Additional browser-engine checks:

```sh
npx playwright install firefox webkit
node verification/cross-browser.cjs
```

The tests use Chromium supplied by Playwright, a cached Windows Chromium, or `PLAYWRIGHT_CHROMIUM_EXECUTABLE`. Screenshots and machine-specific result files are local verification output and are not committed.

## Scientific scope

The examples separate successive hierarchy levels: horizontal shear, irrational translation, Chacon × Chacon, staircase × staircase, Kalikow’s T,T⁻¹ system, and the binary baker map. The hierarchy is established by the cited mathematical results, not inferred from 64-step plots. Simulations share 1,400 seeded initial points. Integer states are used for measurements; intermediate animation is illustrative.

See [IMPLEMENTATION.md](IMPLEMENTATION.md) for the numerical construction and [AUDIT.md](AUDIT.md) for release verification and limitations. The EB Garamond font is distributed under the included SIL Open Font License.
