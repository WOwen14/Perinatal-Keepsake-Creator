function getBoxesForLayout(layout, w, h, footerH = 0) {
  const marginX = Math.round(w * 0.06);
  const marginY = Math.round(h * 0.055);
  const gap = Math.round(w * 0.025);
  const footerGap = footerH ? Math.round(h * 0.025) : 0;
  const usableW = w - marginX * 2;
  const usableH = h - marginY * 2 - footerH - footerGap;

  if (layout === 'Single Full Photo') return [[marginX, marginY, usableW, usableH]];
  if (layout === 'Two Side by Side') {
    const w2 = Math.floor((usableW - gap) / 2);
    return [[marginX, marginY, w2, usableH],[marginX + w2 + gap, marginY, usableW - w2 - gap, usableH]];
  }
  if (layout === 'Two Stacked') {
    const h2 = Math.floor((usableH - gap) / 2);
    return [[marginX, marginY, usableW, h2],[marginX, marginY + h2 + gap, usableW, usableH - h2 - gap]];
  }
  if (layout === 'Feature Left + One Right') {
    const leftW = Math.round(usableW * 0.6);
    return [[marginX, marginY, leftW, usableH],[marginX + leftW + gap, marginY, usableW - leftW - gap, usableH]];
  }
  if (layout === 'One Top + Two Bottom') {
    const topH = Math.round(usableH * 0.56), bottomH = usableH - topH - gap, w2 = Math.floor((usableW - gap) / 2);
    return [[marginX, marginY, usableW, topH],[marginX, marginY + topH + gap, w2, bottomH],[marginX + w2 + gap, marginY + topH + gap, usableW - w2 - gap, bottomH]];
  }
  if (layout === 'One Left + Two Right') {
    const leftW = Math.round(usableW * 0.56), rightW = usableW - leftW - gap, h2 = Math.floor((usableH - gap) / 2);
    return [[marginX, marginY, leftW, usableH],[marginX + leftW + gap, marginY, rightW, h2],[marginX + leftW + gap, marginY + h2 + gap, rightW, usableH - h2 - gap]];
  }
  if (layout === 'Feature + Three' || layout === 'Wide Top + Three') {
    const topH = Math.round(usableH * (layout === 'Feature + Three' ? 0.57 : 0.46));
    const bottomH = usableH - topH - gap, w3 = Math.floor((usableW - gap * 2) / 3);
    return [[marginX, marginY, usableW, topH],[marginX, marginY + topH + gap, w3, bottomH],[marginX + w3 + gap, marginY + topH + gap, w3, bottomH],[marginX + (w3 + gap) * 2, marginY + topH + gap, usableW - (w3 + gap) * 2, bottomH]];
  }
  const bw = Math.floor((usableW - gap) / 2), bh = Math.floor((usableH - gap) / 2);
  return [[marginX, marginY, bw, bh],[marginX + bw + gap, marginY, usableW - bw - gap, bh],[marginX, marginY + bh + gap, bw, usableH - bh - gap],[marginX + bw + gap, marginY + bh + gap, usableW - bw - gap, usableH - bh - gap]];
}

