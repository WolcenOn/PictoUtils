(function () {
  const G = window.PictoGame;
  if (!G || typeof G.renderCard !== "function") return;

  function polygonPath(ctx, vertices) {
    if (!vertices?.length) return;
    ctx.moveTo(vertices[0][0], vertices[0][1]);
    for (let i = 1; i < vertices.length; i++) ctx.lineTo(vertices[i][0], vertices[i][1]);
    ctx.closePath();
  }

  function cardPath(ctx, w, h, shape, radius, inset) {
    const m = Math.max(0, inset || 0);
    ctx.beginPath();
    if (shape === "hex") { polygonPath(ctx, G.hexVertices(w, h, m)); return; }
    if (shape === "oct") { polygonPath(ctx, G.octVertices(w, h, m)); return; }
    if (shape === "oval") {
      ctx.ellipse(w / 2, h / 2, Math.max(.1, w / 2 - m), Math.max(.1, h / 2 - m), 0, 0, Math.PI * 2);
      return;
    }
    const rw = Math.max(0, w - m * 2), rh = Math.max(0, h - m * 2);
    const r = G.clamp((radius || 0) - m, 0, Math.min(rw, rh) / 2);
    if (r > 0 && typeof ctx.roundRect === "function") ctx.roundRect(m, m, rw, rh, r);
    else ctx.rect(m, m, rw, rh);
  }

  async function drawPlacement(ctx, p, scale) {
    ctx.save();
    ctx.translate(p.x * scale, p.y * scale);
    ctx.rotate((p.rotation || 0) * Math.PI / 180);
    if (p.kind === "text") {
      const fontPx = (p.fontPx / (G.MM_TO_TEXT_PX || 3)) * scale;
      const weight = (typeof cfg !== "undefined" && cfg.fontWeight) ? cfg.fontWeight : 600;
      ctx.font = `${weight} ${fontPx}px "${p.fontFamily}", sans-serif`;
      ctx.fillStyle = "#000";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const word = typeof displayWord === "function" ? displayWord(p.source.word) : p.source.word;
      ctx.fillText(word, 0, 0, Math.max(5, p.w * scale));
    } else {
      const img = await G.loadImage(p.source.visualUrl);
      if (img) {
        const box = p.visualSizeMm * scale;
        const ratio = img.naturalWidth && img.naturalHeight ? img.naturalWidth / img.naturalHeight : 1;
        let w = box, h = box;
        if (ratio > 1) h = w / ratio;
        else w = h * ratio;
        ctx.drawImage(img, -w / 2, -h / 2, w, h);
      }
    }
    ctx.restore();
  }

  async function drawArasaacMark(ctx, W, H) {
    if (typeof getArasaacLogoBitmap !== "function") return;
    try {
      const logo = await getArasaacLogoBitmap();
      if (!logo) return;
      const w = W * .11, h = w / (logo.width / logo.height), pad = Math.max(3, W * .012), x = pad, y = H - h - pad;
      ctx.save();
      ctx.globalAlpha = .9;
      ctx.fillStyle = "rgba(255,255,255,.82)";
      ctx.fillRect(x - pad / 2, y - pad / 2, w + pad, h + pad);
      ctx.drawImage(logo, x, y, w, h);
      ctx.restore();
    } catch (_) {}
  }

  G.renderCard = async function (card, scale) {
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(card.widthMm * scale));
    c.height = Math.max(1, Math.round(card.heightMm * scale));
    const ctx = c.getContext("2d"), W = c.width, H = c.height;
    const radiusMm = (typeof cfg !== "undefined" && Number.isFinite(parseFloat(cfg.cardRadiusMm))) ? parseFloat(cfg.cardRadiusMm) : 0;
    const radius = card.shape === "rect" ? radiusMm * scale : 0;
    const bg = (typeof cfg !== "undefined" && cfg.bgColor) ? cfg.bgColor : "#fff";
    const border = (typeof cfg !== "undefined" && cfg.borderColor) ? cfg.borderColor : "#000";
    const borderMm = (typeof cfg !== "undefined" && Number.isFinite(parseFloat(cfg.borderWidthMm))) ? parseFloat(cfg.borderWidthMm) : 1.5;
    const borderPx = Math.max(0, borderMm * scale);
    const strokeInset = borderPx > 0 ? borderPx / 2 + .35 : .35;

    ctx.clearRect(0, 0, W, H);
    cardPath(ctx, W, H, card.shape, radius, strokeInset);
    ctx.fillStyle = bg;
    ctx.fill();

    ctx.save();
    cardPath(ctx, W, H, card.shape, radius, strokeInset);
    ctx.clip();

    if (typeof G.drawGameCardTexture === "function") await G.drawGameCardTexture(ctx, W, H, scale);
    if (typeof G.drawGameOverlayText === "function") G.drawGameOverlayText(ctx, W, H, scale, "behind");

    if (card.layout === "domino") {
      ctx.save();
      ctx.strokeStyle = border;
      ctx.lineWidth = Math.max(1, borderPx * .65);
      ctx.beginPath();
      if (card.widthMm >= card.heightMm) { ctx.moveTo(W / 2, 0); ctx.lineTo(W / 2, H); }
      else { ctx.moveTo(0, H / 2); ctx.lineTo(W, H / 2); }
      ctx.stroke();
      ctx.restore();
    }

    for (const p of card.placements) await drawPlacement(ctx, p, scale);
    if (typeof G.drawGameOverlayText === "function") G.drawGameOverlayText(ctx, W, H, scale, "above");
    if (card.placements.some((p) => p.kind === "visual" && p.source.source === "arasaac")) await drawArasaacMark(ctx, W, H);
    ctx.restore();

    if (borderPx > 0) {
      ctx.save();
      cardPath(ctx, W, H, card.shape, radius, strokeInset);
      ctx.strokeStyle = border;
      ctx.lineWidth = Math.max(1, borderPx);
      ctx.stroke();
      ctx.restore();
    }
    return c;
  };
})();
