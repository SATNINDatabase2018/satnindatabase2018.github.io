/* Set your public Discord username here; no private account details are used. */
(() => {
  const DISCORD_USERNAME = 'crabatthequeen';
  const HM_NAME = 'Luna Dovegarden (2018 version)';
  const logoImage=()=> 'assets/satnin-clam-otter-'+(document.documentElement.dataset.theme==='darkcoffee'?'coffee':(['light','dark','coffee','forest'].includes(document.documentElement.dataset.theme)?document.documentElement.dataset.theme:'light'))+'.png?v=96'; // Example: assets/logo.png
  const SITE_NAME = "SATNIN's Database";
  const text=(tag,value,cls)=>{const n=document.createElement(tag);n.textContent=value;if(cls)n.className=cls;return n;};
  function updateHeader(){
    const header=document.querySelector('body>header');if(!header)return;
    const old=header.querySelector('.header-brand,.logo');
    if(old){
      const brand=text('div','','header-brand');const imageLink=text('a','','header-logo-image');imageLink.href='./';imageLink.setAttribute('aria-label',SITE_NAME+' home');
      const img=document.createElement('img');img.src=logoImage();img.alt='';imageLink.append(img);
      const words=text('div','','header-wordmark');const title=text('a',SITE_NAME,'logo');title.href='./';const credit=text('span','for 2018 Horse Museum','logo-credit');words.append(title,credit);brand.append(imageLink,words);old.replaceWith(brand);
    }
    const nav=header.querySelector('nav');
    if(nav){const database=nav.querySelector('a[href="database/"]'),outfits=nav.querySelector('a[href="outfits/"]');if(database&&outfits&&database.nextElementSibling!==outfits)database.after(outfits);}
    if(nav&&!nav.querySelector('.guides-menu')){
      const menu=text('details','','guides-menu'),summary=text('summary','HM Guides');menu.append(summary);
      const links=text('div','','guides-menu-links');
      links.append(text('small','JORVIK GUIDES','guides-caption'));
      for(const [label,path,icon,description]of [['Spirit timetable','spirit/','◷','Find Spirit’s current location'],['Championships','championships/','⚑','See the next race in UTC'],['Unlocking areas','areas/','⌘','Explore area requirements']]){const a=text('a','');a.href=path;const badge=text('span',icon,'guide-link-icon');badge.setAttribute('aria-hidden','true');const copy=text('span','','guide-link-copy');copy.append(text('strong',label),text('small',description));a.append(badge,copy);links.append(a);}menu.append(links);nav.insertBefore(menu,nav.querySelector('.account-nav-actions'));
      document.addEventListener('pointerdown',e=>{if(!menu.contains(e.target))menu.open=false;},true);
      menu.addEventListener('keydown',e=>{if(e.key==='Escape'){menu.open=false;summary.focus();}});
    }
    if(nav){
      for(const [path,name,entries]of [['stable/','My Stable',[['My Horses','owned'],['Wishlist','wishlist']]],['collection/','My Collection',[['Everything','everything'],['Owned','owned'],['Wishlist','wishlist'],['Wardrobe (My Storage)','wardrobe']]]]){
        const original=[...nav.querySelectorAll('a')].find(a=>a.getAttribute('href')===path);if(!original||original.closest('.header-page-menu'))continue;
        const menu=text('details','','guides-menu header-page-menu'),summary=text('summary',name),links=text('div','','guides-menu-links');menu.append(summary,links);original.replaceWith(menu);
        for(const [label,hash]of entries){const a=text('a',label);a.href=path+'#'+hash;if(hash==='wardrobe'){a.hidden=true;supabaseClient.rpc('hm_is_admin').then(({data,error})=>{a.hidden=!!error||data!==true;}).catch(()=>{});}a.addEventListener('click',()=>menu.open=false);links.append(a);}
      }
      for(const menu of nav.querySelectorAll('.guides-menu')){
        if(menu.dataset.hoverReady)continue;menu.dataset.hoverReady='true';let timer;
        menu.addEventListener('mouseenter',()=>{if(matchMedia('(hover:hover)').matches){clearTimeout(timer);menu.open=true;}});menu.addEventListener('mouseleave',()=>{timer=setTimeout(()=>{if(!menu.contains(document.activeElement))menu.open=false;},100);});
        document.addEventListener('pointerdown',e=>{if(!menu.contains(e.target))menu.open=false;},true);menu.addEventListener('keydown',e=>{if(e.key==='Escape'){menu.open=false;menu.querySelector('summary').focus();}});
      }
    }
    const pageName=path=>path.replace(/\/index\.html$/,'/').replace(/\/$/,'').split('/').pop()||'';const current=pageName(location.pathname);
    header.querySelectorAll('nav a').forEach(a=>{
      const url=new URL(a.href,location.href);const matches=pageName(url.pathname)===current&&(!url.hash||url.hash===location.hash)&&!(current==='login'&&location.hash==='#signup'&&!url.hash);
      if(matches)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');
    });
  }
  window.addEventListener('hashchange',updateHeader);
  function mountNewsBanner(){
    const header=document.querySelector('body>header');
    if(!header||typeof supabaseClient==='undefined'||document.getElementById('satnin-news-banner'))return;
    let neverKey='',storageKey='',never=false,latest=null,closed=new Set(),loading=false,preferencesReady=false,profile=null,pending=false;
    const banner=text('aside','','satnin-news-banner');banner.id='satnin-news-banner';banner.hidden=true;banner.setAttribute('aria-label','Latest news from SATNIN');
    const copy=text('div','','satnin-news-copy'),label=text('span','From SATNIN','satnin-news-label'),title=text('strong','','satnin-news-title'),body=text('p','','satnin-news-excerpt');
    const link=text('a','Read news →','satnin-news-link');link.href='news/';
    const close=text('button','×','satnin-news-close');close.type='button';close.setAttribute('aria-label','Dismiss this news announcement');
    const neverButton=text('button','Never show news banners again','satnin-news-never');neverButton.type='button';
    const status=text('p','','satnin-news-sync-status');status.hidden=true;status.setAttribute('role','status');header.after(status);header.after(banner);
    function persist(){try{localStorage.setItem(neverKey,String(never));localStorage.setItem(storageKey,JSON.stringify([...closed]));}catch{}}
    function show(){banner.hidden=!preferencesReady||never||!latest||closed.has(String(latest.id));}
    function changed(){pending=true;persist();show();syncPreferences();}
    neverButton.addEventListener('click',()=>{never=true;changed();});
    close.addEventListener('click',()=>{if(latest){closed.add(String(latest.id));changed();}});
    copy.append(label,title,body,link,neverButton);banner.append(copy,close);
    function merge(row){if(row){never=never||row.hide_all;for(const id of row.dismissed_ids||[])closed.add(String(id));}persist();}
    let syncing=null;
    async function syncPreferences(){
      if(!profile||profile==='guest'){pending=false;return true;}
      if(syncing){await syncing;return pending?syncPreferences():true;}
      const owner=profile,ids=[...closed],hide=never;
      syncing=(async()=>{
        try{const {data,error}=await supabaseClient.rpc('hm_save_news_banner_preferences',{p_dismissed_ids:ids,p_hide_all:hide});if(error)throw error;
          if(owner!==profile)return false;merge(Array.isArray(data)?data[0]:data);pending=[...closed].some(id=>!ids.includes(id))||never!==hide;status.hidden=true;show();return true;
        }catch{if(owner===profile){pending=true;status.textContent='Banner choice saved on this device. Account sync failed; retrying automatically.';status.hidden=false;}return false;}
      })();
      const ok=await syncing;syncing=null;if(ok&&pending&&owner===profile)return syncPreferences();return ok;
    }
    window.addEventListener('storage',event=>{if(event.key!==storageKey&&event.key!==neverKey)return;
      try{never=localStorage.getItem(neverKey)==='true';closed=new Set(JSON.parse(localStorage.getItem(storageKey)||'[]').map(String));pending=true;show();syncPreferences();}catch{}
    });
    async function refresh(){
      if(!profile||loading||document.hidden)return;loading=true;const owner=profile;
      try{
        if(owner!=='guest'){
          if(pending)await syncPreferences();
          const {data,error}=await supabaseClient.from('hm_news_banner_preferences').select('hide_all,dismissed_ids').eq('user_id',owner).maybeSingle();
          if(owner!==profile)return;
          if(!error){merge(data);status.hidden=!pending;}
        }
        if(owner!==profile)return;preferencesReady=true;show();if(never)return;
        const {data,error}=await supabaseClient.from('hm_news').select('id,title,body,created_at').eq('source','admin').is('parent_key',null).order('created_at',{ascending:false}).order('id',{ascending:false}).limit(1);
        if(error||owner!==profile)return;latest=data?.[0]||null;
        if(latest){title.textContent=latest.title||'Latest update';const content=String(latest.body||'').replace(/\s+/g,' ').trim();body.textContent=content.length>280?content.slice(0,277)+'…':content;body.hidden=!content;}show();
      }catch{}finally{loading=false;if(owner!==profile)refresh();}
    }
    function useProfile(user){
      const next=user?.id||'guest';if(profile===next)return;profile=next;latest=null;preferencesReady=false;
      neverKey='hm2018:hide-all-news-banners:'+next;storageKey='hm2018:dismissed-satnin-news:'+next;never=false;closed=new Set();status.hidden=true;
      try{never=localStorage.getItem(neverKey)==='true';const value=JSON.parse(localStorage.getItem(storageKey)||'[]');if(Array.isArray(value))closed=new Set(value.map(String));}catch{}
      pending=never||closed.size>0;show();refresh();
    }
    supabaseClient.auth.onAuthStateChange((_event,session)=>{setTimeout(()=>useProfile(session?.user),0);});
    supabaseClient.auth.getSession().then(({data})=>{if(profile===null)useProfile(data?.session?.user);}).catch(()=>{if(profile===null)useProfile(null);});
    setInterval(refresh,60000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
    window.addEventListener('online',refresh);
  }
  function mount(){
    updateHeader();
    mountNewsBanner();
    if(document.querySelector('.site-footer'))return;
    const footer=text('footer','','site-footer');
    const inner=text('div','','footer-inner');
    const brand=text('div','','footer-brand');brand.append(text('strong',SITE_NAME),text('p','My database for Horse Museum 2018 Version. I’m SATNIN, and I’ve extracted, compiled and organised the data that makes this database possible.'));
    const nav=document.createElement('nav');nav.setAttribute('aria-label','Footer navigation');
    for(const [label,href]of [['News','news/'],['How to use','tutorial/'],['About & credits','about/'],['Contact / Discord','contact/'],['Privacy','privacy/']]){const a=text('a',label);a.href=href;nav.append(a);}
    brand.append(text('p','Some information in my database may be incorrect. If you spot a mistake, please contact me on Discord: crabatthequeen.'));
    inner.append(brand,nav);
    const bottom=text('div','','footer-bottom');bottom.append(text('small',`© ${new Date().getFullYear()} ${SITE_NAME}. Unofficial fan-made archive.`),text('small','Star Stable and its game assets belong to their respective owners. This site is not affiliated with or endorsed by Star Stable Entertainment.'));
    footer.append(inner,bottom);document.body.append(footer);

  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();
