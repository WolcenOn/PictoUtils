/* Hotfixes de renderizado e interacción de tarjetas.
   Este archivo debe cargarse después de app.js. */
(function(){
  'use strict';

  const $ = (id)=>document.getElementById(id);
  let previewToken = 0;

  function readCfgFallback(){
    try{
      const saved = JSON.parse(localStorage.getItem('pictocfg') || '{}');
      return Object.assign({
        cardW: 60,
        cardH: 100,
        innerMargin: 10,
        borderWidthMm: 1.7,
        bgColor: '#ffffff',
        fontSize: 48,
        fontFamily: 'Open Sans',
        fontWeight: 400,
        caseOption: 'upper',
        modeTextOnly: false,
        modeImageOnly: false,
        writeLinesMode: false,
        linesDistance: 30,
        picSize: 50,
        textGapMm: 0,
        autoTextGap: true,
        previewMax: 260
      }, saved || {});
    }catch(_e){
      return {};
    }
  }

  function canvasFont(size, cfg){
    const family = String(cfg.fontFamily || 'Open Sans').replace(/"/g, '\\"');
    const weight = cfg.fontWeight || 400;
    return `${weight} ${Math.max(8, Math.round(size))}px "${family}", Arial, sans-serif`;
  }

  function displayWord(word, cfg){
    const txt = String(word || '');
    if(cfg.caseOption === 'upper') return txt.toUpperCase();
    if(cfg.caseOption === 'lower') return txt.toLowerCase();
    return txt;
  }

  function clearCanvas(ctx, canvas, bg){
    ctx.setTransform(1,0,0,1,0,0);
    ctx.globalAlpha = 1;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = bg || '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  function getFirstCardFromDom(){
    const grid = $('grid-container');
    const card = grid?.querySelector('.grid-item');
    const img = card?.querySelector('.pic-image');
    const label = card?.querySelector('.word-text, .media-text');
    return {
      imgSrc: img && img.style.display !== 'none' ? img.currentSrc || img.src : '',
      word: label?.textContent?.trim() || ''
    };
  }

  async function ensureSelectedFont(cfg){
    try{
      if(document.fonts?.load){
        await document.fonts.load(canvasFont(32, cfg));
      }
      if(document.fonts?.ready) await document.fonts.ready;
    }catch(_e){}
  }

  async function safePreview(){
    const token = ++previewToken;
    const canvas = $('printPreview');
    if(!canvas) return;

    const cfg = readCfgFallback();
    const ctx = canvas.getContext('2d');
    const cwMm = Math.max(10, Number(cfg.cardW) || 60);
    const chMm = Math.max(10, Number(cfg.cardH) || 100);
    const ratio = cwMm / chMm;
    const maxDim = Math.max(80, Number($('previewSizeRange')?.value || cfg.previewMax || 260));

    let w, h;
    if(ratio >= 1){
      w = maxDim;
      h = Math.round(maxDim / ratio);
    }else{
      h = maxDim;
      w = Math.round(maxDim * ratio);
    }

    canvas.width = Math.max(80, w);
    canvas.height = Math.max(80, h);
    if($('previewSizeVal')) $('previewSizeVal').textContent = String(maxDim);

    const pxPerMm = canvas.width / cwMm;
    clearCanvas(ctx, canvas, cfg.bgColor || '#ffffff');

    const borderMm = Math.max(0, Number(cfg.borderWidthMm) || 0);
    const borderPx = borderMm * pxPerMm;
    if(borderPx > 0.1){
      ctx.strokeStyle = cfg.borderColor || '#111827';
      ctx.lineWidth = Math.max(1, borderPx);
      const inset = ctx.lineWidth / 2;
      ctx.strokeRect(inset, inset, canvas.width - ctx.lineWidth, canvas.height - ctx.lineWidth);
    }

    const domCard = getFirstCardFromDom();
    const word = displayWord(domCard.word || $('input-words')?.value?.split(/[\s,]+/)[0] || '', cfg);
    const margin = Math.max(0, Number(cfg.innerMargin) || 0) * pxPerMm;
    const innerX = margin;
    const innerY = margin;
    const innerW = Math.max(10, canvas.width - margin * 2);
    const innerH = Math.max(10, canvas.height - margin * 2);
    const hasLines = !!cfg.writeLinesMode;
    const showWord = !cfg.modeImageOnly && !hasLines && Number(cfg.fontSize || 0) > 0 && !cfg.modeTextOnly;

    await ensureSelectedFont(cfg);
    if(token !== previewToken) return;

    const fontPx = Math.max(8, (Number(cfg.fontSize) || 48) * (pxPerMm / 3));
    const textH = showWord ? Math.round(fontPx * 1.25) : 0;
    const textGap = showWord ? ((cfg.autoTextGap ? 2 : 0) + Math.max(0, Number(cfg.textGapMm) || 0)) * pxPerMm : 0;
    const lineGap = Math.max(8, (Number(cfg.linesDistance) || 30) * (pxPerMm / 3));
    const reservedBottom = hasLines ? lineGap + 8 : (showWord ? textGap + textH + 6 : 0);
    const mediaH = Math.max(10, innerH - reservedBottom);

    function drawLines(){
      ctx.strokeStyle = '#111827';
      ctx.lineWidth = 2;
      const lineW = innerW * 0.9;
      const x = innerX + (innerW - lineW) / 2;
      const y1 = innerY + mediaH + 6;
      const y2 = y1 + lineGap;
      ctx.beginPath();
      ctx.moveTo(x, y1); ctx.lineTo(x + lineW, y1);
      ctx.moveTo(x, y2); ctx.lineTo(x + lineW, y2);
      ctx.stroke();
    }

    function drawText(centered){
      let s = fontPx;
      ctx.font = canvasFont(s, cfg);
      while(ctx.measureText(word).width > innerW && s > 8){
        s -= 1;
        ctx.font = canvasFont(s, cfg);
      }
      ctx.fillStyle = '#111827';
      ctx.textBaseline = 'alphabetic';
      const tw = ctx.measureText(word).width;
      const y = centered ? innerY + innerH / 2 : innerY + mediaH + textGap + Math.round(s * 1.05);
      ctx.fillText(word, innerX + (innerW - tw) / 2, y);
    }

    if(!domCard.imgSrc || cfg.modeTextOnly){
      if(hasLines) drawLines();
      else drawText(true);
      return;
    }

    await new Promise((resolve)=>{
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = ()=>{
        if(token !== previewToken) return resolve();
        clearCanvas(ctx, canvas, cfg.bgColor || '#ffffff');
        if(borderPx > 0.1){
          ctx.strokeStyle = cfg.borderColor || '#111827';
          ctx.lineWidth = Math.max(1, borderPx);
          const inset = ctx.lineWidth / 2;
          ctx.strokeRect(inset, inset, canvas.width - ctx.lineWidth, canvas.height - ctx.lineWidth);
        }
        const picPx = Math.min(Math.max(5, Number(cfg.picSize) || 50) * pxPerMm, innerW, mediaH);
        const r = img.width / img.height;
        let iw = picPx, ih = picPx;
        if(r > 1) ih = iw / r;
        else iw = ih * r;
        const x = innerX + (innerW - iw) / 2;
        const y = innerY + (mediaH - ih) / 2;
        ctx.drawImage(img, x, y, iw, ih);
        if(hasLines) drawLines();
        else if(showWord) drawText(false);
        resolve();
      };
      img.onerror = ()=>{
        if(token === previewToken){
          clearCanvas(ctx, canvas, cfg.bgColor || '#ffffff');
          if(hasLines) drawLines();
          else drawText(true);
        }
        resolve();
      };
      img.src = domCard.imgSrc;
    });
  }

  function patchTenseButtons(root){
    (root || document).querySelectorAll('.tense-overlay-btn:not([data-hotfix-bound])').forEach((btn)=>{
      btn.dataset.hotfixBound = '1';
      btn.addEventListener('click', (event)=>{
        event.stopPropagation();
        setTimeout(()=>{
          if(typeof window.showPrintPreview === 'function') window.showPrintPreview();
        }, 0);
      });
      btn.addEventListener('keydown', (event)=>{
        if(event.key === 'Enter' || event.key === ' '){
          event.stopPropagation();
        }
      });
    });
  }

  function patchTextColorAndFont(root){
    const cfg = readCfgFallback();
    const family = `"${String(cfg.fontFamily || 'Open Sans').replace(/"/g, '\\"')}", Arial, sans-serif`;
    (root || document).querySelectorAll('.grid-item, .media-text, .word-text, .wm-token .w').forEach((el)=>{
      el.style.fontFamily = family;
      el.style.fontWeight = String(cfg.fontWeight || 400);
      if(el.classList.contains('media-text') || el.classList.contains('word-text') || el.classList.contains('w')){
        el.style.color = '#111827';
      }
    });
  }

  const originalPreview = window.showPrintPreview;
  window.showPrintPreview = function(){
    return safePreview().catch((err)=>{
      console.warn('Hotfix preview fallback:', err);
      try{ return originalPreview?.(); }catch(_e){}
    });
  };

  document.addEventListener('DOMContentLoaded', ()=>{
    patchTenseButtons(document);
    patchTextColorAndFont(document);
    window.showPrintPreview?.();

    const observer = new MutationObserver((records)=>{
      records.forEach((record)=>{
        record.addedNodes.forEach((node)=>{
          if(node.nodeType === 1){
            patchTenseButtons(node);
            patchTextColorAndFont(node);
          }
        });
      });
    });
    observer.observe(document.body, { childList:true, subtree:true });

    ['fontFamilySelect','fontWeightSelect','bgColorPicker','previewSizeRange'].forEach((id)=>{
      $(id)?.addEventListener('change', ()=>setTimeout(()=>{
        patchTextColorAndFont(document);
        window.showPrintPreview?.();
      }, 0));
    });
  });
})();
