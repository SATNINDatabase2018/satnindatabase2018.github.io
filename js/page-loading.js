(() => {
 if(window.HMPageLoading)return;window.HMPageLoading=true;
 const css=document.createElement('style');css.textContent=`#page-loading{position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(255,248,242,.38);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);color:var(--text,#39473b);transition:opacity .16s ease}[data-theme="dark"] #page-loading{background:rgba(18,21,36,.38)}#page-loading[hidden]{display:none}#page-loading .loading-inner{text-align:center;padding:30px}#page-loading .loading-ring{width:38px;height:38px;margin:0 auto 18px;border:3px solid var(--border,#e6d7d3);border-top-color:var(--green,#577b5b);border-radius:50%;animation:page-spin .8s linear infinite}#page-loading strong{font-size:20px}#page-loading p{font-size:14px;opacity:.75;margin-top:10px}@keyframes page-spin{to{transform:rotate(360deg)}}@media(prefers-reduced-motion:reduce){#page-loading{transition:none}#page-loading .loading-ring{animation:none}}`;document.head.append(css);
 const overlay=document.createElement('div');overlay.id='page-loading';overlay.hidden=true;overlay.setAttribute('role','status');overlay.setAttribute('aria-live','polite');const inner=document.createElement('div');inner.className='loading-inner';const ring=document.createElement('div');ring.className='loading-ring';ring.setAttribute('aria-hidden','true');const title=document.createElement('strong');title.textContent="SATNIN’s Database";const message=document.createElement('p');message.textContent='Loading page…';inner.append(ring,title,message);overlay.append(inner);
 let timer,settleTimer,shownAt=0;const started=Date.now();let pageLoaded=document.readyState==='complete',pending=0,lastActivity=Date.now(),finished=false;
 const originalFetch=window.fetch;
 window.fetch=function(...args){pending++;lastActivity=Date.now();return originalFetch.apply(this,args).finally(()=>{pending--;lastActivity=Date.now();});};
 function ready(){
  if(finished)return;
  const visibleImages=[...document.images].filter(img=>img.loading!=='lazy'||img.getBoundingClientRect().top<innerHeight);
  const imagesReady=visibleImages.every(img=>img.complete);
  if(pageLoaded&&!pending&&imagesReady&&Date.now()-lastActivity>=200&&(!shownAt||Date.now()-shownAt>=650)){finished=true;hide();return;}
  if(Date.now()-started>=20000){finished=true;hide();return;}
  settleTimer=setTimeout(ready,100);
 }
 window.addEventListener('load',()=>{pageLoaded=true;lastActivity=Date.now();},{once:true});
 function mount(){if(!overlay.isConnected)document.body.append(overlay);}
 function hide(){clearTimeout(timer);overlay.hidden=true;document.documentElement.removeAttribute('aria-busy');}
 function show(){if(finished)return;mount();shownAt=Date.now();overlay.hidden=false;document.documentElement.setAttribute('aria-busy','true');clearTimeout(timer);timer=setTimeout(hide,20000);}
 // Only the destination page may show a loader. Fast navigations show none.
 setTimeout(()=>{if(!finished)show();},450);
 if(document.readyState==='loading'){
  document.addEventListener('DOMContentLoaded',()=>{mount();ready();},{once:true});
 }else{mount();ready();}
 window.addEventListener('pageshow',e=>{if(e.persisted)hide();});window.addEventListener('pagehide',()=>{clearTimeout(settleTimer);});
 setTimeout(()=>{finished=true;clearTimeout(settleTimer);hide();},20000);
})();
