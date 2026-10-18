(() => {
 if(window.HMPageLoading)return;window.HMPageLoading=true;
 const css=document.createElement('style');css.textContent=`#page-loading{position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:var(--bg,#fff8f2);color:var(--text,#39473b);transition:opacity .16s ease}#page-loading[hidden]{display:none}#page-loading .loading-inner{text-align:center;padding:30px}#page-loading .loading-ring{width:38px;height:38px;margin:0 auto 18px;border:3px solid var(--border,#e6d7d3);border-top-color:var(--green,#577b5b);border-radius:50%;animation:page-spin .8s linear infinite}#page-loading strong{font-size:20px}#page-loading p{font-size:14px;opacity:.75;margin-top:10px}@keyframes page-spin{to{transform:rotate(360deg)}}@media(prefers-reduced-motion:reduce){#page-loading{transition:none}#page-loading .loading-ring{animation:none}}`;document.head.append(css);
 const overlay=document.createElement('div');overlay.id='page-loading';overlay.setAttribute('role','status');overlay.setAttribute('aria-live','polite');const inner=document.createElement('div');inner.className='loading-inner';const ring=document.createElement('div');ring.className='loading-ring';ring.setAttribute('aria-hidden','true');const title=document.createElement('strong');title.textContent="SATNIN’s Database";const message=document.createElement('p');message.textContent='Loading page…';inner.append(ring,title,message);overlay.append(inner);
 let timer,settleTimer;const started=Date.now();let pageLoaded=document.readyState==='complete',pending=0,lastActivity=Date.now(),finished=false;
 const originalFetch=window.fetch;
 window.fetch=function(...args){pending++;lastActivity=Date.now();return originalFetch.apply(this,args).finally(()=>{pending--;lastActivity=Date.now();});};
 function ready(){
  if(finished)return;
  const visibleImages=[...document.images].filter(img=>img.loading!=='lazy'||img.getBoundingClientRect().top<innerHeight);
  const imagesReady=visibleImages.every(img=>img.complete);
  if(pageLoaded&&!pending&&imagesReady&&Date.now()-lastActivity>=500&&Date.now()-started>=1200){finished=true;hide();return;}
  if(Date.now()-started>=20000){finished=true;hide();return;}
  settleTimer=setTimeout(ready,100);
 }
 window.addEventListener('load',()=>{pageLoaded=true;lastActivity=Date.now();},{once:true});
 function mount(){if(!overlay.isConnected)document.body.append(overlay);}
 function hide(){clearTimeout(timer);overlay.hidden=true;document.documentElement.removeAttribute('aria-busy');}
 function show(){mount();overlay.hidden=false;document.documentElement.setAttribute('aria-busy','true');clearTimeout(timer);timer=setTimeout(hide,20000);}
 // The overlay covers document navigation, not later account/database requests.
 document.addEventListener('click',e=>{
  if(e.defaultPrevented||e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;
  const a=e.target.closest?.('a[href]');if(!a||a.hasAttribute('download')||(a.target&&a.target!=='_self'))return;
  const next=new URL(a.href,location.href);if(next.origin!==location.origin||!['http:','https:'].includes(next.protocol))return;
  if(next.pathname===location.pathname&&next.search===location.search)return;
  // Let other link handlers cancel their action before displaying the overlay.
  queueMicrotask(()=>{if(!e.defaultPrevented)show();});
 });
 if(document.readyState==='loading'){
  const observer=new MutationObserver(()=>{if(document.body){mount();observer.disconnect();}});observer.observe(document.documentElement,{childList:true});
  document.addEventListener('DOMContentLoaded',()=>{mount();ready();},{once:true});
 }else{mount();ready();}
 window.addEventListener('pageshow',e=>{if(e.persisted)hide();});window.addEventListener('pagehide',()=>{clearTimeout(settleTimer);hide();});
 setTimeout(()=>{finished=true;clearTimeout(settleTimer);hide();},20000);
})();
