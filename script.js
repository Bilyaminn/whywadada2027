// Same fallback as admin.js/admin-login.js: when VITE_API_BASE isn't set
// (e.g. this file is being served directly by a static server like Live
// Server rather than through Vite, so import.meta.env is undefined),
// assume the backend is on its default local port instead of silently
// hitting whatever is serving this page itself.
const API_BASE = (
  import.meta.env?.VITE_API_BASE ||
  (location.hostname === "localhost" || location.hostname === "127.0.0.1" ? "http://localhost:5000" : "")
).replace(/\/$/, "");
const heartAgenda = [
  {letter:"H", title:"Human Development", goal:"Education, healthcare, youth, women and child development."},
  {letter:"E", title:"Energy & Mineral Resources", goal:"Clean energy, responsible mining and fairer resource opportunities."},
  {letter:"A", title:"Agriculture & Green Economy", goal:"Modern agriculture, irrigation, agribusiness and climate-resilient growth."},
  {letter:"R", title:"Rural & Urban Development", goal:"Better roads, water, sanitation, housing and resilient communities."},
  {letter:"T", title:"Trade, Investment & Industry", goal:"SMEs, investment, industrialisation, entrepreneurship and jobs."},
  {letter:"S", title:"Security", goal:"Community safety, early warning, peacebuilding and stronger response systems."}
];

// Fallback only — used if /api/lgas can't be reached (e.g. backend down,
// offline). The backend's constants/lgas.js is the source of truth.
const FALLBACK_LGAS=["Akwanga","Awe","Doma","Karu","Keana","Keffi","Kokona","Lafia","Nasarawa","Nasarawa Eggon","Obi","Toto","Wamba"];

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

