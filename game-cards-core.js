(function () {
  const G = window.PictoGame = window.PictoGame || {};
  G.STORAGE_KEY = "pictoGameCfgV1";
  G.MM_TO_TEXT_PX = 3;
  G.PREVIEW_SCALE = 4;
  G.PDF_SCALE = 5;
  G.imageCache = new Map();
  G.cards = [];
  G.lastSeed = "";
  G.defaults = {
    count: 6, perCard: 6, layout: "random", shape: "rect", content: "mixed",
    widthMm: 100, heightMm: 70, minSizeMm: 16, maxSizeMm: 28,
    minFontPx: 22, maxFontPx: 38, minRotation: -18, maxRotation: 18,
    itemGapMm: 3, edgePaddingMm: 5,
    fontMode: "random", allowRepeats: false, seed: ""
  };
  G.byId = (id) => document.getElementById(id);
  G.clamp = (n, min, max) => Math.min(max, Math.max(min, n));
  G.lerp = (a, b, t) => a + (b - a) * t;

  G.loadCfg = function () {
    try { return { ...G.defaults, ...(JSON.parse(localStorage.getItem(G.STORAGE_KEY) || "{}")) }; }
    catch (_) { return { ...G.defaults }; }
  };
  G.cfg = G.loadCfg();
  G.saveCfg = function () {
    try { localStorage.setItem(G.STORAGE_KEY, JSON.stringify(G.cfg)); } catch (_) {}
  };

  G.sourceForItem = function (item, index) {
    const picto = item?.pictograms?.[item.current || 0] || null;
    let visualUrl = "";
    if (picto && typeof picto === "object") {
      try { visualUrl = typeof pictoUrl === "function" ? pictoUrl(picto) : (picto.imageUrl || ""); } catch (_) {}
    }
    return {
      id: `result-${index}`,
      word: String(item?.word || picto?.keywords?.[0]?.keyword || "").trim(),
      picto, visualUrl,
      source: picto && typeof picto === "object" && typeof pictoSource === "function" ? pictoSource(picto) : (picto?.source || "none")
    };
  };

  G.currentPool = function () {
    if (typeof items !== "undefined" && Array.isArray(items) && items.length) {
      return items.map(G.sourceForItem).filter((x) => x.word || x.visualUrl);
    }
    const raw = String(G.byId("input-words")?.value || "").trim();
    if (!raw) return [];
    let words = [];
    try { words = typeof parseWords === "function" ? parseWords(raw) : raw.split(/[\s,]+/); }
    catch (_) { words = raw.split(/[\s,]+/); }
    return words.filter(Boolean).map((word, index) => ({ id: `word-${index}`, word, picto: null, visualUrl: "", source: "none" }));
  };

  function xmur3(str) {
    let h = 1779033703 ^ str.length;
    for (let i = 0; i < str.length; i++) {
      h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
      h = h << 13 | h >>> 19;
    }
    return function () {
      h = Math.imul(h ^ (h >>> 16), 2246822507);
      h = Math.imul(h ^ (h >>> 13), 3266489909);
      return (h ^= h >>> 16) >>> 0;
    };
  }
  function mulberry32(a) {
    return function () {
      let t = a += 0x6D2B79F5;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  G.rngFromSeed = function (seed) { const seedFn = xmur3(String(seed)); return mulberry32(seedFn()); };
  G.shuffle = function (arr, rng) {
    const out = arr.slice();
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  };

  G.availableFonts = function () {
    const select = G.byId("fontFamilySelect");
    const fonts = select ? Array.from(select.options).map((o) => o.value).filter(Boolean) : [];
    const current = (typeof cfg !== "undefined" && cfg.fontFamily) ? cfg.fontFamily : "Open Sans";
    if (!fonts.includes(current)) fonts.unshift(current);
    return fonts.length ? fonts : ["Open Sans"];
  };
  G.chooseFont = function (rng) {
    if (G.cfg.fontMode !== "random") return (typeof cfg !== "undefined" && cfg.fontFamily) ? cfg.fontFamily : "Open Sans";
    const fonts = G.availableFonts();
    return fonts[Math.floor(rng() * fonts.length)] || fonts[0];
  };
  G.chooseKind = function (source, rng) {
    if (G.cfg.content === "text") return "text";
    if (G.cfg.content === "visual") return source.visualUrl ? "visual" : "text";
    if (!source.visualUrl) return "text";
    return rng() < 0.5 ? "visual" : "text";
  };

  G.chooseSources = function (pool, count, rng, usage) {
    const chosen = [], usedIds = new Set();
    for (let slot = 0; slot < count; slot++) {
      let candidates = pool.filter((s) => G.cfg.allowRepeats || pool.length <= chosen.length || !usedIds.has(s.id));
      if (!candidates.length) candidates = pool.slice();
      let minUse = Infinity;
      candidates.forEach((s) => { minUse = Math.min(minUse, usage.get(s.id) || 0); });
      const least = candidates.filter((s) => (usage.get(s.id) || 0) === minUse);
      const source = least[Math.floor(rng() * least.length)] || candidates[0];
      chosen.push(source); usedIds.add(source.id);
      usage.set(source.id, (usage.get(source.id) || 0) + 1);
    }
    return chosen;
  };

  G.hexVertices = function (w, h, inset) {
    const m = Math.max(0, inset || 0);
    return [[w*.25+m,m],[w*.75-m,m],[w-m,h*.5],[w*.75-m,h-m],[w*.25+m,h-m],[m,h*.5]];
  };
  G.pointInPolygon = function (x, y, vertices) {
    let inside = false;
    for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
      const [xi, yi] = vertices[i], [xj, yj] = vertices[j];
      const hit = ((yi > y) !== (yj > y)) && (x < (xj-xi)*(y-yi)/((yj-yi)||1e-9)+xi);
      if (hit) inside = !inside;
    }
    return inside;
  };
})();
