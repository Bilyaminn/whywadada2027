// Same fallback as admin.js/admin-login.js: when VITE_API_BASE isn't set
// (e.g. this file is being served directly by a static server like Live
// Server rather than through Vite, so import.meta.env is undefined),
// assume the backend is on its default local port instead of silently
// hitting whatever is serving this page itself.
const API_BASE = (
  import.meta.env?.VITE_API_BASE ||
  (location.hostname === "localhost" || location.hostname === "127.0.0.1" ? "http://localhost:5000" : "")
).replace(/\/$/, "");
const menuToggle=document.getElementById("menuToggle");
const nav=document.getElementById("mainNav");

function setMobileMenu(open){
  if(!nav || !menuToggle) return;
  nav.classList.toggle("open", open);
  menuToggle.setAttribute("aria-expanded", String(open));
  menuToggle.setAttribute("aria-label", open ? "Close navigation" : "Open navigation");
  document.body.classList.toggle("menu-open", open);
}

menuToggle?.addEventListener("click", (event)=>{
  event.stopPropagation();
  setMobileMenu(!nav.classList.contains("open"));
});
nav?.querySelectorAll("a").forEach(a=>a.addEventListener("click",()=>setMobileMenu(false)));
function closeMenu(){
  if(!nav?.classList.contains("open"))return;
  // nav is display:none when closed, so a link that currently has focus is
  // about to be removed from the tab order — without this, focus would
  // silently drop to <body> and a keyboard user loses their place entirely.
  const focusWasInsideNav=nav.contains(document.activeElement);
  setMobileMenu(false);
  if(focusWasInsideNav) menuToggle?.focus();
}
document.addEventListener("keydown",e=>{if(e.key==="Escape")closeMenu();});
document.addEventListener("click",e=>{
  if(!nav?.classList.contains("open"))return;
  if(nav.contains(e.target)||menuToggle?.contains(e.target))return;
  closeMenu();
});



/* Scroll-triggered motion: lightweight, accessible and no dependency required. */
function initRevealAnimations(){
  if(window.matchMedia("(prefers-reduced-motion: reduce)").matches){
    document.querySelectorAll(".reveal, .lga-network-card").forEach(el=>el.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver((entries, obs)=>{
    entries.forEach(entry=>{
      if(entry.isIntersecting){
        entry.target.classList.add("is-visible");
        obs.unobserve(entry.target);
      }
    });
  }, {threshold:0.12, rootMargin:"0px 0px -35px 0px"});

  const observe = (root=document)=>{
    root.querySelectorAll(".reveal:not(.is-visible), .lga-network-card:not(.is-visible)").forEach((el,index)=>{
      // Stagger only card grids; section reveals remain immediate.
      if(el.classList.contains("lga-network-card")){
        el.style.transitionDelay = `${Math.min(index * 55, 330)}ms`;
      }
      observer.observe(el);
    });
  };

  observe();

  // LGA/other cards can be inserted after page load.
  const mutationObserver = new MutationObserver(mutations=>{
    mutations.forEach(mutation=>{
      mutation.addedNodes.forEach(node=>{
        if(node.nodeType===1){
          if(node.matches?.(".reveal, .lga-network-card")) observe(node.parentElement || document);
          else observe(node);
        }
      });
    });
  });
  mutationObserver.observe(document.body,{childList:true,subtree:true});
}


if(document.readyState==="loading"){
  document.addEventListener("DOMContentLoaded", initRevealAnimations, {once:true});
}else{
  initRevealAnimations();
}

// Escapes text before it goes into innerHTML. m.title/m.description are
// admin-supplied strings stored in Mongo and rendered here for every public
// visitor — without this, an admin field (or a compromised admin account)
// could inject a <script> tag that runs in every visitor's browser.
function escGalleryText(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));}

(async function(){
  const el=document.getElementById("publicGallery");
  if(!el)return;
  try{
    const base=API_BASE;
    const r=await fetch(base+"/api/media");
    const j=await r.json();
    if(!j.success||!j.data.length){el.innerHTML='<div class="gallery-loading">Campaign media will appear here soon.</div>';return}
    const mediaUrl=u=>String(u||"").startsWith("http")?u:base+String(u);
    el.innerHTML=j.data.map(m=>{
      const url=escGalleryText(mediaUrl(m.url));
      const title=escGalleryText(m.title);
      const media=m.type==="video"
        ? `<video controls preload="metadata" src="${url}"></video>`
        : `<img loading="lazy" src="${url}" alt="${title}">`;
      const description=m.description?`<p>${escGalleryText(m.description)}</p>`:"";
      return `<article class="gallery-card">${media}<div class="gallery-card-body"><strong>${title}</strong>${description}</div></article>`;
    }).join("");
  }catch{
    el.innerHTML='<div class="gallery-loading">Campaign media is temporarily unavailable.</div>';
  }
})();

// HEARTS Agenda showcase — click/keyboard tabs swapping a single detail
// panel. Every panel already exists in the DOM (real content, readable
// with no JS at all); this only handles switching which one is visible.
(function () {
  const tabs = Array.from(document.querySelectorAll(".hearts-letter"));
  if (!tabs.length) return;

  function activate(tab) {
    tabs.forEach((t) => {
      const selected = t === tab;
      t.classList.toggle("active", selected);
      t.setAttribute("aria-selected", String(selected));
      t.tabIndex = selected ? 0 : -1;
      const panel = document.getElementById(t.getAttribute("aria-controls"));
      if (panel) panel.hidden = !selected;
      if (selected) panel?.classList.add("active");
      else panel?.classList.remove("active");
    });
  }

  tabs.forEach((tab, i) => {
    tab.addEventListener("click", () => activate(tab));
    tab.addEventListener("keydown", (e) => {
      const dir = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
      if (!dir) return;
      e.preventDefault();
      const next = tabs[(i + dir + tabs.length) % tabs.length];
      next.focus();
      activate(next);
    });
  });
})();
