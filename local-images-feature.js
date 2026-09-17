(function () {
  const LOCAL_SOURCE = "local";
  const PDF_PX_PER_MM = 6;
  const MM_TO_PX = 3;
  const localObjectUrls = new Set();
  let localModeActive = false;
  let resultCssInjected = false;
  let renameTimer = null;
  const renderTokens = new WeakMap();

  const byId = (id) => document.getElementById(id);

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

  function isLocalPicto(picto) {
    return !!(picto && typeof picto === "object" && picto.source === LOCAL_SOURCE);
  }

  function currentPicto(item) {
    if (!item || !Array.isArray(item.pictograms)) return null;
    return item.pictograms[item.current || 0] || null;
  }

  function itemIsLocal(item) {
    return isLocalPicto(currentPicto(item));
  }

  function allCurrentItemsAreLocal() {
    return Array.isArray(items) && items.length > 0 && items.every(itemIsLocal);
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

  function updateStatus(message) {
    const live = byId("resultados-hint");
    if (live) live.textContent = message;
  }

  function localImageSizeMm() {
    const n = parseFloat(cfg.localImageSize);
    if (Number.isFinite(n) && n > 0) return n;
    return Math.max(5, parseFloat(cfg.picSize) || 50);
  }

  function cardRadiusMm() {
    const n = parseFloat(cfg.cardRadiusMm);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  }

  function shownWord(item, picto) {
    let raw = item?.word || "";
    if (picto && typeof picto === "object" && !cfg.writeLinesMode && cfg.caseOption !== "original") {
      raw = picto.keywords?.[0]?.keyword || raw;
    }
    return typeof displayWord === "function" ? displayWord(raw) : raw;
  }

  function cardBg(item) {
    return typeof getItemBgColor === "function" ? getItemBgColor(item) : (cfg.bgColor || "#fff");
  }

  function cardBorderColor(item, picto, word) {
    return typeof effectiveBorderColor === "function"
      ? effectiveBorderColor(word || item?.word || "", picto || null, item)
      : (cfg.borderColor || "#000");
  }

  function isHeuristicVerb(item) {
    if (typeof guessPos !== "function") return false;
    const picto = currentPicto(item);
    const pictoForGuess = picto && typeof picto === "object" ? picto : null;
    try {
      return guessPos(item?.word || "", pictoForGuess) === "verb";
    } catch (_) {
      return false;
    }
  }

  function roundedRectPath(ctx, x, y, w, h, radius) {
    const r = Math.max(0, Math.min(radius || 0, w / 2, h / 2));
    ctx.beginPath();
    if (r <= 0.01) {
      ctx.rect(x, y, w, h);
      return;
    }
    if (typeof ctx.roundRect === "function") {
      ctx.roundRect(x, y, w, h, r);
      return;
    }
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function canvasFontFor(sizePx) {
    if (typeof canvasFont === "function") return canvasFont(Math.round(sizePx));
    const family = String(cfg.fontFamily || "Open Sans").replace(/"/g, "");
    return `${parseInt(cfg.fontWeight, 10) || 400} ${Math.round(sizePx)}px "${family}", sans-serif`;
  }

  function loadImage(url) {
    return new Promise((resolve) => {
      if (!url) return resolve(null);
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = url;
    });
  }

  async function drawSourceLogo(ctx, picto, W, H) {
    if (!picto || cfg.modeTextOnly) return;
    const source = typeof pictoSource === "function" ? pictoSource(picto) : picto.source;

    if (source === "arasaac" && cfg.showArasaacLogo && typeof getArasaacLogoBitmap === "function") {
      try {
        const logo = await getArasaacLogoBitmap();
        if (!logo) return;
        const margin = Math.max(4, W * 0.02);
        const logoWidth = W * ((parseFloat(cfg.logoSizePercent) || 20) / 100);
        const scale = logoWidth / logo.width;
        const w = logo.width * scale;
        const h = logo.height * scale;
        let x = margin, y = margin;
        switch (cfg.logoPosition) {
          case "top-right": x = W - w - margin; break;
          case "bottom-left": y = H - h - margin; break;
          case "bottom-right": x = W - w - margin; y = H - h - margin; break;
        }
        ctx.save();
        ctx.globalAlpha = 0.92;
        ctx.drawImage(logo, x, y, w, h);
        ctx.restore();
      } catch (_) {}
    } else if (source === "soyvisual" && cfg.showSoyvisualLogo && typeof getSoyvisualLogoDataURL === "function") {
      const logo = await loadImage(getSoyvisualLogoDataURL());
      if (!logo) return;
      const margin = Math.max(4, W * 0.02);
      const maxW = Math.min(W * 0.34, 240);
      const scale = maxW / logo.width;
      ctx.save();
      ctx.globalAlpha = 0.92;
      ctx.drawImage(logo, margin, margin, logo.width * scale, logo.height * scale);
      ctx.restore();
    }
  }

  async function renderCardCanvas(item, pxPerMm) {
    const cardWmm = Math.max(10, parseFloat(cfg.cardW) || 60);
    const cardHmm = Math.max(10, parseFloat(cfg.cardH) || 100);
    const scale = Math.max(0.5, pxPerMm || PDF_PX_PER_MM);
    const W = Math.max(1, Math.round(cardWmm * scale));
    const H = Math.max(1, Math.round(cardHmm * scale));
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");

    const picto = currentPicto(item);
    const isObjectPicto = !!(picto && typeof picto === "object");
    const isLocal = isLocalPicto(picto);
    const radiusPx = isLocal ? cardRadiusMm() * scale : 0;
    const borderMm = Math.max(0, parseFloat(cfg.borderWidthMm) || 0);
    const borderPx = borderMm * scale;
    const word = shownWord(item, picto);

    ctx.clearRect(0, 0, W, H);
    roundedRectPath(ctx, 0, 0, W, H, radiusPx);
    ctx.fillStyle = cardBg(item);
    ctx.fill();

    ctx.save();
    roundedRectPath(ctx, 0, 0, W, H, radiusPx);
    ctx.clip();

    const marginPx = Math.max(0, parseFloat(cfg.innerMargin) || 0) * scale;
    const innerX = marginPx;
    const innerY = marginPx;
    const innerW = Math.max(1, W - marginPx * 2);
    const innerH = Math.max(1, H - marginPx * 2);
    const hasLines = !!cfg.writeLinesMode;
    const showTextOnly = !!cfg.modeTextOnly || !isObjectPicto;
    const showWord = !cfg.modeImageOnly && !hasLines && !cfg.modeTextOnly && (parseFloat(cfg.fontSize) || 0) > 0;

    const fontMm = Math.max(0, parseFloat(cfg.fontSize) || 0) / MM_TO_PX;
    const fontPx = Math.max(8, fontMm * scale);
    const linesMm = Math.max(0, parseFloat(cfg.linesDistance) || 30) / MM_TO_PX;
    const linesPx = Math.max(8, linesMm * scale);
    const textGapPx = showWord
      ? (Math.max(0, parseFloat(cfg.textGapMm) || 0) + (cfg.autoTextGap ? 2 : 0)) * scale
      : 0;
    const textH = showWord ? Math.round(fontPx * 1.25) : 0;
    const reservedBottom = hasLines ? (linesPx + 8 * scale) : (showWord ? textGapPx + textH + 6 * scale : 0);
    const mediaH = Math.max(1, innerH - reservedBottom);

    function fitFont(text, wantedPx, maxWidth) {
      let s = Math.max(8, wantedPx);
      ctx.font = canvasFontFor(s);
      while (ctx.measureText(text).width > maxWidth && s > 8) {
        s -= 1;
        ctx.font = canvasFontFor(s);
      }
      return s;
    }

    function drawCenteredText() {
      const s = fitFont(word, fontPx, innerW);
      ctx.font = canvasFontFor(s);
      ctx.fillStyle = "#000";
      ctx.textBaseline = "middle";
      const tw = ctx.measureText(word).width;
      ctx.fillText(word, innerX + (innerW - tw) / 2, innerY + innerH / 2);
      ctx.textBaseline = "alphabetic";
    }

    function drawWordBelow() {
      const s = fitFont(word, fontPx, innerW);
      ctx.font = canvasFontFor(s);
      ctx.fillStyle = "#000";
      const tw = ctx.measureText(word).width;
      const baseY = innerY + mediaH + textGapPx + Math.round(s * 1.05);
      ctx.fillText(word, innerX + (innerW - tw) / 2, baseY);
    }

    function drawLines() {
      const lineWidth = innerW * 0.9;
      const x = innerX + (innerW - lineWidth) / 2;
      const y1 = innerY + mediaH + 6 * scale;
      const y2 = y1 + linesPx;
      ctx.strokeStyle = "#000";
      ctx.lineWidth = Math.max(1, 2 * scale / MM_TO_PX);
      ctx.beginPath();
      ctx.moveTo(x, y1); ctx.lineTo(x + lineWidth, y1);
      ctx.moveTo(x, y2); ctx.lineTo(x + lineWidth, y2);
      ctx.stroke();
    }

    if (showTextOnly) {
      if (hasLines) drawLines();
      else if (!cfg.modeImageOnly) drawCenteredText();
    } else {
      const imageUrl = isLocal ? picto.imageUrl : (typeof pictoUrl === "function" ? pictoUrl(picto) : "");
      const img = await loadImage(imageUrl);
      if (img) {
        const mediaMm = isLocal ? localImageSizeMm() : Math.max(5, parseFloat(cfg.picSize) || 50);
        const boxPx = Math.min(mediaMm * scale, innerW, mediaH);
        const ratio = img.naturalWidth && img.naturalHeight ? img.naturalWidth / img.naturalHeight : 1;
        let w = boxPx, h = boxPx;
        if (ratio > 1) h = w / ratio;
        else w = h * ratio;
        const x = innerX + (innerW - w) / 2;
        const y = innerY + (mediaH - h) / 2;
        ctx.drawImage(img, x, y, w, h);
      }
      if (hasLines) drawLines();
      else if (showWord) drawWordBelow();
      if (!isLocal) await drawSourceLogo(ctx, picto, W, H);
    }

    if (typeof drawTenseMarker === "function") drawTenseMarker(ctx, item, W, H, borderPx);
    ctx.restore();

    if (borderPx > 0.1) {
      const inset = borderPx / 2;
      roundedRectPath(ctx, inset, inset, Math.max(0, W - borderPx), Math.max(0, H - borderPx), Math.max(0, radiusPx - inset));
      ctx.strokeStyle = cardBorderColor(item, isObjectPicto ? picto : null, word);
      ctx.lineWidth = Math.max(1, borderPx);
      ctx.stroke();
    }

    return canvas;
  }

  function injectResultCss() {
    if (resultCssInjected || byId("synced-result-canvas-css")) return;
    resultCssInjected = true;
    const style = document.createElement("style");
    style.id = "synced-result-canvas-css";
    style.textContent = `
      .synced-result-stage{position:relative;width:100%;}
      .synced-result-preview{width:100%;height:auto;display:block;background:transparent;cursor:pointer;}
      .grid-item.synced-card-result{border-color:transparent !important;background:transparent !important;box-shadow:none;}
      .grid-item.synced-card-result > .arrows-container{margin-bottom:8px;}
      .grid-item.synced-card-result > .card-media-wrap,
      .grid-item.synced-card-result > .word-text{display:none !important;}
      .synced-result-stage > .tense-overlay-btn{top:35%;transform:translateY(-50%);z-index:6;}
    `;
    document.head.appendChild(style);
  }

  async function redrawResultCanvas(el, item) {
    const preview = el.querySelector(".synced-result-preview");
    if (!preview) return;
    const token = (renderTokens.get(preview) || 0) + 1;
    renderTokens.set(preview, token);
    const cardWmm = Math.max(10, parseFloat(cfg.cardW) || 60);
    const width = Math.max(100, Math.floor(preview.clientWidth || el.clientWidth || 180));
    const rendered = await renderCardCanvas(item, width / cardWmm);
    if (renderTokens.get(preview) !== token) return;
    preview.width = rendered.width;
    preview.height = rendered.height;
    const ctx = preview.getContext("2d");
    ctx.clearRect(0, 0, preview.width, preview.height);
    ctx.drawImage(rendered, 0, 0);
    preview.setAttribute("aria-label", `Vista previa de ${item.word || "tarjeta"}`);
  }

  function decorateResult(el, item) {
    injectResultCss();
    el.classList.add("synced-card-result");
    const originalMedia = el.querySelector(":scope > .card-media-wrap");
    const tenseButtons = originalMedia ? Array.from(originalMedia.querySelectorAll(".tense-overlay-btn")) : [];
    let stage = el.querySelector(".synced-result-stage");
    let preview = el.querySelector(".synced-result-preview");

    if (!stage) {
      stage = document.createElement("div");
      stage.className = "synced-result-stage";
      const nav = el.querySelector(":scope > .arrows-container");
      if (nav) nav.insertAdjacentElement("afterend", stage);
      else el.prepend(stage);
    }

    if (!preview) {
      preview = document.createElement("canvas");
      preview.className = "synced-result-preview";
      preview.tabIndex = 0;
      stage.appendChild(preview);

      const cycle = (shiftKey) => {
        if (!originalMedia || !Array.isArray(item.pictograms) || item.pictograms.length <= 1) return;
        originalMedia.dispatchEvent(new MouseEvent("click", { bubbles: true, shiftKey: !!shiftKey }));
        setTimeout(() => {
          syncTenseControls();
          redrawResultCanvas(el, item);
        }, 0);
      };
      preview.addEventListener("click", (e) => cycle(e.shiftKey));
      preview.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          cycle(e.shiftKey);
        }
      });
    }

    tenseButtons.forEach((button) => {
      if (button.parentElement !== stage) stage.appendChild(button);
      if (button.dataset.syncedTenseRedraw !== "1") {
        button.dataset.syncedTenseRedraw = "1";
        button.addEventListener("click", (event) => {
          event.stopPropagation();
          setTimeout(() => {
            syncTenseControls();
            redrawResultCanvas(el, item);
          }, 0);
        });
      }
    });

    function syncTenseControls() {
      const isVerb = isHeuristicVerb(item);
      if (!isVerb && item.tenseOverride && item.tenseOverride !== "none") {
        item.tenseOverride = "none";
      }
      tenseButtons.forEach((button) => {
        button.style.display = isVerb ? "" : "none";
        const mode = button.classList.contains("tense-overlay-btn--left") ? "past" : "future";
        button.classList.toggle("active", isVerb && item.tenseOverride === mode);
        button.setAttribute("aria-hidden", isVerb ? "false" : "true");
      });
      return isVerb;
    }

    syncTenseControls();
    const redraw = () => requestAnimationFrame(() => {
      syncTenseControls();
      redrawResultCanvas(el, item);
    });
    redraw();

    const observer = new MutationObserver(redraw);
    observer.observe(el, { attributes: true, attributeFilter: ["style"] });
    if (typeof ResizeObserver === "function") {
      const ro = new ResizeObserver(redraw);
      ro.observe(el);
    }
  }

  function installResultRenderer() {
    if (typeof renderItem !== "function" || renderItem.__syncedCanvasPreview) return;
    const original = renderItem;
    const wrapped = function (el, item) {
      if (!isHeuristicVerb(item) && item?.tenseOverride && item.tenseOverride !== "none") {
        item.tenseOverride = "none";
      }
      original(el, item);
      decorateResult(el, item);
    };
    wrapped.__syncedCanvasPreview = true;
    renderItem = wrapped;
  }

  function installTenseModalFilter() {
    if (typeof buildTenseControls !== "function" || buildTenseControls.__verbOnly) return;
    const original = buildTenseControls;
    const wrapped = function (item, onChange) {
      const controls = original(item, onChange);
      const isVerb = isHeuristicVerb(item);
      if (!isVerb) {
        item.tenseOverride = "none";
        controls.style.display = "none";
      }
      return controls;
    };
    wrapped.__verbOnly = true;
    buildTenseControls = wrapped;
  }

  function installBorderColorConsistency() {
    if (typeof effectiveBorderColor !== "function" || effectiveBorderColor.__wordFallback) return;
    const original = effectiveBorderColor;
    const wrapped = function (word, picto, item) {
      const actualWord = word || item?.word || "";
      const actualPicto = picto || currentPicto(item);
      return original(actualWord, actualPicto, item);
    };
    wrapped.__wordFallback = true;
    effectiveBorderColor = wrapped;
  }

  function addNumericControl(afterInputId, id, labelText, value, min, onApply) {
    if (byId(id)) return;
    const anchor = byId(afterInputId)?.closest(".control");
    if (!anchor) return;
    const control = document.createElement("div");
    control.className = "control span-6";
    const label = document.createElement("label");
    label.htmlFor = id;
    label.textContent = labelText;
    const input = document.createElement("input");
    input.id = id;
    input.type = "number";
    input.inputMode = "decimal";
    input.min = String(min);
    input.step = "0.5";
    input.value = String(value);
    control.append(label, input);
    anchor.insertAdjacentElement("afterend", control);
    input.addEventListener("change", () => onApply(input));
  }

  function addConfigControls() {
    if (!(parseFloat(cfg.localImageSize) > 0)) cfg.localImageSize = Math.max(5, parseFloat(cfg.picSize) || 50);
    if (!(parseFloat(cfg.cardRadiusMm) >= 0)) cfg.cardRadiusMm = 0;

    addNumericControl("picSizeInput", "localImageSizeInput", "Tamaño imagen local (mm)", localImageSizeMm(), 5, (input) => {
      cfg.localImageSize = Math.max(5, parseFloat(input.value) || 50);
      input.value = String(cfg.localImageSize);
      if (typeof saveCfg === "function") saveCfg();
      if (typeof renderAll === "function") renderAll();
      if (typeof showPrintPreview === "function") showPrintPreview();
    });

    addNumericControl("borderWidthInput", "cardRadiusInput", "Radio esquinas (mm)", cardRadiusMm(), 0, (input) => {
      cfg.cardRadiusMm = Math.max(0, parseFloat(input.value) || 0);
      input.value = String(cfg.cardRadiusMm);
      if (typeof saveCfg === "function") saveCfg();
      if (typeof renderAll === "function") renderAll();
      if (typeof showPrintPreview === "function") showPrintPreview();
    });

    if (typeof saveCfg === "function") saveCfg();
  }

  function syncLocalLabelsFromTextarea() {
    if (!localModeActive || !allCurrentItemsAreLocal()) return;
    const input = byId("input-words");
    if (!input) return;
    const lines = String(input.value).replace(/\r/g, "").split("\n");
    items.forEach((item, index) => {
      if (index >= lines.length) return;
      item.word = lines[index].trim();
      const picto = currentPicto(item);
      if (isLocalPicto(picto)) {
        if (!Array.isArray(picto.keywords)) picto.keywords = [];
        if (!picto.keywords[0]) picto.keywords[0] = {};
        picto.keywords[0].keyword = item.word;
      }
    });
    clearTimeout(renameTimer);
    renameTimer = setTimeout(() => {
      if (typeof renderAll === "function") renderAll();
      if (typeof showPrintPreview === "function") showPrintPreview();
    }, 70);
  }

  async function loadLocalImages(fileList) {
    const files = Array.from(fileList || [])
      .filter(isSupportedImage)
      .sort((a, b) => naturalPath(a).localeCompare(naturalPath(b), undefined, { numeric: true, sensitivity: "base" }));

    if (!files.length) {
      updateStatus("No se encontraron imágenes compatibles.");
      alert("No se encontraron imágenes compatibles en la selección.");
      return;
    }

    revokeLocalObjectUrls();
    localModeActive = true;
    const container = byId("grid-container");
    if (!container) return;
    items = [];
    container.innerHTML = "";

    for (const file of files) {
      const picto = createLocalPicto(file);
      const item = {
        pictograms: [picto],
        current: 0,
        word: picto.keywords[0].keyword || "imagen",
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
    if (wordsInput) wordsInput.value = items.map((item) => item.word).join("\n");
    updateStatus(`${items.length} imagen(es) local(es) cargadas.`);
    if (typeof updateFitInfo === "function") updateFitInfo();
    if (typeof showPrintPreview === "function") await showPrintPreview();
  }

  function installPreviewRenderer() {
    if (typeof showPrintPreview !== "function" || showPrintPreview.__localExactPreview) return;
    const original = showPrintPreview;
    const wrapped = async function (...args) {
      if (!localModeActive || !allCurrentItemsAreLocal()) return await original.apply(this, args);
      const pv = byId("printPreview");
      if (!pv || !items.length) return;
      const cardWmm = Math.max(10, parseFloat(cfg.cardW) || 60);
      const cardHmm = Math.max(10, parseFloat(cfg.cardH) || 100);
      const maxDim = Math.max(80, parseFloat(byId("previewSizeRange")?.value) || parseFloat(cfg.previewMax) || 260);
      const pxPerMm = maxDim / Math.max(cardWmm, cardHmm);
      const rendered = await renderCardCanvas(items[0], pxPerMm);
      pv.width = rendered.width;
      pv.height = rendered.height;
      pv.getContext("2d").drawImage(rendered, 0, 0);
      if (byId("previewSizeVal")) byId("previewSizeVal").textContent = String(Math.round(maxDim));
    };
    wrapped.__localExactPreview = true;
    showPrintPreview = wrapped;
  }

  function pageFormatForPdf() {
    const page = String(cfg.pageSize || "a4").toLowerCase();
    if (page === "custom") return [Math.max(20, parseFloat(cfg.customWidth) || 210), Math.max(20, parseFloat(cfg.customHeight) || 297)];
    return page;
  }

  async function renderNarrationStrip(text, widthMm, heightMm) {
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(widthMm * PDF_PX_PER_MM));
    c.height = Math.max(1, Math.round(heightMm * PDF_PX_PER_MM));
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, c.width, c.height);
    let size = Math.max(10, (parseFloat(cfg.narrationFontSizePt) || 12) * 0.3528 * PDF_PX_PER_MM);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#000";
    ctx.font = canvasFontFor(size);
    while (ctx.measureText(text).width > c.width - 12 && size > 8) {
      size -= 1;
      ctx.font = canvasFontFor(size);
    }
    ctx.fillText(text, c.width / 2, c.height / 2);
    return c;
  }

  async function buildLocalPdfBlob() {
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ orientation: cfg.orientation || "portrait", unit: "mm", format: pageFormatForPdf() });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const margin = 10;
    const cardW = Math.max(10, parseFloat(cfg.cardW) || 60);
    const cardH = Math.max(10, parseFloat(cfg.cardH) || 100);
    const gap = Math.max(0, parseFloat(cfg.gap) || 0);
    const narrationOn = !!cfg.narrationMode;
    const narrationH = narrationOn ? Math.max(6, ((parseFloat(cfg.narrationFontSizePt) || 12) * 0.3528 * 1.6) + 3) : 0;
    const cols = Math.max(1, Math.floor((pageW - margin * 2 + gap) / (cardW + gap)));
    const rows = Math.max(1, Math.floor((pageH - margin * 2 + gap) / (cardH + narrationH + gap)));
    const perPage = cols * rows;
    const narrationTokens = narrationOn && String(cfg.narrationText || "").trim()
      ? String(cfg.narrationText).trim().split(/\s+/)
      : items.map((item) => shownWord(item, currentPicto(item)));

    for (let i = 0; i < items.length; i++) {
      const pageIndex = i % perPage;
      if (i > 0 && pageIndex === 0) pdf.addPage();
      const col = pageIndex % cols;
      const row = Math.floor(pageIndex / cols);
      const x = margin + col * (cardW + gap);
      const y = margin + row * (cardH + narrationH + gap);
      const card = await renderCardCanvas(items[i], PDF_PX_PER_MM);
      pdf.addImage(card.toDataURL("image/png"), "PNG", x, y, cardW, cardH, undefined, "FAST");
      if (narrationOn && narrationH > 0) {
        const strip = await renderNarrationStrip(narrationTokens[i] || shownWord(items[i], currentPicto(items[i])), cardW, narrationH);
        pdf.addImage(strip.toDataURL("image/png"), "PNG", x, y + cardH, cardW, narrationH, undefined, "FAST");
      }
    }
    return pdf.output("blob");
  }

  async function printBlob(blob) {
    const url = URL.createObjectURL(blob);
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.width = "1px";
    iframe.style.height = "1px";
    iframe.style.opacity = "0";
    iframe.src = url;
    document.body.appendChild(iframe);
    iframe.onload = () => {
      try { iframe.contentWindow.focus(); iframe.contentWindow.print(); }
      catch { window.open(url, "_blank"); }
      setTimeout(() => { URL.revokeObjectURL(url); iframe.remove(); }, 30000);
    };
  }

  function installOutputHandlers() {
    const pdfBtn = byId("btn-print-pdf");
    if (pdfBtn && !pdfBtn.dataset.localExactPrint) {
      const original = pdfBtn.onclick;
      pdfBtn.dataset.localExactPrint = "1";
      pdfBtn.onclick = async function (event) {
        if (!localModeActive || !allCurrentItemsAreLocal()) return original ? original.call(this, event) : undefined;
        try {
          this.disabled = true;
          const blob = await buildLocalPdfBlob();
          const a = document.createElement("a");
          a.href = URL.createObjectURL(blob);
          a.download = "tarjetas_imagenes_locales.pdf";
          a.click();
          setTimeout(() => URL.revokeObjectURL(a.href), 20000);
        } finally { this.disabled = false; }
      };
    }

    const systemBtn = byId("btn-print-system");
    if (systemBtn && !systemBtn.dataset.localExactPrint) {
      const original = systemBtn.onclick;
      systemBtn.dataset.localExactPrint = "1";
      systemBtn.onclick = async function (event) {
        if (!localModeActive || !allCurrentItemsAreLocal()) return original ? original.call(this, event) : undefined;
        try {
          this.disabled = true;
          await printBlob(await buildLocalPdfBlob());
        } finally { this.disabled = false; }
      };
    }

    const downloadBtn = byId("btn-download-all");
    if (downloadBtn && !downloadBtn.dataset.localExactPrint) {
      const original = downloadBtn.onclick;
      downloadBtn.dataset.localExactPrint = "1";
      downloadBtn.onclick = async function (event) {
        if (!localModeActive || !allCurrentItemsAreLocal()) return original ? original.call(this, event) : undefined;
        for (const item of items) {
          const card = await renderCardCanvas(item, PDF_PX_PER_MM);
          const blob = await new Promise((resolve) => card.toBlob(resolve, "image/png"));
          const a = document.createElement("a");
          a.href = URL.createObjectURL(blob);
          a.download = `${(item.word || "tarjeta").replace(/[\\/:*?"<>|]+/g, "_")}.png`;
          a.click();
          URL.revokeObjectURL(a.href);
        }
      };
    }
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

    const folderButton = document.createElement("button");
    folderButton.id = "btn-local-folder";
    folderButton.type = "button";
    folderButton.textContent = "📁 Cargar carpeta";

    searchButton.insertAdjacentElement("afterend", folderButton);
    searchButton.insertAdjacentElement("afterend", imageButton);
    actions.append(imageInput, folderInput);

    imageButton.addEventListener("click", () => imageInput.click());
    folderButton.addEventListener("click", () => folderInput.click());
    imageInput.addEventListener("change", async () => { await loadLocalImages(imageInput.files); imageInput.value = ""; });
    folderInput.addEventListener("change", async () => { await loadLocalImages(folderInput.files); folderInput.value = ""; });

    searchButton.addEventListener("click", () => { localModeActive = false; }, { capture: true });
    byId("input-words")?.addEventListener("input", syncLocalLabelsFromTextarea);
  }

  if (typeof pictoUrl === "function") {
    const originalPictoUrl = pictoUrl;
    pictoUrl = function (p) {
      if (isLocalPicto(p)) return p.imageUrl || "";
      return originalPictoUrl(p);
    };
  }

  installBorderColorConsistency();
  installTenseModalFilter();
  installResultRenderer();
  installPreviewRenderer();
  window.addEventListener("beforeunload", revokeLocalObjectUrls);

  function init() {
    addLocalImageControls();
    addConfigControls();
    injectResultCss();
    installOutputHandlers();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
