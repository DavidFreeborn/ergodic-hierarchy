const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { chromium } = require("playwright");
module.exports = async function (results) {
  const options = { headless: true };
  if (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE)
    options.executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;
  else if (
    !fs.existsSync(chromium.executablePath()) &&
    process.env.LOCALAPPDATA
  ) {
    const folder = path.join(process.env.LOCALAPPDATA, "ms-playwright");
    const cached = fs
      .readdirSync(folder)
      .filter((n) => n.startsWith("chromium_headless_shell-"))
      .sort((a, b) => Number(b.split("-").pop()) - Number(a.split("-").pop()));
    for (const name of cached) {
      const exe = path.join(
        folder,
        name,
        "chrome-headless-shell-win64/chrome-headless-shell.exe",
      );
      if (fs.existsSync(exe)) {
        options.executablePath = exe;
        break;
      }
    }
  }
  const browser = await chromium.launch(options);
  try {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 1100 },
      deviceScaleFactor: 1,
    });
    page.on("pageerror", (e) => results.errors.push(e.message));
    const url = pathToFileURL(
      path.join(__dirname, "../ergodic_hierarchy_visualiser.html"),
    ).href;
    await page.goto(url);
    await page.evaluate(() => document.fonts.ready);
    const state = () => page.evaluate(() => ergodicLab.state);
    assert.equal(await page.locator(".portrait:visible").count(), 6);
    assert.equal(await page.locator(".system-row:visible").count(), 6);
    assert.equal(await page.locator(".metric-plot:visible").count(), 18);
    assert.equal(await page.locator("details").count(), 1);
    assert.equal(await page.locator(".metric-definition").count(), 3);
    assert.equal(
      await page
        .locator(
          ".metric-plot .baseline,.plot-key,.mixing-intro,.condition .example",
        )
        .count(),
      0,
    );
    assert.equal(await page.locator(".entropy-key").count(), 0);
    assert.equal(await page.locator(".map-examples p").count(), 6);
    assert.equal(
      await page
        .locator(
          'a[href="https://plato.stanford.edu/entries/ergodic-hierarchy/"]',
        )
        .count(),
      1,
    );
    assert.equal(
      await page
        .locator(
          ".behaviour,.simulation-note,#measure-title,#hierarchy-title,#exportCSV,#exportSVG",
        )
        .count(),
      0,
    );
    assert.equal(await page.locator("details").getAttribute("open"), null);
    results.interaction.push(
      "Six simulations, eighteen plots, self-contained definitions, examples moved into methodology, no baseline or separate mixing section, Stanford Encyclopedia reference",
    );
    // Reproduce the reported failure: the first RAF timestamp precedes the click handler.
    await page.evaluate(() => {
      const actual = requestAnimationFrame;
      let once = true;
      window.requestAnimationFrame = (cb) =>
        actual((t) => {
          if (cb.name === "frame" && once) {
            once = false;
            cb(t - 100);
          } else cb(t);
        });
    });
    await page.locator("#step").click();
    await page.waitForTimeout(80);
    assert.ok((await state()).time >= 0);
    assert.ok(
      await page
        .locator("canvas")
        .first()
        .evaluate((c) =>
          c
            .getContext("2d")
            .getImageData(0, 0, c.width, c.height)
            .data.some((v) => v > 0),
        ),
    );
    await page.waitForTimeout(1050);
    assert.equal((await state()).time, 1);
    await page.locator("#step").click();
    await page.waitForTimeout(250);
    assert.ok((await state()).time > 1 && (await state()).time < 2);
    await page.waitForTimeout(850);
    assert.equal((await state()).time, 2);
    await page.locator("#reset").click();
    await page.locator("#play").click();
    await page.waitForTimeout(350);
    const first = (await state()).time;
    await page.waitForTimeout(350);
    assert.ok((await state()).time > first && first > 0);
    await page.locator("#play").click();
    await page.locator("#time").fill("64");
    assert.equal(await page.locator("#step").isDisabled(), true);
    await page.locator("#play").click();
    assert.ok((await state()).time < 1);
    await page.locator("#play").click();
    results.interaction.push(
      "Negative first-frame regression, visible non-ergodic canvas, continuous step/playback, reset, pause and restart",
    );
    await page.locator("#time").fill("3");
    const distinct = await page.evaluate(() => ({
      strong: document.querySelectorAll("canvas")[3].toDataURL(),
      k: document.querySelectorAll("canvas")[4].toDataURL(),
      strongR: ergodicLab.series[3].correlation.join(","),
      kR: ergodicLab.series[4].correlation.join(","),
    }));
    assert.notEqual(distinct.strong, distinct.k);
    assert.notEqual(distinct.strongR, distinct.kR);
    assert.ok(
      (await page.locator(".map-examples p").nth(3).textContent()).includes(
        "not K",
      ),
    );
    assert.ok(
      (await page.locator(".map-examples p").nth(4).textContent()).includes(
        "not Bernoulli",
      ),
    );
    results.interaction.push(
      "Strong mixing and K render different trajectories and curves, with explicit separating examples",
    );
    const imageHashes = [];
    for (const grid of ["1x2", "2x2", "4x4"]) {
      await page.locator("#gridN").selectOption(grid);
      await page.locator("#time").fill("0");
      await page.locator("#mode").selectOption("particles");
      const data = await page.evaluate(() => {
        const p = ergodicLab.partition,
          c = document.querySelector("canvas"),
          rgba = c.getContext("2d").getImageData(0, 0, c.width, c.height).data,
          colours = new Set();
        for (let k = 0; k < rgba.length; k += 4)
          if (rgba[k + 3] === 255)
            colours.add([rgba[k], rgba[k + 1], rgba[k + 2]].join(","));
        return {
          size: p.size,
          labels: new Set(p.labels).size,
          cols: p.cols,
          rows: p.rows,
          painted: ergodicLab.colours.every((hex) =>
            colours.has(
              [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(","),
            ),
          ),
          legend: document.querySelectorAll("#colourKey rect").length,
          memory: ergodicLab.series[0].memory[0],
        };
      });
      const size = grid
        .split("x")
        .map(Number)
        .reduce((a, b) => a * b);
      assert.equal(data.size, size);
      assert.equal(data.labels, size);
      assert.equal(data.legend, size);
      assert.equal(data.painted, true);
      assert.ok(Math.abs(data.memory - 1) < 1e-12);
      imageHashes.push(
        await page
          .locator("canvas")
          .first()
          .evaluate((c) => c.toDataURL()),
      );
      await page.locator("#time").fill("13");
      for (const display of ["particles", "cells"]) {
        await page.locator("#mode").selectOption(display);
        assert.equal((await state()).grid, grid);
        assert.equal((await state()).mode, display);
        assert.ok(
          await page
            .locator("canvas")
            .first()
            .evaluate((c) =>
              c
                .getContext("2d")
                .getImageData(0, 0, c.width, c.height)
                .data.some((v) => v > 0),
            ),
        );
      }
    }
    assert.equal(new Set(imageHashes).size, 3);
    const plottedState = () =>
      page.evaluate(() => ({
        states: ergodicLab.model.all[1][13].slice(0, 8).join(","),
        series: ergodicLab.series[1],
        paths: [
          ...document.querySelectorAll(
            ".system-row:nth-child(2) .metric-plot path",
          ),
        ].map((p) => p.getAttribute("d")),
      }));
    await page.locator("#gridN").selectOption("1x2");
    const original = await plottedState();
    assert.ok(
      await page.evaluate(() =>
        ergodicLab.series.every((v, i) =>
          v.correlation.every(
            (r, n) =>
              Math.abs(r - ergodicLab.model.correlation(i).values[n]) < 1e-12,
          ),
        ),
      ),
    );
    await page.locator("#gridN").selectOption("4x4");
    const changed = await plottedState();
    assert.equal(original.states, changed.states);
    for (const metric of ["correlation", "memory", "error"])
      assert.notDeepEqual(original.series[metric], changed.series[metric]);
    assert.notDeepEqual(original.paths, changed.paths);
    assert.ok(
      await page.evaluate(() =>
        ergodicLab.systems.every((_, i) =>
          ["correlation", "memory", "error"].every(
            (id) =>
              Math.abs(
                Number(
                  document.getElementById(`value-${i}-${id}`).textContent,
                ) - ergodicLab.series[i][id][13],
              ) <= 0.0051,
          ),
        ),
      ),
    );
    await page.locator("#gridN").selectOption("1x2");
    assert.deepEqual((await plottedState()).series, original.series);
    await page.locator("#gridN").selectOption("4x4");
    await page.locator("#time").fill("13.8");
    assert.ok(
      await page.evaluate(() =>
        ["correlation", "memory", "error"].every(
          (id) =>
            Math.abs(
              Number(document.getElementById(`value-1-${id}`).textContent) -
                ergodicLab.series[1][id][13],
            ) <= 0.0051,
        ),
      ),
    );
    await page.locator("#time").fill("13");
    results.interaction.push(
      "Every grid recolours points and cells and updates all three curves; 1×2 equals half-correlation; trajectories are unchanged; caching and integer graph cursors agree",
    );
    await page.locator("#mode").selectOption("particles");
    await page.locator("canvas").first().focus();
    await page.keyboard.press("ArrowRight");
    assert.equal((await state()).tracking, 1);
    await page.keyboard.press("Escape");
    assert.equal((await state()).tracking, null);
    const point = await page.evaluate(() => {
      const c = document.querySelector("canvas"),
        r = c.getBoundingClientRect(),
        a = ergodicLab.model.positions(0, ergodicLab.state.time, true);
      return { x: r.left + a[0] * r.width, y: r.top + (1 - a[1]) * r.height };
    });
    await page.mouse.move(point.x, point.y);
    assert.equal((await state()).tracking, 0);
    await page.mouse.click(point.x, point.y);
    await page.mouse.move(10, 10);
    assert.equal((await state()).tracking, 0);
    assert.equal((await state()).locked, true);
    await page.screenshot({
      path: path.join(__dirname, "partition-tracking.png"),
    });
    results.interaction.push(
      "Mouse and keyboard tracking retain a bold shared highlight",
    );
    const before = await page
      .locator("canvas")
      .first()
      .evaluate((c) => c.getBoundingClientRect().width);
    await page.locator("#fullscreen").click();
    await page.waitForFunction(() => !!document.fullscreenElement);
    const screen = await page.evaluate(() => ({
      w: document.querySelector("canvas").getBoundingClientRect().width,
      heights: [...document.querySelectorAll(".portrait")].map(
        (c) => c.getBoundingClientRect().bottom,
      ),
      h: innerHeight,
      overflow:
        document.fullscreenElement.scrollWidth >
        document.fullscreenElement.clientWidth,
    }));
    assert.ok(Math.abs(before - screen.w) < 1);
    assert.ok(screen.heights.every((y) => y < screen.h));
    assert.equal(screen.overflow, false);
    await page.screenshot({
      path: path.join(__dirname, "partition-fullscreen.png"),
    });
    await page.locator("#fullscreen").click();
    await page.waitForFunction(() => !document.fullscreenElement);
    await page.evaluate(() => {
      document.getElementById("instrument").requestFullscreen = () =>
        Promise.reject(new Error("Simulated embedded-browser restriction"));
    });
    await page.locator("#fullscreen").click();
    await page.waitForFunction(() =>
      document.querySelector("#instrument.expanded"),
    );
    assert.ok(
      Math.abs(
        before -
          (await page
            .locator("canvas")
            .first()
            .evaluate((c) => c.clientWidth)),
      ) < 1,
    );
    assert.equal(
      await page.locator(".measurement-section").evaluate((e) => e.inert),
      true,
    );
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(60);
    assert.equal(
      await page
        .locator("#instrument")
        .evaluate((e) => e.scrollWidth > e.clientWidth),
      false,
    );
    await page.keyboard.press("Escape");
    assert.equal(await page.locator("#instrument.expanded").count(), 0);
    assert.equal(
      await page.locator(".measurement-section").evaluate((e) => e.inert),
      false,
    );
    await page.setViewportSize({ width: 1440, height: 1100 });
    results.interaction.push(
      "Full screen shows all six at unchanged size in 1440×1100; viewport fallback works when native full screen is unavailable",
    );
    await page.locator("canvas").first().focus();
    await page.keyboard.press("Escape");
    await page.locator("#time").fill("3");
    for (const [name, width, height, dpr] of [
      ["desktop", 1440, 1100, 1],
      ["tablet", 768, 1024, 1],
      ["mobile", 390, 844, 1],
      ["small-mobile", 320, 700, 1],
      ["zoom-200-equivalent", 720, 550, 2],
    ]) {
      await page.setViewportSize({ width, height });
      if (dpr === 2) {
        const cdp = await page.context().newCDPSession(page);
        await cdp.send("Emulation.setDeviceMetricsOverride", {
          width,
          height,
          deviceScaleFactor: dpr,
          mobile: false,
        });
      }
      await page.waitForTimeout(100);
      const dims = await page.evaluate(() => ({
        viewport: innerWidth,
        document: document.documentElement.scrollWidth,
        canvas: [...document.querySelectorAll("canvas")].map((c) => ({
          w: c.clientWidth,
          h: c.clientHeight,
        })),
      }));
      assert.ok(dims.document <= dims.viewport, `${name} horizontal overflow`);
      for (const c of dims.canvas) assert.ok(Math.abs(c.w - c.h) < 2);
      const overflow = await page.evaluate(() =>
        [...document.querySelectorAll("math mi, math mn, math mo, math mtext")]
          .filter((e) => {
            const a = e.getBoundingClientRect(),
              b = e.closest(".equation").getBoundingClientRect();
            return (
              a.width > 0 && (a.right > b.right + 2 || a.left < b.left - 2)
            );
          })
          .map((e) => e.textContent),
      );
      assert.deepEqual(overflow, [], `${name}: clipped mathematical symbols`);
      assert.ok(
        await page.locator(".metric-plot").evaluateAll((es) =>
          es.every((e) => {
            const start = e.querySelector(".series").getPointAtLength(0).x;
            const axis = Number(e.querySelector(".origin").getAttribute("x1"));
            const tick = Number(
              e.querySelector(".step-tick").getAttribute("x1"),
            );
            const label = Number(
              e.querySelector(".step-label").getAttribute("x"),
            );
            return (
              start === axis &&
              axis === tick &&
              tick === label &&
              e.querySelector(".step-label").textContent === "0"
            );
          }),
        ),
        `${name}: curves must start at the step-zero axis and tick`,
      );
      assert.equal(
        await page.locator(".equation mtable").count(),
        0,
        `${name}: multiline equation`,
      );
      assert.ok(
        await page
          .locator(".equation")
          .evaluateAll((es) =>
            es.every((e) => e.scrollWidth <= e.clientWidth + 1),
          ),
        `${name}: equation needs scrolling`,
      );
      await page.evaluate(() => scrollTo(0, 0));
      await page.screenshot({
        path: path.join(__dirname, `partition-${name}-top.png`),
      });
      await page.locator(".measurement-section").scrollIntoViewIfNeeded();
      await page.screenshot({
        path: path.join(__dirname, `partition-${name}-metrics.png`),
      });
      await page.locator(".system-row").nth(2).scrollIntoViewIfNeeded();
      await page.screenshot({
        path: path.join(__dirname, `partition-${name}-mixing.png`),
      });
      await page.locator(".method summary").click();
      assert.ok(await page.locator(".references").isVisible());
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
      );
      await page.locator(".method summary").click();
      results.layouts.push({ name, ...dims });
    }
    const reduced = await browser.newPage({
      viewport: { width: 390, height: 844 },
      reducedMotion: "reduce",
    });
    await reduced.goto(url);
    assert.equal(await reduced.evaluate(() => ergodicLab.state.playing), false);
    await reduced.keyboard.press("Tab");
    assert.equal(
      await reduced.evaluate(() => document.activeElement.className),
      "skip",
    );
    await reduced.locator("#step").focus();
    await reduced.keyboard.press("Enter");
    assert.equal(await reduced.evaluate(() => ergodicLab.state.time), 1);
    await reduced.locator("#time").focus();
    await reduced.keyboard.press("ArrowRight");
    assert.equal(await reduced.evaluate(() => ergodicLab.state.time), 2);
    assert.equal(
      await reduced
        .locator("#time")
        .evaluate((e) => getComputedStyle(e).outlineWidth),
      "2px",
    );
    results.interaction.push(
      "Reduced motion, keyboard transport, skip link, visible focus and one accessible methodology disclosure",
    );
    assert.deepEqual(results.errors, []);
    assert.equal(
      fs.readFileSync(
        path.join(__dirname, "../ergodic_hierarchy_visualiser.html"),
        "utf8",
      ),
      fs.readFileSync(
        path.join(__dirname, "../ergodic_hierarchy_visualiser_chacon.html"),
        "utf8",
      ),
    );
    results.browser = await browser.version();
    results.passed = true;
    fs.writeFileSync(
      path.join(__dirname, "results.json"),
      JSON.stringify(results, null, 2),
    );
    console.log(
      JSON.stringify(
        {
          passed: true,
          numerical: results.numerical,
          interaction: results.interaction,
          layouts: results.layouts.map((x) => x.name),
          browser: results.browser,
        },
        null,
        2,
      ),
    );
  } finally {
    await browser.close();
  }
};
