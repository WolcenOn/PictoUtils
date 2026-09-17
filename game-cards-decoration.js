(function () {
  const G = window.PictoGame;
  if (!G) return;

  const defaults = {
    textureEnabled: false,
    textureFit: "cover",
    textureScalePercent: 110,
    textureOpacityPercent: 100,
    textureOffsetXmm: 0,
    textureOffsetYmm: 0,
    textureRotation: 0,
    textureDistribution: "balanced",
    textureCardContentMode: "layout",
    overlayTextEnabled: false,
    overlayText: "",
    overlayTextPosition: "center",
    overlayTextLayer: "behind",
    overlayTextSizePx: 48,
    overlayTextColor: "#000000",
    overlayTextOpacityPercent: 28,
    overlayTextRotation: 0,
    overlayTextOffsetXmm: 0,
    overlayTextOffsetYmm: 0,
    overlayTextFontFamily: ""
  };

  Object.entries(defaults).forEach(([key, value]) => {
    if (G.cfg[key] === undefined || G.cfg[key] === null) G.cfg[key] = value;
  });

  G.textureLibrary = Array.isArray(G.textureLibrary) ? G.textureLibrary : [];
  G.saveCfg();

  function num(value, fallback) {
    const n = parseFloat(value);
    return Number.isFinite(n) ? n : fallback;
  }

  function isImageFile(file) {
    if (!file) return false;
    if (String(file.type || "").startsWith("image/")) return true;
    return /\.(png|jpe?g|webp|gif|bmp|svg|avif)$/i.test(file.name || "");
  }

  function fileKey(file) {
    return `${file.name || ""}|${file.size || 0}|${file.lastModified || 0}`;
  }

  G.addGameTextureFiles = function (files) {
    const incoming = Array.from(files || []).filter(isImageFile);
    if (!incoming.length) return 0;
    const existing = new Set(G.textureLibrary.map((entry) => entry.key));
    let added = 0;
    incoming.forEach((file) => {
      const key = fileKey(file);
      if (existing.has(key)) return;
      existing.add(key);
      G.textureLibrary.push({
        id: `texture-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        key,
        name: file.name || `Textura ${G.textureLibrary.length + 1}`,
        url: URL.createObjectURL(file)
      });
      added++;
    });
    if (added) {
      G.cfg.textureEnabled = true;
      G.saveCfg();
    }
    return added;
  };

  G.clearGameTextures = function () {
    G.textureLibrary.forEach((entry) => {
      if (entry?.url?.startsWith("blob:")) {
        try { URL.revokeObjectURL(entry.url); } catch (_) {}
      }
    });
    G.textureLibrary = [];
    G.cfg.textureEnabled = false;
    G.saveCfg();
  };

  G.removeGameTexture = function (id) {
    const index = G.textureLibrary.findIndex((entry) => entry.id === id);
    if (index < 0) return false;
    const [entry] = G.textureLibrary.splice(index, 1);
    if (entry?.url?.startsWith("blob:")) {
      try { URL.revokeObjectURL(entry.url); } catch (_) {}
    }
    if (!G.textureLibrary.length) G.cfg.textureEnabled = false;
    G.saveCfg();
    return true;
  };

  function coverOrContainSize(iw, ih, W, H, mode, zoom) {
    const fit = mode === "contain"
      ? Math.min(W / Math.max(1, iw), H / Math.max(1, ih))
      : Math.max(W / Math.max(1, iw), H / Math.max(1, ih));
    return { w: iw * fit * zoom, h: ih * fit * zoom };
  }

  async function drawTile(ctx, img, W, H, zoom) {
    const iw = Math.max(1, img.naturalWidth || img.width || 1);
    const ih = Math.max(1, img.naturalHeight || img.height || 1);
    const shortSide = Math.max(12, Math.min(W, H) * .32 * zoom);
    const ratio = iw / ih;
    let tw = shortSide, th = shortSide;
    if (ratio >= 1) tw = th * ratio;
    else th = tw / ratio;
    tw = Math.max(4, tw); th = Math.max(4, th);
    const span = Math.hypot(W, H) * 1.4;
    for (let y = -span; y <= span; y += th) {
      for (let x = -span; x <= span; x += tw) ctx.drawImage(img, x, y, tw, th);
    }
  }

  G.drawGameCardTexture = async function (ctx, card, W, H, scale) {
    if (!G.cfg.textureEnabled || typeof G.loadImage !== "function") return;
    const url = card?.texture?.url || G.textureLibrary[0]?.url || "";
    if (!url) return;
    const img = await G.loadImage(url);
    if (!img) return;

    const opacity = G.clamp(num(G.cfg.textureOpacityPercent, 100) / 100, 0, 1);
    const zoom = G.clamp(num(G.cfg.textureScalePercent, 110) / 100, .1, 5);
    const angle = num(G.cfg.textureRotation, 0) * Math.PI / 180;
    const offsetX = num(G.cfg.textureOffsetXmm, 0) * scale;
    const offsetY = num(G.cfg.textureOffsetYmm, 0) * scale;
    const mode = ["cover", "contain", "stretch", "tile"].includes(G.cfg.textureFit) ? G.cfg.textureFit : "cover";

    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.translate(W / 2 + offsetX, H / 2 + offsetY);
    ctx.rotate(angle);

    if (mode === "tile") {
      await drawTile(ctx, img, W, H, zoom);
    } else {
      const iw = Math.max(1, img.naturalWidth || img.width || 1);
      const ih = Math.max(1, img.naturalHeight || img.height || 1);
      let dw, dh;
      if (mode === "stretch") {
        dw = W * zoom;
        dh = H * zoom;
      } else {
        const size = coverOrContainSize(iw, ih, W, H, mode, zoom);
        dw = size.w; dh = size.h;
      }
      ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);
    }
    ctx.restore();
  };

  G.drawGameOverlayText = function (ctx, W, H, scale, layer) {
    if (!G.cfg.overlayTextEnabled) return;
    if ((G.cfg.overlayTextLayer || "behind") !== layer) return;
    const text = String(G.cfg.overlayText || "").trim();
    if (!text) return;

    const opacity = G.clamp(num(G.cfg.overlayTextOpacityPercent, 28) / 100, 0, 1);
    const sizePx = G.clamp(num(G.cfg.overlayTextSizePx, 48), 7, 240);
    const fontCanvasPx = (sizePx / (G.MM_TO_TEXT_PX || 3)) * scale;
    const family = String(G.cfg.overlayTextFontFamily || ((typeof cfg !== "undefined" && cfg.fontFamily) ? cfg.fontFamily : "Open Sans")).replace(/"/g, "");
    const weight = (typeof cfg !== "undefined" && cfg.fontWeight) ? cfg.fontWeight : 600;
    const color = G.cfg.overlayTextColor || "#000000";
    const position = G.cfg.overlayTextPosition || "center";
    const baseY = position === "top" ? H * .22 : position === "bottom" ? H * .78 : H / 2;
    const x = W / 2 + num(G.cfg.overlayTextOffsetXmm, 0) * scale;
    const y = baseY + num(G.cfg.overlayTextOffsetYmm, 0) * scale;
    const angle = num(G.cfg.overlayTextRotation, 0) * Math.PI / 180;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.globalAlpha = opacity;
    ctx.fillStyle = color;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `${weight} ${fontCanvasPx}px "${family}", sans-serif`;
    ctx.fillText(text, 0, 0, Math.max(10, W * .82));
    ctx.restore();
  };

  function assignTextures(cards, seed) {
    cards.forEach((card) => { card.texture = null; });
    if (!G.cfg.textureEnabled || !G.textureLibrary.length) return;
    const rng = G.rngFromSeed(`textures-${seed}`);
    const mode = G.cfg.textureDistribution === "random" ? "random" : "balanced";
    const order = G.shuffle(G.textureLibrary, rng);
    cards.forEach((card, index) => {
      const entry = mode === "random"
        ? G.textureLibrary[Math.floor(rng() * G.textureLibrary.length)]
        : order[index % order.length];
      if (entry) card.texture = { id: entry.id, name: entry.name, url: entry.url };
    });
  }

  function assignForeground(cards, pool, seed) {
    const mode = G.cfg.textureCardContentMode || "layout";
    cards.forEach((card) => { card.textureForegroundSource = null; });
    if (mode !== "word" && mode !== "visual") return;
    const candidates = pool.filter((source) => mode === "visual" ? !!source.visualUrl : !!String(source.word || "").trim());
    if (!candidates.length) return;
    const rng = G.rngFromSeed(`texture-content-${seed}`);
    const order = G.shuffle(candidates, rng);
    cards.forEach((card, index) => { card.textureForegroundSource = order[index % order.length]; });
  }

  const originalCurrentPool = G.currentPool;
  if (typeof originalCurrentPool === "function") {
    G.currentPool = function () {
      const mode = G.cfg.textureCardContentMode || "layout";
      if (mode === "texture-only" && G.cfg.textureEnabled && G.textureLibrary.length) {
        return [{
          id: "texture-only-placeholder",
          word: "",
          picto: null,
          visualUrl: "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==",
          source: "texture"
        }];
      }
      const pool = originalCurrentPool();
      if (mode === "visual") return pool.filter((source) => !!source.visualUrl);
      if (mode === "word") return pool.filter((source) => !!String(source.word || "").trim());
      return pool;
    };
  }

  if (typeof G.buildCards === "function") {
    const previousBuildCards = G.buildCards;
    G.buildCards = function (pool, seed) {
      const mode = G.cfg.textureCardContentMode || "layout";
      const simplified = mode === "texture-only" || mode === "word" || mode === "visual";
      const oldLayout = G.cfg.layout;
      const oldPerCard = G.cfg.perCard;
      let cards;
      try {
        if (simplified) {
          G.cfg.layout = "grid";
          G.cfg.perCard = 1;
        }
        cards = previousBuildCards(pool, seed);
      } finally {
        G.cfg.layout = oldLayout;
        G.cfg.perCard = oldPerCard;
      }
      cards = cards || [];
      assignTextures(cards, seed);
      assignForeground(cards, pool, seed);
      cards.forEach((card) => { card.textureContentMode = mode; });
      return cards;
    };
  }
})();