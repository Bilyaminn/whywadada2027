const canvas=document.getElementById("posterCanvas"),mainCtx=canvas.getContext("2d");
const photoInput=document.getElementById("photoInput"),nameInput=document.getElementById("nameInput"),zoomInput=document.getElementById("zoomInput");
const dragLayer=document.getElementById("dragLayer"),resetPhoto=document.getElementById("resetPhoto"),downloadBtn=document.getElementById("downloadBtn");
const fitBtn=document.getElementById("fitBtn"),fullscreenBtn=document.getElementById("fullscreenBtn"),canvasWrap=document.getElementById("canvasWrap");
const uploadZone=document.getElementById("uploadZone"),uploadError=document.getElementById("uploadError");
const faceGuide=document.getElementById("faceGuide");
const W=1200; const TEMPLATE_H={flyer:1500,classic:880}; let H=TEMPLATE_H.flyer; let supporterImg=new Image(), candidateImg=new Image(), apcImg=new Image(), genericAvatarImg=new Image(), officialImg=new Image();
let hasUploadedPhoto=false;
let state={x:0,y:0,zoom:1.15,template:"flyer",drag:false,lastX:0,lastY:0};

// Brand colors — read from the same CSS custom properties generator.css
// already defines (:root{--green;--deep;--gold;...}), so the canvas
// drawing code and the page's own styling share one source of truth
// instead of the hex values drifting apart in two places. A couple of
// template-specific accent shades don't have a CSS variable of their own
// (the flyer template's slightly different gold/dark-green), so those
// are just named constants instead — still centralized, not scattered
// through every draw function as repeated string literals.
const asset=(name)=>new URL(`./assets/${name}`, import.meta.url).href;

const rootStyles=getComputedStyle(document.documentElement);
const COLORS={
  green: rootStyles.getPropertyValue("--green").trim() || "#075b2d",
  deep: rootStyles.getPropertyValue("--deep").trim() || "#022f18",
  gold: rootStyles.getPropertyValue("--gold").trim() || "#f5c542",
  flyerGold: "#e6b12d",
  flyerDark: "#062a16"
};

// A generic silhouette shown before the person uploads their own photo —
// showing the candidate's own photo as a stand-in there was misleading
// (looked like it might already be "you"). Swapped for the real upload
// the moment one is provided.
candidateImg.onload=()=>render(); candidateImg.src=asset("wadada-hero.jpg");
genericAvatarImg.onload=()=>{ if(!hasUploadedPhoto){ supporterImg=genericAvatarImg; render(); } };
genericAvatarImg.src=asset("generic-avatar.png");
supporterImg=genericAvatarImg;
apcImg.onload=()=>render(); apcImg.src=asset("apc-flag.jpeg");
// Cover template's candidate photo, used only by the "Cover" template.
// Kept as a separate image from candidateImg (the Flyer template's
// photo) so redesigning this template can never affect the Flyer, which
// stays exactly as it was.
officialImg.onload=()=>render(); officialImg.src=asset("wadada-hero-bg.png");

const MAX_PHOTO_BYTES=5*1024*1024;
function showUploadError(message){
  if(!uploadError) return;
  uploadError.textContent=message;
  uploadError.hidden=false;
}
function clearUploadError(){
  if(!uploadError) return;
  uploadError.hidden=true;
  uploadError.textContent="";
}
photoInput.addEventListener("change",()=>{
  const file=photoInput.files?.[0];
  if(!file) return;
  clearUploadError();

  if(!file.type.startsWith("image/")){
    showUploadError("Please choose an image file (JPG, PNG or WEBP).");
    photoInput.value="";
    return;
  }
  if(file.size>MAX_PHOTO_BYTES){
    showUploadError("That photo is too large — please choose one under 5MB.");
    photoInput.value="";
    return;
  }

  uploadZone.classList.add("is-loading");
  const reader=new FileReader();
  reader.onload=e=>{
    const img=new Image();
    img.onload=()=>{
      supporterImg=img;
      hasUploadedPhoto=true;
      uploadZone.classList.remove("is-loading");
      fitSupporter();
      render();
    };
    img.onerror=()=>{
      uploadZone.classList.remove("is-loading");
      showUploadError("Couldn't read that photo — please try another file.");
    };
    img.src=e.target.result;
  };
  reader.onerror=()=>{
    uploadZone.classList.remove("is-loading");
    showUploadError("Couldn't read that photo — please try another file.");
  };
  reader.readAsDataURL(file);
});
nameInput.addEventListener("input",render);
zoomInput.addEventListener("input",()=>{state.zoom=Number(zoomInput.value);render()});
resetPhoto.addEventListener("click",fitSupporter);
fitBtn.addEventListener("click",fitSupporter);

