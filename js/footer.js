/* Set your public Discord username here; no private account details are used. */
(() => {
  const DISCORD_USERNAME = 'crabatthequeen';
  const HM_NAME = 'Luna Dovegarden (2018 version)';
  const logoImage=()=> 'assets/satnin-clam-otter-'+(['light','dark','coffee','forest'].includes(document.documentElement.dataset.theme)?document.documentElement.dataset.theme:'light')+'.png?v=96'; // Example: assets/logo.png
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
    if(nav&&!nav.querySelector('.guides-menu')){
      const menu=text('details','','guides-menu'),summary=text('summary','Guides');menu.append(summary);
      const links=text('div','','guides-menu-links');
      for(const [label,path]of [['Spirit timetable','spirit/'],['Championships','championships/'],['Unlocking areas','areas/']]){const a=text('a',label);a.href=path;links.append(a);}menu.append(links);nav.insertBefore(menu,nav.querySelector('.account-nav-actions'));
      document.addEventListener('pointerdown',e=>{if(!menu.contains(e.target))menu.open=false;},true);
      menu.addEventListener('keydown',e=>{if(e.key==='Escape'){menu.open=false;summary.focus();}});
    }
    const pageName=path=>path.replace(/\/index\.html$/,'/').replace(/\/$/,'').split('/').pop()||'';const current=pageName(location.pathname);
    header.querySelectorAll('nav a').forEach(a=>{
      const url=new URL(a.href,location.href);const matches=pageName(url.pathname)===current&&(!url.hash||url.hash===location.hash)&&!(current==='login'&&location.hash==='#signup'&&!url.hash);
      if(matches)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');
    });
  }
  window.addEventListener('hashchange',updateHeader);
  function mount(){
    updateHeader();
    if(document.querySelector('.site-footer'))return;
    const footer=text('footer','','site-footer');
    const inner=text('div','','footer-inner');
    const brand=text('div','','footer-brand');brand.append(text('strong',SITE_NAME),text('p','My database for Horse Museum 2018 Version. I’m SATNIN, and I’ve extracted, compiled and organised the data that makes this database possible.'));
    const nav=document.createElement('nav');nav.setAttribute('aria-label','Footer navigation');
    for(const [label,href]of [['News','news/'],['How to use','tutorial/'],['About & credits','about/'],['Contact / Discord','contact/'],['Privacy','privacy/']]){const a=text('a',label);a.href=href;nav.append(a);}
    brand.append(text('p','I’m SATNIN. Some information in my database may be incorrect. If you spot a mistake, please contact me on Discord: crabatthequeen.'));
    inner.append(brand,nav);
    const bottom=text('div','','footer-bottom');bottom.append(text('small',`© ${new Date().getFullYear()} ${SITE_NAME}. Unofficial fan-made archive.`),text('small','Star Stable and its game assets belong to their respective owners. This site is not affiliated with or endorsed by Star Stable Entertainment.'));
    footer.append(inner,bottom);document.body.append(footer);

  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();
