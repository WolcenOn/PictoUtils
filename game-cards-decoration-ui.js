(function () {
  const G = window.PictoGame;
  if (!G) return;

  function num(value, fallback) {
    const n = parseFloat(value);
    return Number.isFinite(n) ? n : fallback;
  }

  function esc(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function addStyles() {
    if (G.byId("game-decoration-style")) return;
    const style = document.createElement("style");
    style.id = "game-decoration-style";
    style.textContent = `
      .game-decoration-panel{border:1px solid color-mix(in srgb,currentColor 14%,transparent);border-radius:12px;padding:8px 10px}
      .game-decoration-panel>summary{cursor:pointer;font-weight:700;padding:4px 0}
      .game-decoration-grid{margin-top:8px}
      .game-texture-file-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
      .game-decoration-actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:8px}
      .game-decoration-subtitle{font-weight:700;margin:4px 0 0}
      .game-texture-library{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-top:4px}
      .game-texture-chip{display:inline-flex;gap:6px;align-items:center;max-width:100%;padding:4px 7px;border:1px solid color-mix(in srgb,currentColor 16%,transparent);border-radius:999px;background:color-mix(in srgb,currentColor 5%,transparent)}
      .game-texture-chip span{max-width:190px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .game-texture-chip button{border:0;background:transparent;cursor:pointer;padding:0 2px;font:inherit}
      .game-decoration-note{margin:3px 0 0}
    `;
    document.head.appendChild(style);
  }

  function fontOptions() {
    const fonts = typeof G.availableFonts === "function" ? G.availableFonts() : ["Open Sans"];
    return [`<option value="">Tipografía actual</option>`]
      .concat(fonts.map((font) => `<option value="${esc(font)}">${esc(font)}</option>`))
      .join("");
  }

  function installControls() {
    if (G.byId("gameDecorationPanel")) return;
    const generateRow = G.byId("gameGenerate")?.closest(".span-12");
    if (!generateRow) return;

    const wrap = document.createElement("div");
    wrap.className = "span-12";
    wrap.innerHTML = `
      <details class="game-decoration-panel" id="gameDecorationPanel" open>
        <summary>🎨 Texturas y capas de la tarjeta</summary>
        <div class="config-grid game-decoration-grid">
          <p class="span-12 game-decoration-subtitle">Biblioteca de texturas</p>
          <div class="control span-12"><label class="game-inline-check"><input id="gameTextureEnabled" type="checkbox"> Usar texturas de fondo</label></div>
          <div class="control span-12">
            <label for="gameTextureFile">Añadir texturas</label>
            <div class="game-texture-file-row">
              <input id="gameTextureFile" type="file" accept="image/*" multiple>
              <button class="btn-mini" id="gameTextureClear" type="button">Vaciar biblioteca</button>
              <span class="hint" id="gameTextureCount">0 texturas</span>
            </div>
            <div class="game-texture-library" id="gameTextureLibrary"></div>
          </div>
          <div class="control span-6"><label for="gameTextureDistribution">Reparto de texturas</label><select id="gameTextureDistribution"><option value="balanced">Equilibrado entre tarjetas</option><option value="random">Aleatorio</option></select></div>
          <div class="control span-6"><label for="gameTextureContentMode">Contenido sobre textura</label><select id="gameTextureContentMode"><option value="layout">Composición actual del juego</option><option value="texture-only">Solo textura</option><option value="word">Una palabra centrada</option><option value="visual">Un pictograma / imagen centrado</option></select></div>
          <p class="hint span-12 game-decoration-note" id="gameTextureModeNote"></p>

          <p class="span-12 game-decoration-subtitle">Ajuste de la textura</p>
          <div class="control span-6"><label for="gameTextureFit">Ajuste</label><select id="gameTextureFit"><option value="cover">Cubrir</option><option value="contain">Contener</option><option value="stretch">Estirar</option><option value="tile">Mosaico</option></select></div>
          <div class="control span-6"><label for="gameTextureScale">Escala (%)</label><input id="gameTextureScale" type="number" min="10" max="500" step="5"></div>
          <div class="control span-6"><label for="gameTextureOpacity">Opacidad (%)</label><input id="gameTextureOpacity" type="number" min="0" max="100" step="5"></div>
          <div class="control span-6"><label for="gameTextureRotation">Rotación (°)</label><input id="gameTextureRotation" type="number" min="-180" max="180" step="1"></div>
          <div class="control span-6"><label for="gameTextureOffsetX">Desplazamiento X (mm)</label><input id="gameTextureOffsetX" type="number" min="-100" max="100" step="1"></div>
          <div class="control span-6"><label for="gameTextureOffsetY">Desplazamiento Y (mm)</label><input id="gameTextureOffsetY" type="number" min="-100" max="100" step="1"></div>

          <p class="span-12 game-decoration-subtitle">Texto decorativo opcional</p>
          <div class="control span-12"><label class="game-inline-check"><input id="gameOverlayTextEnabled" type="checkbox"> Activar texto decorativo / marca de agua</label></div>
          <div class="control span-12"><label for="gameOverlayText">Texto</label><input id="gameOverlayText" type="text" placeholder="Ej. ANIMALES"></div>
          <div class="control span-6"><label for="gameOverlayTextLayer">Capa</label><select id="gameOverlayTextLayer"><option value="behind">Detrás del contenido</option><option value="above">Delante del contenido</option></select></div>
          <div class="control span-6"><label for="gameOverlayTextPosition">Posición</label><select id="gameOverlayTextPosition"><option value="top">Arriba</option><option value="center">Centro</option><option value="bottom">Abajo</option></select></div>
          <div class="control span-6"><label for="gameOverlayTextFont">Tipografía</label><select id="gameOverlayTextFont">${fontOptions()}</select></div>
          <div class="control span-6"><label for="gameOverlayTextSize">Tamaño (px)</label><input id="gameOverlayTextSize" type="number" min="7" max="240" step="1"></div>
          <div class="control span-6"><label for="gameOverlayTextColor">Color</label><input id="gameOverlayTextColor" type="color"></div>
          <div class="control span-6"><label for="gameOverlayTextOpacity">Opacidad (%)</label><input id="gameOverlayTextOpacity" type="number" min="0" max="100" step="5"></div>
          <div class="control span-6"><label for="gameOverlayTextRotation">Rotación (°)</label><input id="gameOverlayTextRotation" type="number" min="-180" max="180" step="1"></div>
          <div class="control span-6"><label for="gameOverlayTextOffsetX">Desplazamiento X (mm)</label><input id="gameOverlayTextOffsetX" type="number" min="-100" max="100" step="1"></div>
          <div class="control span-6"><label for="gameOverlayTextOffsetY">Desplazamiento Y (mm)</label><input id="gameOverlayTextOffsetY" type="number" min="-100" max="100" step="1"></div>
          <div class="span-12 game-decoration-actions"><button class="btn-mini" id="gameDecorationRefresh" type="button">↻ Actualizar vista previa</button><span class="hint">Las texturas se recortan automáticamente con la forma de la tarjeta.</span></div>
        </div>
      </details>`;
    generateRow.before(wrap);
  }

  function renderLibrary() {
    const host = G.byId("gameTextureLibrary");
    const count = G.byId("gameTextureCount");
    const library = Array.isArray(G.textureLibrary) ? G.textureLibrary : [];
    if (count) count.textContent = `${library.length} textura${library.length === 1 ? "" : "s"}`;
    if (!host) return;
    if (!library.length) {
      host.innerHTML = `<span class="hint">Aún no hay texturas cargadas. Puedes seleccionar varias imágenes a la vez.</span>`;
      return;
    }
    host.innerHTML = library.map((entry) => `<span class="game-texture-chip"><span title="${esc(entry.name)}">${esc(entry.name)}</span><button type="button" data-remove-texture="${esc(entry.id)}" aria-label="Quitar ${esc(entry.name)}">×</button></span>`).join("");
  }

  function modeNote() {
    const note = G.byId("gameTextureModeNote");
    if (!note) return;
    const mode = G.byId("gameTextureContentMode")?.value || G.cfg.textureCardContentMode || "layout";
    if (mode === "texture-only") note.textContent = "Cada tarjeta usa una textura como contenido principal. No necesitas introducir palabras ni pictogramas.";
    else if (mode === "word") note.textContent = "Cada tarjeta recibe una sola palabra centrada. Se reparten las palabras disponibles entre la tanda y se ignora Elementos por tarjeta.";
    else if (mode === "visual") note.textContent = "Cada tarjeta recibe un solo pictograma o imagen centrado sobre la textura. Se ignora Elementos por tarjeta.";
    else note.textContent = "La textura actúa como fondo y se conserva la distribución actual de palabras, pictogramas o imágenes del generador.";
  }

  function sync() {
    const values = {
      gameTextureDistribution: G.cfg.textureDistribution || "balanced",
      gameTextureContentMode: G.cfg.textureCardContentMode || "layout",
      gameTextureFit: G.cfg.textureFit || "cover",
      gameTextureScale: num(G.cfg.textureScalePercent, 110),
      gameTextureOpacity: num(G.cfg.textureOpacityPercent, 100),
      gameTextureRotation: num(G.cfg.textureRotation, 0),
      gameTextureOffsetX: num(G.cfg.textureOffsetXmm, 0),
      gameTextureOffsetY: num(G.cfg.textureOffsetYmm, 0),
      gameOverlayText: G.cfg.overlayText || "",
      gameOverlayTextLayer: G.cfg.overlayTextLayer || "behind",
      gameOverlayTextPosition: G.cfg.overlayTextPosition || "center",
      gameOverlayTextFont: G.cfg.overlayTextFontFamily || "",
      gameOverlayTextSize: num(G.cfg.overlayTextSizePx, 48),
      gameOverlayTextColor: G.cfg.overlayTextColor || "#000000",
      gameOverlayTextOpacity: num(G.cfg.overlayTextOpacityPercent, 28),
      gameOverlayTextRotation: num(G.cfg.overlayTextRotation, 0),
      gameOverlayTextOffsetX: num(G.cfg.overlayTextOffsetXmm, 0),
      gameOverlayTextOffsetY: num(G.cfg.overlayTextOffsetYmm, 0)
    };
    Object.entries(values).forEach(([id, value]) => { const el = G.byId(id); if (el) el.value = String(value); });
    if (G.byId("gameTextureEnabled")) G.byId("gameTextureEnabled").checked = !!G.cfg.textureEnabled;
    if (G.byId("gameOverlayTextEnabled")) G.byId("gameOverlayTextEnabled").checked = !!G.cfg.overlayTextEnabled;
    renderLibrary();
    modeNote();
  }

  function read() {
    G.cfg.textureEnabled = !!G.byId("gameTextureEnabled")?.checked;
    G.cfg.textureDistribution = G.byId("gameTextureDistribution")?.value === "random" ? "random" : "balanced";
    const contentMode = G.byId("gameTextureContentMode")?.value;
    G.cfg.textureCardContentMode = ["layout", "texture-only", "word", "visual"].includes(contentMode) ? contentMode : "layout";
    G.cfg.textureFit = ["cover", "contain", "stretch", "tile"].includes(G.byId("gameTextureFit")?.value) ? G.byId("gameTextureFit").value : "cover";
    G.cfg.textureScalePercent = G.clamp(num(G.byId("gameTextureScale")?.value, 110), 10, 500);
    G.cfg.textureOpacityPercent = G.clamp(num(G.byId("gameTextureOpacity")?.value, 100), 0, 100);
    G.cfg.textureRotation = G.clamp(num(G.byId("gameTextureRotation")?.value, 0), -180, 180);
    G.cfg.textureOffsetXmm = G.clamp(num(G.byId("gameTextureOffsetX")?.value, 0), -100, 100);
    G.cfg.textureOffsetYmm = G.clamp(num(G.byId("gameTextureOffsetY")?.value, 0), -100, 100);
    G.cfg.overlayTextEnabled = !!G.byId("gameOverlayTextEnabled")?.checked;
    G.cfg.overlayText = String(G.byId("gameOverlayText")?.value || "");
    G.cfg.overlayTextLayer = G.byId("gameOverlayTextLayer")?.value === "above" ? "above" : "behind";
    G.cfg.overlayTextPosition = ["top", "center", "bottom"].includes(G.byId("gameOverlayTextPosition")?.value) ? G.byId("gameOverlayTextPosition").value : "center";
    G.cfg.overlayTextFontFamily = String(G.byId("gameOverlayTextFont")?.value || "");
    G.cfg.overlayTextSizePx = G.clamp(num(G.byId("gameOverlayTextSize")?.value, 48), 7, 240);
    G.cfg.overlayTextColor = G.byId("gameOverlayTextColor")?.value || "#000000";
    G.cfg.overlayTextOpacityPercent = G.clamp(num(G.byId("gameOverlayTextOpacity")?.value, 28), 0, 100);
    G.cfg.overlayTextRotation = G.clamp(num(G.byId("gameOverlayTextRotation")?.value, 0), -180, 180);
    G.cfg.overlayTextOffsetXmm = G.clamp(num(G.byId("gameOverlayTextOffsetX")?.value, 0), -100, 100);
    G.cfg.overlayTextOffsetYmm = G.clamp(num(G.byId("gameOverlayTextOffsetY")?.value, 0), -100, 100);
    G.saveCfg();
    modeNote();
  }

  function refreshPreview() {
    read();
    if (!G.cards?.length) return;
    const generate = G.byId("gameGenerate");
    if (!generate) return;
    const seedInput = G.byId("gameSeed");
    const previousSeed = seedInput?.value || "";
    const previousCfgSeed = G.cfg.seed || "";
    if (seedInput && !previousSeed && G.lastSeed) seedInput.value = G.lastSeed;
    generate.click();
    setTimeout(() => {
      if (seedInput) seedInput.value = previousSeed;
      G.cfg.seed = previousCfgSeed;
      G.saveCfg();
    }, 0);
  }

  function bind() {
    const ids = [
      "gameTextureEnabled", "gameTextureDistribution", "gameTextureContentMode", "gameTextureFit", "gameTextureScale", "gameTextureOpacity", "gameTextureRotation", "gameTextureOffsetX", "gameTextureOffsetY",
      "gameOverlayTextEnabled", "gameOverlayText", "gameOverlayTextLayer", "gameOverlayTextPosition", "gameOverlayTextFont", "gameOverlayTextSize", "gameOverlayTextColor",
      "gameOverlayTextOpacity", "gameOverlayTextRotation", "gameOverlayTextOffsetX", "gameOverlayTextOffsetY"
    ];
    ids.forEach((id) => {
      const el = G.byId(id);
      if (!el || el.dataset.gameDecorationBound) return;
      el.dataset.gameDecorationBound = "1";
      el.addEventListener("input", read);
      el.addEventListener("change", read);
    });

    const file = G.byId("gameTextureFile");
    if (file && !file.dataset.gameDecorationBound) {
      file.dataset.gameDecorationBound = "1";
      file.addEventListener("change", () => {
        if (typeof G.addGameTextureFiles === "function") G.addGameTextureFiles(file.files || []);
        file.value = "";
        const enabled = G.byId("gameTextureEnabled");
        if (enabled && G.textureLibrary?.length) enabled.checked = true;
        sync();
      });
    }

    const library = G.byId("gameTextureLibrary");
    if (library && !library.dataset.gameDecorationBound) {
      library.dataset.gameDecorationBound = "1";
      library.addEventListener("click", (event) => {
        const button = event.target.closest("[data-remove-texture]");
        if (!button) return;
        if (typeof G.removeGameTexture === "function") G.removeGameTexture(button.dataset.removeTexture);
        sync();
      });
    }

    const clear = G.byId("gameTextureClear");
    if (clear && !clear.dataset.gameDecorationBound) {
      clear.dataset.gameDecorationBound = "1";
      clear.addEventListener("click", () => {
        if (typeof G.clearGameTextures === "function") G.clearGameTextures();
        if (file) file.value = "";
        sync();
      });
    }

    const refresh = G.byId("gameDecorationRefresh");
    if (refresh && !refresh.dataset.gameDecorationBound) {
      refresh.dataset.gameDecorationBound = "1";
      refresh.addEventListener("click", refreshPreview);
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