(function () {
  const G = window.PictoGame;
  if (!G) return;

  const $ = (id) => document.getElementById(id);

  function addStyles() {
    if ($("ux-workspace-style")) return;
    const style = document.createElement("style");
    style.id = "ux-workspace-style";
    style.textContent = `
      /* El área principal mantiene el mismo patrón espacial en Tarjetas y Juegos. */
      body.ux-mode-games .ux-normal-results-section{display:none!important}
      body.ux-mode-games .ux-normal-search-preview{display:none!important}
      body.ux-mode-cards #gameLivePreview{display:none!important}
      body.ux-mode-cards #game-results-section{display:none!important}

      #gameLivePreview.ux-game-main-preview{
        position:sticky;
        top:12px;
        z-index:2;
        width:100%;
        max-width:320px;
        margin:0;
        align-self:start;
        border:1px solid var(--edu-border,var(--stroke));
        background:var(--edu-surface,var(--panel));
        border-radius:16px;
        box-shadow:var(--edu-shadow-soft,0 6px 18px rgba(0,0,0,.10));
      }
      #gameLivePreview.ux-game-main-preview .ux-live-canvas-host{
        min-height:210px;
        background:var(--edu-surface-soft,rgba(255,255,255,.04));
      }
      #gameLivePreview.ux-game-main-preview .ux-live-canvas-host canvas{
        width:min(100%,280px);
        max-height:310px;
      }
      #gameLivePreview.ux-game-main-preview .ux-live-preview-head{
        margin-bottom:10px;
      }
      #gameLivePreview.ux-game-main-preview .ux-live-preview-foot{
        padding-top:2px;
      }

      body.ux-mode-games #game-results-section{
        display:block;
        scroll-margin-top:16px;
      }
      body.ux-mode-games #game-results-section[hidden]{display:none!important}
      body.ux-mode-games #game-results-section>.main-title{
        align-items:flex-start;
      }

      /* En Juegos la búsqueda sigue siendo el área de preparación de contenido. */
      body.ux-mode-games .ux-main-input-section .buttons-container #btn-download-all,
      body.ux-mode-games .ux-main-input-section .buttons-container #btn-print-pdf,
      body.ux-mode-games .ux-main-input-section .buttons-container #btn-print-system{
        display:none!important;
      }

      /* Escritura es una herramienta independiente, no un flujo de impresión. */
      body.ux-mode-writing .layout{
        display:block!important;
        grid-template-columns:1fr!important;
      }
      body.ux-mode-writing #uiSidebar,
      body.ux-mode-writing #uiToggleSidebar{
        display:none!important;
      }
      body.ux-mode-writing #writingMode{
        width:100%;
        max-width:none;
        padding:16px;
      }
      body.ux-mode-writing #writingMode .main-card{
        max-width:1180px;
        margin-inline:auto;
      }
      body.ux-mode-writing .ux-workflow-context{
        display:none!important;
      }

      @media (max-width:980px){
        #gameLivePreview.ux-game-main-preview{
          position:relative;
          top:auto;
          max-width:none;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function tagMainSections() {
    const input = $("input-words")?.closest("section.main-card");
    const normalResults = $("grid-container")?.closest("section.main-card");
    if (input) input.classList.add("ux-main-input-section");
    if (normalResults) normalResults.classList.add("ux-normal-results-section");

    const normalPreview = input?.querySelector(".input-area > .preview-mini");
    if (normalPreview && normalPreview.id !== "gameLivePreview") {
      normalPreview.classList.add("ux-normal-search-preview");
    }
    return { input, normalResults, normalPreview };
  }

  function moveGamePreviewToMain() {
    const { input, normalPreview } = tagMainSections();
    const preview = $("gameLivePreview");
    const inputArea = input?.querySelector(".input-area");
    const inputs = inputArea?.querySelector(".inputs-wrap");
    if (!preview || !inputArea || !inputs) return false;

    preview.classList.add("preview-mini", "ux-game-main-preview");
    preview.classList.remove("span-12");
    preview.dataset.uxWorkspaceMoved = "1";

    if (normalPreview) inputArea.insertBefore(preview, normalPreview);
    else inputArea.insertBefore(preview, inputs);

    const sidebarIntro = document.querySelector("#content-game > .ux-game-flow-head");
    if (sidebarIntro) {
      const title = sidebarIntro.querySelector("strong");
      const text = sidebarIntro.querySelector("p");
      if (title) title.textContent = "Configura a la izquierda, revisa a la derecha";
      if (text) text.textContent = "Los cambios se reflejan en la tarjeta de muestra del área principal sin regenerar toda la tanda.";
    }
    return true;
  }

  function moveGameResultsToMainFlow() {
    const { input } = tagMainSections();
    const results = $("game-results-section");
    if (!input || !results) return false;
    input.insertAdjacentElement("afterend", results);
    results.dataset.uxWorkspaceMoved = "1";
    return true;
  }

  function improveGameInputCopy() {
    const section = $("input-words")?.closest("section.main-card");
    if (!section) return;
    const heading = section.querySelector("#entrada-palabras");
    if (heading && !heading.dataset.uxOriginalText) heading.dataset.uxOriginalText = heading.textContent || "Entrada de palabras";
  }

  function applyModeCopy() {
    const heading = $("entrada-palabras");
    const hint = $("instrucciones");
    if (!heading) return;
    if (!heading.dataset.uxOriginalText) heading.dataset.uxOriginalText = heading.textContent || "Entrada de palabras";
    if (hint && !hint.dataset.uxOriginalHtml) hint.dataset.uxOriginalHtml = hint.innerHTML;

    const games = document.body.classList.contains("ux-mode-games");
    if (games) {
      heading.textContent = "Contenido para las tarjetas de juego";
      if (hint) hint.innerHTML = "Escribe palabras y busca pictogramas, o utiliza imágenes y texturas ya cargadas. Este contenido alimenta la vista previa y la tanda de juego.";
    } else {
      heading.textContent = heading.dataset.uxOriginalText || "Entrada de palabras";
      if (hint?.dataset.uxOriginalHtml) hint.innerHTML = hint.dataset.uxOriginalHtml;
    }
  }

  function observeMode() {
    if (document.body.dataset.uxWorkspaceObserved === "1") return;
    document.body.dataset.uxWorkspaceObserved = "1";
    let lastMode = "";
    const observer = new MutationObserver(() => {
      const mode = document.body.classList.contains("ux-mode-games") ? "games"
        : document.body.classList.contains("ux-mode-writing") ? "writing" : "cards";
      if (mode === lastMode) return;
      lastMode = mode;
      applyModeCopy();
      if (mode === "games") {
        moveGamePreviewToMain();
        moveGameResultsToMainFlow();
      }
    });
    observer.observe(document.body, { attributes:true, attributeFilter:["class"] });
  }

  function verifyWritingIsolation() {
    const writing = $("writingMode");
    const sidebar = $("uiSidebar");
    if (!writing || !sidebar) console.warn("UX workspace: no se pudo verificar el aislamiento de Escritura.");
  }

  function init() {
    addStyles();
    tagMainSections();
    improveGameInputCopy();
    moveGamePreviewToMain();
    moveGameResultsToMainFlow();
    applyModeCopy();
    observeMode();
    verifyWritingIsolation();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once:true });
  else init();
})();