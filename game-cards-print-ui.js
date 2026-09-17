(function () {
  const G = window.PictoGame;
  if (!G) return;

  if (G.cfg.hexPrintMode !== "honeycomb" && G.cfg.hexPrintMode !== "easy") G.cfg.hexPrintMode = "honeycomb";
  if (!Number.isFinite(parseFloat(G.cfg.hexPrintGapMm))) G.cfg.hexPrintGapMm = 2;
  if (!Number.isFinite(parseFloat(G.cfg.hexPrintPageMarginMm))) G.cfg.hexPrintPageMarginMm = 9;
  G.saveCfg();

  function addStyles() {
    if (G.byId("game-print-ui-style")) return;
    const style = document.createElement("style");
    style.id = "game-print-ui-style";
    style.textContent = `.game-hex-print-note{margin:4px 0 0}.game-hex-print-controls[hidden]{display:none!important}`;
    document.head.appendChild(style);
  }

  function installControls() {
    if (G.byId("gameHexPrintMode")) return;
    const generateRow = G.byId("gameGenerate")?.closest(".span-12");
    const grid = generateRow?.parentElement;
    if (!generateRow || !grid) return;

    const block = document.createElement("div");
    block.className = "span-12 game-hex-print-controls";
    block.id = "gameHexPrintControls";
    block.innerHTML = `
      <div class="config-grid">
        <div class="control span-6">
          <label for="gameHexPrintMode">Impresión de hexágonos</label>
          <select id="gameHexPrintMode">
            <option value="honeycomb">Colmena compacta</option>
            <option value="easy">Filas separadas · corte fácil</option>
          </select>
        </div>
        <div class="control span-6">
          <label for="gameHexPrintGapMm">Separación PDF (mm)</label>
          <input id="gameHexPrintGapMm" type="number" min="0" max="20" step="0.5" inputmode="decimal">
        </div>
        <div class="control span-6">
          <label for="gameHexPrintMarginMm">Margen de página (mm)</label>
          <input id="gameHexPrintMarginMm" type="number" min="6" max="30" step="0.5" inputmode="decimal">
        </div>
        <p class="hint span-12 game-hex-print-note">Colmena compacta intercala las columnas y aprovecha las esquinas transparentes del hexágono. Con separación 0 mm, los lados quedan prácticamente compartidos y se reduce el número de cortes.</p>
      </div>`;
    generateRow.before(block);
  }

  function sync() {
    const mode = G.byId("gameHexPrintMode");
    const gap = G.byId("gameHexPrintGapMm");
    const margin = G.byId("gameHexPrintMarginMm");
    if (mode) mode.value = G.cfg.hexPrintMode || "honeycomb";
    if (gap) gap.value = String(G.cfg.hexPrintGapMm ?? 2);
    if (margin) margin.value = String(G.cfg.hexPrintPageMarginMm ?? 9);
    updateVisibility();
  }

  function read() {
    G.cfg.hexPrintMode = G.byId("gameHexPrintMode")?.value === "easy" ? "easy" : "honeycomb";
    const gap = parseFloat(G.byId("gameHexPrintGapMm")?.value);
    const margin = parseFloat(G.byId("gameHexPrintMarginMm")?.value);
    G.cfg.hexPrintGapMm = G.clamp(Number.isFinite(gap) ? gap : 2, 0, 20);
    G.cfg.hexPrintPageMarginMm = G.clamp(Number.isFinite(margin) ? margin : 9, 6, 30);
    G.saveCfg();
  }

  function updateVisibility() {
    const shape = G.byId("gameShape")?.value || G.cfg.shape;
    const block = G.byId("gameHexPrintControls");
    if (block) block.hidden = shape !== "hex";
  }

  function bind() {
    ["gameHexPrintMode", "gameHexPrintGapMm", "gameHexPrintMarginMm"].forEach((id) => {
      const el = G.byId(id);
      if (!el || el.dataset.gamePrintBound) return;
      el.dataset.gamePrintBound = "1";
      el.addEventListener("input", read);
      el.addEventListener("change", read);
    });
    const shape = G.byId("gameShape");
    if (shape && !shape.dataset.gamePrintBound) {
      shape.dataset.gamePrintBound = "1";
      shape.addEventListener("change", () => setTimeout(updateVisibility, 0));
    }
  }

  function init() {
    addStyles();
    installControls();
    sync();
    bind();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
