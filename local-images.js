(function () {
  const LOCAL_SOURCE = "local";
  const localObjectUrls = new Set();
  const MM_TO_PX_FALLBACK = 3;
  let resultCardCssInjected = false;

  function byId(id) {
    return document.getElementById(id);
  }

  function filenameWithoutExtension(filename) {
    return String(filename || "")
      .replace(/^.*[\\/]/, "")
      .replace(/\.[^.]+$/, "")
      .trim();
  }

  function isSupportedImage(file) {
    if (!file) return false;
    if (file.type && file.type.startsWith("image/")) return true;
    return /\.(png|jpe?g|webp|gif|bmp|svg|avif)$/i.test(file.name || "");
  }

  function naturalPath(file) {
    return file.webkitRelativePath || file.name || "";
  }

  function revokeLocalObjectUrls() {
    localObjectUrls.forEach((url) => URL.revokeObjectURL(url));
    localObjectUrls.clear();
  }

  function createLocalPicto(file) {
    const word = filenameWithoutExtension(file.name);
    const imageUrl = URL.createObjectURL(file);
    localObjectUrls.add(imageUrl);

    return {
      source: LOCAL_SOURCE,
      imageUrl,
      fileName: file.name,
      relativePath: file.webkitRelativePath || file.name,
      keywords: [{ keyword: word }]
    };
  }

  function isLocalPicto(picto) {
    return !!(picto && typeof picto === "object" && picto.source === LOCAL_SOURCE);
  }

  function currentPicto(item) {
    if (!item || !Array.isArray(item.pictograms)) return null;
    return item.pictograms[item.current || 0] || null;
  }

  function hasOnlyLocalResults() {
    return Array.isArray(items) && items.length > 0 && items.every((item) => isLocalPicto(currentPicto(item)));
  }

  function localImageSizeMm() {
    const configured = parseFloat(cfg.localImageSize);
    if (Number.isFinite(configured) && configured > 0) return configured;
    const fallback = parseFloat(cfg.picSize);
    return Number.isFinite(fallback) && fallback > 0 ? fallback : 50;
  }

  function mediaSizeMmForItem(item) {
    const picto = currentPicto(item);
    return isLocalPicto(picto)
      ? localImageSizeMm()
      : Math.max(5, parseFloat(cfg.picSize) || 50);
  }

  async function withLocalPrintSettings(callback) {
    if (!hasOnlyLocalResults()) return await callback();

    const previousPicSize = cfg.picSize;
    const previousArasaacLogo = cfg.showArasaacLogo;
    cfg.picSize = localImageSizeMm();
    cfg.showArasaacLogo = false;

    try {
      return await callback();
    } finally {
      cfg.picSize = previousPicSize;
      cfg.showArasaacLogo = previousArasaacLogo;
    }
  }

  function updateStatus(message) {
    const live = byId("resultados-hint");
    if (live) live.textContent = message;
  }

  function injectResultCardCss() {
    if (resultCardCssInjected || byId("local-result-card-css")) return;
    resultCardCssInjected = true;

    const style = document.createElement("style");
    style.id = "local-result-card-css";
    style.textContent = `
      .result-print-surface {
        position: relative;
        width: 100%;
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        border-radius: 0;
      }
      .result-print-surface .card-media-wrap {
        flex: 1 1 auto;
        min-height: 0;
        margin: 0;
        overflow: hidden;
        border-radius: 0;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .result-print-surface .pic-image {
        display: block;
        width: auto;
        height: auto;
        max-width: none;
        max-height: none;
        margin: auto;
        border: 0;
        border-radius: 0;
        background: transparent;
        object-fit: contain;
      }
      .result-print-surface .word-text,
      .result-print-surface .media-text {
        color: #000 !important;
        font-family: var(--card-font);
        font-weight: var(--card-font-weight);
      }
      .result-print-surface .word-text {
        flex: 0 0 auto;
        margin-left: 0;
        margin-right: 0;
        margin-bottom: 0;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: clip;
        line-height: 1.15;
        text-align: center;
      }
      .result-print-surface .media-text {
        min-height: 0;
        padding: 0;
        line-height: 1.15;
      }
      .grid-item > .arrows-container {
        margin-bottom: 8px;
      }
    `;
    document.head.appendChild(style);
  }

  function fitResultText(cap, surface, desiredPx) {
    if (!cap || cap.style.display === "none" || !cap.textContent || cfg.writeLinesMode) return;

    const contentWidth = Math.max(1, surface.clientWidth - (parseFloat(surface.style.paddingLeft) || 0) * 2);
    const family = cfg.fontFamily || "Open Sans";
    const weight = cfg.fontWeight || 400;
    const canvas = fitResultText.canvas || (fitResultText.canvas = document.createElement("canvas"));
    const ctx = canvas.getContext("2d");
    ctx.font = `${weight} ${desiredPx}px "${family}", sans-serif`;
    const measured = ctx.measureText(cap.textContent).width;
    const fitted = measured > contentWidth ? desiredPx * (contentWidth / measured) : desiredPx;
    cap.style.fontSize = `${Math.max(6, fitted)}px`;
  }

  function syncResultCardSurface(el, item) {
    const surface = el.querySelector(".result-print-surface");
    if (!surface) return;

    const mediaWrap = surface.querySelector(".card-media-wrap");
    const img = surface.querySelector(".pic-image");
    const mediaText = surface.querySelector(".media-text");
    const cap = surface.querySelector(".word-text");
    if (!mediaWrap || !cap) return;

    const cardWmm = Math.max(10, parseFloat(cfg.cardW) || 60);
    const cardHmm = Math.max(10, parseFloat(cfg.cardH) || 100);
    const widthPx = Math.max(1, surface.clientWidth || el.clientWidth || 180);
    const pxPerMm = widthPx / cardWmm;
    const marginMm = Math.max(0, parseFloat(cfg.innerMargin) || 0);
    const borderMm = Math.max(0, parseFloat(cfg.borderWidthMm) || 0);
    const textGapMm = Math.max(0, parseFloat(cfg.textGapMm) || 0) + (cfg.autoTextGap ? 2 : 0);
    const fontMm = Math.max(0, parseFloat(cfg.fontSize) || 0) / MM_TO_PX_FALLBACK;
    const desiredFontPx = Math.max(6, fontMm * pxPerMm);
    const imageBoxPx = Math.max(5, mediaSizeMmForItem(item) * pxPerMm);

    surface.style.height = `${cardHmm * pxPerMm}px`;
    surface.style.padding = `${marginMm * pxPerMm}px`;
    surface.style.background = typeof getItemBgColor === "function" ? getItemBgColor(item) : (cfg.bgColor || "#fff");
    surface.style.borderStyle = "solid";
    surface.style.borderWidth = `${borderMm * pxPerMm}px`;

    const picto = currentPicto(item);
    const shownWord = typeof displayWord === "function" ? displayWord(item.word || "") : (item.word || "");
    surface.style.borderColor = typeof effectiveBorderColor === "function"
      ? effectiveBorderColor(shownWord, (picto && typeof picto === "object") ? picto : null, item)
      : (cfg.borderColor || "#000");

    mediaWrap.style.minHeight = "0";
    mediaWrap.style.flex = "1 1 auto";

    if (img) {
      img.style.maxWidth = `${imageBoxPx}px`;
      img.style.maxHeight = `${imageBoxPx}px`;
    }

    if (mediaText) {
      mediaText.style.fontSize = `${desiredFontPx}px`;
      mediaText.style.color = "#000";
    }

    cap.style.color = "#000";
    cap.style.marginTop = `${textGapMm * pxPerMm}px`;

    if (cfg.modeImageOnly || (!cfg.writeLinesMode && fontMm <= 0)) {
      cap.style.display = "none";
    }

    if (!cfg.modeImageOnly && !cfg.writeLinesMode && cap.style.display !== "none") {
      cap.style.display = "block";
      cap.style.fontSize = `${desiredFontPx}px`;
      requestAnimationFrame(() => fitResultText(cap, surface, desiredFontPx));
    }
  }

  function decorateResultCard(el, item) {
    injectResultCardCss();
    if (!el || el.querySelector(".result-print-surface")) return;

    const nav = el.querySelector(":scope > .arrows-container");
    const mediaWrap = el.querySelector(":scope > .card-media-wrap");
    const cap = el.querySelector(":scope > .word-text");
    if (!mediaWrap || !cap) return;

    const surface = document.createElement("div");
    surface.className = "result-print-surface";
    if (nav) nav.insertAdjacentElement("afterend", surface);
    else el.prepend(surface);
    surface.append(mediaWrap, cap);

    const resync = () => requestAnimationFrame(() => syncResultCardSurface(el, item));
    resync();

    const elementObserver = new MutationObserver(resync);
    elementObserver.observe(el, { attributes: true, attributeFilter: ["style"] });

    const contentObserver = new MutationObserver(resync);
    contentObserver.observe(cap, { childList: true, characterData: true, subtree: true });

    const img = surface.querySelector(".pic-image");
    if (img) {
      const imageObserver = new MutationObserver(resync);
      imageObserver.observe(img, { attributes: true, attributeFilter: ["src"] });
    }

    if (typeof ResizeObserver === "function") {
      const resizeObserver = new ResizeObserver(resync);
      resizeObserver.observe(surface);
    }
  }

  function installFaithfulResultRenderer() {
    if (typeof renderItem !== "function" || renderItem.__localImageEnhanced) return;
    const originalRenderItem = renderItem;

    const enhanced = function (el, item) {
      originalRenderItem(el, item);
      decorateResultCard(el, item);
    };
    enhanced.__localImageEnhanced = true;
    renderItem = enhanced;
  }

  function installPreviewSizeBridge() {
    if (typeof showPrintPreview !== "function" || showPrintPreview.__localImageSizeAware) return;
    const originalShowPrintPreview = showPrintPreview;

    const enhancedPreview = async function (...args) {
      return await withLocalPrintSettings(() => originalShowPrintPreview.apply(this, args));
    };
    enhancedPreview.__localImageSizeAware = true;
    showPrintPreview = enhancedPreview;
  }

  function wrapAsyncButtonHandler(id) {
    const button = byId(id);
    if (!button || typeof button.onclick !== "function" || button.dataset.localImageWrapped === "1") return;
    const original = button.onclick;
    button.dataset.localImageWrapped = "1";
    button.onclick = async function (event) {
      return await withLocalPrintSettings(() => original.call(this, event));
    };
  }

  function addLocalImageSizeControl() {
    if (byId("localImageSizeInput")) return;
    const pictogramSizeInput = byId("picSizeInput");
    const pictogramControl = pictogramSizeInput?.closest(".control");
    if (!pictogramSizeInput || !pictogramControl) return;

    if (!(parseFloat(cfg.localImageSize) > 0)) {
      cfg.localImageSize = Math.max(5, parseFloat(cfg.picSize) || 50);
      if (typeof saveCfg === "function") saveCfg();
    }

    const control = document.createElement("div");
    control.className = "control span-6";

    const label = document.createElement("label");
    label.htmlFor = "localImageSizeInput";
    label.textContent = "Tamaño imagen local (mm)";

    const input = document.createElement("input");
    input.id = "localImageSizeInput";
    input.type = "number";
    input.inputMode = "numeric";
    input.min = "5";
    input.value = String(localImageSizeMm());

    const hint = document.createElement("p");
    hint.className = "hint";
    hint.textContent = "Solo afecta a las imágenes cargadas desde el equipo; no cambia el tamaño de ARASAAC.";

    control.append(label, input, hint);
    pictogramControl.insertAdjacentElement("afterend", control);

    const apply = () => {
      cfg.localImageSize = Math.max(5, parseFloat(input.value) || 50);
      input.value = String(cfg.localImageSize);
      if (typeof saveCfg === "function") saveCfg();
      if (typeof renderAll === "function") renderAll();
      if (typeof showPrintPreview === "function") showPrintPreview();
    };

    input.addEventListener("change", apply);
    input.addEventListener("input", () => {
      const value = parseFloat(input.value);
      if (Number.isFinite(value) && value > 0) cfg.localImageSize = value;
    });
  }

  async function loadLocalImages(fileList) {
    const files = Array.from(fileList || [])
      .filter(isSupportedImage)
      .sort((a, b) => naturalPath(a).localeCompare(naturalPath(b), undefined, {
        numeric: true,
        sensitivity: "base"
      }));

    if (!files.length) {
      updateStatus("No se encontraron imágenes compatibles.");
      alert("No se encontraron imágenes compatibles en la selección.");
      return;
    }

    revokeLocalObjectUrls();

    const container = byId("grid-container");
    if (!container) return;

    items = [];
    container.innerHTML = "";

    for (const file of files) {
      const picto = createLocalPicto(file);
      const word = picto.keywords[0].keyword || "imagen";
      const item = {
        pictograms: [picto],
        current: 0,
        word,
        borderOverride: { mode: "auto" },
        bgOverride: { mode: "global" },
        tenseOverride: "none"
      };

      items.push(item);

      const cell = document.createElement("div");
      cell.className = "grid-item";
      container.appendChild(cell);
      renderItem(cell, item);
    }

    const wordsInput = byId("input-words");
    if (wordsInput) {
      wordsInput.value = items.map((item) => item.word).join(cfg.separator === "commas" ? ", " : " ");
    }

    updateStatus(`${items.length} imagen(es) local(es) cargadas.`);

    if (typeof updateFitInfo === "function") updateFitInfo();
    if (typeof showPrintPreview === "function") await showPrintPreview();
  }

  function addLocalImageControls() {
    const searchButton = byId("btn-search");
    const actions = searchButton?.closest(".buttons-container");
    if (!actions || byId("btn-local-folder")) return;

    const imageInput = document.createElement("input");
    imageInput.id = "localImagesInput";
    imageInput.type = "file";
    imageInput.accept = "image/*,.svg,.avif";
    imageInput.multiple = true;
    imageInput.hidden = true;

    const folderInput = document.createElement("input");
    folderInput.id = "localFolderInput";
    folderInput.type = "file";
    folderInput.accept = "image/*,.svg,.avif";
    folderInput.multiple = true;
    folderInput.hidden = true;
    folderInput.setAttribute("webkitdirectory", "");
    folderInput.setAttribute("directory", "");

    const imageButton = document.createElement("button");
    imageButton.id = "btn-local-images";
    imageButton.type = "button";
    imageButton.textContent = "🖼️ Cargar imágenes";
    imageButton.title = "Seleccionar una o varias imágenes del equipo";

    const folderButton = document.createElement("button");
    folderButton.id = "btn-local-folder";
    folderButton.type = "button";
    folderButton.textContent = "📁 Cargar carpeta";
    folderButton.title = "Crear una tarjeta por cada imagen de una carpeta";

    searchButton.insertAdjacentElement("afterend", folderButton);
    searchButton.insertAdjacentElement("afterend", imageButton);
    actions.append(imageInput, folderInput);

    imageButton.addEventListener("click", () => imageInput.click());
    folderButton.addEventListener("click", () => folderInput.click());

    imageInput.addEventListener("change", async () => {
      await loadLocalImages(imageInput.files);
      imageInput.value = "";
    });

    folderInput.addEventListener("change", async () => {
      await loadLocalImages(folderInput.files);
      folderInput.value = "";
    });

    searchButton.addEventListener("click", revokeLocalObjectUrls, { capture: true });
  }

  if (typeof pictoUrl === "function") {
    const originalPictoUrl = pictoUrl;
    pictoUrl = function (p) {
      if (isLocalPicto(p)) return p.imageUrl || "";
      return originalPictoUrl(p);
    };
  }

  installFaithfulResultRenderer();
  installPreviewSizeBridge();
  window.addEventListener("beforeunload", revokeLocalObjectUrls);

  function initializeLocalImageEnhancements() {
    addLocalImageControls();
    addLocalImageSizeControl();
    injectResultCardCss();
    wrapAsyncButtonHandler("btn-print-pdf");
    wrapAsyncButtonHandler("btn-print-system");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeLocalImageEnhancements, { once: true });
  } else {
    initializeLocalImageEnhancements();
  }
})();