document.querySelectorAll(".template").forEach(b=>b.addEventListener("click",()=>{
  document.querySelectorAll(".template").forEach(x=>x.classList.remove("active"));
  b.classList.add("active");
  state.template=b.dataset.template;
  // Resize the canvas's actual backing bitmap to match this template's
  // own height *before* rendering into it — otherwise a shorter
  // template would draw into the top of the previous, taller canvas
  // and leave stale leftover pixels below it in the exported PNG.
  H=TEMPLATE_H[state.template];
  canvas.height=H;
  canvasWrap.style.aspectRatio=`${W} / ${H}`;
  updateFaceGuide();
  render();
}));


function fitSupporter(){state.x=0;state.y=0;state.zoom=1.15;zoomInput.value=state.zoom;render()}

function render(ctx=mainCtx,template=state.template){
  H=TEMPLATE_H[template];
  ctx.clearRect(0,0,W,H);
  if(template==="flyer"){
    drawFlyer(ctx);
    drawFlyerSupporter(ctx);
  } else {
    drawClassic(ctx);
  }
  drawFrame(ctx);
  if(ctx===mainCtx) scheduleThumbnailRedraw();
}
function drawFlyer(ctx){
  const bandTop=1000;

  // candidate photo — full bleed across the top
  ctx.save();ctx.beginPath();ctx.rect(0,0,W,bandTop);ctx.clip();
  drawCover(ctx,candidateImg,0,0,W,bandTop);
  ctx.restore();

  // soft gradient blend into the band below
  const grad=ctx.createLinearGradient(0,bandTop-140,0,bandTop);
  grad.addColorStop(0,"rgba(6,42,22,0)");grad.addColorStop(1,"rgba(6,42,22,.92)");
  ctx.fillStyle=grad;ctx.fillRect(0,bandTop-140,W,140);

  // solid band
  ctx.fillStyle=COLORS.flyerDark;ctx.fillRect(0,bandTop,W,H-bandTop);
  ctx.strokeStyle=COLORS.flyerGold;ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(0,bandTop);ctx.lineTo(W,bandTop);ctx.stroke();

  // logo pill, top-left over the photo
  roundRect(ctx,40,40,236,60,30);ctx.fillStyle="rgba(6,26,15,.92)";ctx.fill();
  const bcx=74,bcy=70,br=20;
  ctx.beginPath();ctx.arc(bcx,bcy,br,0,Math.PI*2);ctx.fillStyle="#fff";ctx.fill();
  ctx.save();ctx.fillStyle=COLORS.flyerDark;ctx.font="900 20px Manrope,Arial";ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText("W",bcx,bcy+1);ctx.restore();
  ctx.fillStyle="#fff";ctx.font="800 16px Manrope,Arial";ctx.fillText("WHY WADADA?",bcx+br+10,bcy-4);
  ctx.fillStyle=COLORS.flyerGold;ctx.font="600 11px Arial";ctx.fillText("In God We Trust",bcx+br+10,bcy+12);

  // APC badge, top-right
  const cw=92,ch=92,ccx=W-40-cw,ccy=40;
  ctx.fillStyle="#fff";roundRect(ctx,ccx,ccy,cw,ch,10);ctx.fill();
  if(apcImg.naturalWidth)ctx.drawImage(apcImg,ccx+7,ccy+7,cw-14,ch-14);

  // name block, left-aligned in the band
  const tx=80;let ty=1060;
  ctx.fillStyle=COLORS.flyerGold;ctx.font="700 16px Arial";ctx.fillText("I N   G O D   W E   T R U S T",tx,ty);
  ty+=60;ctx.fillStyle="#fff";ctx.font="800 48px Manrope,Arial";ctx.fillText("SEN. AHMED ALIYU",tx,ty);
  ty+=118;ctx.fillStyle=COLORS.flyerGold;ctx.font="900 106px Manrope,Arial";ctx.fillText("WADADA",tx,ty);
  ty+=52;ctx.fillStyle="#fff";ctx.font="700 24px Arial";ctx.fillText("FOR GOVERNOR  ·  NASARAWA STATE  ·  2027",tx,ty);
  ty+=34;ctx.strokeStyle=COLORS.flyerGold;ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(tx,ty);ctx.lineTo(tx+90,ty);ctx.stroke();
}
function drawFlyerSupporter(ctx){
  const cx=955,cy=1000,r=135;
  ctx.save();ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.clip();
  const base=Math.max((r*2)/supporterImg.width,(r*2)/supporterImg.height)*state.zoom;
  const sw=supporterImg.width*base,sh=supporterImg.height*base;
  const dx=cx-sw/2+state.x,dy=cy-sh/2+state.y;
  ctx.drawImage(supporterImg,dx,dy,sw,sh);ctx.restore();
  ctx.strokeStyle="#fff";ctx.lineWidth=10;ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.stroke();
  ctx.strokeStyle=COLORS.flyerGold;ctx.lineWidth=4;ctx.beginPath();ctx.arc(cx,cy,r+7,0,Math.PI*2);ctx.stroke();

  ctx.textAlign="center";
  ctx.fillStyle="#fff";ctx.font="800 24px Manrope,Arial";
  ctx.fillText((nameInput.value.trim()||"YOUR NAME").toUpperCase(),cx,cy+r+40);
  ctx.fillStyle=COLORS.flyerGold;ctx.font="700 13px Arial";
  ctx.fillText("S U P P O R T S   W A D A D A   2 0 2 7",cx,cy+r+66);
  ctx.textAlign="left";
  if(!hasUploadedPhoto) drawAddPhotoHint(ctx,cx,cy,r);
}
function drawClassic(ctx){
  // COVER TEMPLATE — portrait on the left with the candidate's name
  // directly beneath it, campaign identity and the supporter card on
  // the right. Sized to its own content height (880, not the Flyer
  // template's 1500) rather than padding out a taller canvas with
  // decorative filler — see TEMPLATE_H below for how the canvas itself
  // resizes per template.
  const split=500;
  const leftW=split;
  const leftCx=leftW/2;
  const rightW=W-split;
  const footerY=H-70;

  // Base background.
  ctx.fillStyle=COLORS.deep;
  ctx.fillRect(0,0,W,H);

  // Left panel — portrait with a radiating gold glow behind it.
  const medallionCy=265;
  ctx.save();
  ctx.beginPath();
  ctx.rect(0,0,leftW,H);
  ctx.clip();
  ctx.fillStyle='#064523';
  ctx.fillRect(0,0,leftW,H);
  [340,280,225].forEach((rad,i)=>{
    ctx.strokeStyle=`rgba(245,197,66,${0.16-i*0.04})`;
    ctx.lineWidth=1.5;
    ctx.beginPath();ctx.arc(leftCx,medallionCy,rad,0,Math.PI*2);ctx.stroke();
  });
  const glow=ctx.createRadialGradient(leftCx,medallionCy,30,leftCx,medallionCy,380);
  glow.addColorStop(0,'rgba(245,197,66,.14)');
  glow.addColorStop(1,'rgba(245,197,66,0)');
  ctx.fillStyle=glow;
  ctx.fillRect(0,0,leftW,H);

  // Framed portrait — close to the photo's own proportions so it fills
  // naturally with minimal crop instead of forcing an unrelated shape.
  const frameW=400,frameH=440,frameX=leftCx-frameW/2,frameY=medallionCy-frameH/2,frameR=24;
  ctx.save();
  ctx.shadowColor='rgba(0,0,0,.4)';
  ctx.shadowBlur=36;
  ctx.shadowOffsetY=18;
  ctx.fillStyle='#053018';
  roundRect(ctx,frameX,frameY,frameW,frameH,frameR);
  ctx.fill();
  ctx.restore();
  ctx.save();
  roundRect(ctx,frameX,frameY,frameW,frameH,frameR);
  ctx.clip();
  drawCoverCapped(ctx,officialImg,frameX,frameY,frameW,frameH,1.1);
  // "I stand with" as a badge in the photo's own top-left corner —
  // drawn inside this same clip so it respects the frame's rounded
  // corner instead of a hard rectangle overlapping it. A dark pill
  // behind the gold text keeps it legible regardless of what's behind
  // it in the photo itself.
  ctx.textAlign='left';
  ctx.font='800 13px Arial';
  const badgeLabel='I  STAND  WITH';
  const badgeTextW=ctx.measureText(badgeLabel).width;
  const badgePadX=16,badgePadY=10,badgeX=frameX+18,badgeY=frameY+18;
  ctx.fillStyle='rgba(3,20,11,.62)';
  roundRect(ctx,badgeX,badgeY,badgeTextW+badgePadX*2,badgePadY*2+15,999);
  ctx.fill();
  ctx.fillStyle=COLORS.gold;
  ctx.fillText(badgeLabel,badgeX+badgePadX,badgeY+badgePadY+12);
  ctx.restore();
  ctx.strokeStyle='#fff';
  ctx.lineWidth=6;
  roundRect(ctx,frameX,frameY,frameW,frameH,frameR);
  ctx.stroke();
  ctx.strokeStyle=COLORS.gold;
  ctx.lineWidth=3;
  roundRect(ctx,frameX-8,frameY-8,frameW+16,frameH+16,frameR+8);
  ctx.stroke();

  // Name, then tagline, directly beneath the photo.
  ctx.strokeStyle='rgba(245,197,66,.5)';
  ctx.lineWidth=2;
  ctx.beginPath();ctx.moveTo(leftCx-60,frameY+frameH+34);ctx.lineTo(leftCx+60,frameY+frameH+34);ctx.stroke();
  ctx.textAlign='center';
  ctx.fillStyle='#fff';
  ctx.font='800 25px Manrope,Arial';
  ctx.fillText('SEN. AHMED ALIYU WADADA',leftCx,frameY+frameH+74);
  ctx.fillStyle=COLORS.gold;
  ctx.font='800 17px Arial';
  ctx.fillText('THE PEOPLE\u2019S CANDIDATE',leftCx,frameY+frameH+104);
  ctx.fillStyle='rgba(255,255,255,.6)';
  ctx.font='700 13px Arial';
  ctx.fillText('NASARAWA STATE  \u2022  2027',leftCx,frameY+frameH+128);
  ctx.textAlign='left';
  ctx.restore();

  // Clean gold divider between portrait and editorial copy.
  ctx.fillStyle=COLORS.gold;
  ctx.fillRect(split-4,0,8,H);

  // APC badge — right panel.
  const badgeSize=76,bx=split+54,by=45;
  ctx.fillStyle='#fff';
  roundRect(ctx,bx,by,badgeSize,badgeSize,12);
  ctx.fill();
  if(apcImg.naturalWidth) ctx.drawImage(apcImg,bx+6,by+6,badgeSize-12,badgeSize-12);

  // Campaign identity.
  const tx=split+54;
  ctx.textAlign='left';
  ctx.fillStyle=COLORS.gold;
  ctx.font='800 19px Arial';
  ctx.fillText('WHY WADADA',tx,155);

  ctx.fillStyle='#fff';
  ctx.font='900 64px Manrope,Arial';
  ctx.fillText('2027',tx,224);

  ctx.fillStyle='rgba(255,255,255,.28)';
  ctx.fillRect(tx,250,100,2);

  // Supporter section — given the extra room freed up by dropping the
  // "FOR GOVERNOR" line above, which just repeated what the big "2027"
  // and the footer already establish.
  const cardY=296,cardH=340;
  ctx.fillStyle='rgba(255,255,255,.12)';
  roundRect(ctx,tx,cardY,rightW-108,cardH,22);
  ctx.fill();

  const cx=tx+166,cy=cardY+cardH/2,r=140;
  drawSupporter(ctx,cx,cy,r,0);

  ctx.textAlign='left';
  const supporterName=(nameInput.value.trim()||'YOUR NAME').toUpperCase();
  ctx.fillStyle='#fff';
  ctx.font='800 28px Manrope,Arial';
  ctx.fillText(supporterName,cx+r+40,cy-36);
  ctx.fillStyle=COLORS.gold;
  ctx.font='700 14px Arial';
  ctx.fillText('PROUD SUPPORTER',cx+r+40,cy-6);
  ctx.fillStyle='rgba(255,255,255,.7)';
  ctx.font='600 13px Arial';
  ctx.fillText('WHY WADADA MOVEMENT',cx+r+40,cy+20);

  ctx.fillStyle='#fff';
  ctx.font='800 18px Arial';
  ctx.fillText('IN GOD WE TRUST',cx+r+40,cy+70);
  ctx.fillStyle='rgba(255,255,255,.58)';
  ctx.font='600 12px Arial';
  ctx.fillText('A better future for Nasarawa.',cx+r+40,cy+94);

  // Footer across the whole poster.
  ctx.fillStyle='rgba(2,30,17,.9)';
  ctx.fillRect(0,footerY,W,70);
  ctx.strokeStyle=COLORS.gold;
  ctx.lineWidth=2;
  ctx.beginPath();ctx.moveTo(0,footerY);ctx.lineTo(W,footerY);ctx.stroke();

  ctx.fillStyle='#fff';
  ctx.font='800 14px Arial';
  ctx.textAlign='left';
  ctx.fillText('SEN. AHMED ALIYU WADADA',54,footerY+42);
  ctx.textAlign='right';
  ctx.fillStyle=COLORS.gold;
  ctx.fillText('NASARAWA STATE  \u2022  2027',W-54,footerY+42);
  ctx.textAlign='left';
}
function drawSupporter(ctx,cx=975,cy=1190,r=160,hintOffsetX=0){
  ctx.save();ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.clip();
  const base=Math.max((r*2)/supporterImg.width,(r*2)/supporterImg.height)*state.zoom;
  const sw=supporterImg.width*base,sh=supporterImg.height*base;
  const dx=cx-sw/2+state.x,dy=cy-sh/2+state.y;
  ctx.drawImage(supporterImg,dx,dy,sw,sh);ctx.restore();
  ctx.strokeStyle="#fff";ctx.lineWidth=12;ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.stroke();
  ctx.strokeStyle=COLORS.gold;ctx.lineWidth=5;ctx.beginPath();ctx.arc(cx,cy,r+10,0,Math.PI*2);ctx.stroke();
  if(!hasUploadedPhoto) drawAddPhotoHint(ctx,cx,cy,r,hintOffsetX);
}
function drawAddPhotoHint(ctx,cx,cy,r,offsetX=0){
  ctx.save();
  const w=170,h=34,y=cy+r-h/2-6,x=cx+offsetX;
  roundRect(ctx,x-w/2,y-h/2,w,h,17);ctx.fillStyle="rgba(2,30,17,.85)";ctx.fill();
  ctx.fillStyle="#fff";ctx.font="800 13px Arial";ctx.textAlign="center";ctx.textBaseline="middle";
  ctx.fillText("ADD YOUR PHOTO",x,y+1);
  ctx.restore();
}
function bottomLine(ctx,textColor="#fff",lineColor="rgba(255,255,255,.32)",xStart=78,xEnd=1122,fontSize=18,centered=false){
  ctx.strokeStyle=lineColor;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(xStart,1360);ctx.lineTo(xEnd,1360);ctx.stroke();
  ctx.fillStyle=textColor;ctx.font=`800 ${fontSize}px Arial`;
  if(centered){
    // Narrower panels (e.g. the Cover template's right-hand strip) don't
    // have room for the name and state on opposite ends — combine them
    // into one centered line instead.
    ctx.textAlign="center";
    ctx.fillText("SEN. AHMED ALIYU WADADA  •  NASARAWA STATE",(xStart+xEnd)/2,1400);
  } else {
    ctx.textAlign="left";ctx.fillText("SEN. AHMED ALIYU WADADA",xStart,1400);
    ctx.textAlign="right";ctx.fillText("NASARAWA STATE",xEnd,1400);
  }
  ctx.textAlign="left";
}
function drawFrame(ctx){ctx.strokeStyle="rgba(255,255,255,.26)";ctx.lineWidth=2;ctx.strokeRect(39,39,W-78,H-78)}
function drawCover(c,img,x,y,w,h){if(!img?.naturalWidth)return;const ratio=Math.max(w/img.width,h/img.height),nw=img.width*ratio,nh=img.height*ratio;c.drawImage(img,x+(w-nw)/2,y+(h-nh)/2,nw,nh)}
// Same idea as drawCover, but caps the zoom instead of always filling the
// box edge-to-edge. Needed for the Cover template's panel, which is very
// tall and narrow (roughly 1:3) — a strict cover-fit on a photo that
// isn't already shot in that same tall aspect crops away most of the
// frame to fill it, which reads as "too zoomed in". Capping the scale at
// (roughly) the contain ratio shows the whole photo instead, centered,
// leaving the panel's own background color visible in any gap rather
// than cropping — used only by the Cover template, not the Flyer one.
function drawCoverCapped(c,img,x,y,w,h,maxZoomOverContain=1.15){
  if(!img?.naturalWidth)return;
  const coverRatio=Math.max(w/img.width,h/img.height);
  const containRatio=Math.min(w/img.width,h/img.height);
  const ratio=Math.min(coverRatio,containRatio*maxZoomOverContain);
  const nw=img.width*ratio,nh=img.height*ratio;
  c.drawImage(img,x+(w-nw)/2,y+(h-nh)/2,nw,nh);
}
function roundRect(c,x,y,w,h,r){c.beginPath();c.roundRect(x,y,w,h,r)}

