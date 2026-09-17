(function () {
  const G = window.PictoGame;
  if (!G) return;

  const $ = (id) => document.getElementById(id);

  const groups = [
    {
      id: "content",
      icon: "🧩",
      label: "Contenido",
      short: "Qué aparece",
      description: "Elige si las tarjetas usan pictogramas, palabras o ambos, y cómo se trata la tipografía del contenido.",
      controls: ["gameContent", "gameFontMode"]
    },
    {
      id: "card",
      icon: "⬡",
      label: "Tarjeta",
      short: "Forma y medida",
      description: "Define la forma física, el tamaño y cuántas tarjetas quieres preparar en la tanda.",
      controls: ["gameShape", "gameCount", "gameWidthMm", "gameHeightMm"]
    },
    {
      id: "composition",
      icon: "✦",
      label: "Composición",
      short: "Cómo se reparte",
      description: "Controla la distribución, el número de elementos, las separaciones y la reproducibilidad de la composición.",
      controls: ["gameLayout", "gamePerCard", "gameItemGapMm", "gameEdgePaddingMm", "gameAllowRepeats", "gameSeed", "gameLayoutNote"]
    },
    {
      id: "sizes",
      icon: "↔",
      label: "Tamaños",
      short: "Texto e imagen",
      description: "Ajusta el tamaño visual del contenido. Los valores fijos se optimizan conjuntamente cuando la tarjeta necesita más espacio.",
      controls: [
        "gameImageSizeMode", "gameImageSizeMm", "gameMinSizeMm", "gameMaxSizeMm",
        "gameFontSizeMode", "gameFontSizePx", "gameMinFontPx", "gameMaxFontPx",
        "gameMinRotation", "gameMaxRotation", "gameCopyNormalSizes"
      ]
    },
    {
      id: "decoration",
      icon: "🎨",
      label: "Decoración",
      short: "Texturas y capas",
      description: "Trabaja con la biblioteca de texturas, el contenido sobre fondo y el texto decorativo sin mezclarlo con la composición.",
      controls: ["gameDecorationPanel"]
    },
    {
      id: "export",
      icon: "🖨️",
      label: "Exportación",
      short: "PDF y corte",
      description: "Agrupa aquí los ajustes específicos de impresión. Las opciones dependen de la forma elegida.",
      controls: ["gameHexPrintControls"]
    }
  ];

  function addStyles() {
    if ($("ux-game-reorganize-style")) return;
    const style = document.createElement("style");
    style.id = "ux-game-reorganize-style";
    style.textContent = `
      .ux-game-groups-shell{grid-column:1/-1;display:grid;gap:10px;min-width:0}
      .ux-game-group-nav{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px;padding:7px;border:1px solid var(--edu-border,var(--stroke));border-radius:14px;background:var(--edu-surface-soft,rgba(255,255,255,.04))}
      .ux-game-group-btn{display:grid!important;grid-template-columns:26px minmax(0,1fr);grid-template-rows:auto auto;column-gap:7px;row-gap:0;align-items:center;justify-content:stretch!important;min-height:52px!important;padding:7px 8px!important;text-align:left;border-radius:10px!important;background:transparent!important;border:1px solid transparent!important}
      .ux-game-group-btn:hover{background:var(--edu-primary-soft,rgba(35,163,147,.12))!important}
      .ux-game-group-btn[aria-selected="true"]{background:var(--edu-primary-soft,rgba(35,163,147,.16))!important;border-color:var(--edu-border-strong,rgba(35,163,147,.28))!important;color:var(--edu-primary-strong,var(--brand))!important}
      .ux-game-group-icon{grid-row:1/3;font-size:1rem;line-height:1;text-align:center}
      .ux-game-group-label{font-size:.82rem;font-weight:800;line-height:1.15;min-width:0}
      .ux-game-group-short{font-size:.69rem;line-height:1.15;color:var(--edu-muted,var(--muted));font-weight:500;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .ux-game-group-panels{min-width:0}
      .ux-game-group-panel{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:var(--gap,12px);align-items:start;min-width:0;padding:10px;border:1px solid var(--edu-border,var(--stroke));border-radius:14px;background:var(--edu-surface,var(--panel))}
      .ux-game-group-panel[hidden]{display:none!important}
      .ux-game-group-intro{grid-column:1/-1;padding:0 1px 7px;border-bottom:1px solid var(--edu-border,var(--stroke));margin-bottom:1px}
      .ux-game-group-intro strong{display:block;color:var(--edu-text,var(--text));font-size:.9rem;margin-bottom:2px}
      .ux-game-group-intro p{margin:0;color:var(--edu-muted,var(--muted));font-size:.77rem;line-height:1.45}
      .ux-game-group-footer{grid-column:1/-1;display:flex;align-items:center;justify-content:space-between;gap:8px;padding-top:3px}
      .ux-game-group-footer .btn-mini{min-width:0;flex:0 1 auto}
      .ux-game-group-position{font-size:.72rem;color:var(--edu-muted,var(--muted));white-space:nowrap}
      .ux-game-group-panel .game-decoration-panel{border:0!important;padding:0!important;background:transparent!important}
      .ux-game-group-panel .game-decoration-panel>summary{display:none!important}
      .ux-game-group-panel .game-decoration-grid{margin-top:0!important}
      .ux-game-group-panel #gameHexPrintControls{padding:0!important}
      .ux-game-export-empty{grid-column:1/-1;padding:10px;border-radius:10px;background:var(--edu-surface-soft,rgba(255,255,255,.04));color:var(--edu-muted,var(--muted));font-size:.78rem;line-height:1.45}
      .ux-game-export-actions{grid-column:1/-1;display:grid;gap:7px;padding-top:2px}
      .ux-game-export-actions button{width:100%}
      .ux-game-leftover-note{grid-column:1/-1;color:var(--edu-muted,var(--muted));font-size:.75rem;margin:0}
      #content-game>.ux-game-flow-head{margin-bottom:8px}
      #content-game>.ux-live-preview{margin-bottom:10px}
      #content-game fieldset>.config-grid{gap:10px}
      #content-game fieldset>.config-grid>.ux-primary-action-row{margin-top:0}
      @media (max-width:360px){.ux-game-group-nav{grid-template-columns:1fr}.ux-game-group-short{white-space:normal}}
    `;
    document.head.appendChild(style);
  }

  function movableFor(id) {
    const el = $(id);
    if (!el) return null;
    if (id === "gameDecorationPanel") return el.closest(".span-12") || el;
    if (id === "gameCopyNormalSizes") return el.closest(".span-12") || el;
    if (id === "gameHexPrintControls") return el;
    if (id === "gameLayoutNote") return el;
    return el.closest(".control") || el.closest(".span-12") || el;
  }

  function createPanel(group, index) {
    const panel = document.createElement("section");
    panel.className = "ux-game-group-panel";
    panel.id = `uxGameGroup-${group.id}`;
    panel.dataset.uxGameGroup = group.id;
    panel.setAttribute("role", "tabpanel");
    panel.setAttribute("aria-labelledby", `uxGameGroupBtn-${group.id}`);
    panel.innerHTML = `
      <div class="ux-game-group-intro">
        <strong>${group.icon} ${group.label}</strong>
        <p>${group.description}</p>
      </div>`;

    const footer = document.createElement("div");
    footer.className = "ux-game-group-footer";
    const prev = index > 0 ? groups[index - 1] : null;
    const next = index < groups.length - 1 ? groups[index + 1] : null;
    footer.innerHTML = `
      <button class="btn-mini" type="button" data-game-group-go="${prev ? prev.id : ""}" ${prev ? "" : "disabled"}>← ${prev ? prev.label : "Inicio"}</button>
      <span class="ux-game-group-position">${index + 1} de ${groups.length}</span>
      <button class="btn-mini" type="button" data-game-group-go="${next ? next.id : ""}" ${next ? "" : "disabled"}>${next ? next.label : "Fin"} →</button>`;
    panel.appendChild(footer);
    return panel;
  }

  function createShell(grid) {
    const shell = document.createElement("div");
    shell.className = "ux-game-groups-shell span-12";
    shell.id = "uxGameGroupsShell";

    const nav = document.createElement("div");
    nav.className = "ux-game-group-nav";
    nav.setAttribute("role", "tablist");
    nav.setAttribute("aria-label", "Bloques de configuración de las tarjetas de juego");

    groups.forEach((group) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "ux-game-group-btn";
      btn.id = `uxGameGroupBtn-${group.id}`;
      btn.dataset.gameGroupGo = group.id;
      btn.setAttribute("role", "tab");
      btn.setAttribute("aria-controls", `uxGameGroup-${group.id}`);
      btn.setAttribute("aria-selected", "false");
      btn.innerHTML = `<span class="ux-game-group-icon" aria-hidden="true">${group.icon}</span><span class="ux-game-group-label">${group.label}</span><span class="ux-game-group-short">${group.short}</span>`;
      nav.appendChild(btn);
    });

    const panels = document.createElement("div");
    panels.className = "ux-game-group-panels";
    groups.forEach((group, index) => panels.appendChild(createPanel(group, index)));

    shell.append(nav, panels);
    const generateRow = $("gameGenerate")?.closest(".span-12");
    if (generateRow && generateRow.parentElement === grid) grid.insertBefore(shell, generateRow);
    else grid.prepend(shell);
    return shell;
  }

  function panelFor(id) {
    return $(`uxGameGroup-${id}`);
  }

  function moveKnownControls() {
    groups.forEach((group) => {
      const panel = panelFor(group.id);
      if (!panel) return;
      const footer = panel.querySelector(".ux-game-group-footer");
      group.controls.forEach((id) => {
        const node = movableFor(id);
        if (!node || node.dataset.uxGameReorganized === "1") return;
        node.dataset.uxGameReorganized = "1";
        panel.insertBefore(node, footer);
      });
    });

    const decoration = $("gameDecorationPanel");
    if (decoration) decoration.open = true;
  }

  function moveUnexpectedControls(grid) {
    const shell = $("uxGameGroupsShell");
    const generateRow = $("gameGenerate")?.closest(".span-12");
    const leftovers = Array.from(grid.children).filter((node) => {
      if (node === shell || node === generateRow) return false;
      if (node.id === "gameLayoutNote") return false;
      return !node.classList.contains("ux-primary-action-row");
    });
    if (!leftovers.length) return;
    const panel = panelFor("composition");
    const footer = panel?.querySelector(".ux-game-group-footer");
    if (!panel || !footer) return;
    const note = document.createElement("p");
    note.className = "ux-game-leftover-note";
    note.textContent = "Otros ajustes compatibles se mantienen aquí para no perder funciones añadidas por módulos anteriores.";
    panel.insertBefore(note, footer);
    leftovers.forEach((node) => panel.insertBefore(node, footer));
  }

  function enhanceExportPanel() {
    const panel = panelFor("export");
    const footer = panel?.querySelector(".ux-game-group-footer");
    if (!panel || !footer) return;

    const info = document.createElement("div");
    info.className = "ux-game-export-empty";
    info.id = "uxGameExportHint";
    info.textContent = "Las opciones de impresión específicas aparecen cuando son necesarias. Para exportar PNG o PDF, genera primero la tanda y revisa el resultado.";
    panel.insertBefore(info, footer);

    const actions = document.createElement("div");
    actions.className = "ux-game-export-actions";
    actions.innerHTML = `
      <button class="btn-mini" id="uxGameGoResults" type="button">Ver tanda generada y exportar</button>
      <button class="btn-mini" id="uxGameOpenSharedPrint" type="button">⚙ Ajustes de página compartidos</button>`;
    panel.insertBefore(actions, footer);

    $("uxGameGoResults")?.addEventListener("click", () => {
      const results = $("game-results-section");
      if (results && !results.hidden) results.scrollIntoView({ behavior: "smooth", block: "start" });
      else $("gameGenerate")?.focus();
    });
    $("uxGameOpenSharedPrint")?.addEventListener("click", () => $("uxSharedSettings")?.click());
  }

  function setGroup(id, options) {
    const group = groups.find((entry) => entry.id === id) || groups[0];
    const opts = options || {};
    groups.forEach((entry) => {
      const panel = panelFor(entry.id);
      const btn = $(`uxGameGroupBtn-${entry.id}`);
      const active = entry.id === group.id;
      if (panel) panel.hidden = !active;
      if (btn) {
        btn.setAttribute("aria-selected", String(active));
        btn.tabIndex = active ? 0 : -1;
      }
    });
    if (G.cfg) {
      G.cfg.uxGameGroup = group.id;
      G.saveCfg?.();
    }
    if (opts.focus) $(`uxGameGroupBtn-${group.id}`)?.focus();
    if (opts.scroll) $("uxGameGroupsShell")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function bind() {
    const shell = $("uxGameGroupsShell");
    if (!shell || shell.dataset.uxGameGroupsBound === "1") return;
    shell.dataset.uxGameGroupsBound = "1";

    shell.addEventListener("click", (event) => {
      const target = event.target.closest("[data-game-group-go]");
      if (!target || !shell.contains(target)) return;
      const id = target.dataset.gameGroupGo;
      if (id) setGroup(id, { focus: target.classList.contains("ux-game-group-btn") });
    });

    const nav = shell.querySelector(".ux-game-group-nav");
    nav?.addEventListener("keydown", (event) => {
      if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) return;
      const current = groups.findIndex((entry) => $(`uxGameGroupBtn-${entry.id}`)?.getAttribute("aria-selected") === "true");
      let next = current < 0 ? 0 : current;
      if (event.key === "Home") next = 0;
      else if (event.key === "End") next = groups.length - 1;
      else if (event.key === "ArrowLeft" || event.key === "ArrowUp") next = (next - 1 + groups.length) % groups.length;
      else next = (next + 1) % groups.length;
      event.preventDefault();
      setGroup(groups[next].id, { focus: true });
    });

    document.addEventListener("click", (event) => {
      const step = event.target.closest("[data-ux-step]");
      if (!step || !document.body.classList.contains("ux-mode-games")) return;
      if (step.dataset.uxStep === "content") setGroup("content");
      else if (step.dataset.uxStep === "design") setGroup("card");
      else if (step.dataset.uxStep === "results") setGroup("export");
    });
  }

  function init() {
    const content = $("content-game");
    const grid = content?.querySelector("fieldset > .config-grid");
    if (!content || !grid || $("uxGameGroupsShell")) return;
    addStyles();
    createShell(grid);
    moveKnownControls();
    moveUnexpectedControls(grid);
    enhanceExportPanel();
    bind();
    G.setUxGameGroup = setGroup;
    const initial = groups.some((group) => group.id === G.cfg?.uxGameGroup) ? G.cfg.uxGameGroup : "content";
    setGroup(initial);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
