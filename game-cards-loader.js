(function () {
  const queue = [
    "local-images-feature.js",
    "game-cards-core.js",
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
    "game-cards-ui-enhance.js"
  ];
  let index = 0;
  function loadNext() {
    if (index >= queue.length) return;
    const script = document.createElement("script");
    script.src = queue[index++];
    script.async = false;
    script.onload = loadNext;
    script.onerror = () => console.error("No se pudo cargar", script.src);
    document.head.appendChild(script);
  }
  loadNext();
})();
