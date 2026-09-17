(function () {
  const G = window.PictoGame;
  if (!G) return;

  function rotatedBox(w, h, deg) {
    const r = deg * Math.PI / 180;
    return { w: Math.abs(w*Math.cos(r))+Math.abs(h*Math.sin(r)), h: Math.abs(w*Math.sin(r))+Math.abs(h*Math.cos(r)) };
  }
  function insideCardBox(x, y, w, h, rotation, cardW, cardH, margin) {
    const box = rotatedBox(w, h, rotation);
    const left=x-box.w/2, right=x+box.w/2, top=y-box.h/2, bottom=y+box.h/2;
    if (G.cfg.shape === "rect") return left>=margin && right<=cardW-margin && top>=margin && bottom<=cardH-margin;
    const p = G.hexVertices(cardW, cardH, margin);
    return G.pointInPolygon(left,top,p)&&G.pointInPolygon(right,top,p)&&G.pointInPolygon(right,bottom,p)&&G.pointInPolygon(left,bottom,p);
  }
  function overlaps(a,b,gap) {
    return !(a.right+gap<=b.left || b.right+gap<=a.left || a.bottom+gap<=b.top || b.bottom+gap<=a.top);
  }
  function textBoundsMm(text, family, fontPx) {
    const c = textBoundsMm.canvas || (textBoundsMm.canvas=document.createElement("canvas"));
    const ctx = c.getContext("2d"), fontMm=fontPx/G.MM_TO_TEXT_PX, measurePx=fontMm*8;
    const weight = (typeof cfg!=="undefined" && cfg.fontWeight) ? cfg.fontWeight : 600;
    ctx.font = `${weight} ${measurePx}px "${family}", sans-serif`;
    return { w: Math.max(8, ctx.measureText(text||" ").width/8+4), h: Math.max(6,fontMm*1.35) };
  }

  function makePlacement(source, kind, rng, cardIndex, slotIndex) {
    const family=G.chooseFont(rng), fontPx=Math.round(G.lerp(G.cfg.minFontPx,G.cfg.maxFontPx,rng()));
    const size=G.lerp(G.cfg.minSizeMm,G.cfg.maxSizeMm,rng());
    const rotation=G.cfg.layout==="random"?G.lerp(G.cfg.minRotation,G.cfg.maxRotation,rng()):0;
    const b=kind==="text"?textBoundsMm(source.word,family,fontPx):{w:size,h:size};
    return { id:`${cardIndex}-${slotIndex}-${source.id}`, source, kind, fontFamily:family, fontPx, visualSizeMm:size, rotation, w:b.w, h:b.h, x:0, y:0 };
  }

  function fitToRegion(p,maxW,maxH) {
    if (p.kind==="visual") {
      p.visualSizeMm=Math.max(5,Math.min(G.cfg.maxSizeMm,maxW,maxH)); p.w=p.h=p.visualSizeMm; return;
    }
    let f=G.clamp(p.fontPx,G.cfg.minFontPx,G.cfg.maxFontPx), b=textBoundsMm(p.source.word,p.fontFamily,f);
    while ((b.w>maxW||b.h>maxH)&&f>8) { f--; b=textBoundsMm(p.source.word,p.fontFamily,f); }
    p.fontPx=f; p.w=Math.min(b.w,maxW); p.h=Math.min(b.h,maxH);
  }

  function placeGrid(list) {
    const W=G.cfg.widthMm,H=G.cfg.heightMm,m=5;
    const cols=Math.max(1,Math.ceil(Math.sqrt(list.length*W/H))), rows=Math.ceil(list.length/cols);
    const cw=(W-m*2)/cols, ch=(H-m*2)/rows;
    list.forEach((p,i)=>{
      const col=i%cols,row=Math.floor(i/cols); p.rotation=0; p.x=m+col*cw+cw/2; p.y=m+row*ch+ch/2;
      fitToRegion(p,cw*.82,ch*.8);
    });
  }

  function placeRandom(list,rng) {
    const W=G.cfg.widthMm,H=G.cfg.heightMm,m=5,gap=2.5,occupied=[];
    list.forEach((p,index)=>{
      let placed=false, shrink=1;
      for (let attempt=0;attempt<420&&!placed;attempt++) {
        if (attempt&&attempt%100===0) shrink*=.88;
        const w=Math.max(5,p.w*shrink),h=Math.max(5,p.h*shrink),box=rotatedBox(w,h,p.rotation);
        const x=m+box.w/2+rng()*Math.max(.1,W-m*2-box.w), y=m+box.h/2+rng()*Math.max(.1,H-m*2-box.h);
        if (!insideCardBox(x,y,w,h,p.rotation,W,H,m)) continue;
        const r={left:x-box.w/2,right:x+box.w/2,top:y-box.h/2,bottom:y+box.h/2};
        if (occupied.some((o)=>overlaps(r,o,gap))) continue;
        p.x=x;p.y=y;p.w=w;p.h=h;
        if(p.kind==="visual")p.visualSizeMm=Math.min(w,h); else p.fontPx=Math.max(8,Math.round(p.fontPx*shrink));
        occupied.push(r);placed=true;
      }
      if (!placed) {
        const cols=Math.ceil(Math.sqrt(list.length)),rows=Math.ceil(list.length/cols),cw=(W-m*2)/cols,ch=(H-m*2)/rows;
        const col=index%cols,row=Math.floor(index/cols);p.rotation=0;p.x=m+col*cw+cw/2;p.y=m+row*ch+ch/2;fitToRegion(p,cw*.8,ch*.78);
      }
    });
  }

  function placeDomino(list) {
    const W=G.cfg.widthMm,H=G.cfg.heightMm,m=6,vertical=W>=H;
    list.slice(0,2).forEach((p,i)=>{
      p.rotation=0;
      if(vertical){const rw=(W-m*2)/2;p.x=m+rw*(i+.5);p.y=H/2;fitToRegion(p,rw*.78,(H-m*2)*.76);}
      else{const rh=(H-m*2)/2;p.x=W/2;p.y=m+rh*(i+.5);fitToRegion(p,(W-m*2)*.78,rh*.76);}
    });
  }

  G.buildCards = function(pool,seed) {
    const rng=G.rngFromSeed(seed), cards=[], usage=new Map(pool.map((s)=>[s.id,0]));
    if(G.cfg.layout==="domino"){
      const order=G.shuffle(pool,rng); if(order.length<2)return [];
      for(let i=0;i<G.cfg.count;i++){
        const sources=[order[i%order.length],order[(i+1)%order.length]];
        const placements=sources.map((s,k)=>makePlacement(s,G.chooseKind(s,rng),rng,i,k));
        placeDomino(placements);cards.push({index:i,placements,layout:"domino",shape:G.cfg.shape,widthMm:G.cfg.widthMm,heightMm:G.cfg.heightMm});
      }
      return cards;
    }
    for(let i=0;i<G.cfg.count;i++){
      const sources=G.chooseSources(pool,G.cfg.perCard,rng,usage);
      const placements=sources.map((s,k)=>makePlacement(s,G.chooseKind(s,rng),rng,i,k));
      if(G.cfg.layout==="grid")placeGrid(placements);else placeRandom(placements,rng);
      cards.push({index:i,placements,layout:G.cfg.layout,shape:G.cfg.shape,widthMm:G.cfg.widthMm,heightMm:G.cfg.heightMm});
    }
    return cards;
  };
})();
