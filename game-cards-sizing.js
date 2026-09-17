(function () {
  const G = window.PictoGame;
  if (!G || typeof G.buildCards !== "function") return;

  function numberOr(value, fallback) {
    const n = parseFloat(value);
    return Number.isFinite(n) ? n : fallback;
  }

  function normalFontSizePx() {
    try { return Math.max(8, numberOr(cfg?.fontSize, 48)); }
    catch (_) { return 48; }
  }

  function normalImageSizeMm() {
    try {
      const list = typeof items !== "undefined" && Array.isArray(items) ? items : [];
      const allLocal = list.length > 0 && list.every((item) => {
        const picto = item?.pictograms?.[item.current || 0];
        return picto && typeof picto === "object" && picto.source === "local";
      });
      if (allLocal) {
        const local = numberOr(cfg?.localImageSize, NaN);
        if (Number.isFinite(local) && local > 0) return local;
      }
      return Math.max(5, numberOr(cfg?.picSize, 50));
    } catch (_) {
      return 50;
    }
  }

  if (G.cfg.fontSizeMode !== "fixed" && G.cfg.fontSizeMode !== "variable") G.cfg.fontSizeMode = "fixed";
  if (G.cfg.imageSizeMode !== "fixed" && G.cfg.imageSizeMode !== "variable") G.cfg.imageSizeMode = "fixed";
  if (!Number.isFinite(parseFloat(G.cfg.fontSizePx))) G.cfg.fontSizePx = normalFontSizePx();
  if (!Number.isFinite(parseFloat(G.cfg.imageSizeMm))) G.cfg.imageSizeMm = normalImageSizeMm();
  G.saveCfg();

  G.normalGameReferenceSizes = function () {
    return { fontSizePx: normalFontSizePx(), imageSizeMm: normalImageSizeMm() };
  };

  function displayText(word) {
    const raw = String(word || "");
    try { return typeof displayWord === "function" ? displayWord(raw) : raw; }
    catch (_) { return raw; }
  }

  function measureTextMm(text, family, fontPx) {
    const canvas = measureTextMm.canvas || (measureTextMm.canvas = document.createElement("canvas"));
    const ctx = canvas.getContext("2d");
    const size = Math.max(1, fontPx / (G.MM_TO_TEXT_PX || 3));
    const measureScale = 12;
    let weight = 600;
    try { weight = parseInt(cfg?.fontWeight, 10) || 600; } catch (_) {}
    ctx.font = `${weight} ${size * measureScale}px "${String(family || "Open Sans").replace(/"/g, "")}", sans-serif`;
    const metrics = ctx.measureText(displayText(text) || " ");
    const height = ((metrics.actualBoundingBoxAscent || size * measureScale * .8) +
      (metrics.actualBoundingBoxDescent || size * measureScale * .25)) / measureScale;
    return { w: Math.max(8, metrics.width / measureScale + 2.5), h: Math.max(6, height + 2.5) };
  }

  function normalizeFixedSizes(cards) {
    const text = [];
    const visual = [];
    cards.forEach((card) => (card.placements || []).forEach((p) => {
      if (p.kind === "text") text.push(p);
      else if (p.kind === "visual") visual.push(p);
    }));

    G.lastUniformFontPx = null;
    G.lastUniformImageMm = null;
    G.lastFontWasAdjusted = false;
    G.lastImageWasAdjusted = false;

    if (G.cfg.fontSizeMode === "fixed" && text.length) {
      const requested = Math.max(7, numberOr(G.cfg.fontSizePx, normalFontSizePx()));
      const applied = Math.max(7, Math.min(requested, ...text.map((p) => numberOr(p.fontPx, requested))));
      text.forEach((p) => {
        p.fontPx = applied;
        p.baseFontPx = applied;
        const b = measureTextMm(p.source?.word || "", p.fontFamily, applied);
        p.w = b.w;
        p.h = b.h;
      });
      G.lastUniformFontPx = applied;
      G.lastFontWasAdjusted = applied < requested - .01;
    }

    if (G.cfg.imageSizeMode === "fixed" && visual.length) {
      const requested = Math.max(2.5, numberOr(G.cfg.imageSizeMm, normalImageSizeMm()));
      const applied = Math.max(2.5, Math.min(requested, ...visual.map((p) => numberOr(p.visualSizeMm, requested))));
      visual.forEach((p) => {
        p.visualSizeMm = applied;
        p.baseVisualSizeMm = applied;
        p.w = applied;
        p.h = applied;
      });
      G.lastUniformImageMm = applied;
      G.lastImageWasAdjusted = applied < requested - .01;
    }
  }

  const previousBuildCards = G.buildCards;
  G.buildCards = function (pool, seed) {
    const oldMinFont = G.cfg.minFontPx;
    const oldMaxFont = G.cfg.maxFontPx;
    const oldMinImage = G.cfg.minSizeMm;
    const oldMaxImage = G.cfg.maxSizeMm;

    if (G.cfg.fontSizeMode === "fixed") {
      const fixedFont = Math.max(7, numberOr(G.cfg.fontSizePx, normalFontSizePx()));
      G.cfg.minFontPx = fixedFont;
      G.cfg.maxFontPx = fixedFont;
    }
    if (G.cfg.imageSizeMode === "fixed") {
      const fixedImage = Math.max(2.5, numberOr(G.cfg.imageSizeMm, normalImageSizeMm()));
      G.cfg.minSizeMm = fixedImage;
      G.cfg.maxSizeMm = fixedImage;
    }

    let cards;
    try {
      cards = previousBuildCards(pool, seed);
    } finally {
      G.cfg.minFontPx = oldMinFont;
      G.cfg.maxFontPx = oldMaxFont;
      G.cfg.minSizeMm = oldMinImage;
      G.cfg.maxSizeMm = oldMaxImage;
    }

    normalizeFixedSizes(cards || []);
    return cards || [];
  };
})();
