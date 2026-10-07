(() => {
  "use strict";
  const M = ErgodicModel,
    model = M.create(),
    { systems, metrics } = SCIENCE_CONTENT;
  const $ = (id) => document.getElementById(id),
    canvases = [...document.querySelectorAll(".phase")];
  const palettes = {
    "1x2": ["#0068cf", "#db4a00"],
    "2x2": ["#0068cf", "#db4a00", "#008754", "#bd168a"],
    "4x4": [
      "#0068cf",
      "#db4a00",
      "#008754",
      "#bd168a",
      "#5438a9",
      "#967300",
      "#007f93",
      "#b5283f",
      "#315618",
      "#a15bd2",
      "#0c3986",
      "#8b3d12",
      "#16836c",
      "#d24172",
      "#687500",
      "#74465b",
    ],
  };
  const partitions = Object.fromEntries(
    Object.keys(palettes).map((key) => [
      key,
      M.partition(model.points, ...key.split("x").map(Number)),
    ]),
  );
  const groupedPoints = Object.fromEntries(
    Object.entries(partitions).map(([key, p]) => {
      const groups = Array.from({ length: p.size }, () => []);
      p.labels.forEach((label, k) => groups[label].push(k));
      return [key, groups];
    }),
  );
  const positionBuffers = systems.map(() => new Float64Array(model.count * 2));
  const cellBuffers = systems.map(() => ({
    bins: new Uint32Array(256),
    totals: new Uint32Array(16),
  }));
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const cache = new Map(),
    views = [],
    latest = [];
  let time = 0,
    playing = false,
    animation = null,
    previous = 0,
    raf = 0,
    grid = "2x2",
    mode = "particles";
  let tracking = null,
    locked = false,
    currentN = -1;
  const inertBefore = new Map();
  function seriesFor(g) {
    if (cache.has(g)) return cache.get(g);
    const values = systems.map((_, i) =>
      M.measurementSeries(model.all[i], partitions[g]),
    );
    cache.set(g, values);
    return values;
  }
  let series = seriesFor(grid);
  const ns = "http://www.w3.org/2000/svg";
  function el(tag, attrs = {}, text = "") {
    const e = document.createElementNS(ns, tag);
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
    if (text) e.textContent = text;
    return e;
  }
  function plotGeometry(width = 300) {
    const W = Math.max(180, Math.round(width)),
      H = Math.round(W * 0.72),
      l = 34,
      r = W - 12,
      t = 12,
      b = H - 37;
    return {
      W,
      H,
      l,
      r,
      t,
      b,
      x: (n) => l + (n / 64) * (r - l),
      y: (v, id) => b - (id === "correlation" ? (v + 1) / 2 : v) * (b - t),
    };
  }
  function makePlot(svg, i, id, width) {
    const g = plotGeometry(width);
    svg.replaceChildren();
    svg.setAttribute("viewBox", `0 0 ${g.W} ${g.H}`);
    svg.append(
      el(
        "title",
        {},
        `${systems[i].name}: ${metrics.find((m) => m.id === id).title}. Horizontal axis: step n, 0 to 64.`,
      ),
    );
    svg.append(
      el(
        "desc",
        {},
        id === "memory"
          ? "Fraction of starting-cell information recovered from the current cell alone. One means full recovery; zero means no information."
          : id === "error"
            ? "Mean of individual particles’ time-average errors, including steps 0 through n. Zero means equal time in every cell."
            : "Excess return to the same grid cell: 1 means all return, 0 is the independent uniform return rate.",
      ),
    );
    const ticks = id === "correlation" ? [-1, 0, 1] : [0, 0.5, 1];
    for (const v of ticks) {
      const y = g.y(v, id);
      svg.append(
        el("line", {
          x1: g.l,
          y1: y,
          x2: g.r,
          y2: y,
          class: v === 0 ? "zero" : "axis",
        }),
      );
      svg.append(
        el(
          "text",
          { x: g.l - 7, y: y + 4, "text-anchor": "end" },
          String(v).replace("-", "−"),
        ),
      );
    }
    svg.append(
      el("line", { x1: g.l, y1: g.t, x2: g.l, y2: g.b, class: "axis origin" }),
    );
    for (const n of [0, 32, 64]) {
      svg.append(
        el("line", {
          x1: g.x(n),
          y1: g.b,
          x2: g.x(n),
          y2: g.b + 4,
          class: "axis step-tick",
        }),
      );
      svg.append(
        el(
          "text",
          {
            x: g.x(n),
            y: g.b + 18,
            "text-anchor": "middle",
            class: "step-label",
          },
          String(n),
        ),
      );
    }
    svg.append(
      el(
        "text",
        { x: (g.l + g.r) / 2, y: g.b + 33, "text-anchor": "middle" },
        "Step n",
      ),
    );
    const path = (values) =>
      values
        .map(
          (v, n) =>
            `${n ? "L" : "M"}${g.x(n).toFixed(2)},${g.y(v, id).toFixed(2)}`,
        )
        .join(" ");
    const d = path(series[i][id]);
    svg.append(el("path", { d, class: "series" }));
    const cursor = el("line", { y1: g.t, y2: g.b, class: "cursor" }),
      point = el("circle", { r: 3, class: "current" });
    svg.append(cursor, point);
    return { svg, i, id, g, cursor, point };
  }
  function buildPlots() {
    views.length = 0;
    systems.forEach((_, i) =>
      metrics.forEach((m) => {
        const svg = $(`plot-${i}-${m.id}`);
        views.push(makePlot(svg, i, m.id, svg.getBoundingClientRect().width));
      }),
    );
    updateGraphs(true);
  }
  function updateGraphs(force = false) {
    const n = Math.min(M.MAX, Math.floor(time + 1e-8));
    if (n === currentN && !force) return;
    currentN = n;
    for (const v of views) {
      const value = series[v.i][v.id][n],
        x = v.g.x(n);
      v.cursor.setAttribute("x1", x);
      v.cursor.setAttribute("x2", x);
      v.point.setAttribute("cx", x);
      v.point.setAttribute("cy", v.g.y(value, v.id));
      $(`value-${v.i}-${v.id}`).textContent = (Math.abs(value) < 0.005 ? 0 : value).toFixed(2);
    }
  }
  function drawGrid(ctx, w) {
    const { cols, rows } = partitions[grid];
    ctx.strokeStyle = "#aeb5bb";
    ctx.lineWidth = 0.65;
    ctx.beginPath();
    for (let j = 0; j <= cols; j++) {
      const x = 0.5 + ((w - 1) * j) / cols;
      ctx.moveTo(x, 0.5);
      ctx.lineTo(x, w - 0.5);
    }
    for (let j = 0; j <= rows; j++) {
      const y = 0.5 + ((w - 1) * j) / rows;
      ctx.moveTo(0.5, y);
      ctx.lineTo(w - 0.5, y);
    }
    ctx.stroke();
  }
  function drawKey() {
    const svg = $("colourKey"),
      { cols, rows } = partitions[grid];
    svg.replaceChildren();
    svg.setAttribute("viewBox", "0 0 40 40");
    svg.append(
      el(
        "title",
        {},
        "Each colour marks a particle’s starting cell. Columns × rows.",
      ),
    );
    palettes[grid].forEach((colour, j) =>
      svg.append(
        el("rect", {
          x: ((j % cols) * 40) / cols,
          y: ((rows - 1 - Math.floor(j / cols)) * 40) / rows,
          width: 40 / cols,
          height: 40 / rows,
          fill: colour,
          stroke: "#fff",
          "stroke-width": 0.6,
        }),
      ),
    );
  }
  function draw() {
    const partition = partitions[grid],
      colours = palettes[grid];
    canvases.forEach((canvas, i) => {
      const w = canvas.getBoundingClientRect().width,
        dpr = Math.min(3, devicePixelRatio || 1),
        px = Math.round(w * dpr);
      if (!px) return;
      if (canvas.width !== px || canvas.height !== px) {
        canvas.width = px;
        canvas.height = px;
      }
      const ctx = canvas.getContext("2d");
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, w);
      const arr = model.positions(
        i,
        time,
        !reduced.matches,
        positionBuffers[i],
      );
      latest[i] = arr;
      if (mode === "particles") {
        drawGrid(ctx, w);
        const radius = Math.max(1.35, Math.min(2.1, w / 195));
        // All categories use the same opaque circle; colour alone records origin.
        for (let label = 0; label < partition.size; label++) {
          ctx.fillStyle = colours[label];
          ctx.beginPath();
          for (const k of groupedPoints[grid][label]) {
            const x = arr[2 * k] * w,
              y = (1 - arr[2 * k + 1]) * w;
            ctx.moveTo(x + radius, y);
            ctx.arc(x, y, radius, 0, 2 * Math.PI);
          }
          ctx.fill();
        }
      } else {
        const { cols, rows, size } = partition,
          data = cellBuffers[i],
          cw = w / cols,
          ch = w / rows;
        data.bins.fill(0);
        data.totals.fill(0);
        for (let k = 0; k < model.count; k++) {
          const cell = partition.cell(arr[2 * k], arr[2 * k + 1]);
          data.bins[cell * size + partition.labels[k]]++;
          data.totals[cell]++;
        }
        for (let cy = 0; cy < rows; cy++)
          for (let cx = 0; cx < cols; cx++) {
            const cell = cy * cols + cx,
              total = data.totals[cell];
            let x = cx * cw;
            for (let label = 0; label < size; label++) {
              const width = total
                ? (cw * data.bins[cell * size + label]) / total
                : 0;
              ctx.fillStyle = colours[label];
              ctx.fillRect(x, (rows - 1 - cy) * ch, width, ch);
              x += width;
            }
          }
        drawGrid(ctx, w);
      }
      if (tracking !== null) {
        const x = arr[2 * tracking] * w,
          y = (1 - arr[2 * tracking + 1]) * w;
        ctx.beginPath();
        ctx.arc(x, y, 10, 0, 2 * Math.PI);
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 7;
        ctx.stroke();
        ctx.strokeStyle = "#161616";
        ctx.lineWidth = 3.5;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, 2 * Math.PI);
        ctx.fillStyle = colours[partition.labels[tracking]];
        ctx.fill();
      }
    });
    $("time").value = time;
    $("tread").value = Number.isInteger(time) ? String(time) : time.toFixed(1);
    $("step").disabled = time >= M.MAX;
    $("play").textContent = playing ? "Pause" : "Play";
    updateGraphs();
  }
  function stop() {
    playing = false;
    animation = null;
    cancelAnimationFrame(raf);
    raf = 0;
    previous = 0;
  }
  function frame(now) {
    if (!previous) previous = now;
    const dt = Math.max(0, Math.min(0.1, (now - previous) / 1000));
    previous = now;
    // A frame timestamp may precede the input handler's performance.now().
    // Clamp elapsed time before it can request an invalid negative iterate.
    if (animation) {
      const u = Math.max(
        0,
        Math.min(1, (now - animation.start) / animation.duration),
      );
      time = animation.from + (animation.to - animation.from) * u;
      if (u === 1) {
        time = animation.to;
        animation = null;
      }
    } else if (playing)
      time = Math.min(M.MAX, time + dt * Number($("speed").value));
    if (time >= M.MAX) playing = false;
    draw();
    if (playing || animation) raf = requestAnimationFrame(frame);
    else {
      raf = 0;
      previous = 0;
    }
  }
  function startFrames() {
    if (!raf) {
      previous = 0;
      raf = requestAnimationFrame(frame);
    }
  }
  $("play").addEventListener("click", () => {
    if (playing) stop();
    else {
      animation = null;
      if (time >= M.MAX) time = 0;
      playing = true;
      startFrames();
    }
    draw();
  });
  $("step").addEventListener("click", () => {
    stop();
    const target = Math.min(M.MAX, Math.floor(time + 1e-7) + 1);
    if (reduced.matches) time = target;
    else {
      animation = {
        from: time,
        to: target,
        start: performance.now(),
        duration: 1000,
      };
      startFrames();
    }
    draw();
  });
  $("reset").addEventListener("click", () => {
    stop();
    time = 0;
    draw();
  });
  $("time").addEventListener("input", () => {
    stop();
    time = Number($("time").value);
    draw();
  });
  $("time").addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      stop();
      time = Math.max(
        0,
        Math.min(M.MAX, Math.round(time) + (e.key === "ArrowRight" ? 1 : -1)),
      );
      draw();
    }
  });
  $("gridN").addEventListener("change", () => {
    grid = $("gridN").value;
    series = seriesFor(grid);
    drawKey();
    buildPlots();
    draw();
  });
  $("mode").addEventListener("change", () => {
    mode = $("mode").value;
    draw();
  });
  $("fullscreen").addEventListener("click", async () => {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
      return;
    }
    if ($("instrument").classList.contains("expanded")) {
      setExpanded(false);
      return;
    }
    $("instrument").style.setProperty(
      "--phase-size",
      `${canvases[0].getBoundingClientRect().width}px`,
    );
    try {
      await $("instrument").requestFullscreen();
    } catch {
      setExpanded(true);
    }
  });
  function screenLabel() {
    const on =
      !!document.fullscreenElement ||
      $("instrument").classList.contains("expanded");
    $("fullscreen").textContent = on ? "Exit full screen" : "Full screen";
    $("fullscreen").setAttribute("aria-pressed", String(on));
    draw();
  }
  function setExpanded(on) {
    $("instrument").classList.toggle("expanded", on);
    document.body.classList.toggle("expanded-view", on);
    if (on) {
      for (const node of document.querySelectorAll(
        ".page > :not(#instrument),.tool-navigation,.skip",
      )) {
        inertBefore.set(node, node.inert);
        node.inert = true;
      }
    } else {
      for (const [node, inert] of inertBefore) node.inert = inert;
      inertBefore.clear();
    }
    $("fullscreen").focus();
    screenLabel();
  }
  document.addEventListener("fullscreenchange", screenLabel);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && $("instrument").classList.contains("expanded"))
      setExpanded(false);
  });
  function nearest(canvas, event, i) {
    const rect = canvas.getBoundingClientRect(),
      x = (event.clientX - rect.left) / rect.width,
      y = 1 - (event.clientY - rect.top) / rect.height,
      arr = latest[i];
    let result = null,
      best = (15 / rect.width) ** 2;
    for (let k = 0; k < model.count; k++) {
      const d = (arr[2 * k] - x) ** 2 + (arr[2 * k + 1] - y) ** 2;
      if (d < best) {
        best = d;
        result = k;
      }
    }
    return result;
  }
  canvases.forEach((canvas, i) => {
    canvas.addEventListener("pointermove", (e) => {
      if (locked || e.pointerType === "touch") return;
      const next = nearest(canvas, e, i);
      if (next !== tracking) {
        tracking = next;
        draw();
      }
    });
    canvas.addEventListener("pointerleave", () => {
      if (!locked) {
        tracking = null;
        draw();
      }
    });
    canvas.addEventListener("click", (e) => {
      const picked = nearest(canvas, e, i);
      if (locked && picked === tracking) {
        locked = false;
        tracking = null;
      } else {
        tracking = picked;
        locked = picked !== null;
      }
      draw();
    });
    canvas.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        tracking = null;
        locked = false;
      } else if (
        ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)
      ) {
        e.preventDefault();
        tracking =
          ((tracking ?? 0) +
            (["ArrowLeft", "ArrowDown"].includes(e.key) ? -1 : 1) +
            model.count) %
          model.count;
        locked = true;
      } else return;
      draw();
      $("status").textContent =
        tracking === null
          ? "Point tracking cleared."
          : `Following point ${tracking + 1} in all six maps.`;
    });
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      stop();
      draw();
    }
  });
  // Fit complete formulas to the available width; preserve native, accessible MathML.
  const equations = [...document.querySelectorAll(".equation")];
  function fitEquation(e) {
    const math = e.querySelector("math");
    if (!math || !e.clientWidth) return;
    math.style.fontSize = "1em";
    let scale = 1;
    for (let attempt = 0; attempt < 6; attempt++) {
      const bounds = math.getBoundingClientRect();
      const right = Math.max(
        bounds.right,
        ...[...math.querySelectorAll("mi,mn,mo,mtext")].map(
          (t) => t.getBoundingClientRect().right,
        ),
      );
      const width = right - bounds.left;
      if (width <= e.clientWidth - 1) break;
      scale *= (e.clientWidth - 3) / width;
      math.style.fontSize = `${scale}em`;
    }
  }
  const equationWidths = new WeakMap();
  const equationObserver = new ResizeObserver((entries) => {
    for (const { target, contentRect } of entries) {
      if (equationWidths.get(target) !== contentRect.width) {
        equationWidths.set(target, contentRect.width);
        fitEquation(target);
      }
    }
  });
  equations.forEach((e) => {
    fitEquation(e);
    equationObserver.observe(e);
  });
  document.fonts.ready.then(() => equations.forEach(fitEquation));
  window.addEventListener("resize", () => equations.forEach(fitEquation));
  let resizeFrame = 0;
  new ResizeObserver(() => {
    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(() => {
      buildPlots();
      draw();
    });
  }).observe($("portraits"));
  window.ergodicLab = {
    model,
    systems,
    get state() {
      return { time, playing, grid, mode, tracking, locked };
    },
    get partition() {
      return partitions[grid];
    },
    get colours() {
      return palettes[grid];
    },
    get series() {
      return series;
    },
  };
  drawKey();
  buildPlots();
  draw();
})();
