(function () {
  const G = window.PictoGame;
  if (!G) return;

  function displayText(word) {
    const raw = String(word || "");
    try { return typeof displayWord === "function" ? displayWord(raw) : raw; }
    catch (_) { return raw; }
  }

  function rotatedBox(w, h, deg) {
    const r = deg * Math.PI / 180;
    const c = Math.abs(Math.cos(r));
    const s = Math.abs(Math.sin(r));
    return { w: w * c + h * s, h: w * s + h * c };
  }

  function rectFor(x, y, w, h, rotation, halo) {
    const box = rotatedBox(w, h, rotation);
    const pad = Math.max(0, halo || 0);
    return {
      left: x - box.w / 2 - pad,
      right: x + box.w / 2 + pad,
      top: y - box.h / 2 - pad,
      bottom: y + box.h / 2 + pad,
      width: box.w + pad * 2,
      height: box.h + pad * 2
    };
  }

  function overlaps(a, b) {
    return !(a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top);
  }

  function insideCardRect(rect, cardW, cardH, margin) {
    if (G.cfg.shape === "rect") {
      return rect.left >= margin && rect.right <= cardW - margin && rect.top >= margin && rect.bottom <= cardH - margin;
    }
    const polygon = G.hexVertices(cardW, cardH, margin);
    return G.pointInPolygon(rect.left, rect.top, polygon) &&
      G.pointInPolygon(rect.right, rect.top, polygon) &&
      G.pointInPolygon(rect.right, rect.bottom, polygon) &&
      G.pointInPolygon(rect.left, rect.bottom, polygon);
  }

  function textBoundsMm(text, family, fontPx) {
    const c = textBoundsMm.canvas || (textBoundsMm.canvas = document.createElement("canvas"));
    const ctx = c.getContext("2d");
    const shown = displayText(text);
    const fontMm = Math.max(1, fontPx / G.MM_TO_TEXT_PX);
    const measureScale = 12;
    const weight = (typeof cfg !== "undefined" && cfg.fontWeight) ? cfg.fontWeight : 600;
    ctx.font = `${weight} ${fontMm * measureScale}px "${family}", sans-serif`;
    const metrics = ctx.measureText(shown || " ");
    const measuredH = ((metrics.actualBoundingBoxAscent || fontMm * measureScale * .8) +
      (metrics.actualBoundingBoxDescent || fontMm * measureScale * .25)) / measureScale;
    return {
      w: Math.max(8, metrics.width / measureScale + 2.5),
      h: Math.max(6, measuredH + 2.5)
    };
  }

  function naturalSizeFor(p, scaleFactor) {
    const factor = Math.max(.2, scaleFactor || 1);
    if (p.kind === "visual") {
      const s = Math.max(5, p.baseVisualSizeMm * factor);
      return { w: s, h: s, visualSizeMm: s, fontPx: p.baseFontPx };
    }
    const fontPx = Math.max(8, Math.round(p.baseFontPx * factor));
    const b = textBoundsMm(p.source.word, p.fontFamily, fontPx);
    return { w: b.w, h: b.h, visualSizeMm: p.baseVisualSizeMm, fontPx };
  }

  function applyNaturalSize(p, scaleFactor) {
    const s = naturalSizeFor(p, scaleFactor);
    p.w = s.w;
    p.h = s.h;
    p.visualSizeMm = s.visualSizeMm;
    p.fontPx = s.fontPx;
  }

  function makePlacement(source, kind, rng, cardIndex, slotIndex) {
    const family = G.chooseFont(rng);
    const fontPx = Math.round(G.lerp(G.cfg.minFontPx, G.cfg.maxFontPx, rng()));
    const visualSizeMm = G.lerp(G.cfg.minSizeMm, G.cfg.maxSizeMm, rng());
    const rotation = G.cfg.layout === "random" ? G.lerp(G.cfg.minRotation, G.cfg.maxRotation, rng()) : 0;
    const p = {
      id: `${cardIndex}-${slotIndex}-${source.id}`,
      source,
      kind,
      fontFamily: family,
      baseFontPx: fontPx,
      baseVisualSizeMm: visualSizeMm,
      fontPx,
      visualSizeMm,
      rotation,
      w: 0,
      h: 0,
      x: 0,
      y: 0
    };
    applyNaturalSize(p, 1);
    return p;
  }

  function fitToRegion(p, maxW, maxH) {
    const safeW = Math.max(4, maxW);
    const safeH = Math.max(4, maxH);
    if (p.kind === "visual") {
      const size = Math.max(5, Math.min(p.baseVisualSizeMm, safeW, safeH));
      p.visualSizeMm = size;
      p.w = size;
      p.h = size;
      p.rotation = 0;
      return;
    }
    let f = G.clamp(p.baseFontPx, 8, G.cfg.maxFontPx);
    let b = textBoundsMm(p.source.word, p.fontFamily, f);
    while ((b.w > safeW || b.h > safeH) && f > 8) {
      f -= 1;
      b = textBoundsMm(p.source.word, p.fontFamily, f);
    }
    p.fontPx = f;
    p.w = Math.min(b.w, safeW);
    p.h = Math.min(b.h, safeH);
    p.rotation = 0;
  }

  function safeGridRect() {
    const W = G.cfg.widthMm;
    const H = G.cfg.heightMm;
    const m = Math.max(2, G.cfg.edgePaddingMm || 0);
    if (G.cfg.shape === "hex") {
      return { x: W * .25 + m, y: m, w: Math.max(10, W * .5 - m * 2), h: Math.max(10, H - m * 2) };
    }
    return { x: m, y: m, w: Math.max(10, W - m * 2), h: Math.max(10, H - m * 2) };
  }

  function placeGrid(list) {
    const region = safeGridRect();
    const gap = Math.max(0, G.cfg.itemGapMm || 0);
    const aspect = region.w / Math.max(1, region.h);
    const cols = Math.max(1, Math.ceil(Math.sqrt(list.length * aspect)));
    const rows = Math.max(1, Math.ceil(list.length / cols));
    const cw = region.w / cols;
    const ch = region.h / rows;
    list.forEach((p, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      p.x = region.x + col * cw + cw / 2;
      p.y = region.y + row * ch + ch / 2;
      fitToRegion(p, Math.max(4, cw - gap * 2), Math.max(4, ch - gap * 2));
    });
  }

  function tryRandomLayout(list, rng, globalScale) {
    const W = G.cfg.widthMm;
    const H = G.cfg.heightMm;
    const margin = Math.max(2, G.cfg.edgePaddingMm || 0);
    const halo = Math.max(0, (G.cfg.itemGapMm || 0) / 2);
    const occupied = [];
    const order = list.slice().sort((a, b) => {
      const da = naturalSizeFor(a, globalScale);
      const db = naturalSizeFor(b, globalScale);
      return (db.w * db.h) - (da.w * da.h);
    });

    for (const p of order) {
      applyNaturalSize(p, globalScale);
      let placed = false;
      for (let attempt = 0; attempt < 750; attempt++) {
        const box = rotatedBox(p.w, p.h, p.rotation);
        const minX = margin + box.w / 2 + halo;
        const maxX = W - margin - box.w / 2 - halo;
        const minY = margin + box.h / 2 + halo;
        const maxY = H - margin - box.h / 2 - halo;
        if (maxX < minX || maxY < minY) break;
        const x = minX + rng() * Math.max(.01, maxX - minX);
        const y = minY + rng() * Math.max(.01, maxY - minY);
        const collision = rectFor(x, y, p.w, p.h, p.rotation, halo);
        if (!insideCardRect(collision, W, H, 0)) continue;
        if (occupied.some((other) => overlaps(collision, other))) continue;
        p.x = x;
        p.y = y;
        p.collisionRect = collision;
        occupied.push(collision);
        placed = true;
        break;
      }
      if (!placed) return false;
    }
    return true;
  }

  function placeRandom(list, rng) {
    const scales = [1, .94, .88, .82, .76, .70, .64, .58, .52];
    for (let round = 0; round < scales.length; round++) {
      const roundSeed = Math.floor(rng() * 0xffffffff);
      const roundRng = G.rngFromSeed(`layout-${roundSeed}-${round}`);
      if (tryRandomLayout(list, roundRng, scales[round])) {
        list.forEach((p) => { delete p.collisionRect; });
        return { fallback: false, scale: scales[round] };
      }
    }

    // Si no cabe una composición aleatoria completa, recoloca TODA la tarjeta
    // en una cuadrícula segura. Nunca mezcla posiciones aleatorias y fallback.
    placeGrid(list);
    return { fallback: true, scale: 1 };
  }

  function placeDomino(list) {
    const W = G.cfg.widthMm;
    const H = G.cfg.heightMm;
    const m = Math.max(4, G.cfg.edgePaddingMm || 0);
    const gap = Math.max(0, G.cfg.itemGapMm || 0);
    const vertical = W >= H;
    list.slice(0, 2).forEach((p, i) => {
      p.rotation = 0;
      if (vertical) {
        const rw = (W - m * 2) / 2;
        p.x = m + rw * (i + .5);
        p.y = H / 2;
        fitToRegion(p, Math.max(4, rw - gap * 2), Math.max(4, H - m * 2 - gap * 2));
      } else {
        const rh = (H - m * 2) / 2;
        p.x = W / 2;
        p.y = m + rh * (i + .5);
        fitToRegion(p, Math.max(4, W - m * 2 - gap * 2), Math.max(4, rh - gap * 2));
      }
    });
  }

  G.buildCards = function (pool, seed) {
    const rng = G.rngFromSeed(seed);
    const cards = [];
    const usage = new Map(pool.map((s) => [s.id, 0]));

    if (G.cfg.layout === "domino") {
      const order = G.shuffle(pool, rng);
      if (order.length < 2) return [];
      for (let i = 0; i < G.cfg.count; i++) {
        const sources = [order[i % order.length], order[(i + 1) % order.length]];
        const placements = sources.map((s, k) => makePlacement(s, G.chooseKind(s, rng), rng, i, k));
        placeDomino(placements);
        cards.push({ index: i, placements, layout: "domino", shape: G.cfg.shape, widthMm: G.cfg.widthMm, heightMm: G.cfg.heightMm, layoutAdjusted: false });
      }
      return cards;
    }

    for (let i = 0; i < G.cfg.count; i++) {
      const sources = G.chooseSources(pool, G.cfg.perCard, rng, usage);
      const placements = sources.map((s, k) => makePlacement(s, G.chooseKind(s, rng), rng, i, k));
      let result = { fallback: false, scale: 1 };
      if (G.cfg.layout === "grid") placeGrid(placements);
      else result = placeRandom(placements, rng);
      cards.push({
        index: i,
        placements,
        layout: G.cfg.layout,
        shape: G.cfg.shape,
        widthMm: G.cfg.widthMm,
        heightMm: G.cfg.heightMm,
        layoutAdjusted: !!result.fallback,
        autoScale: result.scale
      });
    }
    return cards;
  };
})();
