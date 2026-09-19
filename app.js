
const $=(s,e=document)=>e.querySelector(s), $$=(s,e=document)=>[...e.querySelectorAll(s)];
const data=window.ROOT_DATA, roots=data.roots;
const bookEl=$("#book"),gridEl=$("#grid"),bookView=$("#bookView"),browseView=$("#browseView"),
bookMode=$("#bookMode"),browseMode=$("#browseMode"),search=$("#search"),searchResults=$("#searchResults"),
prevBtn=$("#prevBtn"),nextBtn=$("#nextBtn"),tocBtn=$("#tocBtn"),tocDialog=$("#tocDialog"),
tocList=$("#tocList"),position=$("#position"),currentRoot=$("#currentRoot");
let current=0, mode=localStorage.getItem("rootNotebookView")||"book", pageFlip=null, suppress=false;

const slug=s=>s.normalize("NFKD").replace(/[\u0300-\u036f]/g,"").replaceAll("ʿ","ayn").replaceAll("ʾ","hamza").replace(/[^a-zA-Z0-9]+/g,"-").replace(/^-|-$/g,"").toLowerCase();

function hebrewHTML(r){
  if(!r.hebrew) return "";
  const ex=(r.hebrew.examples||[]).map(x=>`<span class="hebrew-chip">${x}</span>`).join("");
  return `<details class="hebrew"><summary>Hebrew connection · ${r.hebrew.status}</summary><div class="hebrew-body"><p><strong>Root:</strong> ${r.hebrew.root}</p>${ex?`<div class="hebrew-examples">${ex}</div>`:""}<p>${r.hebrew.note}</p></div></details>`;
}
function rootPage(r,i){return `<div class="page root-page" data-root-index="${i}"><div class="page-content"><div class="page-no">${i+1}</div><div class="root-number">Root ${String(i+1).padStart(3,"0")}</div><h2 class="root-title">${r.root}</h2><div class="root-core">${r.core}</div><div class="word-list">${r.forms.map(f=>`<div class="word"><div class="word-term">${f.term}</div><div class="word-type">${f.type}</div><div class="word-meaning">${f.meaning}</div></div>`).join("")}</div>${r.note ? `<div class="root-note">${r.note}</div>` : ""}${hebrewHTML(r)}</div></div>`}
function buildBook(){
  bookEl.innerHTML=`<div class="page cover" data-density="hard"><div class="page-content"><div><div class="cover-kicker">A visual root book</div><h1>${data.title}</h1><p>${data.subtitle}. One root family per page, with Hebrew comparisons folded away until you want them.</p></div><div class="cover-bottom"><span>${roots.length} roots</span><span>open →</span></div></div></div>
  <div class="page intro-page"><div class="page-content"><span class="eyebrow">How to read it</span><h2>Start from the consonantal root.</h2><p>${data.selection.method}</p><div class="legend">${Object.entries(data.transliteration).map(([k,v])=>`<div><strong>${k}</strong> — ${v}</div>`).join("")}</div><p style="margin-top:22px;font-size:12px;color:#81786e">Use ← / →, search, or the root index. Arabic is intentionally presented in Latin transliteration.</p></div></div>${roots.map(rootPage).join("")}<div class="page back-cover" data-density="hard"><div class="page-content"><span class="eyebrow">End</span><h2>${roots.length} roots</h2><p>The same roots.js drives the physical book and the browse view.</p></div></div>`;
  pageFlip=new St.PageFlip(bookEl,{width:470,height:660,size:"stretch",minWidth:290,maxWidth:520,minHeight:440,maxHeight:730,maxShadowOpacity:.25,showCover:true,mobileScrollSupport:false,usePortrait:true,autoSize:true,drawShadow:true,flippingTime:600});
  pageFlip.loadFromHTML($$(".page",bookEl));
  pageFlip.on("flip",e=>{if(suppress)return; current=Math.max(0,Math.min(roots.length-1,e.data-2)); updateUI(false)});
  pageFlip.on("changeOrientation",()=>updateUI(false));
}
// StPageFlip starts gestures before click; keep Hebrew controls native, including cloned pages.
for(const eventName of ["mousedown","touchstart"]){
  bookEl.addEventListener(eventName,e=>{
    if(e.target.closest(".hebrew"))e.stopPropagation();
  },{capture:true});
}
function buildBrowse(){
  gridEl.innerHTML=roots.map((r,i)=>`<article class="root-card" id="${slug(r.root)}" data-index="${i}" tabindex="0"><div class="card-top"><div><div class="card-root">${r.root}</div><div class="card-core">${r.core}</div></div><div class="card-rank">${String(i+1).padStart(3,"0")}</div></div><div class="card-forms">${r.forms.slice(0,7).map(f=>`<span class="form-chip">${f.term}</span>`).join("")}</div><div class="card-hebrew">Hebrew: <strong>${r.hebrew.root}</strong> · ${r.hebrew.status}</div></article>`).join("");
  $$(".root-card",gridEl).forEach(c=>{const go=()=>selectRoot(+c.dataset.index,{scroll:true});c.onclick=go;c.onkeydown=e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();go()}}});
}
function buildToc(){
  tocList.innerHTML=roots.map((r,i)=>`<button class="toc-item" data-index="${i}"><strong>${r.root}</strong><small>${r.core}</small></button>`).join("");
  $$(".toc-item",tocList).forEach(b=>b.onclick=()=>{tocDialog.close();selectRoot(+b.dataset.index,{scroll:true,flip:true})});
}
const fuse=new Fuse(roots,{includeScore:true,threshold:.34,ignoreLocation:true,minMatchCharLength:2,keys:[{name:"root",weight:2.5},{name:"aliases",weight:2.2},{name:"forms.term",weight:1.8},{name:"forms.meaning",weight:1.2},{name:"core",weight:1.3},{name:"hebrew.root",weight:.7},{name:"hebrew.examples",weight:.5}]});
function showSearch(){
  const q=search.value.trim(); if(!q){searchResults.hidden=true;return}
  const rs=fuse.search(q,{limit:10});
  searchResults.innerHTML=rs.length?rs.map((x,n)=>{const r=x.item,i=roots.indexOf(r);return `<button class="search-result ${n===0?"active":""}" data-index="${i}"><span class="rroot">${r.root}</span><span><strong>${r.core}</strong><br><small>${r.forms.slice(0,4).map(f=>f.term).join(" · ")}</small></span></button>`}).join(""):`<div style="padding:15px;color:#746f67">No matching roots</div>`;
  searchResults.hidden=false; $$(".search-result",searchResults).forEach(b=>b.onclick=()=>{searchResults.hidden=true;search.blur();selectRoot(+b.dataset.index,{scroll:true,flip:true})});
}
function pageIndex(i){return i+2}

