(function () {
  const G = window.PictoGame;
  if (!G) return;

  const $ = (id) => document.getElementById(id);

  function textureFlowActive() {
    return !!G.cfg?.textureEnabled && Array.isArray(G.textureLibrary) && G.textureLibrary.length > 0;
  }

  function restoreNormalGameControls() {
    if (textureFlowActive()) return;

    const layout = $("gameLayout");
    const perCard = $("gamePerCard");
    const content = $("gameContent");

    if (G.cfg?.textureSimplifiedActive) {
      const oldLayout = G.cfg.texturePreviousLayout || G.cfg.layout || "random";
      const oldPerCard = parseInt(G.cfg.texturePreviousPerCard, 10) || G.cfg.perCard || 6;
      const oldContent = G.cfg.texturePreviousContent || G.cfg.content || "mixed";

      G.cfg.layout = oldLayout;
      G.cfg.perCard = oldPerCard;
      G.cfg.content = oldContent;
      G.cfg.textureSimplifiedActive = false;

      if (layout) layout.value = oldLayout;
      if (perCard) perCard.value = String(oldPerCard);
      if (content) content.value = oldContent;
      G.saveCfg?.();
    }

    if (layout) layout.disabled = false;
    if (perCard) perCard.disabled = false;
    if (content) content.disabled = false;
  }

  const decoratedCurrentPool = G.currentPool;
  if (typeof decoratedCurrentPool === "function") {
    G.currentPool = function () {
      // Fuera del flujo de texturas usamos exactamente la misma fuente que
      // Tarjetas normales, sin filtros heredados de pruebas decorativas.
      if (!textureFlowActive() && typeof G.currentNormalCardPool === "function") {
        return G.currentNormalCardPool();
      }
      return decoratedCurrentPool();
    };
  }

  const decoratedBuildCards = G.buildCards;
  if (typeof decoratedBuildCards === "function") {
    G.buildCards = function (pool, seed) {
      const textureActive = textureFlowActive();
      const previousMode = G.cfg.textureCardContentMode;
      if (!textureActive) G.cfg.textureCardContentMode = "layout";

      G.lastGamePoolSnapshot = Array.isArray(pool)
        ? pool.map((source) => ({
            id: source?.id || "",
            word: String(source?.word || "").trim(),
            visualUrl: source?.visualUrl || "",
            source: source?.source || "none"
          }))
        : [];

      try {
        const cards = decoratedBuildCards(pool, seed) || [];
        if (!textureActive) {
          cards.forEach((card) => {
            card.textureContentMode = "layout";
            card.texture = null;
            card.textureForegroundSource = null;
          });
        }
        return cards;
      } finally {
        G.cfg.textureCardContentMode = previousMode;
      }
    };
  }

  const decoratedOverlay = G.drawGameOverlayText;
  if (typeof decoratedOverlay === "function") {
    G.drawGameOverlayText = function (ctx, W, H, scale, layer) {
      // El texto decorativo pertenece al flujo de textura. De este modo un
      // texto de una sesión anterior (p. ej. ROCK) no enmascara un juego normal.
      if (!textureFlowActive()) return;

      // Si la tarjeta principal es textual, una marca decorativa centrada y
      // configurada por delante puede tapar por completo la palabra real.
      // En ese caso se convierte en marca de agua detrás del contenido.
      const textMainMode = G.cfg.textureCardContentMode === "word" ||
        (G.cfg.textureCardContentMode === "layout" && G.cfg.content === "text");
      const centered = (G.cfg.overlayTextPosition || "center") === "center";
      const above = (G.cfg.overlayTextLayer || "behind") === "above";

      if (textMainMode && centered && above) {
        if (layer === "above") return;
        const previousLayer = G.cfg.overlayTextLayer;
        G.cfg.overlayTextLayer = "behind";
        try {
          return decoratedOverlay.call(this, ctx, W, H, scale, "behind");
        } finally {
          G.cfg.overlayTextLayer = previousLayer;
        }
      }

      return decoratedOverlay.call(this, ctx, W, H, scale, layer);
    };
  }

  function poolWords() {
    const pool = Array.isArray(G.lastGamePoolSnapshot) ? G.lastGamePoolSnapshot : [];
    const seen = new Set();
    const words = [];
    pool.forEach((source) => {
      const word = String(source?.word || "").trim();
      if (!word) return;
      const key = word.toLocaleLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      words.push(word);
    });
    return words;
  }

  function diagnosticText() {
    const words = poolWords();
    const shown = words.slice(0, 6);
    let text = shown.length ? `Fuente: ${shown.join(", ")}${words.length > shown.length ? "…" : ""}` : "Fuente: sin palabras";
    if (textureFlowActive() && G.cfg.overlayTextEnabled && String(G.cfg.overlayText || "").trim()) {
      text += ` · Texto decorativo: ${String(G.cfg.overlayText).trim()}`;
    }
    return text;
  }

  function appendDiagnostic() {
    const status = $("gameCardsStatus");
    if (!status || !G.cards?.length) return;
    const marker = " · Fuente:";
    let base = String(status.textContent || "");
    const cut = base.indexOf(marker);
    if (cut >= 0) base = base.slice(0, cut);
    const extra = diagnosticText();
    status.textContent = `${base} · ${extra}`;
  }

  function watchStatus() {
    const status = $("gameCardsStatus");
    if (!status || status.dataset.gameSourceDiagnostic === "1") return;
    status.dataset.gameSourceDiagnostic = "1";
    let applying = false;
    const observer = new MutationObserver(() => {
      if (applying || !G.cards?.length) return;
      const current = String(status.textContent || "");
      if (current.includes(" · Fuente:")) return;
      applying = true;
      appendDiagnostic();
      applying = false;
    });
    observer.observe(status, { childList: true, characterData: true, subtree: true });
  }

  function refreshTextureState() {
    setTimeout(() => {
      restoreNormalGameControls();
      const note = $("gameTextureModeNote");
      if (note && !textureFlowActive()) {
        note.textContent = "Los modos especiales de contenido solo se aplican cuando hay texturas cargadas y activas. Sin textura, Juegos usa el contenido normal preparado arriba.";
      }
    }, 0);
  }

  function bind() {
    $("gameTextureEnabled")?.addEventListener("change", refreshTextureState);
    $("gameTextureClear")?.addEventListener("click", refreshTextureState);
    $("gameTextureFile")?.addEventListener("change", refreshTextureState);
    $("gameGenerate")?.addEventListener("click", () => {
      setTimeout(appendDiagnostic, 60);
      setTimeout(appendDiagnostic, 350);
      setTimeout(appendDiagnostic, 900);
    });
  }

  function init() {
    restoreNormalGameControls();
    watchStatus();
    bind();
    refreshTextureState();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
