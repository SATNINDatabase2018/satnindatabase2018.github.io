/* Public content overrides; admin writes always require server-side authorization. */
(() => {
  'use strict';
  const $=id=>document.getElementById(id);
  const el=(tag,text='',cls='')=>{const n=document.createElement(tag);n.textContent=text;if(cls)n.className=cls;return n;};
  const rows=new Map(),originals=new WeakMap();
  let admin=false,editing=false,ready=false,manifest=null,dialog=null,loadError='',generation=0,applyQueued=false;
  function safeURL(value){
    const input=String(value).trim();
    if(!input||/[\u0000-\u0020\u007f\\]/.test(input)||input.startsWith('//'))return false;
    try{return ['https:','http:','mailto:'].includes(new URL(input,document.baseURI).protocol);}catch{return false;}
  }
  function tag(node,key,attr){if(!node)return;node.dataset.siteKey=key;if(attr)node.dataset.siteAttr=attr;}
  function sharedKeys(){
    tag(document.querySelector('header .logo'),'shared-site-name');
    tag(document.querySelector('header .header-logo-image img'),'shared-site-logo','src');
    tag(document.querySelector('header .logo-credit'),'shared-site-credit');
    tag(document.querySelector('header .guides-menu:not(.header-page-menu) summary'),'shared-guides-title');
    for(const a of document.querySelectorAll('header nav a[href]')){
      const href=a.getAttribute('href')||'',match=href.match(/^(database|outfits|stable|collection|spirit|championships|areas)\/(?:#([a-z-]+))?$/);
      if(!match)continue;const key='nav-'+match[1]+(match[2]?'-'+match[2]:'');
      tag(a.querySelector('strong')||a,key);tag(a.querySelector('small'),key+'-description');
    }
    const copy=[document.querySelector('.footer-brand strong'),...document.querySelectorAll('.footer-brand p'),...document.querySelectorAll('.footer-bottom small')];
    copy.forEach((n,i)=>tag(n,'footer-copy-'+i));
    for(const a of document.querySelectorAll('.site-footer nav a[href]')){const m=a.getAttribute('href').match(/^([a-z-]+)\/$/);if(m)tag(a,'footer-nav-'+m[1]);}
  }
  function apply(){
    applyQueued=false;sharedKeys();
    for(const node of document.querySelectorAll('[data-site-key]')){
      const key=node.dataset.siteKey,attr=node.dataset.siteAttr;
      if(attr&&!['src','href','placeholder'].includes(attr))continue;
      if(!originals.has(node))originals.set(node,attr?node.getAttribute(attr):node.textContent);
      const row=rows.get(key),value=row?.value==null?originals.get(node):row.value;
      const display=key==='footer-copy-3'?String(value).replaceAll('{year}',new Date().getFullYear()):String(value??'');
      if(attr){if((attr==='placeholder'||safeURL(display))&&node.getAttribute(attr)!==display)node.setAttribute(attr,display);}
      else {if(node.textContent!==display)node.textContent=display;node.classList.toggle('site-content-custom',row?.value!=null);}
    }
    for(const node of document.querySelectorAll('[data-site-extra]')){
      const value=rows.get(node.dataset.siteExtra)?.value||'';
      if(node.dataset.renderedContent===value)continue;
      node.dataset.renderedContent=value;node.replaceChildren(...value.split(/\n\s*\n/).filter(s=>s.trim()).map(s=>el('p',s)));node.hidden=!value.trim();
    }
    document.dispatchEvent(new CustomEvent('hm-site-content-applied'));
  }
  function scheduleApply(){if(!applyQueued){applyQueued=true;queueMicrotask(apply);}}
  async function refresh(){
    try {
    const all=[];
    for(let start=0;;start+=1000){
      const {data,error}=await supabaseClient.from('hm_site_content').select('key,value,revision').order('key').range(start,start+999);
      if(error){loadError='Site content storage is unavailable. Run the supplied SQL setup, then refresh this page.';return false;}
      all.push(...(data||[]));if(!data||data.length<1000)break;
    }
    rows.clear();for(const row of all)rows.set(row.key,row);loadError='';ready=true;apply();return true;
    }catch{loadError='Could not reach site content storage. Please retry using Refresh content.';return false;}
  }
  async function definitions(){
    if(!manifest){const r=await fetch('data/site-content-defaults.json',{cache:'no-cache'});if(!r.ok)throw Error('Could not load the list of editable content.');manifest=await r.json();}
    return manifest;
  }
  function action(label,fn){const b=el('button',label);b.type='button';b.addEventListener('click',fn);return b;}
  async function verifyAdmin(){const {data,error}=await supabaseClient.rpc('hm_is_admin');return !error&&data===true;}
  async function openEditor(key){
    if(!admin||!ready)return;
    let def;try{def=(await definitions()).find(d=>d.key===key);}catch(e){alert(e.message);return;}
    if(!def){alert('This entry is not listed in the content editor.');return;}
    if(dialog?.open)return;
    const initial=rows.get(key),expected=Number(initial?.revision||0),previous=document.activeElement;
    const d=el('dialog','','site-content-dialog');dialog=d;d.setAttribute('aria-labelledby','site-content-edit-title');
    const title=el('h2',def.label);title.id='site-content-edit-title';
    const context=el('p',def.page+' · ','site-content-context');const pageLink=el('a','Open page');pageLink.href=def.path;pageLink.target='_blank';pageLink.rel='noopener';context.append(pageLink);
    const label=el('label',def.type==='url'?'Link or picture URL':'Content');label.htmlFor='site-content-value';
    const value=el('textarea');value.id='site-content-value';value.rows=def.type==='url'?3:10;value.maxLength=50000;value.value=initial?.value??def.default;
    const hint=el('p',def.type==='paragraphs'?'Separate paragraphs with a blank line.':def.type==='url'?'Use an HTTPS URL or a relative website path.':'Plain text; existing links and page structure stay in place.','site-content-hint');
    const status=el('p','','site-content-status');status.setAttribute('role','status');
    let busy=false;
    async function close(){if(busy)return;if(value.value!==(initial?.value??def.default)&&!(await HMDialog.confirm('Discard your unsaved content changes?')))return;d.close();}
    const cancel=action('Cancel',close),reset=action('Restore original',async()=>{
      if(!(await HMDialog.confirm('Restore this entry to its original website content?')))return;
      await save(true);
    }),submit=action('Save for everyone',()=>save(false));
    async function save(resetValue){
      if(busy)return;if(!resetValue&&def.type==='url'&&!safeURL(value.value)){status.textContent='Enter a valid http/https URL, email link, or relative path.';return;}
      busy=true;submit.disabled=reset.disabled=cancel.disabled=true;status.textContent='Saving…';
      try{
        if(!await verifyAdmin())throw Error('Admin access is required. Sign in as an administrator and leave preview mode.');
        const {data,error}=await supabaseClient.rpc('hm_save_site_content',{p_key:key,p_value:resetValue?null:value.value,p_revision:expected});
        if(error)throw error;const row=Array.isArray(data)?data[0]:data;
        if(!row||row.key!==key)throw Error('The server did not confirm the saved content.');
        rows.set(key,row);apply();d.close();document.dispatchEvent(new CustomEvent('hm-site-content-saved'));
      }catch(e){status.textContent=e.code==='40001'?'Someone else changed this entry. Close the editor, refresh content, then try again.':e.message||'Could not save content.';}
      finally{busy=false;submit.disabled=reset.disabled=cancel.disabled=false;}
    }
    const buttons=el('div','','site-content-actions');buttons.append(submit,reset,cancel);d.append(title,context,label,value,hint,status,buttons);
    d.addEventListener('cancel',e=>{e.preventDefault();close();});
    d.addEventListener('close',()=>{d.remove();dialog=null;if(previous?.isConnected)previous.focus();},{once:true});
    document.body.append(d);d.showModal();value.focus();
  }
  async function panel(){
    const host=$('site-content-panel');if(!host||!admin)return;host.hidden=false;for(const child of [...host.children])if(child.tagName!=='SUMMARY')child.remove();
    const status=el('p',loadError||'Choose a page, then select the content to edit.');status.setAttribute('role','status');
    const page=el('select'),search=el('input');page.setAttribute('aria-label','Page or shared section');search.type='search';search.placeholder='Search all editable text…';search.setAttribute('aria-label','Find website content');
    const list=el('div','','site-content-list'),count=el('p');
    const toolbar=el('div','','site-content-toolbar');toolbar.append(page,search,action('Refresh content',async()=>{await refresh();status.textContent=loadError||'Content refreshed.';render();}));host.append(status,toolbar,count,list);
    let defs;try{defs=await definitions();}catch(e){status.textContent=e.message;return;}
    page.append(new Option('All pages and shared sections',''),...[...new Set(defs.map(d=>d.page))].map(p=>new Option(p,p)));
    function render(){const q=search.value.trim().toLowerCase();const matches=defs.filter(d=>(!page.value||d.page===page.value)&&[d.label,d.page,rows.get(d.key)?.value??d.default].join(' ').toLowerCase().includes(q));
      count.textContent=matches.length+' editable entries'+(matches.length>100?' · Showing the first 100; choose a page or search to narrow the list.':'');list.replaceChildren();for(const def of matches.slice(0,100)){const b=action('',()=>openEditor(def.key));b.className='site-content-entry';b.append(el('strong',def.page+' · '+def.label),el('small',String(rows.get(def.key)?.value??def.default).slice(0,180)||'(empty)'));b.disabled=!ready;list.append(b);}
    }
    search.addEventListener('input',render);page.addEventListener('change',render);document.addEventListener('hm-site-content-saved',render);render();
  }
  async function access(){
    const current=++generation;let allowed=false;try{allowed=await verifyAdmin();}catch{}if(current!==generation)return;admin=allowed;
    let controls=$('site-content-controls');
    if(!admin){editing=false;document.documentElement.classList.remove('site-content-editing');controls?.remove();if($('site-content-panel'))$('site-content-panel').hidden=true;if(dialog?.open)dialog.close();return;}
    if(controls)return;
    controls=el('div','','site-content-controls');controls.id='site-content-controls';
    const toggle=action('Edit website',()=>{if(!ready){alert(loadError||'Content is still loading.');return;}editing=!editing;document.documentElement.classList.toggle('site-content-editing',editing);toggle.textContent=editing?'Finish editing':'Edit website';toggle.setAttribute('aria-pressed',String(editing));});toggle.setAttribute('aria-pressed','false');
    const link=el('a','All site content');link.href='admin/#site-content-panel';controls.append(toggle,link);document.body.append(controls);await panel();
  }
  async function boot(){
    sharedKeys();apply();
    for(const node of document.querySelectorAll('body>header,.site-footer'))new MutationObserver(scheduleApply).observe(node,{childList:true,subtree:true});
    new MutationObserver(changes=>{if(changes.some(change=>[...change.addedNodes].some(node=>node.nodeType===1&&node.matches?.('.spirit-schedule-dialog,.spirit-schedule-page'))))scheduleApply();}).observe(document.body,{childList:true});
    document.addEventListener('click',event=>{
      if(!editing||!admin||event.target.closest('.site-content-dialog,.site-content-controls'))return;
      const node=event.target.closest('[data-site-key],[data-site-extra]');if(!node)return;
      event.preventDefault();event.stopImmediatePropagation();openEditor(node.dataset.siteKey||node.dataset.siteExtra);
    },true);
    await refresh();await access();
    supabaseClient.auth.onAuthStateChange(()=>{setTimeout(access,0);});
    if(location.hash==='#site-content-panel'&&$('site-content-panel'))$('site-content-panel').open=true;
  }
  window.HMSiteContent={refresh,openEditor,safeURL};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
