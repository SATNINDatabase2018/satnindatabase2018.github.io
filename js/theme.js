/* Apply before paint, then offer one persistent switch across all pages. */
(() => {
  const key='hm2018:theme';
  let choice='light';try{choice=localStorage.getItem(key)==='dark'?'dark':'light';}catch{}
  function apply(theme){
    choice=theme==='dark'?'dark':'light';document.documentElement.dataset.theme=choice;
    document.documentElement.style.colorScheme=choice;
    const button=document.getElementById('theme-toggle');
    if(button){button.textContent=choice==='dark'?'✿ Blossom':'☾ Night';button.setAttribute('aria-label',choice==='dark'?'Switch to Cherry Blossom light theme':'Switch to Night dark theme');button.setAttribute('aria-pressed',String(choice==='dark'));}
    let meta=document.querySelector('meta[name="theme-color"]');if(!meta){meta=document.createElement('meta');meta.name='theme-color';document.head.append(meta);}meta.content=choice==='dark'?'#121524':'#fff7f7';
  }
  apply(choice);
  function mount(){const header=document.querySelector('header');if(!header)return;const b=document.createElement('button');b.id='theme-toggle';b.type='button';b.className='theme-toggle';b.addEventListener('click',()=>{apply(choice==='dark'?'light':'dark');try{localStorage.setItem(key,choice);}catch{}});(header.querySelector('nav')||header).append(b);apply(choice);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
  window.addEventListener('storage',e=>{if(e.key===key)apply(e.newValue);});
})();
