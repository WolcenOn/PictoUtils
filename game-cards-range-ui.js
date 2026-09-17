(function () {
  const G = window.PictoGame;
  if (!G) return;

  const specs = [
    // Tarjeta normal: solo parámetros visuales continuos.
    { id: "borderWidthInput", min: 0, max: 8, step: .1, unit: "mm" },
    { id: "cardWInput", min: 20, max: 250, step: 1, unit: "mm" },
    { id: "cardHInput", min: 20, max: 250, step: 1, unit: "mm" },
    { id: "innerMarginInput", min: 0, max: 50, step: .5, unit: "mm" },
    { id: "gapInput", min: 0, max: 30, step: .5, unit: "mm" },
    { id: "picSizeInput", min: 10, max: 160, step: 1, unit: "mm" },
    { id: "textGapMmInput", min: 0, max: 30, step: .5, unit: "mm" },
    { id: "fontSizeInput", min: 8, max: 160, step: 1, unit: "px" },

    // Tarjetas de juego.
    { id: "gameWidthMm", min: 30, max: 250, step: 1, unit: "mm" },
    { id: "gameHeightMm", min: 30, max: 250, step: 1, unit: "mm" },
    { id: "gameItemGapMm", min: 0, max: 30, step: .5, unit: "mm" },
    { id: "gameEdgePaddingMm", min: 0, max: 40, step: .5, unit: "mm" },
    { id: "gameImageSizeMm", min: 2.5, max: 160, step: .5, unit: "mm" },
    { id: "gameFontSizePx", min: 7, max: 160, step: 1, unit: "px" },

    // Textura y texto decorativo: especialmente útiles con vista previa viva.
    { id: "gameTextureScale", min: 10, max: 500, step: 5, unit: "%" },
    { id: "gameTextureOpacity", min: 0, max: 100, step: 1, unit: "%" },
    { id: "gameTextureRotation", min: -180, max: 180, step: 1, unit: "°" },
    { id: "gameTextureOffsetX", min: -100, max: 100, step: 1, unit: "mm" },
    { id: "gameTextureOffsetY", min: -100, max: 100, step: 1, unit: "mm" },
    { id: "gameOverlayTextSize", min: 7, max: 240, step: 1, unit: "px" },
    { id: "gameOverlayTextOpacity", min: 0, max: 100, step: 1, unit: "%" },
    { id: "gameOverlayTextRotation", min: -180, max: 180, step: 1, unit: "°" },
    { id: "gameOverlayTextOffsetX", min: -100, max: 100, step: 1, unit: "mm" },
    { id: "gameOverlayTextOffsetY", min: -100, max: 100, step: 1, unit: "mm" },

    // Ajustes de impresión hexagonal.
    { id: "gameHexPrintGapMm", min: 0, max: 20, step: .5, unit: "mm" },
    { id: "gameHexPrintMarginMm", min: 6, max: 30, step: .5, unit: "mm" }
  ];

  const pairs = new Map();

  function addStyles() {
    if (document.getElementById("ux-range-style")) return;
    const style = document.createElement("style");
    style.id = "ux-range-style";
    style.textContent = `
      .ux-range-addon{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:8px;margin-top:2px;min-width:0}
      .ux-range-addon input[type="range"]{width:100%;min-width:0;accent-color:var(--brand);cursor:pointer}
      .ux-range-addon input[type="range"]:disabled{cursor:not-allowed;opacity:.45}
      .ux-range-readout{min-width:56px;text-align:right;color:var(--muted);font-size:.76rem;font-variant-numeric:tabular-nums;white-space:nowrap}
      .ux-range-number{font-variant-numeric:tabular-nums}
      @media (max-width:520px){.ux-range-addon{grid-template-columns:minmax(0,1fr) 54px}.ux-range-readout{font-size:.72rem}}
    `;
    document.head.appendChild(style);
  }

  function decimals(step) {
    const text = String(step);
    if (text.includes("e-")) return parseInt(text.split("e-")[1], 10) || 0;
    return (text.split(".")[1] || "").length;
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function numericValue(input, fallback) {
    const n = parseFloat(input?.value);
    return Number.isFinite(n) ? n : fallback;
  }

  function formatValue(value, spec) {
    const places = decimals(spec.step);
    const rounded = Number(value.toFixed(places));
    return places ? rounded.toFixed(places).replace(/\.0+$/, "").replace(/(\.\d*?)0+$/, "$1") : String(Math.round(rounded));
  }

  function visibleValue(input, spec) {
    const value = numericValue(input, spec.min);
    return `${formatValue(value, spec)}${spec.unit ? ` ${spec.unit}` : ""}`;
  }

  function syncPair(id) {
    const pair = pairs.get(id);
    if (!pair) return;
    const { input, range, output, spec } = pair;
    const raw = numericValue(input, spec.min);
    range.value = String(clamp(raw, spec.min, spec.max));
    range.disabled = !!input.disabled;
    output.textContent = visibleValue(input, spec);
  }

  function dispatchFromRange(input, type) {
    input.dispatchEvent(new Event(type, { bubbles: true }));
  }

  function enhance(spec) {
    const input = document.getElementById(spec.id);
    if (!input || input.dataset.uxRangeBound === "1") return;
    if (input.type !== "number") return;

    input.dataset.uxRangeBound = "1";
    input.classList.add("ux-range-number");

    const addon = document.createElement("div");
    addon.className = "ux-range-addon";
    addon.dataset.rangeFor = spec.id;

    const range = document.createElement("input");
    range.type = "range";
    range.min = String(spec.min);
    range.max = String(spec.max);
    range.step = String(spec.step);
    range.setAttribute("aria-label", `Ajuste deslizante de ${document.querySelector(`label[for="${spec.id}"]`)?.textContent?.trim() || spec.id}`);

    const output = document.createElement("output");
    output.className = "ux-range-readout";
    output.setAttribute("aria-live", "off");

    addon.append(range, output);
    input.insertAdjacentElement("afterend", addon);
    pairs.set(spec.id, { input, range, output, spec });
    syncPair(spec.id);

    range.addEventListener("input", () => {
      input.value = formatValue(parseFloat(range.value), spec);
      output.textContent = visibleValue(input, spec);
      dispatchFromRange(input, "input");
    });
    range.addEventListener("change", () => dispatchFromRange(input, "change"));

    input.addEventListener("input", () => syncPair(spec.id));
    input.addEventListener("change", () => syncPair(spec.id));

    const observer = new MutationObserver(() => syncPair(spec.id));
    observer.observe(input, { attributes: true, attributeFilter: ["disabled", "min", "max", "step"] });
  }

  function syncAll() {
    pairs.forEach((_pair, id) => syncPair(id));
  }

  function init() {
    addStyles();
    specs.forEach(enhance);

    // Algunos módulos actualizan .value por código (p. ej. “Copiar tamaños”).
    // Resincronizamos tras acciones de interfaz sin alterar sus listeners originales.
    document.addEventListener("click", () => setTimeout(syncAll, 0), true);
    document.addEventListener("change", () => setTimeout(syncAll, 0), true);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
