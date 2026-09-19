(function () {
  const queue = [
    "local-images-feature.js",
    "game-cards-core.js",
    "game-cards-source-bridge.js",
    "game-cards-layouts.js",
    "game-cards-edges.js",
    "game-cards-sizing.js",
    "game-cards-decoration.js",
    "game-cards-render.js",
    "game-cards-decoration-render.js",
    "game-cards-ui.js",
    "game-cards-size-ui.js",
    "game-cards-print-ui.js",
    "game-cards-decoration-ui.js",
    "game-cards-ui-enhance.js",
    "game-cards-state-guard.js",
    "game-cards-generation-state.js",
    "game-cards-range-ui.js",
    "game-cards-workflow-ui.js",
    "game-cards-reorganize-ui.js",
    "game-cards-workspace-ui.js",
    "game-cards-education-theme.js"
  ];
  let index = 0;
  let finished = false;

  function finishBoot() {
    if (finished) return;
    finished = true;
    const reveal = () => {
      document.documentElement.classList.remove("ux-booting");
      window.dispatchEvent(new CustomEvent("picto:ux-ready"));
    };
    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(() => requestAnimationFrame(reveal));
    } else {
      setTimeout(reveal, 0);
    }
  }

  function loadNext() {
    if (index >= queue.length) {
      finishBoot();
      return;
    }
    const script = document.createElement("script");
    script.src = queue[index++];
    script.async = false;
    script.onload = loadNext;
    script.onerror = () => {
      console.error("No se pudo cargar", script.src);
      loadNext();
    };
    document.head.appendChild(script);
  }
  // Salvaguarda: nunca dejar la aplicación oculta si un navegador bloquea
  // inesperadamente algún módulo. Los scripts son locales y normalmente
  // terminan mucho antes de este límite.
  setTimeout(finishBoot, 5000);
  loadNext();
})();
