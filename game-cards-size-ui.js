(function () {
  const G = window.PictoGame;
  if (!G) return;

  function controlOf(id) {
    return G.byId(id)?.closest(".control") || null;
  }

  function numberOr(value, fallback) {
    const n = parseFloat(value);
    return Number.isFinite(n) ? n : fallback;
  }

  function addStyles() {
    if (G.byId("game-size-ui-style")) return;
    const style = document.createElement("style");
    style.id = "game-size-ui-style";
    style.textContent = `
      .game-size-fixed[hidden],.game-size-range-hidden{display:none!important}
      .game-size-copy-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
      .game-size-independent-note{margin:2px 0 8px}
    `;
    document.head.appendChild(style);
  }

  function installControls() {
    if (G.byId("gameFontSizeMode")) return;
    const grid = G.byId("gameMinFontPx")?.closest(".config-grid");
    if (!grid) return;

    const fontMin = controlOf("gameMinFontPx");
    const imageMin = controlOf("gameMinSizeMm");
    if (!fontMin || !imageMin) return;

    const imageMode = document.createElement("div");
    imageMode.className = "control span-6";
    imageMode.innerHTML = `<label for="gameImageSizeMode">Tamaño de imagen</label><select id="gameImageSizeMode"><option value="fixed">Fijo</option><option value="variable">Variable</option></select>`;
    const imageFixed = document.createElement("div");
    imageFixed.className = "control span-6 game-size-fixed";
    imageFixed.id = "gameImageFixedControl";
    imageFixed.innerHTML = `<label for="gameImageSizeMm">Imagen fija (mm)</label><input id="gameImageSizeMm" type="number" min="2.5" max="160" step="0.5" inputmode="decimal">`;
    imageMin.before(imageMode, imageFixed);

    const fontMode = document.createElement("div");
    fontMode.className = "control span-6";
    fontMode.innerHTML = `<label for="gameFontSizeMode">Tamaño del texto</label><select id="gameFontSizeMode"><option value="fixed">Fijo</option><option value="variable">Variable</option></select>`;
    const fontFixed = document.createElement("div");
    fontFixed.className = "control span-6 game-size-fixed";
    fontFixed.id = "gameFontFixedControl";
    fontFixed.innerHTML = `<label for="gameFontSizePx">Texto fijo (px)</label><input id="gameFontSizePx" type="number" min="7" max="160" step="1" inputmode="numeric">`;
    fontMin.before(fontMode, fontFixed);

    const generateRow = G.byId("gameGenerate")?.closest(".span-12");
    if (generateRow) {
      const row = document.createElement("div");
      row.className = "span-12 game-size-copy-row";
      row.innerHTML = `<button class="btn-mini" id="gameCopyNormalSizes" type="button">↔ Copiar tamaños de tarjeta normal</button><span class="hint">Los tamaños del modo juego son independientes y se ajustan conjuntamente si la tarjeta no ofrece espacio suficiente.</span>`;
      generateRow.before(row);
    }
  }

  function rangeControls(prefix) {
    return prefix === "font"
      ? [controlOf("gameMinFontPx"), controlOf("gameMaxFontPx")]
      : [controlOf("gameMinSizeMm"), controlOf("gameMaxSizeMm")];
  }

  function updateVisibility() {
    const fontFixed = (G.byId("gameFontSizeMode")?.value || G.cfg.fontSizeMode) === "fixed";
    const imageFixed = (G.byId("gameImageSizeMode")?.value || G.cfg.imageSizeMode) === "fixed";
    const ff = G.byId("gameFontFixedControl");
    const im = G.byId("gameImageFixedControl");
    if (ff) ff.hidden = !fontFixed;
    if (im) im.hidden = !imageFixed;
    rangeControls("font").forEach((el) => el?.classList.toggle("game-size-range-hidden", fontFixed));
    rangeControls("image").forEach((el) => el?.classList.toggle("game-size-range-hidden", imageFixed));
  }

  function sync() {
    const fontMode = G.byId("gameFontSizeMode");
    const imageMode = G.byId("gameImageSizeMode");
    const fontSize = G.byId("gameFontSizePx");
    const imageSize = G.byId("gameImageSizeMm");
    if (fontMode) fontMode.value = G.cfg.fontSizeMode || "fixed";
    if (imageMode) imageMode.value = G.cfg.imageSizeMode || "fixed";
    if (fontSize) fontSize.value = String(numberOr(G.cfg.fontSizePx, 48));
    if (imageSize) imageSize.value = String(numberOr(G.cfg.imageSizeMm, 50));
    updateVisibility();
  }

  function read() {
    G.cfg.fontSizeMode = G.byId("gameFontSizeMode")?.value === "variable" ? "variable" : "fixed";
    G.cfg.imageSizeMode = G.byId("gameImageSizeMode")?.value === "variable" ? "variable" : "fixed";
    G.cfg.fontSizePx = G.clamp(numberOr(G.byId("gameFontSizePx")?.value, G.cfg.fontSizePx || 48), 7, 160);
    G.cfg.imageSizeMm = G.clamp(numberOr(G.byId("gameImageSizeMm")?.value, G.cfg.imageSizeMm || 50), 2.5, 160);
    G.saveCfg();
    updateVisibility();
  }

  function copyNormalSizes() {
    const sizes = typeof G.normalGameReferenceSizes === "function"
      ? G.normalGameReferenceSizes()
      : { fontSizePx: 48, imageSizeMm: 50 };
    G.cfg.fontSizeMode = "fixed";
    G.cfg.imageSizeMode = "fixed";
    G.cfg.fontSizePx = sizes.fontSizePx;
    G.cfg.imageSizeMm = sizes.imageSizeMm;
    G.saveCfg();
    sync();
  }

  function bind() {
    ["gameFontSizeMode", "gameImageSizeMode", "gameFontSizePx", "gameImageSizeMm"].forEach((id) => {
      const el = G.byId(id);
      if (!el || el.dataset.gameSizeBound) return;
      el.dataset.gameSizeBound = "1";
      el.addEventListener("input", read);
      el.addEventListener("change", read);
    });
    const copy = G.byId("gameCopyNormalSizes");
    if (copy && !copy.dataset.gameSizeBound) {
      copy.dataset.gameSizeBound = "1";
      copy.addEventListener("click", copyNormalSizes);
    }
  }

  function sizingSummary() {
    const parts = [];
    if (G.cfg.layout === "edge" && Number.isFinite(G.lastEdgeScale)) {
      const pct = Math.round(G.lastEdgeScale * 100);
      parts.push(pct < 100 ? `ajuste conjunto a tarjeta ${pct}%` : "encaje a tarjeta 100%");
    }
    if (G.cfg.fontSizeMode === "fixed" && Number.isFinite(G.lastUniformFontPx)) {
      const requested = numberOr(G.cfg.fontSizePx, G.lastUniformFontPx);
      const applied = G.lastUniformFontPx;
      parts.push(G.lastFontWasAdjusted ? `texto uniforme ${applied}px (pedido ${requested}px)` : `texto fijo ${applied}px`);
    }
    if (G.cfg.imageSizeMode === "fixed" && Number.isFinite(G.lastUniformImageMm)) {
      const requested = numberOr(G.cfg.imageSizeMm, G.lastUniformImageMm);
      const applied = Math.round(G.lastUniformImageMm * 10) / 10;
      parts.push(G.lastImageWasAdjusted ? `imagen uniforme ${applied}mm (pedido ${requested}mm)` : `imagen fija ${applied}mm`);
    }
    return parts.join(" · ");
  }

  function observeStatus() {
    const status = G.byId("gameCardsStatus");
    if (!status || status.dataset.gameSizeObserved) return;
    status.dataset.gameSizeObserved = "1";
    let editing = false;
    const observer = new MutationObserver(() => {
      if (editing) return;
      const summary = sizingSummary();
      if (!summary || status.textContent.includes("ajuste conjunto a tarjeta") || status.textContent.includes("encaje a tarjeta") || status.textContent.includes("texto fijo") || status.textContent.includes("texto uniforme") || status.textContent.includes("imagen fija") || status.textContent.includes("imagen uniforme")) return;
      if (!status.textContent.includes("semilla")) return;
      editing = true;
      status.textContent += ` · ${summary}`;
      editing = false;
    });
    observer.observe(status, { childList: true, characterData: true, subtree: true });
  }

  function init() {
    addStyles();
    installControls();
    sync();
    bind();
    observeStatus();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