// Live thumbnail previews on the four template buttons — each is a small
// canvas scaled with ctx.scale() and rendered via the exact same render()
// function used for the full-size poster (with a template override), so
// there's zero risk of a preview drifting out of sync with what
// downloading actually produces. Regenerated on every render(), but
// throttled to once per animation frame so rapid photo-dragging doesn't
// redraw four extra canvases on every pointermove event.
const templateThumbCanvases={};
document.querySelectorAll(".template").forEach(b=>{
  const c=b.querySelector(".template-thumb");
  if(c) templateThumbCanvases[b.dataset.template]=c;
});
let thumbRedrawScheduled=false;
function scheduleThumbnailRedraw(){
  if(thumbRedrawScheduled) return;
  thumbRedrawScheduled=true;
  requestAnimationFrame(()=>{ renderTemplateThumbnails(); thumbRedrawScheduled=false; });
}
function renderTemplateThumbnails(){
  Object.entries(templateThumbCanvases).forEach(([key,c])=>{
    const tctx=c.getContext("2d");
    const targetH=TEMPLATE_H[key];
    // Uniform scale, not c.width/W and c.height/H separately — those
    // only match when a template's own aspect ratio equals the thumb
    // button's fixed 4:5 box (true for the Flyer, no longer true for
    // the Cover template's shorter canvas). A non-uniform scale would
    // stretch that thumbnail's content vertically. Scaling uniformly
    // and centering keeps every thumbnail an undistorted match for
    // what that template actually exports, just letterboxed to fit the
    // shared thumbnail size.
    const scale=Math.min(c.width/W,c.height/targetH);
    const offX=(c.width-W*scale)/2,offY=(c.height-targetH*scale)/2;
    tctx.clearRect(0,0,c.width,c.height);
    tctx.save();
    tctx.translate(offX,offY);
    tctx.scale(scale,scale);
    render(tctx,key);
    tctx.restore();
  });
  // render() sets the shared H for whichever template it just drew —
  // after looping through every template's thumbnail, put it back to
  // match the template actually active on the main canvas, or drag/zoom
  // pointer math there would silently use the wrong template's height
  // until the next click or render.
  H=TEMPLATE_H[state.template];
}

