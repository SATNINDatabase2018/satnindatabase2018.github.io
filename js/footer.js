/* Set your public Discord username here; no private account details are used. */
(() => {
  const DISCORD_USERNAME = 'crabatthequeen';
  const HM_NAME = 'Luna Dovegarden (2018 version)';
  const LOGO_IMAGE = 'assets/cloud-horseshoe-logo.png'; // Example: assets/logo.png
  const SITE_NAME = 'HM 2018';
  const text=(tag,value,cls)=>{const n=document.createElement(tag);n.textContent=value;if(cls)n.className=cls;return n;};
  function mount(){
    if(document.querySelector('.site-footer'))return;
    const footer=text('footer','','site-footer');
    const inner=text('div','','footer-inner');
    const brand=text('div','','footer-brand');brand.append(text('strong','HM 2018'),text('p','My database for Horse Museum 2018 Version.'));
    const nav=document.createElement('nav');nav.setAttribute('aria-label','Footer navigation');
    for(const [label,href]of [['About & credits','about.html'],['Contact / Discord','contact.html'],['Privacy','privacy.html']]){const a=text('a',label);a.href=href;nav.append(a);}
    brand.append(text('p','I’m SATNIN. Some information in my database may be incorrect. If you spot a mistake, please contact me on Discord: crabatthequeen.'));
    inner.append(brand,nav);
    const bottom=text('div','','footer-bottom');bottom.append(text('small',`© ${new Date().getFullYear()} HM 2018. Unofficial fan-made archive.`),text('small','Star Stable and its game assets belong to their respective owners. This site is not affiliated with or endorsed by Star Stable Entertainment.'));
    footer.append(inner,bottom);document.body.append(footer);
    const contact=document.getElementById('discord-contact');
    if(contact){contact.replaceChildren();if(DISCORD_USERNAME){contact.append(text('strong',DISCORD_USERNAME),text('p','HM name: '+HM_NAME),text('p','My nickname is SATNIN. If you spot incorrect information or missing items, please send me a message on Discord.'));}else contact.append(text('p','Discord contact details will be added here soon.'));}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();
