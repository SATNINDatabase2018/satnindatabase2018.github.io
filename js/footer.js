/* Set your public Discord username here; no private account details are used. */
(() => {
  const DISCORD_USERNAME = 'crabatthequeen';
  const HM_NAME = 'Luna Dovegarden (2018 version)';
  const LOGO_IMAGE = 'assets/cloud-horseshoe-logo.png'; // Example: assets/logo.png
  const SITE_NAME = 'HM 2018';
  const text=(tag,value,cls)=>{const n=document.createElement(tag);n.textContent=value;if(cls)n.className=cls;return n;};
  function updateHeader(){
    const header=document.querySelector('body>header');if(!header)return;
    const old=header.querySelector('.header-brand,.logo');
    if(old){
      const brand=text('div','','header-brand');const imageLink=text('a','','header-logo-image');imageLink.href='index.html';imageLink.setAttribute('aria-label','HM 2018 home');
      const img=document.createElement('img');img.src=LOGO_IMAGE;img.alt='';imageLink.append(img);
      const words=text('div','','header-wordmark');const title=text('a',SITE_NAME,'logo');title.href='index.html';const credit=text('a','by SATNIN','logo-credit');credit.href='contact.html';words.append(title,credit);brand.append(imageLink,words);old.replaceWith(brand);
    }
    const current=location.pathname.split('/').pop()||'index.html';
    header.querySelectorAll('nav a').forEach(a=>{
      const url=new URL(a.href,location.href);const matches=url.pathname.split('/').pop()===current&&(!url.hash||url.hash===location.hash)&&!(current==='login.html'&&location.hash==='#signup'&&!url.hash);
      if(matches)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');
    });
  }
  window.addEventListener('hashchange',updateHeader);
  function mount(){
    updateHeader();
    if(document.querySelector('.site-footer'))return;
    const footer=text('footer','','site-footer');
    const inner=text('div','','footer-inner');
    const brand=text('div','','footer-brand');brand.append(text('strong','HM 2018'),text('p','My database for Horse Museum 2018 Version. I’m SATNIN, and I’ve extracted, compiled and organised the data that makes this database possible.'));
    const nav=document.createElement('nav');nav.setAttribute('aria-label','Footer navigation');
    for(const [label,href]of [['About & credits','about.html'],['Contact / Discord','contact.html'],['Privacy','privacy.html']]){const a=text('a',label);a.href=href;nav.append(a);}
    brand.append(text('p','I’m SATNIN. Some information in my database may be incorrect. If you spot a mistake, please contact me on Discord: crabatthequeen.'));
    inner.append(brand,nav);
    const bottom=text('div','','footer-bottom');bottom.append(text('small',`© ${new Date().getFullYear()} HM 2018. Unofficial fan-made archive.`),text('small','Star Stable and its game assets belong to their respective owners. This site is not affiliated with or endorsed by Star Stable Entertainment.'));
    footer.append(inner,bottom);document.body.append(footer);

  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();