// Face-guide overlay — a dashed circle over the live preview showing
// exactly where the crop will land, matching the currently selected
// template's circle position/size. Positioned with percentages of
// .canvas-wrap's own box rather than fixed pixels, so it tracks the
// canvas correctly at any screen size (canvas-wrap's aspect-ratio is
// set in JS to match whatever the active template's own W:H is — see
// the template click handler above — so percentages of one map exactly
// onto percentages of the other for every template, not just the
// Flyer's original 4:5).
function updateFaceGuide(){
  if(!faceGuide) return;
  const isFlyer=state.template==="flyer";
  const cx=isFlyer?955:720, cy=isFlyer?1000:466, r=isFlyer?135:140;
  faceGuide.style.left=((cx-r)/W*100)+"%";
  faceGuide.style.top=((cy-r)/H*100)+"%";
  faceGuide.style.width=((r*2)/W*100)+"%";
  faceGuide.style.height=((r*2)/H*100)+"%";
}
updateFaceGuide();

function pointerPosition(e){const rect=canvas.getBoundingClientRect();return {x:(e.clientX-rect.left)*(W/rect.width),y:(e.clientY-rect.top)*(H/rect.height)}}
dragLayer.addEventListener("pointerdown",e=>{state.drag=true;state.lastX=pointerPosition(e).x;state.lastY=pointerPosition(e).y;dragLayer.setPointerCapture(e.pointerId);canvasWrap.classList.add("dragging")});
dragLayer.addEventListener("pointermove",e=>{if(!state.drag)return;const p=pointerPosition(e),dx=p.x-state.lastX,dy=p.y-state.lastY;state.x+=dx;state.y+=dy;state.lastX=p.x;state.lastY=p.y;render()});
dragLayer.addEventListener("pointerup",()=>{state.drag=false;canvasWrap.classList.remove("dragging")});
dragLayer.addEventListener("pointercancel",()=>{state.drag=false;canvasWrap.classList.remove("dragging")});
dragLayer.addEventListener("wheel",e=>{e.preventDefault();state.zoom=Math.min(2.8,Math.max(1,Number((state.zoom+(e.deltaY<0?.05:-.05)).toFixed(2))));zoomInput.value=state.zoom;render()},{passive:false});
dragLayer.addEventListener("dblclick",fitSupporter);

fullscreenBtn.addEventListener("click",()=>{canvasWrap.parentElement.classList.toggle("fullscreen")});
downloadBtn.addEventListener("click",()=>{render();const a=document.createElement("a");a.download="why-wadada-poster-hd.png";a.href=canvas.toDataURL("image/png");a.click()});
