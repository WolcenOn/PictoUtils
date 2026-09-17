(function () {
  const G=window.PictoGame;if(!G)return;

  function polygonPath(ctx,vertices){
    if(!vertices?.length)return;
    ctx.moveTo(vertices[0][0],vertices[0][1]);
    for(let i=1;i<vertices.length;i++)ctx.lineTo(vertices[i][0],vertices[i][1]);
    ctx.closePath();
  }

  function cardPath(ctx,w,h,shape,radius){
    ctx.beginPath();
    if(shape==="hex"){polygonPath(ctx,G.hexVertices(w,h,0));return;}
    if(shape==="oct"){polygonPath(ctx,G.octVertices(w,h,0));return;}
    if(shape==="oval"){ctx.ellipse(w/2,h/2,w/2,h/2,0,0,Math.PI*2);return;}
    const r=G.clamp(radius||0,0,Math.min(w,h)/2);
    if(r>0&&typeof ctx.roundRect==="function")ctx.roundRect(0,0,w,h,r);else ctx.rect(0,0,w,h);
  }

  G.loadImage=function(url){
    if(!url)return Promise.resolve(null);if(G.imageCache.has(url))return G.imageCache.get(url);
    const p=new Promise((resolve)=>{const img=new Image();if(!url.startsWith("blob:"))img.crossOrigin="anonymous";img.onload=()=>resolve(img);img.onerror=()=>resolve(null);img.src=url;});
    G.imageCache.set(url,p);return p;
  };

  async function drawPlacement(ctx,p,scale){
    ctx.save();ctx.translate(p.x*scale,p.y*scale);ctx.rotate(p.rotation*Math.PI/180);
    if(p.kind==="text"){
      const fontPx=(p.fontPx/G.MM_TO_TEXT_PX)*scale,weight=(typeof cfg!=="undefined"&&cfg.fontWeight)?cfg.fontWeight:600;
      ctx.font=`${weight} ${fontPx}px "${p.fontFamily}", sans-serif`;ctx.fillStyle="#000";ctx.textAlign="center";ctx.textBaseline="middle";
      const word=typeof displayWord==="function"?displayWord(p.source.word):p.source.word;ctx.fillText(word,0,0,Math.max(5,p.w*scale));
    }else{
      const img=await G.loadImage(p.source.visualUrl);if(img){const box=p.visualSizeMm*scale,ratio=img.naturalWidth&&img.naturalHeight?img.naturalWidth/img.naturalHeight:1;let w=box,h=box;if(ratio>1)h=w/ratio;else w=h*ratio;ctx.drawImage(img,-w/2,-h/2,w,h);}
    }
    ctx.restore();
  }

  async function drawArasaacMark(ctx,W,H){
    if(typeof getArasaacLogoBitmap!=="function")return;
    try{const logo=await getArasaacLogoBitmap();if(!logo)return;const w=W*.11,h=w/(logo.width/logo.height),pad=Math.max(3,W*.012),x=pad,y=H-h-pad;ctx.save();ctx.globalAlpha=.9;ctx.fillStyle="rgba(255,255,255,.82)";ctx.fillRect(x-pad/2,y-pad/2,w+pad,h+pad);ctx.drawImage(logo,x,y,w,h);ctx.restore();}catch(_){}
  }

  G.renderCard=async function(card,scale){
    const c=document.createElement("canvas");c.width=Math.max(1,Math.round(card.widthMm*scale));c.height=Math.max(1,Math.round(card.heightMm*scale));
    const ctx=c.getContext("2d"),W=c.width,H=c.height;
    const radiusMm=(typeof cfg!=="undefined"&&Number.isFinite(parseFloat(cfg.cardRadiusMm)))?parseFloat(cfg.cardRadiusMm):0;
    const radius=card.shape==="rect"?radiusMm*scale:0,bg=(typeof cfg!=="undefined"&&cfg.bgColor)?cfg.bgColor:"#fff",border=(typeof cfg!=="undefined"&&cfg.borderColor)?cfg.borderColor:"#000";
    const borderMm=(typeof cfg!=="undefined"&&Number.isFinite(parseFloat(cfg.borderWidthMm)))?parseFloat(cfg.borderWidthMm):1.5;
    ctx.clearRect(0,0,W,H);cardPath(ctx,W,H,card.shape,radius);ctx.fillStyle=bg;ctx.fill();ctx.save();cardPath(ctx,W,H,card.shape,radius);ctx.clip();
    if(card.layout==="domino"){ctx.save();ctx.strokeStyle=border;ctx.lineWidth=Math.max(1,borderMm*scale*.65);ctx.beginPath();if(card.widthMm>=card.heightMm){ctx.moveTo(W/2,0);ctx.lineTo(W/2,H);}else{ctx.moveTo(0,H/2);ctx.lineTo(W,H/2);}ctx.stroke();ctx.restore();}
    for(const p of card.placements)await drawPlacement(ctx,p,scale);
    if(card.placements.some((p)=>p.kind==="visual"&&p.source.source==="arasaac"))await drawArasaacMark(ctx,W,H);
    ctx.restore();
    if(borderMm>0){ctx.save();cardPath(ctx,W,H,card.shape,radius);ctx.strokeStyle=border;ctx.lineWidth=Math.max(1,borderMm*scale);ctx.stroke();ctx.restore();}
    return c;
  };

  G.downloadCanvas=function(canvas,filename){canvas.toBlob((blob)=>{if(!blob)return;const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);},"image/png");};
  G.downloadAllPng=async function(){for(const card of G.cards){G.downloadCanvas(await G.renderCard(card,G.PDF_SCALE),`tarjeta_juego_${card.index+1}.png`);await new Promise((r)=>setTimeout(r,120));}};
  function pdfFormat(){if(typeof cfg==="undefined")return"a4";if(String(cfg.pageSize||"a4").toLowerCase()==="custom")return[Math.max(50,parseFloat(cfg.customWidth)||210),Math.max(50,parseFloat(cfg.customHeight)||297)];return String(cfg.pageSize||"a4").toLowerCase();}
  G.downloadPdf=async function(){
    if(!G.cards.length||!window.jspdf?.jsPDF)return;const orientation=(typeof cfg!=="undefined"&&cfg.orientation)?cfg.orientation:"portrait";
    const pdf=new window.jspdf.jsPDF({unit:"mm",orientation,format:pdfFormat()}),pageW=pdf.internal.pageSize.getWidth(),pageH=pdf.internal.pageSize.getHeight(),margin=10;
    const gap=(typeof cfg!=="undefined"&&Number.isFinite(parseFloat(cfg.gap)))?Math.max(2,parseFloat(cfg.gap)):5,W=G.cfg.widthMm,H=G.cfg.heightMm;
    const cols=Math.max(1,Math.floor((pageW-margin*2+gap)/(W+gap))),rows=Math.max(1,Math.floor((pageH-margin*2+gap)/(H+gap))),perPage=Math.max(1,cols*rows);
    for(let i=0;i<G.cards.length;i++){const pos=i%perPage;if(i>0&&pos===0)pdf.addPage();const col=pos%cols,row=Math.floor(pos/cols),x=margin+col*(W+gap),y=margin+row*(H+gap),canvas=await G.renderCard(G.cards[i],G.PDF_SCALE);pdf.addImage(canvas.toDataURL("image/png"),"PNG",x,y,W,H,undefined,"FAST");}
    pdf.save("tarjetas_de_juego.pdf");
  };
})();
