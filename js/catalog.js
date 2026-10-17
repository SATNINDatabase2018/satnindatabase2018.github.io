/* Shared database, collection and outfit workspace. All catalog text uses DOM textContent. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const view = document.body.dataset.view;
  const categories = [['','Everything'],['Clothes','Player Clothes'],['Player Accessories','Player Accessories'],['Equipment','Horse Equipment'],['Horses','Horses'],['Horse Decorations','Horse Decorations'],['Pets','Pets']];
  const fields = [['title','Name'],['sc','SC'],['js','JS'],['ride','Riding'],['jump','Jumping'],['command','Command'],['care','Care'],['speed','Speed'],['strength','Strength'],['agility','Agility'],['discipline','Discipline']];
  let items=[], user=null, states=new Map(), active='', draft={}, ready=false;
  const pending = new Set();
  const key = item => `${item.kind}:${item.id}`;
  const draftKey = () => `hm2018:outfit:${user?.id || 'guest'}`;
  const text = (tag, value, cls) => {const n=document.createElement(tag); n.textContent=value; if(cls)n.className=cls; return n;};
  const button = (label, action) => {const n=text('button',label); n.type='button'; n.addEventListener('click',action); return n;};
  function message(value) {$('catalog-message').textContent=value;}
  async function json(path) {const r=await fetch(path); if(!r.ok)throw Error(`Could not load ${path} (${r.status}).`); const a=await r.json(); if(!Array.isArray(a))throw Error(`Invalid data in ${path}.`); return a;}
  function number(v) {if(v===null || v===undefined || String(v).trim()==='')return null; const n=Number(v); return Number.isFinite(n)?n:null;}
  function overallStats(item) {
    const values = fields
        .slice(3)
        .map(([field]) => number(item[field]))
        .filter(value => value !== null);

    return values.length
        ? values.reduce((sum, value) => sum + value, 0)
        : null;
}

function sortValue(item, field) {
    if (field === "title") return item.title;
    if (field === "overall") return overallStats(item);

    return number(item[field]);
}
  function compare(a,b,rules) {
    for(const {field,dir} of rules){
      const av = sortValue(a, field);
const bv = sortValue(b, field);
      // Unknown values stay last in either direction. Zero is a known value.
      if(av==null && bv!=null)return 1; if(bv==null && av!=null)return -1;
      const c=av==null?0:field==='title'?av.localeCompare(bv,undefined,{numeric:true,sensitivity:'base'}):av-bv;
      if(c)return c*(dir==='desc'?-1:1);
    }
    return a.title.localeCompare(b.title) || key(a).localeCompare(key(b));
  }
  // Exposed for small regression checks; no network or writes.
  window.HMCatalog={compare,number};
  function state(item){return states.get(String(item.id)) || {};}
  async function loadStates(){
    states=new Map(); if(!user)return;
    const {data,error}=await supabaseClient.from('user_items').select('item_id,owned,wishlist,favorite').eq('user_id',user.id);
    if(error)throw Error('Could not load your saved item states. '+error.message);
    for(const row of data)states.set(String(row.item_id),row);
  }
  async function toggle(item,field,control){
    if(!user){location.href='login.html'; return;}
    if(pending.has(key(item)))return;
    pending.add(key(item));
    document.querySelectorAll('[data-item-key]').forEach(n=>{if(n.dataset.itemKey===key(item))n.querySelectorAll('button').forEach(b=>b.disabled=true);});
    const before=state(item), next={owned:!!before.owned,wishlist:!!before.wishlist,favorite:!!before.favorite}; next[field]=!next[field];
    const {error}=await supabaseClient.from('user_items').upsert({user_id:user.id,item_id:item.id,...next},{onConflict:'user_id,item_id'});
    pending.delete(key(item));
    if(error){message('Could not save this change: '+error.message); render(); return;}
    states.set(String(item.id),next); message('Saved.'); render();
  }
  function image(item){
    const wrap=text('div','', 'catalog-image');
    if(item.image && /^https?:\/\//i.test(item.image)){
      const img=document.createElement('img'); img.src=item.image; img.alt=item.title; img.loading='lazy';
      img.addEventListener('error',()=>wrap.replaceChildren(text('span','Image unavailable')),{once:true}); wrap.append(img);
    }else wrap.append(text('span','Image unavailable'));
    return wrap;
  }
  function slot(item){
    if(item.kind==='horse' || item.category==='Pets')return null;
    const s=String(item.section||'').toLowerCase().replace(/[_-]/g,' ');
    const aliases=[['Mane Decoration',/mane/],['Tail Decoration',/tail/],['Leg Wraps',/leg wrap|socks/],['Saddle Bag',/saddle ?bag/],['Horseshoes',/horseshoe|horse shoe/],['Bridle',/bridle/],['Blanket',/blanket|saddle pad/],['Saddle',/saddle/],['Hat',/hat|helmet/],['Top',/top|shirt|jacket|sweater|coat/],['Gloves',/glove/],['Pants',/pant|breech|trouser/],['Shoes',/shoe|boot/]];
    return aliases.find(([,re])=>re.test(s))?.[0] || (['Clothes','Player Accessories','Equipment','Horse Decorations'].includes(item.category) && item.section ? String(item.section) : null);
  }
  function saveDraft(){try{localStorage.setItem(draftKey(),JSON.stringify({name:$('outfit-name').value,slots:draft}));}catch{outfitMessage('This browser could not keep the draft. You can still save it to your account.');}}
  function outfitMessage(s){$('outfit-message').textContent=s;}
  function renderTray(){
    const tray=$('outfit-tray'); if(!tray)return; tray.replaceChildren();
    $('tray-count').textContent=`(${Object.keys(draft).length})`;
    for(const [s,k] of Object.entries(draft)){
      const item=items.find(i=>key(i)===k); if(!item)continue;
      const row=text('div','', 'tray-row'); row.append(image(item),text('span',`${s}: ${item.title}`),button('Remove',()=>{delete draft[s];saveDraft();renderTray();render();})); tray.append(row);
    }
    $('save-outfit').disabled=!Object.keys(draft).length;
  }
  function card(item){
    const card=text('article','', 'item-card'); card.dataset.itemKey=key(item); card.append(image(item),text('h3',item.title),text('p',item.section || item.category));
    if(item.description)card.append(text('p',item.description));
    card.append(text('p',`SC ${item.sc ?? '—'} · JS ${item.js ?? '—'}`),text('p',item.shop || 'Site / shop not verified'));
    const stats=fields.slice(3).filter(([f])=>number(item[f])!==null).map(([f,label])=>`${label} ${item[f]}`).join(' · ');
    if(stats)card.append(text('p',stats,'stats'));
    if(item.level!==undefined && item.level!=='')card.append(text('p',`Level / requirement: ${item.level}`));
    const actions=text('div','','item-actions');
    if(item.kind==='horse'){
      const a=text('a','Add to My Stable','button'); a.href='stable.html'; actions.append(a);
    }else{
      for(const [field,label] of [['owned','✓ I own this'],['wishlist','☆ Wishlist'],['favorite','♡ Favorite']]){
        const b=button(label,e=>toggle(item,field,e.currentTarget)); const selected=!!state(item)[field];
        b.setAttribute('aria-pressed',String(selected)); b.disabled=!ready || pending.has(key(item)); actions.append(b);
      }
    }
    const s=slot(item);
    if(s){const selected=draft[s]===key(item); actions.append(button(selected?'✓ In outfit':'+ Add to outfit',()=>{draft[s]=key(item);saveDraft();renderTray();render();outfitMessage(`${item.title} added to ${s}.`);}));}
    card.append(actions); return card;
  }
  function render(){
    if(!$('database-grid'))return;
    const q=$('search').value.trim().toLowerCase(), category=$('category-filter').value,shop=$('shop-filter').value;
    const flags=[...document.querySelectorAll('#state-filters input:checked')].map(n=>n.value);
    const rules=[...document.querySelectorAll('.sort-rule')].map(n=>({field:n.querySelector('.sort-field').value,dir:n.querySelector('.sort-dir').value}));
    const filtered=items.filter(i=>(view!=='collection' || (i.kind!=='horse' && state(i)[active])) && (view==='collection' || !active || i.category===active) && (!category || i.section===category) && (!shop || i.shop===shop) && (!flags.length || (i.kind!=='horse' && flags.every(f=>state(i)[f]))) && `${i.title} ${i.description||''} ${i.shop||''} ${i.section||''}`.toLowerCase().includes(q)).sort((a,b)=>compare(a,b,rules));
    $('database-grid').replaceChildren(...filtered.map(card));
    $('result-count').textContent=`${filtered.length} result${filtered.length===1?'':'s'}`;
    if(!filtered.length)$('database-grid').append(text('p','No items match these filters.'));
  }
  function options(select,values,first){select.replaceChildren(new Option(first,''),...values.map(v=>new Option(v,v)));}
  function updateOptions(){
    const pool=items.filter(i=>view==='collection' || !active || i.category===active);
    options($('category-filter'),[...new Set(pool.map(i=>i.section).filter(Boolean))].sort(),'All item types');
    options($('shop-filter'),[...new Set(pool.map(i=>i.shop).filter(Boolean))].sort(),'All sites / shops');
  }
  function activate(value){
    active=value;
    const tabs=[...document.querySelectorAll('[role="tab"]')];
    tabs.forEach(b=>{b.setAttribute('aria-selected',String(b.dataset.value===value)); b.tabIndex=b.dataset.value===value?0:-1;});
    const tab=tabs.find(b=>b.dataset.value===value); $('tab-heading').textContent=tab.textContent;
    $('catalog-panel').setAttribute('aria-labelledby',tab.id);
    updateOptions(); render();
  }
  function addSort(field = "title", dir = "asc") {
    const row = text("div", "", "sort-rule");
    const fieldSelect = document.createElement("select");
    const directionSelect = document.createElement("select");

    fieldSelect.className = "sort-field";
    fieldSelect.setAttribute("aria-label", "Sort by");

    const sortOptions = [
        ...fields,
        ["overall", "Overall stats (best first)"]
    ];

    sortOptions.forEach(([value, label]) => {
        fieldSelect.add(new Option(label, value));
    });

    fieldSelect.value = field;

    directionSelect.className = "sort-dir";
    directionSelect.setAttribute("aria-label", "Sort direction");

    directionSelect.add(
        new Option("Lowest first / A–Z", "asc")
    );

    directionSelect.add(
        new Option("Highest first / Z–A", "desc")
    );

    directionSelect.value = dir;

    fieldSelect.addEventListener("change", () => {
        if (fieldSelect.value === "overall") {
            directionSelect.value = "desc";
        }

        render();
    });

    directionSelect.addEventListener("change", render);

    row.append(
        fieldSelect,
        directionSelect,
        button("Remove rule", () => {
            row.remove();
            render();
        })
    );

    $("sort-rules").append(row);
}
  async function saveOutfit(){
    if(!user){outfitMessage('Log in to save this outfit. Your guest draft stays in this browser.');return;}
    const name=$('outfit-name').value.trim(); if(!name){outfitMessage('Give your outfit a name first.');$('outfit-name').focus();return;}
    $('save-outfit').disabled=true;
    const {error}=await supabaseClient.from('hm_saved_outfits').insert({user_id:user.id,name,slots:draft});
    $('save-outfit').disabled=false;outfitMessage(error?'Could not save outfit: '+error.message:'Outfit saved! Find it under My Outfits.');
  }
  async function showOutfits(){
    const host=$('saved-outfits');host.replaceChildren();
    if(!user){message('Log in to see your saved outfits.');return;}
    const {data,error}=await supabaseClient.from('hm_saved_outfits').select('id,name,slots').eq('user_id',user.id).order('created_at',{ascending:false});
    if(error){message('Could not load outfits. Make sure the supplied setup SQL has been run. '+error.message);return;}
    message(data.length?`${data.length} saved outfits`:'No saved outfits yet.');
    for(const outfit of data){
      const card=text('article','','item-card');card.append(text('h2',outfit.name));
      for(const [s,k] of Object.entries(outfit.slots||{})){
        const item=items.find(i=>key(i)===k); const row=text('div','','tray-row'); if(item)row.append(image(item));row.append(text('span',`${s}: ${item?.title || 'Item no longer in catalog'}`));card.append(row);
      }
      card.append(button('Use as a starting point',()=>{try{localStorage.setItem(draftKey(),JSON.stringify({name:outfit.name+' (copy)',slots:outfit.slots}));location.href='database.html';}catch{message('This browser cannot open the outfit draft.');}}));
      card.append(button('Delete outfit',async e=>{if(!confirm(`Delete “${outfit.name}”?`))return;e.currentTarget.disabled=true;const {error}=await supabaseClient.from('hm_saved_outfits').delete().eq('id',outfit.id).eq('user_id',user.id);if(error){message(error.message);e.currentTarget.disabled=false;}else await showOutfits();}));host.append(card);
    }
  }
  function setup(){
    const choices=view==='collection'?[['owned','Owned'],['wishlist','Wishlist'],['favorite','Favorites']]:categories;
    let hash='';try{hash=decodeURIComponent(location.hash.slice(1));}catch{}
    active=choices.some(([v])=>v===hash)?hash:choices[0][0];
    const tabs=$('catalog-tabs');
    choices.forEach(([value,label],index)=>{
      const b=button(label,()=>{history.replaceState(null,'','#'+encodeURIComponent(value));activate(value);});b.id='tab-'+index;b.dataset.value=value;b.setAttribute('role','tab');b.setAttribute('aria-controls','catalog-panel');
      b.addEventListener('keydown',e=>{const all=[...tabs.children];const i=all.indexOf(b);const next=e.key==='ArrowRight'?all[(i+1)%all.length]:e.key==='ArrowLeft'?all[(i-1+all.length)%all.length]:e.key==='Home'?all[0]:e.key==='End'?all.at(-1):null;if(next){e.preventDefault();next.click();next.focus();}});tabs.append(b);
    });
    window.addEventListener('hashchange',()=>{let v;try{v=decodeURIComponent(location.hash.slice(1));}catch{return;}if(choices.some(([x])=>x===v))activate(v);});
    $('search').addEventListener('input',render);
    ['category-filter','shop-filter','state-filters'].forEach(id=>$(id).addEventListener('change',render));
    if(!user){document.querySelectorAll('#state-filters input').forEach(n=>n.disabled=true);$('state-filters').append(text('small','Log in to filter your saved items.'));}
    $('add-sort').addEventListener('click',()=>{addSort('sc','asc');render();});addSort();
    $('reset-filters').addEventListener('click',()=>{$('search').value='';updateOptions();document.querySelectorAll('#state-filters input').forEach(n=>n.checked=false);$('sort-rules').replaceChildren();addSort();render();});
    try{const saved=JSON.parse(localStorage.getItem(draftKey())||localStorage.getItem('hm2018:outfit:guest')||'null');if(saved && typeof saved.slots==='object' && saved.slots){draft=Object.fromEntries(Object.entries(saved.slots).filter(([s,k])=>items.some(i=>key(i)===k && slot(i)===s)));$('outfit-name').value=String(saved.name||'');}}catch{}
    $('outfit-name').addEventListener('input',saveDraft);
    $('clear-outfit').addEventListener('click',()=>{draft={};$('outfit-name').value='';saveDraft();renderTray();render();});
    $('save-outfit').addEventListener('click',saveOutfit);renderTray();activate(active);
  }
  async function start(){
    try{
      const {data,error}=await supabaseClient.auth.getUser(); if(error && error.name!=='AuthSessionMissingError')throw error;user=data.user;
      const [catalog,horses]=await Promise.all([json('data/database.json'),json('data/horses.json')]);
      items=catalog.map(i=>({...i,kind:'item',title:String(i.title||'Untitled item'),agility:i.agility??i.agil,discipline:i.discipline??i.disc})).concat(horses.map(h=>({...h,kind:'horse',category:'Horses',section:h.breed,title:`${h.breed} ${h.coat||''}`.trim(),shop:h.location})));
      if(view==='outfits'){await showOutfits();return;}
      try{await loadStates();ready=true;}catch(e){message(e.message);}
      setup();
      if(view==='collection' && !user)message('Log in to see your collection, wishlist and favorites.');
      // Reload after a session change so account-specific drafts and flags never carry over.
      supabaseClient.auth.onAuthStateChange((event,session)=>{if((session?.user?.id||null)!==(user?.id||null))setTimeout(()=>location.reload(),0);});
    }catch(e){message(e.message || 'Could not load the database.');}
  }
  start();
})();
