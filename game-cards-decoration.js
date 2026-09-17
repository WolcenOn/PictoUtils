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
  G.textureObjectUrl = G.textureObjectUrl || "";
  G.textureFileName = G.textureFileName || "";
  G.saveCfg();

  function num(value, fallback) {
    const n = parseFloat(value);
    return Number.isFinite(n) ? n : fallback;
  }

  G.setGameTextureFile = function (file) {
    if (!file || !String(file.type || "").startsWith("image/")) return false;
    if (G.textureObjectUrl && G.textureObjectUrl.startsWith("blob:")) {
      try { URL.revokeObjectURL(G.textureObjectUrl); } catch (_) {}
    }
    G.textureObjectUrl = URL.createObjectURL(file);
    G.textureFileName = file.name || "textura";
    G.cfg.textureEnabled = true;
    G.saveCfg();
    return true;
  };

  G.clearGameTexture = function () {
    if (G.textureObjectUrl && G.textureObjectUrl.startsWith("blob:")) {
      try { URL.revokeObjectURL(G.textureObjectUrl); } catch (_) {}
    }
    G.textureObjectUrl = "";
    G.textureFileName = "";
    G.cfg.textureEnabled = false;
    G.saveCfg();
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
    const span = Math.hypot(W, H) * 1.3;
    for (let y = -span; y <= span; y += th) {
      for (let x = -span; x <= span; x += tw) {
        ctx.drawImage(img, x, y, tw, th);
      }
    }
  }

  G.drawGameCardTexture = async function (ctx, W, H, scale) {
    if (!G.cfg.textureEnabled || !G.textureObjectUrl || typeof G.loadImage !== "function") return;
    const img = await G.loadImage(G.textureObjectUrl);
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
})();
