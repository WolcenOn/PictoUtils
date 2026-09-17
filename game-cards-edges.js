(function () {
  const G = window.PictoGame;
  if (!G || typeof G.buildCards !== "function") return;

  const baseBuildCards = G.buildCards;

  function displayText(word) {
    const raw = String(word || "");
    try { return typeof displayWord === "function" ? displayWord(raw) : raw; }
    catch (_) { return raw; }
  }

  function textBoundsMm(text, family, fontPx) {
    const canvas = textBoundsMm.canvas || (textBoundsMm.canvas = document.createElement("canvas"));
    const ctx = canvas.getContext("2d");
    const shown = displayText(text);
    const fontMm = Math.max(1, fontPx / G.MM_TO_TEXT_PX);
    const scale = 12;
    const weight = (typeof cfg !== "undefined" && cfg.fontWeight) ? cfg.fontWeight : 600;
    ctx.font = `${weight} ${fontMm * scale}px "${family}", sans-serif`;
    const metrics = ctx.measureText(shown || " ");
    const height = ((metrics.actualBoundingBoxAscent || fontMm * scale * .8) +
      (metrics.actualBoundingBoxDescent || fontMm * scale * .25)) / scale;
    return { w: Math.max(8, metrics.width / scale + 2.5), h: Math.max(6, height + 2.5) };
  }

  function rotatedBox(w, h, deg) {
    const r = deg * Math.PI / 180;
    const c = Math.abs(Math.cos(r));
    const s = Math.abs(Math.sin(r));
    return { w: w * c + h * s, h: w * s + h * c };
  }

  function rectFor(p, halo) {
    const box = rotatedBox(p.w, p.h, p.rotation || 0);
    const pad = Math.max(0, halo || 0);
    return {
      left: p.x - box.w / 2 - pad,
      right: p.x + box.w / 2 + pad,
      top: p.y - box.h / 2 - pad,
      bottom: p.y + box.h / 2 + pad
    };
  }

  function overlaps(a, b) {
    return !(a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top);
  }

  function normalizeReadableAngle(deg) {
    let a = deg;
    while (a > 180) a -= 360;
    while (a <= -180) a += 360;
    if (a > 90) a -= 180;
    if (a < -90) a += 180;
    return a;
  }

  function edgesFromVertices(vertices) {
    return vertices.map((a, i) => {
      const b = vertices[(i + 1) % vertices.length];
      const dx = b[0] - a[0], dy = b[1] - a[1];
      const length = Math.max(.001, Math.hypot(dx, dy));
      const ux = dx / length, uy = dy / length;
      return {
        x1: a[0], y1: a[1], x2: b[0], y2: b[1],
        ux, uy, nx: -uy, ny: ux, length,
        angle: normalizeReadableAngle(Math.atan2(dy, dx) * 180 / Math.PI)
      };
    });
  }

  function ovalEdges(w, h, segments) {
    const n = Math.max(8, Math.min(28, segments || 12));
    const vertices = [];
    for (let i = 0; i < n; i++) {
      const t = -Math.PI / 2 + (Math.PI * 2 * i / n);
      vertices.push([w / 2 + (w / 2) * Math.cos(t), h / 2 + (h / 2) * Math.sin(t)]);
    }
    return edgesFromVertices(vertices);
  }

  function shapeEdges(shape, w, h, itemCount) {
    if (shape === "hex") return edgesFromVertices(G.hexVertices(w, h, 0));
    if (shape === "oct") return edgesFromVertices(G.octVertices(w, h, 0));
    if (shape === "oval") return ovalEdges(w, h, Math.max(12, itemCount * 2));
    return edgesFromVertices([[0, 0], [w, 0], [w, h], [0, h]]);
  }

  function distributeCounts(totalItems, edges) {
    const counts = new Array(edges.length).fill(0);
    if (!totalItems || !edges.length) return counts;

    if (totalItems < edges.length) {
      for (let i = 0; i < totalItems; i++) {
        const idx = Math.floor((i + .5) * edges.length / totalItems) % edges.length;
        counts[idx]++;
      }
      return counts;
    }

    counts.fill(1);
    let remaining = totalItems - edges.length;
    while (remaining-- > 0) {
      let best = 0, bestScore = -Infinity;
      for (let i = 0; i < edges.length; i++) {
        const score = edges[i].length / (counts[i] + 1);
        if (score > bestScore) { bestScore = score; best = i; }
      }
      counts[best]++;
    }
    return counts;
  }

  function fitPlacement(p, maxAlong, maxAcross) {
    const along = Math.max(4, maxAlong);
    const across = Math.max(4, maxAcross);
    if (p.kind === "visual") {
      const size = Math.max(3, Math.min(p.baseVisualSizeMm || p.visualSizeMm || 12, along, across));
      p.visualSizeMm = size;
      p.w = size;
      p.h = size;
      return;
    }

    let fontPx = Math.max(8, Math.round(p.baseFontPx || p.fontPx || 18));
    let bounds = textBoundsMm(p.source?.word || "", p.fontFamily || "Open Sans", fontPx);
    while ((bounds.w > along || bounds.h > across) && fontPx > 8) {
      fontPx--;
      bounds = textBoundsMm(p.source?.word || "", p.fontFamily || "Open Sans", fontPx);
    }
    p.fontPx = fontPx;
    p.w = Math.min(bounds.w, along);
    p.h = Math.min(bounds.h, across);
  }

  function shrinkPlacement(p, factor) {
    const f = Math.max(.6, Math.min(.95, factor || .9));
    if (p.kind === "visual") {
      const size = Math.max(3, (p.visualSizeMm || p.w || 10) * f);
      p.visualSizeMm = size;
      p.w = size;
      p.h = size;
      return;
    }
    const fontPx = Math.max(8, Math.floor((p.fontPx || 8) * f));
    const b = textBoundsMm(p.source?.word || "", p.fontFamily || "Open Sans", fontPx);
    p.fontPx = fontPx;
    p.w = b.w;
    p.h = b.h;
  }

  function placeOneOnEdge(p, edge, slotIndex, slotCount, occupied, shape, W, H) {
    const gap = Math.max(0, G.cfg.itemGapMm || 0);
    const edgePad = Math.max(0, G.cfg.edgePaddingMm || 0);
    const halo = gap / 2;
    const vertexPad = Math.min(edge.length * .22, Math.max(3, gap * 1.3));
    const usableLength = Math.max(6, edge.length - vertexPad * 2);
    const slotLength = usableLength / Math.max(1, slotCount);
    const maxAcross = Math.max(7, Math.min(W, H) * .34);

    p.rotation = edge.angle;
    fitPlacement(p, Math.max(4, slotLength - gap), maxAcross);

    const distance = vertexPad + slotLength * (slotIndex + .5);
    const bx = edge.x1 + edge.ux * distance;
    const by = edge.y1 + edge.uy * distance;

    for (let shrinkRound = 0; shrinkRound < 8; shrinkRound++) {
      const baseOffset = edgePad + p.h / 2 + halo;
      const maxPush = Math.max(baseOffset, Math.min(W, H) * .32);
      for (let push = baseOffset; push <= maxPush; push += 1.25) {
        p.x = bx + edge.nx * push;
        p.y = by + edge.ny * push;
        const rect = rectFor(p, halo);
        const inside = typeof G.rectInsideShape === "function"
          ? G.rectInsideShape(rect, W, H, 0, shape)
          : true;
        if (!inside) continue;
        if (occupied.some((other) => overlaps(rect, other))) continue;
        occupied.push(rect);
        return true;
      }
      shrinkPlacement(p, .88);
    }
    return false;
  }

  function placeAlongEdges(card, seed) {
    const placements = card.placements || [];
    const W = card.widthMm, H = card.heightMm;
    const edges = shapeEdges(card.shape, W, H, placements.length);
    const counts = distributeCounts(placements.length, edges);
    const rng = G.rngFromSeed(`edge-${seed}-${card.index}`);
    const order = G.shuffle(placements, rng);
    const snapshot = placements.map((p) => ({
      p, x: p.x, y: p.y, w: p.w, h: p.h, rotation: p.rotation,
      fontPx: p.fontPx, visualSizeMm: p.visualSizeMm
    }));
    const occupied = [];
    let cursor = 0;

    for (let edgeIndex = 0; edgeIndex < edges.length; edgeIndex++) {
      const count = counts[edgeIndex];
      for (let slot = 0; slot < count; slot++) {
        const p = order[cursor++];
        if (!p || !placeOneOnEdge(p, edges[edgeIndex], slot, count, occupied, card.shape, W, H)) {
          snapshot.forEach((s) => {
            s.p.x = s.x; s.p.y = s.y; s.p.w = s.w; s.p.h = s.h;
            s.p.rotation = s.rotation; s.p.fontPx = s.fontPx; s.p.visualSizeMm = s.visualSizeMm;
          });
          card.edgeFallback = true;
          card.layoutAdjusted = true;
          card.layout = "edge";
          return false;
        }
      }
    }

    card.edgeFallback = false;
    card.layoutAdjusted = false;
    card.layout = "edge";
    return true;
  }

  G.buildCards = function (pool, seed) {
    if (G.cfg.layout !== "edge") return baseBuildCards(pool, seed);

    const requested = G.cfg.layout;
    let cards;
    try {
      G.cfg.layout = "grid";
      cards = baseBuildCards(pool, seed);
    } finally {
      G.cfg.layout = requested;
    }

    cards.forEach((card) => placeAlongEdges(card, seed));
    return cards;
  };
})();
