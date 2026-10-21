/* Persistent navigation highlights, including script-driven tab changes. */
(()=>{
 const page=path=>path.replace(/\/index\.html$/,'/').replace(/\/$/,'').split('/').pop()||'';
 function refresh(){const nav=document.querySelector('body>header nav');if(!nav)return;const current=page(location.pathname),hash=location.hash||(current==='stable'?'#owned':current==='collection'?'#everything':'');
  for(const link of nav.querySelectorAll('a[href]')){const url=new URL(link.href,location.href);const on=page(url.pathname)===current&&(!url.hash||url.hash===hash)&&!(current==='login'&&hash==='#signup'&&!url.hash);link.classList.toggle('hm-current-page',on);if(on)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current');}
  for(const menu of nav.querySelectorAll('.guides-menu')){const on=[...menu.querySelectorAll('a[href]')].some(link=>page(new URL(link.href,location.href).pathname)===current);menu.classList.toggle('hm-current-section',on);const summary=menu.querySelector('summary');if(summary){summary.classList.toggle('hm-current-page',on);if(on)summary.setAttribute('aria-current','page');else summary.removeAttribute('aria-current');}}
 }
 for(const method of ['pushState','replaceState']){const original=history[method];history[method]=function(...args){const value=original.apply(this,args);refresh();return value;};}
 for(const event of ['hashchange','popstate','pageshow','hm-navigation'])window.addEventListener(event,refresh);
 function mount(){refresh();const nav=document.querySelector('body>header nav');if(nav)new MutationObserver(refresh).observe(nav,{childList:true,subtree:true});}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();
