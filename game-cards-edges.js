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

  function normalizeAngle(deg) {
    let a = deg;
    while (a > 180) a -= 360;
    while (a <= -180) a += 360;
    return a;
  }

  function orientedRect(p, halo) {
    const pad = Math.max(0, halo || 0);
    const hx = Math.max(.1, p.w / 2 + pad);
    const hy = Math.max(.1, p.h / 2 + pad);
    const r = (p.rotation || 0) * Math.PI / 180;
    const ax = { x: Math.cos(r), y: Math.sin(r) };
    const ay = { x: -Math.sin(r), y: Math.cos(r) };
    const corners = [
      { x: p.x + ax.x * hx + ay.x * hy, y: p.y + ax.y * hx + ay.y * hy },
      { x: p.x - ax.x * hx + ay.x * hy, y: p.y - ax.y * hx + ay.y * hy },
      { x: p.x - ax.x * hx - ay.x * hy, y: p.y - ax.y * hx - ay.y * hy },
      { x: p.x + ax.x * hx - ay.x * hy, y: p.y + ax.y * hx - ay.y * hy }
    ];
    return { corners, axes: [ax, ay] };
  }

  function project(corners, axis) {
    let min = Infinity, max = -Infinity;
    for (const p of corners) {
      const value = p.x * axis.x + p.y * axis.y;
      min = Math.min(min, value);
      max = Math.max(max, value);
    }
    return { min, max };
  }

  function obbOverlaps(a, b) {
    const axes = [a.axes[0], a.axes[1], b.axes[0], b.axes[1]];
    for (const axis of axes) {
      const pa = project(a.corners, axis);
      const pb = project(b.corners, axis);
      if (pa.max <= pb.min || pb.max <= pa.min) return false;
    }
    return true;
  }

  function pointInsideShape(x, y, W, H, shape) {
    if (shape === "rect") return x >= 0 && x <= W && y >= 0 && y <= H;
    if (shape === "oval") return typeof G.pointInEllipse === "function" ? G.pointInEllipse(x, y, W, H, 0) : true;
    const vertices = shape === "oct" ? G.octVertices(W, H, 0) : G.hexVertices(W, H, 0);
    return typeof G.pointInPolygon === "function" ? G.pointInPolygon(x, y, vertices) : true;
  }

  function obbInsideShape(obb, W, H, shape) {
    return obb.corners.every((p) => pointInsideShape(p.x, p.y, W, H, shape));
  }

  function edgesFromVertices(vertices, W, H) {
    const cx = W / 2, cy = H / 2;
    return vertices.map((a, i) => {
      const b = vertices[(i + 1) % vertices.length];
      const dx = b[0] - a[0], dy = b[1] - a[1];
      const length = Math.max(.001, Math.hypot(dx, dy));
      const ux = dx / length, uy = dy / length;
      let nx = -uy, ny = ux;
      const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
      if ((cx - mx) * nx + (cy - my) * ny < 0) {
        nx *= -1;
        ny *= -1;
      }
      // El eje Y local del elemento apunta hacia su "parte de abajo".
      // Elegimos el ángulo para que ese eje apunte SIEMPRE hacia fuera,
      // es decir, hacia el borde exterior de la tarjeta.
      const outwardAngle = normalizeAngle(Math.atan2(nx, -ny) * 180 / Math.PI);
      return {
        x1: a[0], y1: a[1], x2: b[0], y2: b[1],
        ux, uy, nx, ny, length, angle: outwardAngle
      };
    });
  }

  function ovalEdges(w, h, segments) {
    const n = Math.max(8, Math.min(32, segments || 12));
    const vertices = [];
    for (let i = 0; i < n; i++) {
      const t = -Math.PI / 2 + Math.PI * 2 * i / n;
      vertices.push([w / 2 + w / 2 * Math.cos(t), h / 2 + h / 2 * Math.sin(t)]);
    }
    return edgesFromVertices(vertices, w, h);
  }

  function shapeEdges(shape, w, h, itemCount) {
    if (shape === "hex") return edgesFromVertices(G.hexVertices(w, h, 0), w, h);
    if (shape === "oct") return edgesFromVertices(G.octVertices(w, h, 0), w, h);
    if (shape === "oval") return ovalEdges(w, h, Math.max(12, itemCount * 2));
    return edgesFromVertices([[0, 0], [w, 0], [w, h], [0, h]], w, h);
  }

  function distributeCounts(totalItems, edges) {
    const counts = new Array(edges.length).fill(0);
    if (!totalItems || !edges.length) return counts;
    if (totalItems <= edges.length) {
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

  function fitPlacement(p, maxAlong, maxAcross, scaleFactor) {
    const factor = Math.max(.35, Math.min(1, scaleFactor || 1));
    const along = Math.max(4, maxAlong);
    const across = Math.max(4, maxAcross);
    if (p.kind === "visual") {
      const base = (p.baseVisualSizeMm || p.visualSizeMm || 12) * factor;
      const size = Math.max(3, Math.min(base, along, across));
      p.visualSizeMm = size;
      p.w = size;
      p.h = size;
      return;
    }
    let fontPx = Math.max(8, Math.round((p.baseFontPx || p.fontPx || 18) * factor));
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
    const f = Math.max(.55, Math.min(.95, factor || .9));
    if (p.kind === "visual") {
      const size = Math.max(2.5, (p.visualSizeMm || p.w || 10) * f);
      p.visualSizeMm = size;
      p.w = size;
      p.h = size;
      return;
    }
    const fontPx = Math.max(7, Math.floor((p.fontPx || 8) * f));
    const b = textBoundsMm(p.source?.word || "", p.fontFamily || "Open Sans", fontPx);
    p.fontPx = fontPx;
    p.w = b.w;
    p.h = b.h;
  }

  function placeOneOnEdge(p, edge, slotIndex, slotCount, occupied, shape, W, H, scaleFactor) {
    const gap = Math.max(0, G.cfg.itemGapMm || 0);
    const edgePad = Math.max(0, G.cfg.edgePaddingMm || 0);
    const halo = gap / 2;
    const vertexPad = Math.min(edge.length * .16, Math.max(2, gap));
    const usableLength = Math.max(5, edge.length - vertexPad * 2);
    const slotLength = usableLength / Math.max(1, slotCount);
    const maxAcross = Math.max(7, Math.min(W, H) * .36);

    p.rotation = edge.angle;
    fitPlacement(p, Math.max(4, slotLength - gap), maxAcross, scaleFactor);

    const distance = vertexPad + slotLength * (slotIndex + .5);
    const bx = edge.x1 + edge.ux * distance;
    const by = edge.y1 + edge.uy * distance;

    for (let shrinkRound = 0; shrinkRound < 10; shrinkRound++) {
      const baseOffset = edgePad + p.h / 2 + halo;
      const maxPush = Math.max(baseOffset, Math.min(W, H) * .40);
      for (let push = baseOffset; push <= maxPush; push += 1) {
        p.x = bx + edge.nx * push;
        p.y = by + edge.ny * push;
        const obb = orientedRect(p, halo);
        if (!obbInsideShape(obb, W, H, shape)) continue;
        if (occupied.some((other) => obbOverlaps(obb, other))) continue;
        occupied.push(obb);
        return true;
      }
      shrinkPlacement(p, .88);
    }
    return false;
  }

  function snapshotPlacements(placements) {
    return placements.map((p) => ({
      p, x: p.x, y: p.y, w: p.w, h: p.h, rotation: p.rotation,
      fontPx: p.fontPx, visualSizeMm: p.visualSizeMm
    }));
  }

  function restoreSnapshot(snapshot) {
    snapshot.forEach((s) => {
      s.p.x = s.x; s.p.y = s.y; s.p.w = s.w; s.p.h = s.h;
      s.p.rotation = s.rotation; s.p.fontPx = s.fontPx; s.p.visualSizeMm = s.visualSizeMm;
    });
  }

  function tryPlaceAlongEdges(card, seed, scaleFactor) {
    const placements = card.placements || [];
    const W = card.widthMm, H = card.heightMm;
    const edges = shapeEdges(card.shape, W, H, placements.length);
    const counts = distributeCounts(placements.length, edges);
    const rng = G.rngFromSeed(`edge-${seed}-${card.index}`);
    const order = G.shuffle(placements, rng);
    const occupied = [];
    let cursor = 0;

    for (let edgeIndex = 0; edgeIndex < edges.length; edgeIndex++) {
      const count = counts[edgeIndex];
      for (let slot = 0; slot < count; slot++) {
        const p = order[cursor++];
        if (!p || !placeOneOnEdge(p, edges[edgeIndex], slot, count, occupied, card.shape, W, H, scaleFactor)) return false;
      }
    }
    return true;
  }

  function placeAlongEdges(card, seed) {
    const snapshot = snapshotPlacements(card.placements || []);
    const scales = [1, .94, .88, .82, .76, .70, .64, .58, .52, .46];

    for (const scale of scales) {
      restoreSnapshot(snapshot);
      if (tryPlaceAlongEdges(card, seed, scale)) {
        card.edgeFallback = false;
        card.layoutAdjusted = scale < 1;
        card.edgeScale = scale;
        card.layout = "edge";
        return true;
      }
    }

    restoreSnapshot(snapshot);
    card.edgeFallback = true;
    card.layoutAdjusted = true;
    card.layout = "edge";
    return false;
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