function getBoxes(w, h) { return getBoxesForLayout(layoutSelect.value, w, h, getFooterHeight(h)); }
function makeLayoutThumbnailSvg(layoutName) {
  const w = 120, h = 86, boxes = getBoxesForLayout(layoutName, w, h, 0);
  const rects = boxes.map(([x,y,bw,bh]) => `<rect x="${x}" y="${y}" width="${bw}" height="${bh}" rx="3" ry="3" fill="#d8e5eb" stroke="#c0d0d8" stroke-width="1" />`).join('');
  return `<svg class="layout-mini-svg" viewBox="0 0 ${w} ${h}" aria-hidden="true" role="img"><rect x="1" y="1" width="${w-2}" height="${h-2}" rx="7" ry="7" fill="#f9fbfc" stroke="#d7e1e6" stroke-width="2" />${rects}</svg>`;
}
function getPreviewCanvasPoint(evt) { const rect=previewCanvas.getBoundingClientRect(); return {rect,x:(evt.clientX-rect.left)*(PREVIEW_W/rect.width),y:(evt.clientY-rect.top)*(PREVIEW_H/rect.height)}; }
function getBoxIndexAtPoint(x,y) { const boxes=getBoxes(PREVIEW_W,PREVIEW_H); for(let i=0;i<boxes.length;i++){const [bx,by,bw,bh]=boxes[i]; if(x>=bx&&x<=bx+bw&&y>=by&&y<=by+bh)return {index:i,box:boxes[i]};} return null; }
function getImageDisplayGeometry(state,bw,bh){ if(!state||!state.img)return{extraX:0,extraY:0}; let iw=state.img.naturalWidth,ih=state.img.naturalHeight; if(state.cropBox){const[l,t,r,b]=state.cropBox;iw=Math.max(1,Math.round(iw*(r-l)));ih=Math.max(1,Math.round(ih*(b-t)));} const angle=((state.rotation%360)+360)%360;if(angle===90||angle===270)[iw,ih]=[ih,iw]; const baseScale=Math.max(bw/iw,bh/ih),scale=baseScale*clamp(state.zoom,1,2.5),rw=Math.max(bw,Math.round(iw*scale)),rh=Math.max(bh,Math.round(ih*scale)); return{rw,rh,extraX:Math.max(0,rw-bw),extraY:Math.max(0,rh-bh)}; }
function createProcessedCanvas(state){ const img=state.img;if(!img)return null; const srcCanvas=document.createElement('canvas'),srcCtx=srcCanvas.getContext('2d',{willReadFrequently:true}); if(state.cropBox){const[l,t,r,b]=state.cropBox,sx=Math.round(img.naturalWidth*l),sy=Math.round(img.naturalHeight*t),sw=Math.max(1,Math.round(img.naturalWidth*(r-l))),sh=Math.max(1,Math.round(img.naturalHeight*(b-t)));srcCanvas.width=sw;srcCanvas.height=sh;srcCtx.drawImage(img,sx,sy,sw,sh,0,0,sw,sh);}else{srcCanvas.width=img.naturalWidth;srcCanvas.height=img.naturalHeight;srcCtx.drawImage(img,0,0);} let baseCanvas=srcCanvas;if(state.rotation%360!==0){const rotCanvas=document.createElement('canvas'),rotCtx=rotCanvas.getContext('2d'),angle=((state.rotation%360)+360)%360;if(angle===90||angle===270){rotCanvas.width=baseCanvas.height;rotCanvas.height=baseCanvas.width;}else{rotCanvas.width=baseCanvas.width;rotCanvas.height=baseCanvas.height;}rotCtx.translate(rotCanvas.width/2,rotCanvas.height/2);rotCtx.rotate(angle*Math.PI/180);rotCtx.drawImage(baseCanvas,-baseCanvas.width/2,-baseCanvas.height/2);baseCanvas=rotCanvas;} const filtered=document.createElement('canvas');filtered.width=baseCanvas.width;filtered.height=baseCanvas.height;const fctx=filtered.getContext('2d',{willReadFrequently:true});const filters=[`brightness(${state.brightness})`,`contrast(${state.contrast})`,`saturate(${state.saturation})`,`hue-rotate(${state.hue}deg)`];if(state.style==='Black & White')filters.push('grayscale(1)');if(state.style==='Sepia')filters.push('sepia(0.85)');fctx.filter=filters.join(' ');fctx.drawImage(baseCanvas,0,0);fctx.filter='none';if(state.warmth!==0||Math.abs(state.sharpness-1)>0.01)adjustPixels(filtered,state.warmth,state.sharpness);return filtered; }
function adjustPixels(canvas,warmth,sharpness){const ctx=canvas.getContext('2d',{willReadFrequently:true}),{width,height}=canvas,imgData=ctx.getImageData(0,0,width,height),d=imgData.data,warmthAmt=clamp(warmth/100,-1,1);for(let i=0;i<d.length;i+=4){d[i]=clamp(d[i]*(1+0.18*warmthAmt),0,255);d[i+1]=clamp(d[i+1]*(1+0.04*warmthAmt),0,255);d[i+2]=clamp(d[i+2]*(1-0.18*warmthAmt),0,255);}ctx.putImageData(imgData,0,0);if(sharpness>1.02){const amount=Math.min(1,(sharpness-1)*0.8),src=ctx.getImageData(0,0,width,height),out=ctx.createImageData(width,height),s=src.data,o=out.data,k=[0,-1,0,-1,5,-1,0,-1,0];for(let y=1;y<height-1;y++){for(let x=1;x<width-1;x++){const idx=(y*width+x)*4;for(let c=0;c<3;c++){let sum=0,ki=0;for(let yy=-1;yy<=1;yy++)for(let xx=-1;xx<=1;xx++)sum+=s[((y+yy)*width+(x+xx))*4+c]*k[ki++];o[idx+c]=clamp(s[idx+c]*(1-amount)+sum*amount,0,255);}o[idx+3]=s[idx+3];}}for(let i=0;i<o.length;i+=4)if(o[i+3]===0){o[i]=s[i];o[i+1]=s[i+1];o[i+2]=s[i+2];o[i+3]=s[i+3];}ctx.putImageData(out,0,0);} }
function drawCover(ctx,sourceCanvas,dx,dy,dw,dh,state){const iw=sourceCanvas.width,ih=sourceCanvas.height,baseScale=Math.max(dw/iw,dh/ih),scale=baseScale*clamp(state.zoom,1,2.5),rw=Math.max(dw,Math.round(iw*scale)),rh=Math.max(dh,Math.round(ih*scale)),extraX=Math.max(0,rw-dw),extraY=Math.max(0,rh-dh),sx=(extraX/2)*(1+clamp(state.panX,-1,1)),sy=(extraY/2)*(1+clamp(state.panY,-1,1));ctx.drawImage(sourceCanvas,0,0,iw,ih,dx-sx,dy-sy,rw,rh);}
function getMemorialFontFamily(){return memorialFont?.value||'Arial, Helvetica, sans-serif';}
function drawSafeArea(ctx,w,h){if(!showSafeArea.checked)return;const inset=Math.round(w*0.035);ctx.strokeStyle='#8a8a88';ctx.lineWidth=Math.max(1,Math.round(w/1000));ctx.setLineDash([Math.max(6,Math.round(w/150)),Math.max(6,Math.round(w/150))]);ctx.strokeRect(inset,inset,w-inset*2,h-inset*2);ctx.setLineDash([]);}
function drawMemorialText(ctx,w,h){const lines=getMemorialLines();if(!lines.length)return;const footerH=getFooterHeight(h),footerTop=h-Math.round(h*0.05)-footerH,lineY=footerTop-Math.max(2,Math.round(h/1000)),fontFamily=getMemorialFontFamily();ctx.strokeStyle='#d9d7d2';ctx.lineWidth=Math.max(1,Math.round(w/1400));ctx.beginPath();ctx.moveTo(Math.round(w*0.14),lineY);ctx.lineTo(Math.round(w*0.86),lineY);ctx.stroke();ctx.textAlign='center';ctx.fillStyle='#4a4a4a';ctx.font=`600 ${Math.max(18,Math.round(h*0.024))}px ${fontFamily}`;const nameY=footerTop+Math.round(footerH*0.34);if(lines[0])ctx.fillText(lines[0],w/2,nameY);if(lines[1]){ctx.fillStyle='#6a6a6a';ctx.font=`${Math.max(13,Math.round(h*0.014))}px ${fontFamily}`;ctx.fillText(lines[1],w/2,nameY+Math.round(h*0.03));}}