function animateCounter(el,target){
  const duration=900,start=performance.now();
  function tick(now){
    const progress=Math.min((now-start)/duration,1);
    const value=Math.floor(target*(1-Math.pow(1-progress,3)));
    el.textContent=value.toLocaleString();
    if(progress<1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

async function loadSupporterCount(){
  const el=document.getElementById("supporterCount"),status=document.getElementById("counterStatus");
  try{
    const response=await fetch(`${API_BASE}/api/supporters`,{headers:{Accept:"application/json"}});
    if(!response.ok) throw new Error();
    const data=await response.json();
    const count=Number(data.count);
    if(!Number.isFinite(count)) throw new Error();
    animateCounter(el,count);
    status.textContent="Live registration data";
  }catch{
    el.textContent="—";
    status.textContent="Live counter will appear when connected";
  }
}
loadSupporterCount();

const form=document.getElementById("supporterForm");
const registerSteps=[...document.querySelectorAll(".quick-step")];
const stepDots=[...document.querySelectorAll(".registration-steps span")];
let currentRegisterStep=1;
function setRegisterStep(step){
  currentRegisterStep=Math.max(1,Math.min(5,step));
  registerSteps.forEach(el=>el.classList.toggle("active",Number(el.dataset.step)===currentRegisterStep));
  stepDots.forEach((el,i)=>el.classList.toggle("active",i<currentRegisterStep));
  if(currentRegisterStep===5){
    const fd=new FormData(form);
    const summary=document.getElementById("registerSummary");
    if(summary)summary.textContent=`${fd.get("name")} • ${fd.get("lga")} LGA • ${fd.get("ward")}`;
  }
}
function validateCurrentStep(){
  const fields=registerSteps[currentRegisterStep-1]?.querySelectorAll("input,select")||[];
  for(const field of fields){if(!field.checkValidity()){field.reportValidity();return false;}}
  return true;
}
document.querySelectorAll(".next-step").forEach(btn=>btn.addEventListener("click",()=>{if(validateCurrentStep())setRegisterStep(currentRegisterStep+1)}));
document.querySelectorAll(".prev-step").forEach(btn=>btn.addEventListener("click",()=>setRegisterStep(currentRegisterStep-1)));

async function loadRegistrationLgas(){
  const select=form?.querySelector('select[name="lga"]'); if(!select)return;
  let lgas=[];try{const r=await fetch(`${API_BASE}/api/lgas`,{headers:{Accept:"application/json"}});const d=await r.json();if(r.ok&&Array.isArray(d.data))lgas=d.data}catch{}
  if(!lgas.length)lgas=FALLBACK_LGAS;
  select.innerHTML='<option value="">Select your LGA</option>'+lgas.map(x=>`<option value="${String(x).replaceAll('"','&quot;')}">${String(x).replaceAll('<','&lt;')}</option>`).join('');
}
async function loadRegistrationWards(){
  const lga=form?.querySelector('select[name="lga"]')?.value||"";const ward=form?.querySelector('select[name="ward"]');if(!ward)return;
  ward.innerHTML=`<option value="">${lga?"Loading wards…":"Select your LGA first"}</option>`;ward.disabled=!lga;if(!lga)return;
  try{const r=await fetch(`${API_BASE}/api/wards?lga=${encodeURIComponent(lga)}`,{headers:{Accept:"application/json"}});const d=await r.json();const wards=Array.isArray(d.data)?d.data:[];ward.innerHTML=wards.length?'<option value="">Select your Ward</option>'+wards.map(x=>`<option value="${String(x).replaceAll('"','&quot;')}">${String(x).replaceAll('<','&lt;')}</option>`).join(''):'<option value="">No wards available</option>';ward.disabled=!wards.length}catch{ward.innerHTML='<option value="">Unable to load wards</option>';ward.disabled=true}
}
form?.querySelector('select[name="lga"]')?.addEventListener("change",loadRegistrationWards);
loadRegistrationLgas();

form?.addEventListener("submit",async e=>{
  e.preventDefault();
  const message=document.getElementById("formMessage");
  message.className="form-message";message.textContent="Registering your support…";
  const payload=Object.fromEntries(new FormData(form).entries());payload.consent=Boolean(payload.consent);
  try{
    const response=await fetch(`${API_BASE}/api/supporters`,{method:"POST",headers:{"Content-Type":"application/json",Accept:"application/json"},body:JSON.stringify(payload)});
    const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data.message||"Unable to register support.");
    document.querySelectorAll(".quick-step").forEach(el=>el.classList.remove("active"));document.querySelector(".registration-steps")?.classList.add("hidden");document.getElementById("registrationSuccess")?.classList.remove("hidden");
    const copy=document.getElementById("successCopy");if(copy)copy.textContent=`Welcome, ${data.supporter?.name||payload.name}. You're registered in ${data.supporter?.lga||payload.lga} LGA, ${payload.ward}.`;
    const share=document.getElementById("shareSupport");share?.addEventListener("click",()=>{const text=`I support WHY WADADA. In God We Trust. Join the movement: ${location.origin}${location.pathname}#register`;if(navigator.share)navigator.share({title:"WHY WADADA",text,url:location.href}).catch(()=>{});else navigator.clipboard?.writeText(text).then(()=>{share.innerHTML='Link copied ✓'}).catch(()=>{});},{once:true});
    form.reset();loadSupporterCount();
  }catch(err){message.className="form-message error";message.textContent=err.message||"Registration failed. Please try again."}
});



const lgaGrid = document.getElementById("lgaGrid");
const lgaReached = document.getElementById("lgaReached");
const lgaSupporters = document.getElementById("lgaSupporters");
const lgaSearch = document.getElementById("lgaSearch");
const lgaShowToggle = document.getElementById("lgaShowToggle");
const lgaShowToggleBtn = document.getElementById("lgaShowToggleBtn");

const lgaNames = [
  "Akwanga", "Awe", "Doma", "Karu", "Keana", "Keffi",
  "Kokona", "Lafia", "Nasarawa", "Nasarawa Eggon", "Obi", "Toto", "Wamba"
];

// Ranked-by-registrations view: shows the busiest LGAs first instead of a
// fixed alphabetical list, and only a handful by default so the section
// doesn't run long on mobile. "Show all" reveals the rest, ranked the same
// way. Searching always shows every match regardless of the limit — a
// search result that got hidden by the collapse would look like a bug.
const DEFAULT_VISIBLE_LGAS = 6;
let lgaCounts = {};
let lgaExpanded = false;

// LGA navigation is intentionally a responsive grid.  Keeping the
// interaction model simple avoids the mobile carousel state getting out of
// sync with filtered results or viewport changes.

function renderLgaNetwork(filter = "") {
  if (!lgaGrid) return;

  const query = filter.trim().toLowerCase();
  const ranked = [...lgaNames]
    .filter(name => name.toLowerCase().includes(query))
    .sort((a, b) => Number(lgaCounts[b] || 0) - Number(lgaCounts[a] || 0) || a.localeCompare(b));

  const isSearching = query.length > 0;
  const visible = isSearching || lgaExpanded ? ranked : ranked.slice(0, DEFAULT_VISIBLE_LGAS);

  lgaGrid.innerHTML = visible.map((name, i) => {
    const count = Number(lgaCounts[name] || 0);

    return `
      <button class="lga-network-card" type="button" data-lga="${name}">
        <div class="lga-card-top">
          <span class="lga-number">${String(i + 1).padStart(2, "0")}</span>
          <span class="lga-arrow">↗</span>
        </div>
        <h3>${name}</h3>
        <div class="lga-card-meta">
          <span>
            <strong>${count.toLocaleString()}</strong>
            supporter${count === 1 ? "" : "s"}
          </span>
          <span class="lga-card-status">
            ${count > 0 ? "Active network" : "Join the network"}
          </span>
        </div>
      </button>
    `;
  }).join("");

  if (!visible.length) {
    lgaGrid.innerHTML = `
      <div class="lga-empty">
        <strong>No LGA found.</strong>
        <span>Try another search.</span>
      </div>
    `;
  }

  lgaGrid.querySelectorAll(".lga-network-card").forEach(card => {
    card.addEventListener("click", () => {
      const selectedLga = card.dataset.lga;
      const select = document.querySelector('select[name="lga"]');

      if (select) {
        select.value = selectedLga;
        select.dispatchEvent(new Event("change", { bubbles: true }));
      }

      const register = document.getElementById("register");
      if (register) {
        register.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  });

  // A fresh render (e.g. from a search filter) starts the strip back at
  // the beginning rather than leaving it scrolled into whatever position
  // the previous result set was at.
  lgaGrid.scrollTop = 0;
  lgaGrid.scrollLeft = 0;

  if (lgaShowToggle && lgaShowToggleBtn) {
    if (isSearching || ranked.length <= DEFAULT_VISIBLE_LGAS) {
      lgaShowToggle.hidden = true;
    } else {
      lgaShowToggle.hidden = false;
      lgaShowToggleBtn.textContent = lgaExpanded
        ? "Show fewer LGAs ↑"
        : `Show all ${ranked.length} LGAs ↓`;
    }
  }
}

lgaShowToggleBtn?.addEventListener("click", () => {
  lgaExpanded = !lgaExpanded;
  renderLgaNetwork(lgaSearch?.value || "");
  if (!lgaExpanded) {
    document.getElementById("lgas")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
});

async function loadLgaNetwork() {
  try {
    const response = await fetch(`${API_BASE}/api/supporters/lgas`, {
      headers: { Accept: "application/json" }
    });

    if (!response.ok) throw new Error("Unable to load LGA statistics.");

    const data = await response.json();

    lgaCounts = Object.fromEntries(
      (data.data || []).map(row => [row.lga, Number(row.count) || 0])
    );

    if (lgaReached) {
      lgaReached.textContent = lgaNames.length;
    }

    if (lgaSupporters) {
      const total = lgaNames.reduce(
        (sum, name) => sum + Number(lgaCounts[name] || 0),
        0
      );
      lgaSupporters.textContent = total.toLocaleString();
    }
  } catch {
    lgaCounts = {};
  }

  renderLgaNetwork(lgaSearch?.value || "");
}

lgaSearch?.addEventListener("input", event => {
  renderLgaNetwork(event.target.value);
});

renderLgaNetwork();
loadLgaNetwork();


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
      if(el.classList.contains("heart-card") || el.classList.contains("lga-network-card")){
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
