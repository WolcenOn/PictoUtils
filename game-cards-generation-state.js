(function () {
  const G = window.PictoGame;
  if (!G) return;
  const $ = (id) => document.getElementById(id);

  let sourceRevision = 0;
  let generatedRevision = -1;

  function hideStaleResults(reason) {
    const section = $("game-results-section");
    if (!section || !G.cards?.length) return;
    section.hidden = true;
    section.dataset.gameResultsStale = "1";
    const status = $("gameCardsStatus");
    if (status && reason) status.dataset.staleReason = reason;
  }

  function sourceChanged(reason) {
    sourceRevision++;
    if (generatedRevision !== sourceRevision) hideStaleResults(reason);
  }

  function beginGeneration() {
    const section = $("game-results-section");
    if (section) {
      section.hidden = true;
      section.dataset.gameResultsStale = "1";
    }
  }

  function finishGenerationIfNew() {
    const section = $("game-results-section");
    if (!section || section.hidden || !G.cards?.length) return;
    generatedRevision = sourceRevision;
    delete section.dataset.gameResultsStale;
  }

  function bind() {
    const words = $("input-words");
    if (words && !words.dataset.gameStaleBound) {
      words.dataset.gameStaleBound = "1";
      words.addEventListener("input", () => sourceChanged("Las palabras han cambiado."));
    }

    ["btn-search", "btn-local-images", "btn-local-folder"].forEach((id) => {
      const button = $(id);
      if (!button || button.dataset.gameStaleBound) return;
      button.dataset.gameStaleBound = "1";
      button.addEventListener("click", () => sourceChanged("El contenido preparado está cambiando."));
    });

    const generate = $("gameGenerate");
    if (generate && !generate.dataset.gameGenerationStateBound) {
      generate.dataset.gameGenerationStateBound = "1";
      generate.addEventListener("click", beginGeneration, true);
      generate.addEventListener("click", () => {
        setTimeout(finishGenerationIfNew, 80);
        setTimeout(finishGenerationIfNew, 350);
        setTimeout(finishGenerationIfNew, 900);
      });
    }

    const regenerate = $("gameRegenerate");
    if (regenerate && !regenerate.dataset.gameGenerationStateBound) {
      regenerate.dataset.gameGenerationStateBound = "1";
      regenerate.addEventListener("click", beginGeneration, true);
      regenerate.addEventListener("click", () => {
        setTimeout(finishGenerationIfNew, 80);
        setTimeout(finishGenerationIfNew, 350);
        setTimeout(finishGenerationIfNew, 900);
      });
    }
  }

  function init() {
    bind();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
