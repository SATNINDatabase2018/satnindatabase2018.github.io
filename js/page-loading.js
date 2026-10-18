(() => {
 if(window.HMPageLoading)return;window.HMPageLoading=true;
 const css=document.createElement('style');css.textContent=`#page-loading{position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:var(--bg,#fff8f2);color:var(--text,#39473b);transition:opacity .16s ease}#page-loading[hidden]{display:none}#page-loading .loading-inner{text-align:center;padding:30px}#page-loading .loading-ring{width:38px;height:38px;margin:0 auto 18px;border:3px solid var(--border,#e6d7d3);border-top-color:var(--green,#577b5b);border-radius:50%;animation:page-spin .8s linear infinite}#page-loading strong{font-size:20px}#page-loading p{font-size:14px;opacity:.75;margin-top:10px}@keyframes page-spin{to{transform:rotate(360deg)}}@media(prefers-reduced-motion:reduce){#page-loading{transition:none}#page-loading .loading-ring{animation:none}}`;document.head.append(css);
 const overlay=document.createElement('div');overlay.id='page-loading';overlay.setAttribute('role','status');overlay.setAttribute('aria-live','polite');const inner=document.createElement('div');inner.className='loading-inner';const ring=document.createElement('div');ring.className='loading-ring';ring.setAttribute('aria-hidden','true');const title=document.createElement('strong');title.textContent="SATNIN’s Database";const message=document.createElement('p');message.textContent='Loading page…';inner.append(ring,title,message);overlay.append(inner);
 let timer;
 function mount(){if(!overlay.isConnected)document.body.append(overlay);}
 function hide(){clearTimeout(timer);overlay.hidden=true;document.documentElement.removeAttribute('aria-busy');}
 function show(){mount();overlay.hidden=false;document.documentElement.setAttribute('aria-busy','true');clearTimeout(timer);timer=setTimeout(hide,10000);}
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
  document.addEventListener('DOMContentLoaded',()=>{mount();requestAnimationFrame(hide);},{once:true});
 }else{mount();hide();}
 window.addEventListener('pageshow',hide);window.addEventListener('pagehide',hide);
 setTimeout(hide,10000);
})();
