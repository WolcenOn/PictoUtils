(function () {
  const G = window.PictoGame;
  if (!G) return;

  function num(value, fallback) {
    const n = parseFloat(value);
    return Number.isFinite(n) ? n : fallback;
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
      .game-texture-file-name{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1}
      .game-decoration-actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:8px}
      .game-decoration-subtitle{font-weight:700;margin:4px 0 0}
    `;
    document.head.appendChild(style);
  }

  function fontOptions() {
    const fonts = typeof G.availableFonts === "function" ? G.availableFonts() : ["Open Sans"];
    return [`<option value="">Tipografía actual</option>`]
      .concat(fonts.map((font) => `<option value="${String(font).replace(/&/g, "&amp;").replace(/"/g, "&quot;")}">${font}</option>`))
      .join("");
  }

  function installControls() {
    if (G.byId("gameDecorationPanel")) return;
    const generateRow = G.byId("gameGenerate")?.closest(".span-12");
    if (!generateRow) return;

    const wrap = document.createElement("div");
    wrap.className = "span-12";
    wrap.innerHTML = `
      <details class="game-decoration-panel" id="gameDecorationPanel">
        <summary>🎨 Fondo, textura y texto decorativo</summary>
        <div class="config-grid game-decoration-grid">
          <p class="span-12 game-decoration-subtitle">Textura / imagen de fondo</p>
          <div class="control span-12"><label class="game-inline-check"><input id="gameTextureEnabled" type="checkbox"> Activar textura</label></div>
          <div class="control span-12"><label for="gameTextureFile">Imagen de textura</label><div class="game-texture-file-row"><input id="gameTextureFile" type="file" accept="image/*"><button class="btn-mini" id="gameTextureClear" type="button">Quitar</button><span class="hint game-texture-file-name" id="gameTextureFileName">Sin imagen</span></div></div>
          <div class="control span-6"><label for="gameTextureFit">Ajuste</label><select id="gameTextureFit"><option value="cover">Cubrir</option><option value="contain">Contener</option><option value="stretch">Estirar</option><option value="tile">Mosaico</option></select></div>
          <div class="control span-6"><label for="gameTextureScale">Escala (%)</label><input id="gameTextureScale" type="number" min="10" max="500" step="5"></div>
          <div class="control span-6"><label for="gameTextureOpacity">Opacidad (%)</label><input id="gameTextureOpacity" type="number" min="0" max="100" step="5"></div>
          <div class="control span-6"><label for="gameTextureRotation">Rotación (°)</label><input id="gameTextureRotation" type="number" min="-180" max="180" step="1"></div>
          <div class="control span-6"><label for="gameTextureOffsetX">Desplazamiento X (mm)</label><input id="gameTextureOffsetX" type="number" min="-100" max="100" step="1"></div>
          <div class="control span-6"><label for="gameTextureOffsetY">Desplazamiento Y (mm)</label><input id="gameTextureOffsetY" type="number" min="-100" max="100" step="1"></div>

          <p class="span-12 game-decoration-subtitle">Texto superpuesto</p>
          <div class="control span-12"><label class="game-inline-check"><input id="gameOverlayTextEnabled" type="checkbox"> Activar texto decorativo</label></div>
          <div class="control span-12"><label for="gameOverlayText">Texto</label><input id="gameOverlayText" type="text" placeholder="Ej. ANIMALES"></div>
          <div class="control span-6"><label for="gameOverlayTextLayer">Capa</label><select id="gameOverlayTextLayer"><option value="behind">Detrás de los elementos</option><option value="above">Delante de los elementos</option></select></div>
          <div class="control span-6"><label for="gameOverlayTextPosition">Posición</label><select id="gameOverlayTextPosition"><option value="top">Arriba</option><option value="center">Centro</option><option value="bottom">Abajo</option></select></div>
          <div class="control span-6"><label for="gameOverlayTextFont">Tipografía</label><select id="gameOverlayTextFont">${fontOptions()}</select></div>
          <div class="control span-6"><label for="gameOverlayTextSize">Tamaño (px)</label><input id="gameOverlayTextSize" type="number" min="7" max="240" step="1"></div>
          <div class="control span-6"><label for="gameOverlayTextColor">Color</label><input id="gameOverlayTextColor" type="color"></div>
          <div class="control span-6"><label for="gameOverlayTextOpacity">Opacidad (%)</label><input id="gameOverlayTextOpacity" type="number" min="0" max="100" step="5"></div>
          <div class="control span-6"><label for="gameOverlayTextRotation">Rotación (°)</label><input id="gameOverlayTextRotation" type="number" min="-180" max="180" step="1"></div>
          <div class="control span-6"><label for="gameOverlayTextOffsetX">Desplazamiento X (mm)</label><input id="gameOverlayTextOffsetX" type="number" min="-100" max="100" step="1"></div>
          <div class="control span-6"><label for="gameOverlayTextOffsetY">Desplazamiento Y (mm)</label><input id="gameOverlayTextOffsetY" type="number" min="-100" max="100" step="1"></div>
          <div class="span-12 game-decoration-actions"><button class="btn-mini" id="gameDecorationRefresh" type="button">↻ Actualizar vista previa</button><span class="hint">La textura queda recortada automáticamente por la forma de la tarjeta.</span></div>
        </div>
      </details>`;
    generateRow.before(wrap);
  }

  function sync() {
    const values = {
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
    const fileName = G.byId("gameTextureFileName");
    if (fileName) fileName.textContent = G.textureFileName || "Sin imagen (se selecciona de nuevo tras recargar)";
  }

  function read() {
    G.cfg.textureEnabled = !!G.byId("gameTextureEnabled")?.checked;
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
      "gameTextureEnabled", "gameTextureFit", "gameTextureScale", "gameTextureOpacity", "gameTextureRotation", "gameTextureOffsetX", "gameTextureOffsetY",
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
        const selected = file.files?.[0];
        if (selected && typeof G.setGameTextureFile === "function" && G.setGameTextureFile(selected)) {
          const enabled = G.byId("gameTextureEnabled");
          if (enabled) enabled.checked = true;
          sync();
        }
      });
    }

    const clear = G.byId("gameTextureClear");
    if (clear && !clear.dataset.gameDecorationBound) {
      clear.dataset.gameDecorationBound = "1";
      clear.addEventListener("click", () => {
        if (typeof G.clearGameTexture === "function") G.clearGameTexture();
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
