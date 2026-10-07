/* Deterministic numerical model. No drawing or DOM dependencies. */
const ErgodicModel = (() => {
  "use strict";
  const MAX = 64,
    BITS = 192n,
    SCALE = 1n << BITS,
    MASK = SCALE - 1n;
  const mod1 = (x) => ((x % 1) + 1) % 1;
  const toFloat = (x) => Number(x >> 139n) / 9007199254740992;
  function random(seed) {
    let a = seed >>> 0;
    return () => {
      a += 0x6d2b79f5;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return (t ^ (t >>> 14)) >>> 0;
    };
  }
  function ensemble(count = 1400, seed = 917331) {
    const rng = random(seed),
      cols = count === 5600 ? 80 : 40,
      rows = count / cols;
    const bits = () => {
      let b = 0n;
      for (let j = 0; j < 6; j++) b = (b << 32n) | BigInt(rng());
      return b;
    };
    return Array.from({ length: count }, (_, k) => {
      const bx = (BigInt(k % cols) * SCALE + bits()) / BigInt(cols);
      const by = (BigInt(Math.floor(k / cols)) * SCALE + bits()) / BigInt(rows);
      const x = toFloat(bx),
        y = toFloat(by);
      return { x, y, bx, by, label: (x >= 0.5 ? 1 : 0) + (y >= 0.5 ? 2 : 0) };
    });
  }
  function tower(stage) {
    let levels = [{ a: 0, b: 2 / 3, added: 0 }],
      width = 2 / 3,
      unused = 2 / 3;
    const stages = [{ levels, width, height: 1 }];
    for (let s = 1; s <= stage; s++) {
      const w = width / 3,
        cols = [[], [], []];
      for (const L of levels)
        for (let j = 0; j < 3; j++)
          cols[j].push({
            a: L.a + j * w,
            b: L.a + (j + 1) * w,
            added: L.added,
          });
      levels = [
        ...cols[0],
        ...cols[1],
        { a: unused, b: unused + w, added: s },
        ...cols[2],
      ];
      unused += w;
      width = w;
      stages.push({ levels, width, height: levels.length });
    }
    const sorted = levels
      .map((L, i) => ({ ...L, i }))
      .sort((a, b) => a.a - b.a);
    function locate(x) {
      let lo = 0,
        hi = sorted.length;
      while (lo < hi) {
        const m = (lo + hi) >> 1;
        if (sorted[m].a <= x) lo = m + 1;
        else hi = m;
      }
      const z = sorted[lo - 1];
      return z && x < z.b + 1e-14 && x < unused ? z : null;
    }
    function iterate(x, n) {
      const z = locate(x);
      return z ? mod1(levels[(z.i + n) % levels.length].a + (x - z.a)) : x;
    }
    return {
      stage,
      stages,
      levels,
      width,
      height: levels.length,
      unused,
      locate,
      iterate,
    };
  }
  function bakerStep(x, y) {
    return [(x << 1n) & MASK, (y >> 1n) | ((x >> (BITS - 1n)) << (BITS - 1n))];
  }
  // Recursive addresses avoid building or cyclically closing a finite tower.
  // A path is used only when every requested iterate lies below its top.
  function rankOne(kind) {
    if (!["chacon", "staircase"].includes(kind))
      throw new Error("Unknown tower construction");
    const base = kind === "chacon" ? 2 / 3 : 1 / (1 + Math.E / 2);
    const stages = [{ stage: 0, height: 1, width: base, mass: base, cuts: 1 }];
    const prefix = (j) =>
      kind === "chacon" ? (j >= 2 ? 1 : 0) : (j * (j - 1)) / 2;
    const offset = (j, h) => j * h + prefix(j);
    function metadata(stage) {
      while (stages.length <= stage) {
        const s = stages.length,
          p = stages[s - 1],
          cuts = kind === "chacon" ? 3 : s + 1;
        const spacers = kind === "chacon" ? 1 : (cuts * (cuts - 1)) / 2,
          width = p.width / cuts;
        const height = cuts * p.height + spacers;
        if (!Number.isSafeInteger(height))
          throw new Error("Tower address exceeds integer precision");
        stages.push({
          stage: s,
          height,
          width,
          mass: p.mass + spacers * width,
          cuts,
        });
      }
      return stages[stage];
    }
    function locate(x, stage) {
      metadata(stage);
      let i = x < base ? 0 : null,
        a = 0;
      for (let s = 1; s <= stage; s++) {
        const p = stages[s - 1],
          q = stages[s];
        if (x >= q.mass) {
          i = null;
          continue;
        }
        if (x >= p.mass) {
          const spacer = Math.min(
            Math.round((q.mass - p.mass) / q.width) - 1,
            Math.floor((x - p.mass) / q.width),
          );
          const j =
            kind === "chacon"
              ? 1
              : Math.floor((1 + Math.sqrt(1 + 8 * spacer)) / 2);
          i = offset(j, p.height) + p.height + spacer - prefix(j);
          a = p.mass + spacer * q.width;
        } else if (i !== null) {
          const j = Math.max(
            0,
            Math.min(q.cuts - 1, Math.floor((x - a) / q.width)),
          );
          i = offset(j, p.height) + i;
          a += j * q.width;
        }
      }
      return i === null ? null : { i, a, b: a + stages[stage].width };
    }
    function levelStart(index, stage) {
      metadata(stage);
      let a = 0;
      for (let s = stage; s > 0; s--) {
        const p = stages[s - 1],
          q = stages[s];
        let lo = 0,
          hi = q.cuts;
        while (lo + 1 < hi) {
          const j = (lo + hi) >> 1;
          if (offset(j, p.height) <= index) lo = j;
          else hi = j;
        }
        const local = index - offset(lo, p.height);
        if (local >= p.height)
          return a + p.mass + (prefix(lo) + local - p.height) * q.width;
        a += lo * q.width;
        index = local;
      }
      return a;
    }
    function orbit(x, steps = MAX, startStage = kind === "chacon" ? 8 : 6) {
      let stage = startStage,
        z;
      while (true) {
        const q = metadata(stage);
        z = locate(x, stage);
        if (z && z.i + steps < q.height) break;
        stage++;
      }
      const values = new Float64Array(steps + 1),
        residual = x - z.a;
      values[0] = x;
      for (let n = 1; n <= steps; n++)
        values[n] = levelStart(z.i + n, stage) + residual;
      return { values, stage, index: z.i, height: metadata(stage).height };
    }
    return { kind, base, metadata, locate, levelStart, orbit };
  }
  // A real coordinate encodes a two-sided fair-bit sequence in the order
  // 0,+1,-1,+2,-2,... . This is a measure-preserving coding of the square.
  const sequenceIndex = (j) => (j > 0 ? 2 * j - 1 : -2 * j);
  function sequenceDigits(bits) {
    return Uint8Array.from({ length: Number(BITS) }, (_, k) =>
      Number((bits >> BigInt(Number(BITS) - 1 - k)) & 1n),
    );
  }
  function sequenceBit(digits, j) {
    const k = sequenceIndex(j);
    if (k >= digits.length) throw new Error("Insufficient sequence precision");
    return digits[k];
  }
  function sequenceCoordinate(digits, shift) {
    let v = 0;
    for (let k = 0; k < 53; k++) {
      const j = k % 2 ? (k + 1) / 2 : -k / 2;
      v = 2 * v + sequenceBit(digits, j + shift);
    }
    return v / 9007199254740992;
  }
  function sceneryOrbit(bx, by, steps = MAX) {
    const driver = sequenceDigits(bx),
      scenery = sequenceDigits(by),
      values = new Float64Array(2 * (steps + 1)),
      walk = new Int16Array(steps + 1);
    let position = 0;
    for (let n = 0; n <= steps; n++) {
      values[2 * n] = sequenceCoordinate(driver, n);
      values[2 * n + 1] = sequenceCoordinate(scenery, position);
      walk[n] = position;
      if (n < steps) position += sequenceBit(driver, n) ? 1 : -1;
    }
    return { values, walk };
  }
  function create(count = 1400, seed = 917331, stage = 8) {
    const points = ensemble(count, seed),
      chacon = rankOne("chacon"),
      staircase = rankOne("staircase");
    const all = Array.from({ length: 6 }, () =>
      Array.from({ length: MAX + 1 }, () => new Float64Array(count * 2)),
    );
    const towerAudit = { chacon: [], staircase: [] };
    points.forEach((p, k) => {
      const weak = [
        chacon.orbit(p.x, MAX, stage),
        chacon.orbit(p.y, MAX, stage),
      ];
      const strong = [staircase.orbit(p.x), staircase.orbit(p.y)],
        scenery = sceneryOrbit(p.bx, p.by);
      towerAudit.chacon.push(
        ...weak.map((o) => ({
          stage: o.stage,
          index: o.index,
          height: o.height,
        })),
      );
      towerAudit.staircase.push(
        ...strong.map((o) => ({
          stage: o.stage,
          index: o.index,
          height: o.height,
        })),
      );
      let bx = p.bx,
        by = p.by;
      for (let n = 0; n <= MAX; n++) {
        const vals = [
          mod1(p.x + n * (0.071 + 0.11 * p.y)),
          p.y,
          mod1(p.x + n * (Math.SQRT2 - 1)),
          mod1(p.y + n * (Math.sqrt(3) - 1)),
          weak[0].values[n],
          weak[1].values[n],
          strong[0].values[n],
          strong[1].values[n],
          scenery.values[2 * n],
          scenery.values[2 * n + 1],
          toFloat(bx),
          toFloat(by),
        ];
        for (let j = 0; j < 6; j++) {
          all[j][n][2 * k] = vals[2 * j];
          all[j][n][2 * k + 1] = vals[2 * j + 1];
        }
        [bx, by] = bakerStep(bx, by);
      }
    });
    const cache = new Map();
    function correlation(index, observable = "y") {
      const key = index + observable;
      if (cache.has(key)) return cache.get(key);
      const f = (x, y) =>
        observable === "x"
          ? x < 0.5
            ? 1
            : -1
          : observable === "y"
            ? y < 0.5
              ? 1
              : -1
            : x < 0.5 && y < 0.5
              ? 1
              : 0;
      const f0 = points.map((p) => f(p.x, p.y));
      // Half-space signs have mean zero and variance one under uniform area.
      // Their autocorrelation is the average sign product, with no fitted centring.
      const mean =
        observable === "quadrant" ? f0.reduce((a, b) => a + b, 0) / count : 0;
      const variance =
        observable === "quadrant"
          ? f0.reduce((a, b) => a + (b - mean) ** 2, 0) / count
          : 1;
      const values = all[index].map((arr) => {
        let cov = 0;
        for (let k = 0; k < count; k++)
          cov += (f0[k] - mean) * f(arr[2 * k], arr[2 * k + 1]);
        return cov / count / variance;
      });
      let sum = 0;
      const average = values.map((v, n) => {
        if (n === 0) return null;
        sum += Math.abs(v);
        return sum / n;
      });
      const result = { values, average };
      cache.set(key, result);
      return result;
    }
    function positions(index, t, interpolate = false, buffer) {
      t = Number.isFinite(t) ? Math.max(0, Math.min(MAX, t)) : 0;
      const n = Math.min(MAX, Math.floor(t)),
        a = all[index][n];
      if (!interpolate || n === MAX || t === n) return a;
      const b = all[index][n + 1],
        u = t - n,
        out = buffer || new Float64Array(a.length);
      // Linear timing keeps particles moving across iterate boundaries. Translation and
      // shear have natural continuous lifts; other maps use illustrative torus paths.
      for (let k = 0; k < a.length; k++) {
        let d = b[k] - a[k];
        if (index === 0) d = k % 2 ? 0 : 0.071 + 0.11 * a[k + 1];
        else if (index === 1) d = k % 2 ? Math.sqrt(3) - 1 : Math.SQRT2 - 1;
        else {
          if (d > 0.5) d -= 1;
          if (d < -0.5) d += 1;
        }
        // The two product constructions update x, then y. This keeps each
        // cut-and-translate operation visible instead of merging both into a shuffle.
        const fraction =
          index === 2 || index === 3
            ? k % 2
              ? Math.max(0, 2 * u - 1)
              : Math.min(1, 2 * u)
            : u;
        out[k] = mod1(a[k] + fraction * d);
      }
      return out;
    }
    return {
      points,
      all,
      count,
      seed,
      chacon,
      staircase,
      towerAudit,
      correlation,
      positions,
    };
  }
  function partition(points, cols, rows = cols) {
    const cell = (x, y) =>
      Math.min(rows - 1, Math.floor(y * rows)) * cols +
      Math.min(cols - 1, Math.floor(x * cols));
    return {
      cols,
      rows,
      size: cols * rows,
      labels: Uint16Array.from(points, (p) => cell(p.x, p.y)),
      cell,
    };
  }
  function metrics(arr, points, grid) {
    if (!grid) return { mi: null, he: null, bins: [] };
    const p = typeof grid === "number" ? partition(points, grid) : grid;
    const current = Uint16Array.from(points, (_, k) =>
      p.cell(arr[2 * k], arr[2 * k + 1]),
    );
    return cellMetrics(current, p.labels, p.size);
  }
  function cellMetrics(current, initial, cells) {
    const joint = new Uint32Array(cells * cells),
      totals = new Uint32Array(cells),
      labels = new Uint32Array(cells),
      count = initial.length;
    let matches = 0;
    for (let k = 0; k < count; k++) {
      const c = current[k],
        l = initial[k];
      joint[c * cells + l]++;
      totals[c]++;
      labels[l]++;
      if (c === l) matches++;
    }
    let mi = 0,
      h = 0,
      hl = 0;
    for (let l = 0; l < cells; l++) {
      const p = labels[l] / count;
      if (p) hl -= p * Math.log2(p);
    }
    for (let c = 0; c < cells; c++) {
      const pc = totals[c] / count;
      if (pc) h -= pc * Math.log2(pc);
      for (let l = 0; l < cells; l++) {
        const p = joint[c * cells + l] / count;
        if (p) mi += p * Math.log2(p / ((pc * labels[l]) / count));
      }
    }
    return {
      mi: hl ? mi / hl : 0,
      correlation:
        cells > 1 ? ((cells * matches) / count - 1) / (cells - 1) : null,
      he: cells > 1 ? h / Math.log2(cells) : 0,
      bins: joint,
      totals,
    };
  }
  function measurementSeries(states, grid) {
    const count = grid.labels.length,
      q = grid.size,
      visits = new Uint32Array(count * q);
    const result = { correlation: [], memory: [], error: [] };
    states.forEach((arr, n) => {
      const current = Uint16Array.from(grid.labels, (_, k) =>
        grid.cell(arr[2 * k], arr[2 * k + 1]),
      );
      const measured = cellMetrics(current, grid.labels, q);
      result.correlation.push(measured.correlation);
      result.memory.push(measured.mi);
      let error = 0;
      // Take absolute deviations for each orbit BEFORE averaging particles.
      // At step n the history includes n+1 observations, starting at step zero.
      for (let k = 0; k < count; k++) {
        visits[k * q + current[k]]++;
        for (let c = 0; c < q; c++)
          error += Math.abs(visits[k * q + c] / (n + 1) - 1 / q);
      }
      result.error.push(error / (2 * count));
    });
    return result;
  }
  return {
    MAX,
    BITS,
    SCALE,
    MASK,
    mod1,
    toFloat,
    ensemble,
    tower,
    rankOne,
    bakerStep,
    sequenceIndex,
    sequenceDigits,
    sequenceBit,
    sequenceCoordinate,
    sceneryOrbit,
    create,
    partition,
    metrics,
    cellMetrics,
    measurementSeries,
  };
})();
if (typeof module !== "undefined") module.exports = ErgodicModel;
