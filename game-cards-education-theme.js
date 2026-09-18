(function () {
  if (document.getElementById("ux-education-theme-style")) return;

  document.body.classList.add("ux-education-theme");

  // En el rediseño educativo, el modo automático prioriza una experiencia clara.
  // Una elección explícita del usuario por el tema oscuro se sigue respetando.
  try {
    const preferred = (typeof cfg !== "undefined" && cfg) ? cfg.theme : null;
    if (!preferred || preferred === "auto") {
      if (typeof applyTheme === "function") applyTheme("light");
      else document.documentElement.setAttribute("data-theme", "light");
    }
  } catch (_) {
    document.documentElement.setAttribute("data-theme", "light");
  }

  const style = document.createElement("style");
  style.id = "ux-education-theme-style";
  style.textContent = `
    /* =========================================================
       Lenguaje visual educativo: claro, sereno y profesional.
       Esta capa no modifica estructura, IDs ni comportamiento.
       ========================================================= */

    body.ux-education-theme{
      --edu-bg:#f3f8f5;
      --edu-bg-warm:#fffaf1;
      --edu-surface:#ffffff;
      --edu-surface-soft:#f8fbf9;
      --edu-surface-tint:#edf8f4;
      --edu-border:#dfe9e3;
      --edu-border-strong:#c8dcd2;
      --edu-text:#263630;
      --edu-muted:#708079;
      --edu-primary:#4e8f84;
      --edu-primary-strong:#356f66;
      --edu-primary-soft:#e7f4f0;
      --edu-secondary:#6f98c7;
      --edu-secondary-soft:#eef4fb;
      --edu-focus:#6aa79d;
      --edu-shadow:0 8px 24px rgba(62,91,81,.055);
      --edu-shadow-soft:0 3px 12px rgba(62,91,81,.04);
      --edu-radius:18px;
      --edu-radius-sm:12px;
      color:var(--edu-text);
      background:
        radial-gradient(900px 520px at 4% 0%, rgba(118,177,159,.10), transparent 64%),
        radial-gradient(780px 520px at 96% 12%, rgba(111,152,199,.08), transparent 62%),
        linear-gradient(180deg,var(--edu-bg-warm),var(--edu-bg));
    }

    html[data-theme="dark"] body.ux-education-theme{
      --edu-bg:#25302d;
      --edu-bg-warm:#2b3532;
      --edu-surface:#313e3a;
      --edu-surface-soft:#2b3733;
      --edu-surface-tint:#34453f;
      --edu-border:#465852;
      --edu-border-strong:#5a7068;
      --edu-text:#f2f7f4;
      --edu-muted:#bdc9c4;
      --edu-primary:#8bc3b6;
      --edu-primary-strong:#a0d1c5;
      --edu-primary-soft:#3a5049;
      --edu-secondary:#9eb9dc;
      --edu-secondary-soft:#3b4654;
      --edu-focus:#a0d1c5;
      --edu-shadow:0 9px 26px rgba(0,0,0,.14);
      --edu-shadow-soft:0 4px 14px rgba(0,0,0,.10);
      background:
        radial-gradient(900px 520px at 4% 0%, rgba(116,185,168,.10), transparent 64%),
        radial-gradient(780px 520px at 96% 12%, rgba(229,181,111,.07), transparent 62%),
        linear-gradient(180deg,var(--edu-bg-warm),var(--edu-bg));
    }

    body.ux-education-theme .app{
      max-width:1440px;
      background:var(--edu-surface);
      border:1px solid var(--edu-border);
      border-radius:24px;
      box-shadow:0 12px 34px rgba(62,91,81,.07);
      overflow:hidden;
    }

    html[data-theme="dark"] body.ux-education-theme .app{
      box-shadow:0 12px 34px rgba(0,0,0,.18);
    }

    body.ux-education-theme .topbar{
      min-height:76px;
      padding:14px 18px;
      background:var(--edu-surface);
      border-bottom:1px solid var(--edu-border);
      backdrop-filter:none;
    }

    body.ux-education-theme .brand{gap:13px}
    body.ux-education-theme .brand .dot{
      width:13px;height:13px;
      background:var(--edu-primary);
      box-shadow:0 0 0 6px var(--edu-primary-soft);
    }
    body.ux-education-theme .brand h1{
      color:var(--edu-text);
      font-size:1.08rem;
      font-weight:700;
      letter-spacing:-.01em;
    }
    body.ux-education-theme .brand p{
      color:var(--edu-muted);
      font-size:.82rem;
      max-width:58ch;
    }

    body.ux-education-theme button,
    body.ux-education-theme .btn{
      border-radius:10px;
      border-color:var(--edu-border);
      background:var(--edu-surface-soft);
      color:var(--edu-text);
      box-shadow:none;
      font-weight:600;
    }
    body.ux-education-theme button:hover{
      background:var(--edu-primary-soft);
      border-color:var(--edu-border-strong);
    }
    body.ux-education-theme button:focus-visible,
    body.ux-education-theme input:focus-visible,
    body.ux-education-theme select:focus-visible,
    body.ux-education-theme textarea:focus-visible{
      outline:2px solid var(--edu-focus);
      outline-offset:2px;
      box-shadow:none;
    }
    body.ux-education-theme .btn-primary,
    body.ux-education-theme #gameGenerate{
      background:var(--edu-primary);
      border-color:var(--edu-primary);
      color:#fff;
      font-weight:750;
    }
    body.ux-education-theme .btn-primary:hover,
    body.ux-education-theme #gameGenerate:hover{
      background:var(--edu-primary-strong);
      border-color:var(--edu-primary-strong);
      filter:none;
    }
    body.ux-education-theme .btn-ghost{
      background:transparent;
      border-color:var(--edu-border);
      color:var(--edu-muted);
    }
    body.ux-education-theme .btn-ghost:hover{
      color:var(--edu-text);
      background:var(--edu-surface-soft);
    }
    body.ux-education-theme .btn-mini{
      min-height:32px;
      border-radius:9px;
      background:var(--edu-surface-soft);
      border-color:var(--edu-border);
      color:var(--edu-text);
    }

    body.ux-education-theme .ux-workflow-bar{
      padding:11px 18px;
      background:var(--edu-surface-soft);
      border-bottom:1px solid var(--edu-border);
      box-shadow:inset 0 -1px 0 rgba(255,255,255,.25);
    }
    body.ux-education-theme .ux-mode-switch{
      padding:4px;
      border:1px solid var(--edu-border);
      border-radius:14px;
      background:var(--edu-surface);
      gap:3px;
    }
    body.ux-education-theme .ux-mode-btn{
      border:0;
      background:transparent;
      color:var(--edu-muted);
      border-radius:10px;
      padding:8px 12px;
      min-height:36px;
    }
    body.ux-education-theme .ux-mode-btn[aria-pressed="true"]{
      background:var(--edu-primary-soft);
      color:var(--edu-primary-strong);
      box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--edu-primary) 24%,transparent);
    }
    body.ux-education-theme .ux-step-switch{gap:5px}
    body.ux-education-theme .ux-step-btn{
      color:var(--edu-muted);
      border-color:transparent;
      background:transparent;
      padding:6px 9px;
      font-weight:650;
    }
    body.ux-education-theme .ux-step-btn:hover{
      color:var(--edu-primary-strong);
      border-color:var(--edu-border);
      background:var(--edu-surface);
    }
    body.ux-education-theme .ux-workflow-context{color:var(--edu-muted)}
    body.ux-education-theme .ux-workflow-context strong{color:var(--edu-text)}

    body.ux-education-theme .layout{
      grid-template-columns:365px minmax(0,1fr);
      background:transparent;
    }
    body.ux-education-theme .sidebar{
      padding:14px;
      border-right:1px solid var(--edu-border);
      background:var(--edu-surface-soft);
    }
    body.ux-education-theme .sidebar>.chip{
      width:100%;
      justify-content:space-between;
      margin-bottom:10px;
      padding:8px 10px;
      border-color:transparent;
      background:transparent;
      color:var(--edu-muted);
    }
    body.ux-education-theme .side-section{
      margin-bottom:10px;
      border:1px solid var(--edu-border);
      border-radius:14px;
      background:var(--edu-surface);
      box-shadow:var(--edu-shadow-soft);
    }
    body.ux-education-theme .section-header{
      padding:11px 12px;
      background:transparent;
      border-bottom:1px solid transparent;
    }
    body.ux-education-theme .section-header:has(+ .section-content:not([hidden])){
      border-bottom-color:var(--edu-border);
    }
    body.ux-education-theme .section-header h2{
      color:var(--edu-text);
      font-size:.93rem;
      font-weight:750;
    }
    body.ux-education-theme .section-content{padding:12px}
    body.ux-education-theme .sub-header{
      width:100%;
      justify-content:flex-start;
      min-height:38px;
      border:0;
      border-radius:9px;
      background:transparent;
      color:var(--edu-muted);
      font-weight:650;
    }
    body.ux-education-theme .sub-header.is-open,
    body.ux-education-theme .sub-header[aria-expanded="true"]{
      color:var(--edu-primary-strong);
      background:var(--edu-primary-soft);
    }
    body.ux-education-theme .sub-content{
      margin-top:7px;
      padding:10px;
      border:1px solid var(--edu-border);
      border-radius:11px;
      background:var(--edu-surface-soft);
    }

    body.ux-education-theme .main{
      padding:18px;
      background:transparent;
    }
    body.ux-education-theme .main-card{
      margin-bottom:16px;
      padding:18px;
      border:1px solid var(--edu-border);
      border-radius:var(--edu-radius);
      background:var(--edu-surface);
      box-shadow:var(--edu-shadow);
    }
    body.ux-education-theme .main-title{
      margin-bottom:12px;
      gap:14px;
    }
    body.ux-education-theme .main-title h2{
      color:var(--edu-text);
      font-size:1.06rem;
      font-weight:760;
      letter-spacing:-.01em;
    }

    body.ux-education-theme label{
      color:var(--edu-text);
      font-size:.82rem;
      font-weight:700;
    }
    body.ux-education-theme .hint,
    body.ux-education-theme .live{
      color:var(--edu-muted);
    }
    body.ux-education-theme select,
    body.ux-education-theme input[type="number"],
    body.ux-education-theme input[type="color"],
    body.ux-education-theme input[type="file"],
    body.ux-education-theme input[type="text"],
    body.ux-education-theme textarea{
      min-height:42px;
      border:1px solid var(--edu-border);
      border-radius:10px;
      background:var(--edu-surface);
      color:var(--edu-text);
      box-shadow:inset 0 1px 2px rgba(33,52,47,.025);
    }
    body.ux-education-theme select:hover,
    body.ux-education-theme input:hover,
    body.ux-education-theme textarea:hover{
      border-color:var(--edu-border-strong);
    }
    body.ux-education-theme textarea{
      min-height:104px;
      line-height:1.5;
    }

    body.ux-education-theme input[type="range"]{
      accent-color:var(--edu-primary);
    }
    body.ux-education-theme .ux-range-addon{
      grid-template-columns:minmax(0,1fr) 62px;
      gap:10px;
      padding:2px 1px 0;
    }
    body.ux-education-theme .ux-range-readout{
      color:var(--edu-primary-strong);
      font-weight:700;
      padding:2px 6px;
      border-radius:7px;
      background:var(--edu-primary-soft);
      text-align:center;
    }

    body.ux-education-theme .ux-game-flow-head{
      padding:11px 12px;
      border:1px solid var(--edu-border);
      border-radius:12px;
      background:color-mix(in srgb,var(--edu-secondary-soft) 70%,var(--edu-surface));
    }
    body.ux-education-theme .ux-game-flow-head strong{color:var(--edu-text)}
    body.ux-education-theme .ux-game-flow-head p{color:var(--edu-muted)}
    body.ux-education-theme .ux-live-preview{
      border:1px solid color-mix(in srgb,var(--edu-primary) 42%,var(--edu-border));
      border-radius:16px;
      background:var(--edu-surface-tint);
      box-shadow:none;
    }
    body.ux-education-theme .ux-live-preview-title{color:var(--edu-text)}
    body.ux-education-theme .ux-live-dot{
      background:var(--edu-primary);
      box-shadow:0 0 0 4px var(--edu-primary-soft);
    }
    body.ux-education-theme .ux-live-preview-badge{
      color:var(--edu-primary-strong);
      border-color:color-mix(in srgb,var(--edu-primary) 24%,var(--edu-border));
      background:var(--edu-surface);
    }
    body.ux-education-theme .ux-live-canvas-host{
      background:var(--edu-surface);
      border:1px dashed var(--edu-border-strong);
    }
    body.ux-education-theme .ux-live-status{color:var(--edu-muted)}

    body.ux-education-theme .game-decoration-panel{
      border:1px solid var(--edu-border);
      border-radius:12px;
      background:var(--edu-surface-soft);
    }
    body.ux-education-theme .game-decoration-panel>summary{
      color:var(--edu-text);
      padding:6px 2px;
    }
    body.ux-education-theme .game-decoration-subtitle{
      color:var(--edu-primary-strong);
      font-size:.82rem;
      letter-spacing:.01em;
    }
    body.ux-education-theme .game-texture-chip{
      border-color:var(--edu-border);
      background:var(--edu-surface);
      color:var(--edu-text);
    }

    body.ux-education-theme .grid-container,
    body.ux-education-theme #gameCardsGrid{gap:16px}
    body.ux-education-theme .grid-item,
    body.ux-education-theme .game-card-preview{
      border:1px solid var(--edu-border);
      border-radius:15px;
      background:var(--edu-surface);
      box-shadow:var(--edu-shadow-soft);
    }
    body.ux-education-theme .grid-item:hover,
    body.ux-education-theme .game-card-preview:hover{
      border-color:var(--edu-border-strong);
      background:var(--edu-surface);
      box-shadow:0 6px 18px rgba(62,91,81,.07);
    }
    body.ux-education-theme .game-card-meta .hint{
      background:var(--edu-surface-soft);
      color:var(--edu-muted);
      border:1px solid var(--edu-border);
    }

    body.ux-education-theme .result-control--bg,
    body.ux-education-theme .result-control--tense{
      background:var(--edu-surface-soft);
      border-color:var(--edu-border);
    }
    body.ux-education-theme .result-select{
      background:var(--edu-surface);
      color:var(--edu-text);
      border-color:var(--edu-border);
    }
    body.ux-education-theme .result-btn{
      background:var(--edu-surface);
      color:var(--edu-text);
      border-color:var(--edu-border);
    }
    body.ux-education-theme .result-btn.active{
      background:var(--edu-primary-soft);
      color:var(--edu-primary-strong);
      border-color:var(--edu-primary);
      box-shadow:none;
    }

    body.ux-education-theme .preview-mini{
      border-color:var(--edu-border);
      background:var(--edu-surface-soft);
      border-radius:14px;
    }
    body.ux-education-theme #printPreview{
      border-color:var(--edu-border);
      background:var(--edu-surface);
      border-radius:12px;
    }

    body.ux-education-theme .buttons-container{
      padding-top:2px;
      gap:8px;
    }
    body.ux-education-theme .buttons-container button:not(.btn-primary){
      background:var(--edu-surface-soft);
      color:var(--edu-text);
      border-color:var(--edu-border);
    }

    /* Restos del tema original: los llevamos al mismo lenguaje claro y educativo. */
    body.ux-education-theme .chip{
      background:var(--edu-secondary-soft);
      border-color:color-mix(in srgb,var(--edu-secondary) 24%,var(--edu-border));
      color:var(--edu-text);
      box-shadow:none;
    }
    body.ux-education-theme .group-title{
      color:var(--edu-primary-strong);
      letter-spacing:.07em;
    }
    body.ux-education-theme fieldset{
      border-color:var(--edu-border);
    }
    body.ux-education-theme .results-accordion-toggle,
    body.ux-education-theme .ux-game-group-btn{
      box-shadow:none!important;
    }
    body.ux-education-theme .ux-game-group-nav,
    body.ux-education-theme .ux-game-group-panel{
      box-shadow:none;
    }
    body.ux-education-theme .ux-game-group-panel{
      background:var(--edu-surface);
    }
    body.ux-education-theme .ux-game-group-intro{
      background:linear-gradient(90deg,var(--edu-primary-soft),transparent 82%);
      margin:-2px -2px 6px;
      padding:8px 9px 9px;
      border-radius:10px 10px 0 0;
    }
    body.ux-education-theme input[type="checkbox"]{
      accent-color:var(--edu-primary);
    }
    body.ux-education-theme ::selection{
      background:var(--edu-primary-soft);
      color:var(--edu-text);
    }

    body.ux-education-theme #appFooter{
      color:var(--edu-muted);
      border-top-color:var(--edu-border)!important;
      background:color-mix(in srgb,var(--edu-surface-soft) 90%,transparent)!important;
    }
    body.ux-education-theme #appFooter strong{color:var(--edu-text)}
    body.ux-education-theme #appFooter a{color:var(--edu-primary-strong)}

    @media (max-width:1020px){
      body.ux-education-theme .layout{grid-template-columns:1fr}
      body.ux-education-theme .sidebar.is-open{
        background:var(--edu-surface-soft);
        border:1px solid var(--edu-border);
      }
      body.ux-education-theme .main{padding:12px}
      body.ux-education-theme .main-card{padding:14px}
    }

    @media (max-width:620px){
      body.ux-education-theme{padding:8px}
      body.ux-education-theme .app{border-radius:18px}
      body.ux-education-theme .topbar{padding:11px 12px;min-height:64px}
      body.ux-education-theme .ux-workflow-bar{padding:9px 10px}
      body.ux-education-theme .ux-mode-switch{padding:3px}
      body.ux-education-theme .ux-mode-btn{font-size:.82rem;padding:7px 5px}
      body.ux-education-theme .main-title{align-items:flex-start;flex-direction:column}
    }
  `;

  document.head.appendChild(style);
})();
