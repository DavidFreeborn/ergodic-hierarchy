const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const { pathToFileURL } = require("node:url");
const { firefox, webkit } = require("playwright");
(async () => {
  const results = [];
  for (const [name, engine] of Object.entries({ firefox, webkit })) {
    const browser = await engine.launch();
    try {
      const page = await browser.newPage({ reducedMotion: "reduce" }),
        errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page.goto(pathToFileURL(path.resolve("dist/index.html")).href);
      await page.evaluate(() => document.fonts.ready);
      for (const width of [1440, 1000, 768, 390, 320]) {
        await page.setViewportSize({ width, height: 1000 });
        await page.waitForTimeout(150);
        await page.locator(".method").evaluate((e) => (e.open = true));
        await page.waitForTimeout(50);
        const audit = await page.evaluate(() => ({
          overflow: document.documentElement.scrollWidth > innerWidth,
          math: [...document.querySelectorAll(".equation")].map((e) => {
            const b = e.getBoundingClientRect();
            return {
              font: getComputedStyle(e.querySelector("math")).fontSize,
              overflow: e.scrollWidth > e.clientWidth + 1,
              clipped: [...e.querySelectorAll("mi,mn,mo,mtext")].some((t) => {
                const r = t.getBoundingClientRect();
                return (
                  r.width > 0 && (r.left < b.left - 2 || r.right > b.right + 2)
                );
              }),
            };
          }),
        }));
        assert.equal(
          audit.overflow,
          false,
          `${name} ${width} document overflow`,
        );
        assert.ok(
          audit.math.every((e) => !e.overflow && !e.clipped),
          JSON.stringify({ name, width, audit }),
        );
        results.push({
          name,
          width,
          minEquationFont: Math.min(
            ...audit.math.map((e) => parseFloat(e.font)),
          ),
        });
      }
      await page.locator("#step").click();
      assert.equal(await page.evaluate(() => ergodicLab.state.time), 1);
      for (const grid of ["1x2", "2x2", "4x4"]) {
        await page.locator("#gridN").selectOption(grid);
        for (const mode of ["particles", "cells"]) {
          await page.locator("#mode").selectOption(mode);
          assert.equal(await page.locator("canvas").count(), 6);
        }
      }
      await page.locator("canvas").first().focus();
      await page.keyboard.press("ArrowRight");
      assert.equal(await page.evaluate(() => ergodicLab.state.tracking), 1);
      assert.deepEqual(errors, []);
      await page.locator(".system-row").last().scrollIntoViewIfNeeded();
      await page.screenshot({
        path: `verification/${name}-bernoulli-mobile.png`,
      });
    } finally {
      await browser.close();
    }
  }
  fs.writeFileSync(
    "verification/cross-browser-results.json",
    JSON.stringify(results, null, 2),
  );
  console.log(results);
})();
