(function () {
  const G = window.PictoGame;
  if (!G) return;

  const $ = (id) => document.getElementById(id);
  let previewTimer = null;
  let previewVersion = 0;
  let activeMode = "cards";

  const savedPreviewKeys = [
    "lastUniformFontPx", "lastUniformImageMm", "lastFontWasAdjusted",
    "lastImageWasAdjusted", "lastEdgeScale"
  ];

  function addStyles() {
    if ($("ux-workflow-style")) return;
    const style = document.createElement("style");
    style.id = "ux-workflow-style";
    style.textContent = `
      .ux-workflow-bar{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 14px;border-bottom:1px solid var(--stroke);background:color-mix(in srgb,var(--panel) 92%,transparent);flex-wrap:wrap}
      .ux-mode-switch,.ux-step-switch{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
      .ux-mode-btn,.ux-step-btn{min-height:36px;padding:7px 11px;border-radius:999px}
      .ux-mode-btn[aria-pressed="true"]{background:var(--brand);color:#061015;border-color:transparent;font-weight:800}
      .ux-step-btn{font-size:.84rem;background:transparent;border-color:color-mix(in srgb,currentColor 15%,transparent)}
      .ux-step-btn:hover{border-color:color-mix(in srgb,var(--brand) 55%,transparent)}
      .ux-workflow-context{display:flex;align-items:center;gap:8px;min-width:0;color:var(--muted);font-size:.82rem}
      .ux-workflow-context strong{color:var(--text);white-space:nowrap}
      .ux-shared-settings-btn{display:none}
      body.ux-mode-games .ux-shared-settings-btn{display:inline-flex}
      body.ux-mode-cards #sec-game{display:none!important}
      body.ux-mode-cards #game-results-section{display:none!important}
      body.ux-mode-games #sec-voz,body.ux-mode-games #sec-reglas{display:none!important}
      body.ux-mode-games:not(.ux-show-shared-settings) #sec-cuadro{display:none!important}
      body.ux-mode-writing .sidebar{display:none!important}
      body.ux-mode-writing .ux-step-switch,body.ux-mode-writing .ux-shared-settings-btn{display:none!important}
      .ux-game-flow-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin:0 0 10px;padding:10px;border:1px solid color-mix(in srgb,currentColor 12%,transparent);border-radius:12px;background:color-mix(in srgb,currentColor 4%,transparent)}
      .ux-game-flow-head strong{display:block;margin-bottom:2px}
      .ux-game-flow-head p{margin:0;color:var(--muted);font-size:.8rem}
      .ux-live-preview{position:sticky;top:8px;z-index:6;margin:0 0 12px;padding:10px;border:1px solid color-mix(in srgb,var(--brand) 35%,var(--stroke));border-radius:14px;background:color-mix(in srgb,var(--panel) 96%,transparent);box-shadow:0 10px 24px rgba(0,0,0,.14)}
      .ux-live-preview-head{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:8px}
      .ux-live-preview-title{display:flex;align-items:center;gap:7px;font-weight:800;font-size:.9rem}
      .ux-live-dot{width:8px;height:8px;border-radius:50%;background:var(--brand2);box-shadow:0 0 0 4px color-mix(in srgb,var(--brand2) 18%,transparent)}
      .ux-live-preview-badge{font-size:.72rem;color:var(--muted);padding:3px 7px;border:1px solid color-mix(in srgb,currentColor 13%,transparent);border-radius:999px}
      .ux-live-canvas-host{display:grid;place-items:center;min-height:150px;border-radius:12px;background:color-mix(in srgb,currentColor 4%,transparent);overflow:hidden;padding:8px}
      .ux-live-canvas-host canvas{display:block;width:min(100%,260px);height:auto;max-height:250px;object-fit:contain;filter:drop-shadow(0 5px 10px rgba(0,0,0,.16))}
      .ux-live-empty{max-width:26ch;text-align:center;color:var(--muted);font-size:.82rem;padding:18px 8px}
      .ux-live-preview-foot{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:8px;flex-wrap:wrap}
      .ux-live-status{color:var(--muted);font-size:.78rem;min-width:0}
      .ux-live-refresh{min-height:30px;padding:5px 8px;font-size:.78rem}
      .ux-game-section-active>.section-header{border-bottom-color:color-mix(in srgb,var(--brand) 35%,transparent)}
      .ux-mode-games #content-game{padding-top:8px}
      .ux-primary-action-row{position:sticky;bottom:0;z-index:5;padding:8px 0 2px;background:linear-gradient(180deg,transparent,var(--panel) 34%)}
      .ux-primary-action-row #gameGenerate{width:100%;min-height:44px}
      @media (max-width:1020px){
        .ux-workflow-bar{position:sticky;top:0;z-index:40;padding:8px 10px}
        .ux-workflow-context{width:100%;order:3}
        .ux-live-preview{position:relative;top:auto}
      }
      @media (max-width:620px){
        .ux-workflow-bar{align-items:stretch}
        .ux-mode-switch{width:100%;display:grid;grid-template-columns:repeat(3,1fr)}
        .ux-mode-btn{width:100%;padding-inline:6px}
        .ux-step-switch{width:100%;overflow-x:auto;flex-wrap:nowrap;padding-bottom:2px}
        .ux-step-btn{white-space:nowrap;flex:0 0 auto}
      }
    `;
    document.head.appendChild(style);
  }

  function createWorkflowBar() {
    if ($("uxWorkflowBar")) return;
    const topbar = document.querySelector(".topbar");
    if (!topbar) return;

    const bar = document.createElement("nav");
    bar.id = "uxWorkflowBar";
    bar.className = "ux-workflow-bar";
    bar.setAttribute("aria-label", "Flujo principal de trabajo");
    bar.innerHTML = `
      <div class="ux-mode-switch" role="group" aria-label="Modo de trabajo">
        <button class="ux-mode-btn" type="button" data-ux-mode="cards" aria-pressed="true">🗂️ Tarjetas</button>
        <button class="ux-mode-btn" type="button" data-ux-mode="games" aria-pressed="false">🎲 Juegos</button>
        <button class="ux-mode-btn" type="button" data-ux-mode="writing" aria-pressed="false">✍️ Escritura</button>
      </div>
      <div class="ux-step-switch" id="uxStepSwitch" aria-label="Etapas del flujo"></div>
      <div class="ux-workflow-context">
        <strong id="uxWorkflowTitle">Tarjetas</strong>
        <span id="uxWorkflowHint">Introduce contenido, revisa el resultado y exporta.</span>
        <button class="btn-mini ux-shared-settings-btn" id="uxSharedSettings" type="button" aria-pressed="false">⚙ Ajustes compartidos</button>
      </div>`;
    topbar.insertAdjacentElement("afterend", bar);

    // Escritura ya está disponible en la nueva navegación; evitamos duplicarla.
    document.body.classList.add("ux-workflow-ready");
    const oldWriting = $("uiWritingMode");
    if (oldWriting) oldWriting.style.display = "none";
  }

  function mainInputSection() {
    return $("input-words")?.closest("section.main-card") || null;
  }

  function normalResultsSection() {
    return $("grid-container")?.closest("section.main-card") || null;
  }

  function openSidebarOnSmallScreens() {
    const sidebar = $("uiSidebar");
    if (!sidebar) return;
    if (window.matchMedia && window.matchMedia("(max-width: 1020px)").matches) {
      sidebar.classList.add("is-open");
      $("uiToggleSidebar")?.setAttribute("aria-expanded", "true");
    }
  }

  function openGamePanel() {
    const content = $("content-game");
    const button = $("btn-toggle-game");
    if (content) content.hidden = false;
    if (button) {
      button.setAttribute("aria-expanded", "true");
      button.textContent = "Ocultar";
    }
    $("sec-game")?.classList.add("ux-game-section-active");
  }

  function openSharedSettings() {
    document.body.classList.add("ux-show-shared-settings");
    const btn = $("uxSharedSettings");
    if (btn) btn.setAttribute("aria-pressed", "true");
    const content = $("content-cuadro");
    const toggle = $("btn-toggle-cuadro");
    if (content) content.hidden = false;
    if (toggle) {
      toggle.setAttribute("aria-expanded", "true");
      toggle.textContent = "Ocultar";
    }
  }

  function scrollToElement(el, focusSelector) {
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    if (focusSelector) setTimeout(() => el.querySelector(focusSelector)?.focus(), 280);
  }

  function stepDefinitions(mode) {
    if (mode === "games") {
      return [
        { id: "content", label: "1 · Contenido", action: () => scrollToElement(mainInputSection(), "#input-words") },
        { id: "design", label: "2 · Diseño", action: () => { openSidebarOnSmallScreens(); openGamePanel(); scrollToElement($("sec-game")); } },
        { id: "preview", label: "3 · Vista previa", action: () => { openSidebarOnSmallScreens(); openGamePanel(); scrollToElement($("gameLivePreview")); schedulePreview(0); } },
        { id: "results", label: "4 · Generar / exportar", action: () => { const r = $("game-results-section"); if (r && !r.hidden) scrollToElement(r); else { openSidebarOnSmallScreens(); openGamePanel(); $("gameGenerate")?.focus(); } } }
      ];
    }
    if (mode === "writing") return [];
    return [
      { id: "content", label: "1 · Contenido", action: () => scrollToElement(mainInputSection(), "#input-words") },
      { id: "design", label: "2 · Diseño", action: () => { openSidebarOnSmallScreens(); const s = $("sec-cuadro"); if (s) scrollToElement(s); } },
      { id: "review", label: "3 · Revisar", action: () => scrollToElement(normalResultsSection()) },
      { id: "export", label: "4 · Exportar", action: () => scrollToElement(mainInputSection(), ".buttons-container") }
    ];
  }

  function renderSteps(mode) {
    const host = $("uxStepSwitch");
    if (!host) return;
    host.innerHTML = "";
    stepDefinitions(mode).forEach((step) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "ux-step-btn";
      btn.textContent = step.label;
      btn.dataset.uxStep = step.id;
      btn.addEventListener("click", step.action);
      host.appendChild(btn);
    });
  }

  function setMode(mode, options) {
    if (!["cards", "games", "writing"].includes(mode)) mode = "cards";
    activeMode = mode;
    const opts = options || {};
    document.body.classList.remove("ux-mode-cards", "ux-mode-games", "ux-mode-writing");
    document.body.classList.add(`ux-mode-${mode}`);

    document.querySelectorAll("[data-ux-mode]").forEach((btn) => {
      btn.setAttribute("aria-pressed", String(btn.dataset.uxMode === mode));
    });

    const title = $("uxWorkflowTitle"), hint = $("uxWorkflowHint");
    if (title) title.textContent = mode === "games" ? "Tarjetas de juego" : mode === "writing" ? "Modo escritura" : "Tarjetas normales";
    if (hint) hint.textContent = mode === "games"
      ? "Prepara contenido, diseña con vista previa viva y genera la tanda al final."
      : mode === "writing"
        ? "Escribe y obtén pictogramas en secuencia."
        : "Introduce contenido, ajusta el diseño, revisa y exporta.";
    renderSteps(mode);

    if (mode === "writing") {
      if (!$("writingMode")?.hidden) return;
      const old = $("uiWritingMode");
      if (old) old.click();
      return;
    }

    if (!$("writingMode")?.hidden) $("wm-back")?.click();

    if (mode === "games") {
      openGamePanel();
      normalResultsSection()?._setResultsCollapsed?.(true);
      schedulePreview(0);
      if (opts.scroll) scrollToElement(mainInputSection(), "#input-words");
    } else {
      document.body.classList.remove("ux-show-shared-settings");
      const shared = $("uxSharedSettings");
      if (shared) shared.setAttribute("aria-pressed", "false");
      if (opts.scroll) scrollToElement(mainInputSection(), "#input-words");
    }
  }

  function installGamePreview() {
    if ($("gameLivePreview")) return;
    const content = $("content-game");
    if (!content) return;

    const intro = document.createElement("div");
    intro.className = "ux-game-flow-head";
    intro.innerHTML = `<div><strong>Diseña primero, genera después</strong><p>La muestra usa una sola tarjeta y una semilla estable para que los cambios sean fáciles de comparar.</p></div><span class="ux-live-preview-badge">sin regenerar la tanda</span>`;

    const preview = document.createElement("section");
    preview.className = "ux-live-preview";
    preview.id = "gameLivePreview";
    preview.setAttribute("aria-label", "Vista previa en tiempo real de tarjeta de juego");
    preview.innerHTML = `
      <div class="ux-live-preview-head">
        <div class="ux-live-preview-title"><span class="ux-live-dot" aria-hidden="true"></span>Vista previa en tiempo real</div>
        <span class="ux-live-preview-badge" id="gameLivePreviewBadge">muestra</span>
      </div>
      <div class="ux-live-canvas-host" id="gameLiveCanvasHost"><div class="ux-live-empty">Introduce contenido o carga texturas para ver aquí una tarjeta de muestra.</div></div>
      <div class="ux-live-preview-foot">
        <span class="ux-live-status" id="gameLivePreviewStatus" aria-live="polite">Esperando contenido…</span>
        <button class="btn-mini ux-live-refresh" id="gameLiveRefresh" type="button">↻ Actualizar</button>
      </div>`;

    content.prepend(preview);
    content.prepend(intro);

    const generateRow = $("gameGenerate")?.closest(".span-12");
    if (generateRow) generateRow.classList.add("ux-primary-action-row");

    $("gameLiveRefresh")?.addEventListener("click", () => schedulePreview(0));
  }

  function numberValue(id, fallback) {
    const n = parseFloat($(id)?.value);
    return Number.isFinite(n) ? n : fallback;
  }

  function liveCfg(base) {
    const next = { ...base };
    const value = (id, fallback) => $(id)?.value || fallback;
    next.layout = value("gameLayout", next.layout || "random");
    next.shape = value("gameShape", next.shape || "rect");
    next.content = value("gameContent", next.content || "mixed");
    next.fontMode = value("gameFontMode", next.fontMode || "current");
    next.count = 1;
    next.perCard = Math.max(1, Math.round(numberValue("gamePerCard", next.perCard || 6)));
    next.widthMm = Math.max(30, numberValue("gameWidthMm", next.widthMm || 100));
    next.heightMm = Math.max(30, numberValue("gameHeightMm", next.heightMm || 70));
    next.itemGapMm = Math.max(0, numberValue("gameItemGapMm", next.itemGapMm || 3));
    next.edgePaddingMm = Math.max(0, numberValue("gameEdgePaddingMm", next.edgePaddingMm || 5));
    next.minSizeMm = Math.max(2.5, numberValue("gameMinSizeMm", next.minSizeMm || 16));
    next.maxSizeMm = Math.max(next.minSizeMm, numberValue("gameMaxSizeMm", next.maxSizeMm || 28));
    next.minFontPx = Math.max(7, numberValue("gameMinFontPx", next.minFontPx || 22));
    next.maxFontPx = Math.max(next.minFontPx, numberValue("gameMaxFontPx", next.maxFontPx || 38));
    next.minRotation = Math.max(-180, numberValue("gameMinRotation", next.minRotation || -18));
    next.maxRotation = Math.min(180, numberValue("gameMaxRotation", next.maxRotation || 18));
    if (next.maxRotation < next.minRotation) [next.minRotation, next.maxRotation] = [next.maxRotation, next.minRotation];
    next.allowRepeats = !!$("gameAllowRepeats")?.checked;
    next.fontSizeMode = value("gameFontSizeMode", next.fontSizeMode || "fixed");
    next.imageSizeMode = value("gameImageSizeMode", next.imageSizeMode || "fixed");
    next.fontSizePx = Math.max(7, numberValue("gameFontSizePx", next.fontSizePx || 48));
    next.imageSizeMm = Math.max(2.5, numberValue("gameImageSizeMm", next.imageSizeMm || 50));
    next.textureCardContentMode = value("gameTextureContentMode", next.textureCardContentMode || "layout");
    next.textureEnabled = !!$("gameTextureEnabled")?.checked;
    next.textureDistribution = value("gameTextureDistribution", next.textureDistribution || "balanced");
    next.seed = String($("gameSeed")?.value || next.seed || "").trim();
    return next;
  }

  function previewSummary(card, cfg) {
    const shape = { rect: "rectangular", hex: "hexagonal", oval: cfg.widthMm === cfg.heightMm ? "circular" : "ovalada", oct: "octogonal" }[cfg.shape] || cfg.shape;
    const layout = { random: "aleatoria", grid: "cuadrícula", edge: "paralela a bordes", domino: "dominó" }[cfg.layout] || cfg.layout;
    const adjusted = card?.layoutAdjusted ? " · ajuste automático" : "";
    return `${shape} · ${layout}${adjusted}`;
  }

  function savePreviewGlobals() {
    const out = {};
    savedPreviewKeys.forEach((key) => { out[key] = G[key]; });
    return out;
  }

  function restorePreviewGlobals(values) {
    savedPreviewKeys.forEach((key) => { G[key] = values[key]; });
  }

  async function renderLivePreview() {
    if (activeMode !== "games" || !$("gameLiveCanvasHost")) return;
    const version = ++previewVersion;
    const host = $("gameLiveCanvasHost");
    const status = $("gameLivePreviewStatus");
    const badge = $("gameLivePreviewBadge");
    if (status) status.textContent = "Actualizando vista previa…";

    const realCfg = G.cfg;
    const realCards = G.cards;
    const realLastSeed = G.lastSeed;
    const globals = savePreviewGlobals();

    try {
      const tempCfg = liveCfg(realCfg || {});
      G.cfg = tempCfg;
      const pool = typeof G.currentPool === "function" ? G.currentPool() : [];
      if (!pool?.length) {
        if (version !== previewVersion) return;
        host.innerHTML = `<div class="ux-live-empty">No hay contenido compatible todavía. Introduce palabras, busca pictogramas, carga imágenes o añade texturas según el modo elegido.</div>`;
        if (status) status.textContent = "Añade contenido para activar la vista previa.";
        if (badge) badge.textContent = "sin contenido";
        return;
      }

      const seed = String($("gameSeed")?.value || "").trim() || "ux-live-preview";
      const cards = typeof G.buildCards === "function" ? G.buildCards(pool, seed) : [];
      const card = cards?.[0];
      if (!card) throw new Error("No se pudo crear la tarjeta de muestra");
      const canvas = await G.renderCard(card, Math.min(3, G.PREVIEW_SCALE || 3));
      if (version !== previewVersion) return;
      host.replaceChildren(canvas);
      if (status) status.textContent = previewSummary(card, tempCfg);
      if (badge) badge.textContent = `${Math.round(tempCfg.widthMm)}×${Math.round(tempCfg.heightMm)} mm`;
    } catch (error) {
      if (version !== previewVersion) return;
      host.innerHTML = `<div class="ux-live-empty">La combinación actual no puede previsualizarse todavía. Ajusta contenido, tamaño o distribución.</div>`;
      if (status) status.textContent = "Vista previa no disponible con estos ajustes.";
      if (badge) badge.textContent = "revisar ajustes";
      console.warn("Vista previa de juego:", error);
    } finally {
      G.cfg = realCfg;
      G.cards = realCards;
      G.lastSeed = realLastSeed;
      restorePreviewGlobals(globals);
    }
  }

  function schedulePreview(delay) {
    clearTimeout(previewTimer);
    previewTimer = setTimeout(renderLivePreview, Number.isFinite(delay) ? delay : 180);
  }

  function bindLivePreview() {
    const content = $("content-game");
    if (content && !content.dataset.uxLiveBound) {
      content.dataset.uxLiveBound = "1";
      content.addEventListener("input", (event) => {
        if (event.target?.id === "gameSeed") schedulePreview(260);
        else schedulePreview(160);
      });
      content.addEventListener("change", () => schedulePreview(80));
    }

    const words = $("input-words");
    if (words && !words.dataset.uxLiveBound) {
      words.dataset.uxLiveBound = "1";
      words.addEventListener("input", () => schedulePreview(260));
    }

    const results = $("grid-container");
    if (results && !results.dataset.uxLiveObserved) {
      results.dataset.uxLiveObserved = "1";
      const observer = new MutationObserver(() => schedulePreview(180));
      observer.observe(results, { childList: true, subtree: true, attributes: true, attributeFilter: ["src"] });
    }

    const shared = $("sec-cuadro");
    if (shared && !shared.dataset.uxLiveBound) {
      shared.dataset.uxLiveBound = "1";
      shared.addEventListener("input", () => { if (activeMode === "games") schedulePreview(180); });
      shared.addEventListener("change", () => { if (activeMode === "games") schedulePreview(100); });
    }
  }

  function bindWorkflow() {
    document.querySelectorAll("[data-ux-mode]").forEach((btn) => {
      btn.addEventListener("click", () => setMode(btn.dataset.uxMode, { scroll: true }));
    });

    $("uxSharedSettings")?.addEventListener("click", () => {
      const open = !document.body.classList.contains("ux-show-shared-settings");
      document.body.classList.toggle("ux-show-shared-settings", open);
      $("uxSharedSettings")?.setAttribute("aria-pressed", String(open));
      if (open) {
        openSidebarOnSmallScreens();
        openSharedSettings();
        scrollToElement($("sec-cuadro"));
      }
    });

    $("btnLicense")?.addEventListener("click", () => {
      // La licencia sigue siendo una acción global e independiente del modo activo.
      $("arasaacLicenseModal")?.setAttribute("data-ux-license-check", "ok");
    });

    window.addEventListener("hashchange", () => {
      if (location.hash === "#escritura") setMode("writing");
    });
  }

  function verifyLicenseContract() {
    const modal = $("arasaacLicenseModal");
    const close = $("arasaacCloseBtn");
    const reopen = $("btnLicense");
    if (!modal || !close || !reopen) {
      console.error("UX redesign: faltan elementos obligatorios de licencia ARASAAC.");
      return false;
    }
    return true;
  }

  function init() {
    if (!verifyLicenseContract()) return;
    addStyles();
    createWorkflowBar();
    installGamePreview();
    bindWorkflow();
    bindLivePreview();

    const initial = location.hash === "#escritura"
      ? "writing"
      : (G.cfg?.uxPrimaryMode === "games" ? "games" : "cards");
    setMode(initial);

    document.querySelectorAll("[data-ux-mode]").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (btn.dataset.uxMode === "cards" || btn.dataset.uxMode === "games") {
          G.cfg.uxPrimaryMode = btn.dataset.uxMode;
          G.saveCfg?.();
        }
      });
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