// Move by however many root pages/cards are visible at once.
// StPageFlip itself has portrait (1 page) and landscape (2 pages);
// Browse mode can naturally be 1, 2, 3, ... columns depending on width.
function visiblePageCount(){
  if(mode==="book" && pageFlip){
    return pageFlip.getOrientation?.() === "landscape" ? 2 : 1;
  }
  if(mode==="browse"){
    const columns=getComputedStyle(gridEl).gridTemplateColumns
      .split(/\s+/).filter(Boolean).length;
    return Math.max(1,columns);
  }
  return 1;
}
function navigate(direction){
  const step=visiblePageCount();
  selectRoot(current + direction*step,{scroll:true,flip:true});
}
function selectRoot(i,{scroll=false,flip=false}={}){
  current=Math.max(0,Math.min(roots.length-1,i)); updateUI(true);
  if(mode==="book"&&pageFlip&&flip){suppress=true;pageFlip.flip(pageIndex(current));setTimeout(()=>suppress=false,700)}
  if(mode==="browse"&&scroll)$(`.root-card[data-index="${current}"]`,gridEl)?.scrollIntoView({behavior:"smooth",block:"center"});
}
function updateUI(hash=true){
  const visible=visiblePageCount();
  const first=current+1, last=Math.min(roots.length,current+visible);
  position.textContent=visible>1?`${first}–${last} / ${roots.length}`:`${first} / ${roots.length}`;
  currentRoot.textContent=roots[current].root;prevBtn.disabled=current<=0;nextBtn.disabled=current>=roots.length-1;
  $$(".root-card",gridEl).forEach(c=>c.classList.toggle("selected",+c.dataset.index===current));
  if(hash)history.replaceState(null,"",`#${slug(roots[current].root)}`);
}
function setMode(next){
  mode=next;localStorage.setItem("rootNotebookView",mode);const b=mode==="book";bookView.hidden=!b;browseView.hidden=b;bookMode.classList.toggle("active",b);browseMode.classList.toggle("active",!b);
  if(b&&pageFlip)setTimeout(()=>{suppress=true;pageFlip.flip(pageIndex(current));setTimeout(()=>suppress=false,700)},50);
  else if(!b)setTimeout(()=>$(`.root-card[data-index="${current}"]`,gridEl)?.scrollIntoView({block:"center"}),30);
}
function initial(){const h=location.hash.slice(1);const i=roots.findIndex(r=>slug(r.root)===h);return i<0?0:i}
search.oninput=showSearch;search.onkeydown=e=>{if(e.key==="Escape"){searchResults.hidden=true;search.blur()} if(e.key==="Enter"){const f=$(".search-result",searchResults);if(f)f.click()}};
document.addEventListener("click",e=>{if(!e.target.closest(".search-wrap"))searchResults.hidden=true});
document.addEventListener("keydown",e=>{if(e.target.matches("input,textarea,select"))return;if(e.key==="/"){e.preventDefault();search.focus()}if(e.key==="ArrowRight")navigate(1);if(e.key==="ArrowLeft")navigate(-1);if(e.key.toLowerCase()==="b")setMode("book");if(e.key.toLowerCase()==="g")setMode("browse")});
prevBtn.onclick=()=>navigate(-1);nextBtn.onclick=()=>navigate(1);bookMode.onclick=()=>setMode("book");browseMode.onclick=()=>setMode("browse");tocBtn.onclick=()=>tocDialog.showModal();
window.addEventListener("resize",()=>updateUI(false));
buildBook();buildBrowse();buildToc();current=initial();updateUI(false);setMode(mode);if(current)selectRoot(current,{scroll:true,flip:true});
