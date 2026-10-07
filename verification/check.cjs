const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { chromium } = require("playwright");
const M = require("../src/model.js");
const results = { numerical: [], interaction: [], layouts: [], errors: [] };
function check(name, fn) {
  fn();
  results.numerical.push(name);
}
const m = M.create();
check("Reusable interpolation buffers preserve every coordinate", () => {
  for (let i = 0; i < 6; i++) {
    const buffer = new Float64Array(m.count * 2);
    for (const time of [0.25, 1.5, 31.75, 63.5]) {
      const expected = m.positions(i, time, true);
      const actual = m.positions(i, time, true, buffer);
      assert.equal(actual, buffer);
      assert.deepEqual(actual, expected);
    }
  }
});

check("Reproducible, complete 40 × 35 stratification", () => {
  const again = M.ensemble();
  assert.equal(again.length, 1400);
  assert.deepEqual(again, m.points);
  const cells = new Set(
    m.points.map((p) => Math.floor(p.x * 40) + 40 * Math.floor(p.y * 35)),
  );
  assert.equal(cells.size, 1400);
});
check(
  "All six models share initial states, have distinct trajectories and stay in the unit square",
  () => {
    for (const states of m.all)
      for (let n = 0; n <= 64; n++)
        for (let k = 0; k < m.count; k++) {
          assert.ok(states[n][2 * k] >= 0 && states[n][2 * k] < 1);
          assert.ok(states[n][2 * k + 1] >= 0 && states[n][2 * k + 1] < 1);
          if (n === 0) {
            assert.ok(Math.abs(states[n][2 * k] - m.points[k].x) < 1e-14);
            assert.ok(Math.abs(states[n][2 * k + 1] - m.points[k].y) < 1e-14);
          }
        }
    for (let i = 0; i < 6; i++)
      for (let j = i + 1; j < 6; j++) {
        assert.notEqual(m.all[i], m.all[j]);
        assert.notDeepEqual(m.all[i][1], m.all[j][1]);
      }
  },
);
check("Invariant y coordinates and lower-half correlation R(n) = 1", () => {
  for (let n = 0; n <= 64; n++) {
    assert.ok(Math.abs(m.correlation(0, "y").values[n] - 1) < 1e-12);
    for (let k = 0; k < m.count; k++)
      assert.equal(m.all[0][n][2 * k + 1], m.points[k].y);
  }
});
check(
  "Translation correlations agree with the analytic triangular autocorrelation",
  () => {
    for (const [obs, v] of [
      ["x", Math.SQRT2 - 1],
      ["y", Math.sqrt(3) - 1],
    ])
      for (let n = 0; n <= 64; n++) {
        const d = M.mod1(n * v),
          exact = 1 - 4 * Math.min(d, 1 - d);
        assert.ok(Math.abs(m.correlation(1, obs).values[n] - exact) < 0.065);
      }
  },
);
check(
  "Baker binary coding shifts the correct bit and retains 128 future bits at n = 64",
  () => {
    for (const p of m.points.slice(0, 100)) {
      const [x, y] = M.bakerStep(p.bx, p.by);
      assert.equal(x, (p.bx << 1n) & M.MASK);
      assert.equal(y >> 191n, p.bx >> 191n);
    }
    const arr = m.all[5][64],
      xs = new Set();
    for (let k = 0; k < m.count; k++) xs.add(arr[2 * k]);
    assert.equal(xs.size, 1400);
    assert.ok(M.metrics(arr, m.points, 4).he > 0.99);
    assert.ok(M.metrics(arr, m.points, 4).mi < 0.04);
  },
);
check(
  "Chacon tower heights, mass, recurrence, disjoint levels and closure",
  () => {
    for (const stage of [4, 6, 8]) {
      const t = M.tower(stage);
      assert.equal(t.height, (3 ** (stage + 1) - 1) / 2);
      assert.ok(Math.abs(t.unused - (1 - 3 ** (-stage - 1))) < 1e-12);
      const sorted = [...t.levels].sort((a, b) => a.a - b.a);
      for (let j = 1; j < sorted.length; j++)
        assert.ok(sorted[j].a >= sorted[j - 1].b - 1e-12);
      for (const p of m.points.slice(0, 100))
        assert.ok(Math.abs(t.iterate(p.x, t.height) - p.x) < 1e-12);
    }
  },
);
check(
  "Diagnostic normalisation, exact initial memory and absolute averages",
  () => {
    for (const g of [4, 8, 16])
      assert.ok(Math.abs(M.metrics(m.all[1][0], m.points, g).mi - 1) < 1e-12);
    for (let i = 0; i < 6; i++)
      for (const obs of ["x", "y", "quadrant"]) {
        const c = m.correlation(i, obs);
        assert.ok(Math.abs(c.values[0] - 1) < 1e-12);
        assert.equal(c.average[0], null);
        assert.ok(
          Math.abs(
            c.average[64] -
              c.values.slice(1).reduce((a, b) => a + Math.abs(b), 0) / 64,
          ) < 1e-12,
        );
      }
    assert.equal(M.metrics(m.all[0][0], m.points, 0).mi, null);
  },
);
check(
  "Interpolation preserves exact iterates, invariant height and the natural translation velocity",
  () => {
    for (let i = 0; i < 6; i++)
      for (const n of [0, 1, 13, 63, 64])
        assert.equal(m.positions(i, n, true), m.all[i][n]);
    for (const n of [0, 1, 13, 63])
      for (const u of [0.001, 0.25, 0.75, 0.999]) {
        for (let i = 0; i < 6; i++) {
          const arr = m.positions(i, n + u, true);
          for (const v of arr) assert.ok(v >= 0 && v < 1);
        }
        const shear = m.positions(0, n + u, true),
          translation = m.positions(1, n + u, true);
        for (let k = 0; k < 50; k++) {
          assert.ok(Math.abs(shear[2 * k + 1] - m.points[k].y) < 1e-14);
          for (const [axis, v] of [
            [0, Math.SQRT2 - 1],
            [1, Math.sqrt(3) - 1],
          ])
            assert.ok(
              Math.abs(
                translation[2 * k + axis] -
                  M.mod1(m.all[1][n][2 * k + axis] + u * v),
              ) < 1e-13,
            );
        }
      }
  },
);
check(
  "All graph metrics remain in their theoretical ranges at every grid size and iterate",
  () => {
    for (let i = 0; i < 6; i++)
      for (const arr of m.all[i])
        for (const g of [
          M.partition(m.points, 1, 2),
          M.partition(m.points, 2, 2),
          M.partition(m.points, 4, 4),
        ]) {
          const v = M.metrics(arr, m.points, g);
          assert.ok(v.mi >= -1e-12 && v.mi <= 1 + 1e-12);
          assert.ok(v.he >= 0 && v.he <= 1 + 1e-12);
        }
    for (let i = 0; i < 6; i++)
      for (const r of m.correlation(i).values) assert.ok(r >= -1 && r <= 1);
  },
);
check(
  "Starting-cell labels and current-cell counts use the same rectangular partition",
  () => {
    for (const [cols, rows] of [
      [1, 2],
      [2, 2],
      [4, 4],
    ]) {
      const p = M.partition(m.points, cols, rows);
      assert.equal(new Set(p.labels).size, cols * rows);
      m.points.forEach((point, k) =>
        assert.equal(
          p.labels[k],
          Math.floor(point.y * rows) * cols + Math.floor(point.x * cols),
        ),
      );
      const v = M.metrics(m.all[0][0], m.points, p);
      assert.ok(Math.abs(v.mi - 1) < 1e-12);
      assert.equal(v.bins.length, p.size ** 2);
      for (let cell = 0; cell < p.size; cell++)
        for (let origin = 0; origin < p.size; origin++)
          if (cell !== origin) assert.equal(v.bins[cell * p.size + origin], 0);
    }
    const halves = M.partition(m.points, 1, 2);
    for (const state of m.all[0])
      assert.ok(Math.abs(M.metrics(state, m.points, halves).mi - 1) < 1e-12);
  },
);
check(
  "Memory is one for reversible cell relabelling and zero for independent cell assignments",
  () => {
    const pts = Array.from({ length: 16 }, (_, k) => ({
      x: 0.25 + 0.5 * (Math.floor(k / 4) % 2),
      y: 0.25 + 0.5 * Math.floor(k / 8),
    }));
    const p = M.partition(pts, 2, 2);
    const swapped = Float64Array.from(pts.flatMap((v) => [1 - v.x, 1 - v.y]));
    assert.ok(Math.abs(M.metrics(swapped, pts, p).mi - 1) < 1e-12);
    const independent = Float64Array.from(
      pts.flatMap((_, k) => [
        0.25 + 0.5 * (k % 2),
        0.25 + 0.5 * (Math.floor(k / 2) % 2),
      ]),
    );
    assert.ok(Math.abs(M.metrics(independent, pts, p).mi) < 1e-12);
  },
);
check("A negative frame time clamps safely to the initial state", () => {
  for (let i = 0; i < 6; i++) {
    assert.equal(m.positions(i, -0.05, true), m.all[i][0]);
    assert.equal(m.positions(i, NaN, true), m.all[i][0]);
  }
});
check(
  "Recursive Chacon addresses agree with an independently materialised cutting-and-stacking tower",
  () => {
    const r = M.rankOne("chacon");
    for (let s = 1; s <= 8; s++) {
      const t = M.tower(s);
      assert.equal(r.metadata(s).height, t.height);
      for (let i = 0; i < t.height; i++) {
        assert.ok(Math.abs(r.levelStart(i, s) - t.levels[i].a) < 1e-13);
        assert.equal(r.locate((t.levels[i].a + t.levels[i].b) / 2, s).i, i);
      }
    }
  },
);
check(
  "Staircase addresses, spacer counts, normalisation and restricted-growth parameters",
  () => {
    const r = M.rankOne("staircase");
    let levels = [{ a: 0, b: r.base }],
      width = r.base,
      end = r.base;
    for (let s = 1; s <= 6; s++) {
      const cuts = s + 1,
        w = width / cuts,
        next = [];
      for (let j = 0; j < cuts; j++) {
        for (const L of levels)
          next.push({ a: L.a + j * w, b: L.a + (j + 1) * w });
        for (let spacer = 0; spacer < j; spacer++) {
          next.push({ a: end, b: end + w });
          end += w;
        }
      }
      levels = next;
      width = w;
      const meta = r.metadata(s);
      assert.equal(meta.height, levels.length);
      assert.ok(Math.abs(meta.mass - end) < 1e-12);
      for (let i = 0; i < levels.length; i++) {
        assert.ok(Math.abs(r.levelStart(i, s) - levels[i].a) < 1e-12);
        assert.equal(r.locate((levels[i].a + levels[i].b) / 2, s).i, i);
      }
      const sorted = [...levels].sort((a, b) => a.a - b.a);
      for (let i = 1; i < sorted.length; i++)
        assert.ok(Math.abs(sorted[i].a - sorted[i - 1].b) < 1e-12);
    }
    for (let s = 0; s <= 12; s++) {
      const q = r.metadata(s);
      assert.ok(Math.abs(q.mass - q.height * q.width) < 1e-13);
    }
    const q = r.metadata(12);
    assert.ok(1 - q.mass < 1e-9);
    assert.ok((q.cuts * q.cuts) / q.height < 1e-6);
  },
);
check(
  "Every displayed tower path avoids closure and is unchanged by further refinement",
  () => {
    for (const [name, index] of [
      ["chacon", 2],
      ["staircase", 3],
    ]) {
      const construction = m[name],
        audit = m.towerAudit[name];
      assert.equal(audit.length, 2 * m.count);
      for (let k = 0; k < m.count; k++)
        for (let axis = 0; axis < 2; axis++) {
          const a = audit[2 * k + axis];
          assert.ok(a.index + M.MAX < a.height);
          const deeper = construction.orbit(
            axis ? m.points[k].y : m.points[k].x,
            M.MAX,
            a.stage + 1,
          );
          for (let n = 0; n <= M.MAX; n++)
            assert.ok(
              Math.abs(deeper.values[n] - m.all[index][n][2 * k + axis]) <
                1e-12,
            );
        }
    }
  },
);
check(
  "Kalikow coding follows a fixed scenery and preserves exact revisits",
  () => {
    const raw = (bits, j) =>
      Number((bits >> BigInt(191 - (j > 0 ? 2 * j - 1 : -2 * j))) & 1n);
    let revisits = 0;
    for (const p of m.points.slice(0, 120)) {
      const orbit = M.sceneryOrbit(p.bx, p.by);
      let walk = 0;
      for (let n = 0; n <= 64; n++) {
        assert.equal(orbit.walk[n], walk);
        assert.equal(Math.floor(2 * orbit.values[2 * n]), raw(p.bx, n));
        assert.equal(Math.floor(2 * orbit.values[2 * n + 1]), raw(p.by, walk));
        if (n && walk === 0) {
          assert.equal(orbit.values[2 * n + 1], p.y);
          revisits++;
        }
        if (n < 64) walk += raw(p.bx, n) ? 1 : -1;
      }
    }
    assert.ok(revisits > 100);
    assert.throws(
      () => M.sequenceCoordinate(M.sequenceDigits(m.points[0].bx), 100),
      /Insufficient/,
    );
  },
);
check(
  "Kalikow half-correlation matches the analytic random-walk return probability",
  () => {
    const values = m.correlation(4).values;
    let probability = 1;
    for (let n = 1; n <= 64; n++) {
      if (n % 2 === 0) probability *= (n - 1) / n;
      const expected = n % 2 ? 0 : probability;
      assert.ok(
        Math.abs(values[n] - expected) < 0.075,
        `n=${n}, measured=${values[n]}, expected=${expected}`,
      );
    }
  },
);
check(
  "Product-map animation separates horizontal and vertical updates without changing endpoints",
  () => {
    for (const i of [2, 3])
      for (const n of [0, 3, 31, 63]) {
        const early = m.positions(i, n + 0.25, true),
          late = m.positions(i, n + 0.75, true);
        for (let k = 0; k < m.count; k++) {
          assert.ok(
            Math.abs(early[2 * k + 1] - m.all[i][n][2 * k + 1]) < 1e-13,
          );
          assert.ok(Math.abs(late[2 * k] - m.all[i][n + 1][2 * k]) < 1e-13);
        }
      }
  },
);
check(
  "Cell-return correlation distinguishes identity, permutations and independence at every partition size",
  () => {
    for (const q of [2, 4, 16]) {
      const initial = Uint16Array.from({ length: q * q }, (_, k) =>
        Math.floor(k / q),
      );
      const identical = M.cellMetrics(initial, initial, q);
      assert.equal(identical.correlation, 1);
      assert.ok(Math.abs(identical.mi - 1) < 1e-12);
      const rotated = M.cellMetrics(
        initial.map((c) => (c + 1) % q),
        initial,
        q,
      );
      assert.equal(rotated.correlation, -1 / (q - 1));
      assert.ok(Math.abs(rotated.mi - 1) < 1e-12);
      const independent = M.cellMetrics(
        Uint16Array.from(initial, (_, k) => k % q),
        initial,
        q,
      );
      assert.equal(independent.correlation, 0);
      assert.ok(Math.abs(independent.mi) < 1e-12);
    }
    const fixedOne = M.cellMetrics(
      Uint16Array.of(0, 2, 3, 1),
      Uint16Array.of(0, 1, 2, 3),
      4,
    );
    assert.equal(fixedOne.correlation, 0);
    assert.equal(fixedOne.mi, 1); // R=0 does not imply independence.
    const halves = M.partition(m.points, 1, 2);
    for (let i = 0; i < 6; i++)
      m.all[i].forEach((arr, n) =>
        assert.ok(
          Math.abs(
            M.metrics(arr, m.points, halves).correlation -
              m.correlation(i).values[n],
          ) < 1e-12,
        ),
      );
  },
);
check(
  "Time-average error uses individual histories, includes step zero and vanishes for complete cycles",
  () => {
    const points = Array.from({ length: 4 }, (_, k) => ({
        x: (k + 0.5) / 4,
        y: 0.5,
      })),
      grid = M.partition(points, 4, 1);
    const states = Array.from({ length: 4 }, (_, n) =>
      Float64Array.from(
        points.flatMap((_, k) => [(((k + n) % 4) + 0.5) / 4, 0.5]),
      ),
    );
    const cycle = M.measurementSeries(states, grid);
    [0.75, 0.5, 0.25, 0].forEach((expected, n) =>
      assert.ok(Math.abs(cycle.error[n] - expected) < 1e-12),
    );
    const fixed = M.measurementSeries(
      states.map(() => states[0]),
      grid,
    );
    assert.deepEqual(fixed.error, [0.75, 0.75, 0.75, 0.75]); // The pooled occupancy is uniform throughout.
    for (const [cols, rows] of [
      [1, 2],
      [2, 2],
      [4, 4],
    ]) {
      const p = M.partition(m.points, cols, rows);
      for (let i = 0; i < 6; i++) {
        const curves = M.measurementSeries(m.all[i], p);
        assert.ok(Math.abs(curves.error[0] - (1 - 1 / p.size)) < 1e-12);
        for (const value of curves.error)
          assert.ok(value >= 0 && value <= 1 - 1 / p.size + 1e-12);
        for (const value of curves.correlation)
          assert.ok(value >= -1 / (p.size - 1) - 1e-12 && value <= 1);
        for (const n of [1, 17, 64]) {
          let direct = 0;
          for (let k = 0; k < m.count; k++) {
            const counts = Array(p.size).fill(0);
            for (let j = 0; j <= n; j++) {
              const a = m.all[i][j];
              counts[
                Math.floor(a[2 * k + 1] * rows) * cols +
                  Math.floor(a[2 * k] * cols)
              ]++;
            }
            direct +=
              counts.reduce(
                (sum, v) => sum + Math.abs(v / (n + 1) - 1 / p.size),
                0,
              ) / 2;
          }
          assert.ok(Math.abs(direct / m.count - curves.error[n]) < 1e-12);
        }
        if (i === 0)
          for (const value of curves.error)
            assert.ok(value >= 1 - 1 / rows - 1e-12);
      }
    }
  },
);
require("./browser-check.cjs")(results).catch((e) => {
  console.error(e);
  process.exit(1);
});
