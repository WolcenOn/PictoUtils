(function () {
  const G = window.PictoGame;
  if (!G) return;

  function selectedPicto(item) {
    if (!item || !Array.isArray(item.pictograms)) return null;
    return item.pictograms[item.current || 0] || null;
  }

  function sourceName(picto) {
    if (!picto || typeof picto !== "object") return "none";
    if (picto.source) return picto.source;
    try {
      if (typeof pictoSource === "function") return pictoSource(picto) || "unknown";
    } catch (_) {}
    if (picto._id) return "arasaac";
    return "unknown";
  }

  function visualUrlFor(picto) {
    if (!picto || typeof picto !== "object") return "";

    // Las imágenes locales ya contienen su URL real. No deben pasar primero
    // por pictoUrl(), que solo conoce las fuentes remotas de la app base.
    const direct = picto.imageUrl || picto.image?.src || picto.thumbnail?.src || "";
    if (direct) return direct;

    try {
      if (typeof pictoUrl === "function") return pictoUrl(picto) || "";
    } catch (_) {}
    return "";
  }

  G.sourceForItem = function (item, index) {
    const picto = selectedPicto(item);
    return {
      id: `result-${index}`,
      word: String(item?.word || picto?.keywords?.[0]?.keyword || "").trim(),
      picto: picto && typeof picto === "object" ? picto : null,
      visualUrl: visualUrlFor(picto),
      source: sourceName(picto),
      item
    };
  };

  function parseInputWords() {
    const raw = String(G.byId("input-words")?.value || "").trim();
    if (!raw) return [];
    try {
      if (typeof parseWords === "function") return parseWords(raw).map((w) => String(w || "").trim()).filter(Boolean);
    } catch (_) {}
    return raw.split(/[\s,]+/).map((w) => w.trim()).filter(Boolean);
  }

  function normalise(value) {
    return String(value || "")
      .trim()
      .toLocaleLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  function poolFromWords(words) {
    return words.map((word, index) => ({
      id: `word-${index}`,
      word,
      picto: null,
      visualUrl: "",
      source: "none",
      item: null
    }));
  }

  function poolFromNormalItems() {
    if (typeof items === "undefined" || !Array.isArray(items) || !items.length) return [];
    return items.map(G.sourceForItem).filter((source) => source.word || source.visualUrl);
  }

  function itemsStillMatchInput(itemPool, words) {
    if (!itemPool.length || !words.length || itemPool.length !== words.length) return false;
    return itemPool.every((source, index) => normalise(source.word) === normalise(words[index]));
  }

  G.currentNormalCardPool = function () {
    const words = parseInputWords();
    const itemPool = poolFromNormalItems();

    // Cuando hay resultados normales que corresponden al texto actual, esos
    // resultados son la fuente de verdad: conservan pictograma elegido,
    // imágenes locales y nombres editados.
    if (itemPool.length && (!words.length || itemsStillMatchInput(itemPool, words))) return itemPool;

    // Si el usuario acaba de editar la entrada, no reutilizamos silenciosamente
    // unos resultados anteriores. Las palabras nuevas ya pueden alimentar los
    // modos de texto mientras el usuario decide si vuelve a buscar pictogramas.
    if (words.length) return poolFromWords(words);

    return itemPool;
  };

  G.currentPool = function () {
    return G.currentNormalCardPool();
  };
})();
