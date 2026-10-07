const fs = require("node:fs");
const path = require("node:path");
const katex = require("katex");
const content = require("./src/content.cjs");
const root = __dirname;
const read = (name) =>
  fs.readFileSync(path.join(root, "src", name), "utf8").replace(/\r\n/g, "\n");
const font = fs
  .readFileSync(path.join(root, "src", "eb-garamond.woff2"))
  .toString("base64");
const math = (tex) =>
  katex.renderToString(tex, {
    output: "mathml",
    displayMode: true,
    throwOnError: true,
  });
const portraits = content.systems
  .map(
    (s, i) =>
      `<article class="portrait"><h2>${s.name}</h2><div class="phase-wrap"><canvas class="phase" data-system="${i}" tabindex="0" role="img" aria-label="${s.name}. ${s.behaviour} Use arrow keys to follow a point, Escape to clear." title="Follow a point: hover, click to keep it, or use the arrow keys."></canvas></div></article>`,
  )
  .join("\n");
const definitions = content.metrics
  .map(
    (m) =>
      `<article class="metric-definition" data-metric="${m.id}"><h3>${m.title}</h3><p class="metric-lead">${m.lead}</p><div class="equation">${math(m.tex)}</div><div class="metric-copy">${[m.description, ...(m.paragraphs || [])].map((p) => `<p class="metric-description">${p}</p>`).join("")}</div></article>`,
  )
  .join("\n");
const rows = content.systems
  .map(
    (s, i) =>
      `<article class="system-row"><div class="condition"><h3>${s.name}</h3><div class="intuition"><p>${s.lead}</p><p>${s.intuition}</p></div><div class="equation">${math(s.tex)}</div>${s.scope ? `<p class="scope">${s.scope}</p>` : ""}${s.after ? `<p>${s.after}</p>` : ""}</div>${content.metrics.map((m) => `<figure class="metric-figure"><figcaption><span>${m.plotTitle || m.title} <i>${m.symbol}</i></span><output id="value-${i}-${m.id}" aria-label="Current ${m.title.toLowerCase()}"></output></figcaption><svg class="metric-plot" id="plot-${i}-${m.id}" role="img" aria-label="${s.name}: ${m.title.toLowerCase()} over 64 steps"></svg></figure>`).join("")}</article>`,
  )
  .join("\n");
const examples = content.systems
  .map((s) => `<p><strong>${s.name}.</strong> ${s.example}</p>`)
  .join("\n");
const html = read("page.html")
  .replace("<!-- PORTRAITS -->", portraits)
  .replace("<!-- METRIC_DEFINITIONS -->", definitions)
  .replace("<!-- SYSTEM_ROWS -->", rows)
  .replace("<!-- MAP_EXAMPLES -->", examples)
  .replace(
    /<div class="([^"]*equation[^"]*)" data-tex="([^"]*)"><\/div>/g,
    (_, cls, tex) => `<div class="${cls}">${math(tex)}</div>`,
  )
  .replace(
    "/* EMBED_STYLE */",
    () =>
      `@font-face{font-family:"EB Garamond";src:url('data:font/woff2;base64,${font}') format('woff2');font-style:normal;font-weight:400 800;font-display:swap}\n${read("site-shell.css").trim()}\n/* Tool-specific styles */\n${read("style.css")}`,
  )
  .replace(
    "/* EMBED_CONTENT */",
    () =>
      `const SCIENCE_CONTENT = ${JSON.stringify(content).replaceAll("<", "\\u003c")};`,
  )
  .replace("/* EMBED_MODEL */", () => read("model.js"))
  .replace("/* EMBED_APP */", () => read("app.js"));
for (const name of [
  "ergodic_hierarchy_visualiser.html",
  "ergodic_hierarchy_visualiser_chacon.html",
])
  fs.writeFileSync(path.join(root, name), html);
fs.mkdirSync(path.join(root, "dist"), { recursive: true });
fs.writeFileSync(path.join(root, "dist", "index.html"), html);
fs.writeFileSync(
  path.join(root, "dist", "EB-GARAMOND-OFL.txt"),
  fs
    .readFileSync(path.join(root, "EB-GARAMOND-OFL.txt"), "utf8")
    .replace(/\r\n/g, "\n"),
);
fs.writeFileSync(path.join(root, "dist", ".nojekyll"), "");
console.log(
  `Built two standalone documents (${Math.round(Buffer.byteLength(html) / 1024)} KiB each).`,
);
