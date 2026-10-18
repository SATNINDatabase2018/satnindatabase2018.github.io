/* Apply saved theme before paint; offer all themes on every page. */
(() => {
 const key='hm2018:theme',themes={light:{name:'✿ Blossom',colour:'#fff8f2'},dark:{name:'☾ Night',colour:'#121524'},coffee:{name:'☕ Coffee',colour:'#f2e8db'},forest:{name:'🌲 Night Forest',colour:'#101d18'}};
 let choice='light';try{const saved=localStorage.getItem(key);if(themes[saved])choice=saved;}catch{}
 function apply(theme){
  choice=themes[theme]?theme:'light';document.documentElement.dataset.theme=choice;document.documentElement.style.colorScheme=['dark','forest'].includes(choice)?'dark':'light';
  document.documentElement.style.backgroundColor=themes[choice].colour;
  document.documentElement.style.setProperty('--loading-tint',choice==='forest'?'rgba(16,29,24,.38)':choice==='dark'?'rgba(18,21,36,.38)':choice==='coffee'?'rgba(242,232,219,.38)':'rgba(255,248,242,.38)');
  const picker=document.getElementById('theme-toggle');if(picker)picker.value=choice;
  let meta=document.querySelector('meta[name="theme-color"]');if(!meta){meta=document.createElement('meta');meta.name='theme-color';document.head.append(meta);}meta.content=themes[choice].colour;
 }
 apply(choice);
 function mount(){const header=document.querySelector('header');if(!header||document.getElementById('theme-toggle'))return;const picker=document.createElement('select');picker.id='theme-toggle';picker.className='theme-toggle';picker.setAttribute('aria-label','Website theme');for(const [value,theme] of Object.entries(themes)){const option=document.createElement('option');option.value=value;option.textContent=theme.name;picker.append(option);}picker.addEventListener('change',()=>{apply(picker.value);try{localStorage.setItem(key,choice);}catch{}});(header.querySelector('nav')||header).append(picker);apply(choice);}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
 window.addEventListener('storage',e=>{if(e.key===key)apply(e.newValue);});
})();
