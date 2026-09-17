(function () {
  const LOCAL_SOURCE = "local";
  const localObjectUrls = new Set();

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

  function updateStatus(message) {
    const live = byId("resultados-hint");
    if (live) live.textContent = message;
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
      if (p && typeof p === "object" && p.source === LOCAL_SOURCE) {
        return p.imageUrl || "";
      }
      return originalPictoUrl(p);
    };
  }

  window.addEventListener("beforeunload", revokeLocalObjectUrls);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", addLocalImageControls, { once: true });
  } else {
    addLocalImageControls();
  }
})();
