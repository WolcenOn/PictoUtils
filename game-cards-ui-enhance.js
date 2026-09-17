(function () {
  const G = window.PictoGame;
  if (!G) return;

  function addStyles() {
    if (document.getElementById("game-cards-enhance-style")) return;
    const style = document.createElement("style");
    style.id = "game-cards-enhance-style";
    style.textContent = `
      #gameCardsGrid{grid-template-columns:repeat(auto-fit,minmax(270px,1fr));gap:20px}
      .game-card-preview{padding:14px;border:1px solid color-mix(in srgb,currentColor 14%,transparent);border-radius:16px;background:color-mix(in srgb,currentColor 5%,transparent);box-shadow:0 8px 26px rgba(0,0,0,.08)}
      .game-card-preview canvas{width:min(100%,380px);margin:0 auto;border-radius:12px;filter:drop-shadow(0 5px 10px rgba(0,0,0,.16))}
      .game-card-meta{padding-top:2px}
      .game-card-meta .hint{display:inline-flex;align-items:center;min-height:28px;padding:4px 9px;border-radius:999px;background:color-mix(in srgb,currentColor 7%,transparent)}
      #game-results-section{scroll-margin-top:16px}
      #game-results-section>.main-title{align-items:flex-start;gap:12px}
      .results-accordion-toggle{white-space:nowrap;margin-left:auto}
      .results-accordion-body[hidden]{display:none!important}
      .normal-results-collapsed{padding-bottom:10px}
      .normal-results-collapsed .main-title{margin-bottom:0}
      @media (max-width:700px){#gameCardsGrid{grid-template-columns:1fr}.game-card-preview{padding:10px}}
    `;
    document.head.appendChild(style);
  }

  function installEdgeOption() {
    const select = G.byId("gameLayout");
    if (!select || select.querySelector('option[value="edge"]')) return;
    const option = document.createElement("option");
    option.value = "edge";
    option.textContent = "Paralela a los bordes";
    const domino = select.querySelector('option[value="domino"]');
    if (domino) select.insertBefore(option, domino); else select.appendChild(option);
    if (G.cfg.layout === "edge") select.value = "edge";
  }

  function edgeNote() {
    const select = G.byId("gameLayout");
    const note = G.byId("gameLayoutNote");
    if (!select || !note || select.value !== "edge") return;
    const shape = G.byId("gameShape")?.value || G.cfg.shape;
    const shapeText = shape === "rect" ? "4 lados" : shape === "hex" ? "6 lados" : shape === "oct" ? "8 lados" : "tangentes alrededor del perímetro";
    note.textContent = `Paralela a bordes reparte los elementos entre ${shapeText}, los orienta con el borde y los desplaza hacia el interior para que no sobresalgan ni se solapen.`;
  }

  function installNormalResultsAccordion() {
    const grid = G.byId("grid-container");
    const section = grid?.closest("section.main-card");
    if (!section || section.dataset.gameAccordionReady === "1") return;
    const title = section.querySelector(":scope > .main-title");
    if (!title) return;

    const body = document.createElement("div");
    body.className = "results-accordion-body";
    body.id = "normal-results-accordion-body";
    const movable = Array.from(section.children).filter((el) => el !== title);
    movable.forEach((el) => body.appendChild(el));
    section.appendChild(body);

    const button = document.createElement("button");
    button.type = "button";
    button.className = "btn-mini results-accordion-toggle";
    button.id = "normalResultsToggle";
    button.setAttribute("aria-controls", body.id);
    title.appendChild(button);

    function setCollapsed(collapsed) {
      body.hidden = !!collapsed;
      section.classList.toggle("normal-results-collapsed", !!collapsed);
      button.setAttribute("aria-expanded", String(!collapsed));
      button.textContent = collapsed ? "▾ Mostrar resultados" : "▴ Ocultar resultados";
    }

    button.addEventListener("click", () => setCollapsed(!body.hidden));
    section.dataset.gameAccordionReady = "1";
    section._setResultsCollapsed = setCollapsed;
    setCollapsed(false);
  }

  function collapseNormalResults() {
    const section = G.byId("grid-container")?.closest("section.main-card");
    if (section && typeof section._setResultsCollapsed === "function") section._setResultsCollapsed(true);
  }

  function wireAutoCollapse() {
    const gameToggle = G.byId("btn-toggle-game");
    if (gameToggle && !gameToggle.dataset.resultsCollapseBound) {
      gameToggle.dataset.resultsCollapseBound = "1";
      gameToggle.addEventListener("click", () => {
        setTimeout(() => {
          if (gameToggle.getAttribute("aria-expanded") === "true") collapseNormalResults();
        }, 0);
      });
    }

    const generate = G.byId("gameGenerate");
    if (generate && !generate.dataset.resultsCollapseBound) {
      generate.dataset.resultsCollapseBound = "1";
      generate.addEventListener("click", collapseNormalResults);
    }
  }

  function wireEdgeNotes() {
    const layout = G.byId("gameLayout");
    const shape = G.byId("gameShape");
    if (layout && !layout.dataset.edgeNoteBound) {
      layout.dataset.edgeNoteBound = "1";
      layout.addEventListener("change", () => setTimeout(edgeNote, 0));
    }
    if (shape && !shape.dataset.edgeNoteBound) {
      shape.dataset.edgeNoteBound = "1";
      shape.addEventListener("change", () => setTimeout(edgeNote, 0));
    }
    edgeNote();
  }

  function enhanceGameHeading() {
    const section = G.byId("game-results-section");
    const h2 = section?.querySelector("h2");
    if (h2 && !h2.textContent.includes("🎲")) h2.textContent = `🎲 ${h2.textContent}`;
  }

  function init() {
    addStyles();
    installEdgeOption();
    installNormalResultsAccordion();
    wireAutoCollapse();
    wireEdgeNotes();
    enhanceGameHeading();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
