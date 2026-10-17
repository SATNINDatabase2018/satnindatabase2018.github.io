/* Set your public Discord username here; no private account details are used. */
(() => {
  const DISCORD_USERNAME = '';
  const LOGO_IMAGE = ''; // Example: assets/logo.png
  const SITE_NAME = 'HM 2018';
  const text=(tag,value,cls)=>{const n=document.createElement(tag);n.textContent=value;if(cls)n.className=cls;return n;};
  function mount(){
    if(LOGO_IMAGE)document.querySelectorAll('header .logo').forEach(link=>{const img=document.createElement('img');img.src=LOGO_IMAGE;img.alt=SITE_NAME;link.replaceChildren(img);});
    if(document.querySelector('.site-footer'))return;
    const footer=text('footer','','site-footer');
    const inner=text('div','','footer-inner');
    const brand=text('div','','footer-brand');brand.append(text('strong','HM 2018'),text('p','A little archive of Jorvik, as it was in 2018.'));
    const nav=document.createElement('nav');nav.setAttribute('aria-label','Footer navigation');
    for(const [label,href]of [['About & credits','about.html'],['Contact / Discord','contact.html'],['Privacy','privacy.html']]){const a=text('a',label);a.href=href;nav.append(a);}
    inner.append(brand,nav);
    const bottom=text('div','','footer-bottom');bottom.append(text('small',`© ${new Date().getFullYear()} HM 2018. Unofficial fan-made archive.`),text('small','Star Stable and its game assets belong to their respective owners. This site is not affiliated with or endorsed by Star Stable Entertainment.'));
    footer.append(inner,bottom);document.body.append(footer);
    const contact=document.getElementById('discord-contact');
    if(contact){contact.replaceChildren();if(DISCORD_USERNAME){contact.append(text('strong',DISCORD_USERNAME),text('p','Find this username in Discord to get in touch.'));}else contact.append(text('p','Discord contact details will be added here soon.'));}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();
