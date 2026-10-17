/* Shared database, collection and outfit workspace. All catalog text uses DOM textContent. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const view = document.body.dataset.view;
  const categories = [['','Everything'],['Clothes','Player Clothes'],['Player Accessories','Player Accessories'],['Equipment','Horse Equipment'],['Horses','Horses'],['Horse Decorations','Horse Decorations'],['Pets','Pets']];
  const fields = [['title','Name'],['sc','SC'],['js','JS'],['ride','Riding'],['jump','Jumping'],['command','Command'],['care','Care'],['speed','Speed'],['strength','Strength'],['agility','Agility'],['discipline','Discipline'],['endurance','Endurance']];
  let items=[], user=null, states=new Map(), active='', workspace=null, ready=false;
  const pending = new Set();
  let visibleLimit=60;
  const key = item => `${item.kind}:${item.id}`;
  const draftKey = () => `hm2018:outfit:${user?.id || 'guest'}`;
  const text = (tag, value, cls) => {const n=document.createElement(tag); n.textContent=value; if(cls)n.className=cls; return n;};
  const button = (label, action) => {const n=text('button',label); n.type='button'; n.addEventListener('click',action); return n;};
  function message(value) {$('catalog-message').textContent=value;}
  function requireAccount(){
    if(user)return true;
    const existing=$('database-login-dialog');if(existing?.open)return false;
    const dialog=document.createElement('dialog');dialog.id='database-login-dialog';dialog.className='database-login-dialog';dialog.setAttribute('aria-labelledby','database-login-title');
    const heading=text('h2','Account required');heading.id='database-login-title';
    const prompt=text('p','To use this feature, please log in or create an account');
    const actions=text('div','','account-gate-actions');
    const signup=text('a','Create account','button');signup.href='login.html#signup';
    const login=text('a','Log in');login.href='login.html';
    actions.append(signup,login,button('Close',()=>dialog.close()));dialog.append(heading,prompt,actions);
    const previous=document.activeElement;
    dialog.addEventListener('close',()=>{dialog.remove();if(previous?.isConnected)previous.focus();});
    dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close();});
    document.body.append(dialog);dialog.showModal();return false;
  }
  async function json(path) {const r=await fetch(path); if(!r.ok)throw Error(`Could not load ${path} (${r.status}).`); const a=await r.json(); if(!Array.isArray(a))throw Error(`Invalid data in ${path}.`); return a;}
  function number(v) {if(v===null || v===undefined || String(v).trim()==='')return null; const n=Number(v); return Number.isFinite(n)?n:null;}
  function overallStats(item) {
    const values=fields.slice(3).map(([field])=>number(item[field])).filter(value=>value!==null);
    return values.length ? values.reduce((sum,value)=>sum+value,0) : null;
  }
  function sortValue(item,field) {return field==='title'?item.title:field==='overall'?overallStats(item):number(item[field]);}
  function compare(a,b,rules) {
    for(const {field,dir} of rules){
      const av=sortValue(a,field), bv=sortValue(b,field);
      // Unknown values stay last in either direction. Zero is a known value.
      if(av==null && bv!=null)return 1; if(bv==null && av!=null)return -1;
      const c=av==null?0:field==='title'?av.localeCompare(bv,undefined,{numeric:true,sensitivity:'base'}):av-bv;
      if(c)return c*(dir==='desc'?-1:1);
    }
    return a.title.localeCompare(b.title) || key(a).localeCompare(key(b));
  }
  // Exposed for small regression checks; no network or writes.
  window.HMCatalog={compare,number,overallStats};
  function state(item){return states.get(String(item.id)) || {};}
  async function loadStates(){
    states=new Map(); if(!user)return;
    const {data,error}=await supabaseClient.from('user_items').select('item_id,owned,wishlist,favorite').eq('user_id',user.id);
    if(error)throw Error('Could not load your saved item states. '+error.message);
    for(const row of data)states.set(String(row.item_id),row);
  }
  async function toggle(item,field,control){
    if(!requireAccount())return;
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
    if(item.kind==='horse')return null;
    if(item.category==='Pets')return 'Pet';
    const s=String(item.section||'').toLowerCase().replace(/[_-]/g,' ');
    const aliases=[['Mane Decoration',/mane/],['Tail Decoration',/tail/],['Leg Wraps',/leg wrap|socks/],['Saddle Bag',/saddle ?bag/],['Horseshoes',/horseshoe|horse shoe/],['Bridle',/bridle/],['Blanket',/blanket|saddle pad/],['Saddle',/saddle/],['Hat',/hat|helmet/],['Top',/top|shirt|jacket|sweater|coat/],['Gloves',/glove/],['Pants',/pant|breech|trouser/],['Shoes',/shoe|boot/]];
    return aliases.find(([,re])=>re.test(s))?.[0] || (['Clothes','Player Accessories','Equipment','Horse Decorations'].includes(item.category) && item.section ? String(item.section) : null);
  }
  async function addHorseHere(horse,control){
    if(!requireAccount())return;
    const entered=prompt(`Name your ${horse.breed||horse.title}:`);
    if(entered===null)return;const name=entered.trim();if(!name){message('Enter a horse name to add it.');return;}
    control.disabled=true;const old=control.textContent;control.textContent='Adding…';
    try{
      const {error}=await supabaseClient.from('user_horses').insert({user_id:user.id,horse_id:horse.id,name,nickname:null});
      if(error)throw error;
      message(`${name} was added to My Stable!`);
      await workspace?.refreshHorses();
    }catch(e){message('Could not add horse: '+e.message);}finally{control.disabled=false;control.textContent=old;}
  }
  function card(item){
    const card=text('article','', 'item-card'); card.dataset.itemKey=key(item); card.append(image(item),text('h3',item.title),text('p',item.section || item.category));
    if(item.description)card.append(text('p',item.description));
    if(item.price_note)card.append(text('p',item.price_note));
    if(item.speciality)card.append(text('p',item.speciality));
    card.append(text('p',`SC ${item.sc ?? '—'} · JS ${item.js ?? '—'}`),text('p',item.shop || 'Site / shop not verified'));
    const stats=fields.slice(3).filter(([f])=>number(item[f])!==null).map(([f,label])=>`${label} ${item[f]}`).join(' · ');
    if(stats)card.append(text('p',stats,'stats'));
    if(item.level!==undefined && item.level!=='')card.append(text('p',`Level / requirement: ${item.level}`));
    const actions=text('div','','item-actions');
    if(item.kind==='horse'){
      actions.append(button('Add to My Stable',e=>addHorseHere(item,e.currentTarget)));
    }else{
      for(const [field,label] of [['owned','✓ I own this'],['wishlist','☆ Wishlist'],['favorite','♡ Favorite']]){
        const b=button(label,e=>toggle(item,field,e.currentTarget)); const selected=!!state(item)[field];
        b.setAttribute('aria-pressed',String(selected)); b.disabled=!ready || pending.has(key(item)); actions.append(b);
      }
    }
    const s=slot(item);
    if(s){const count=workspace?.count(item)||0; const b=button(count?`✓ In ${count} outfit${count===1?'':'s'}`:'+ Add to outfit',e=>{if(requireAccount())workspace.openMenu(item,e.currentTarget);});b.className='outfit-menu-trigger';b.setAttribute('aria-expanded','false');b.setAttribute('aria-haspopup','dialog');actions.append(b);}
    card.append(actions); return card;
  }
  function render(reset=true){
    if(!$('database-grid'))return;
    if(reset!==false)visibleLimit=60;
    const q=($('search')?.value||'').trim().toLowerCase(),category=$('category-filter')?.value||'',shop=$('shop-filter')?.value||'',breed=$('breed-filter')?.value||'';
    const flags=[...document.querySelectorAll('#state-filters input:checked')].map(n=>n.value);
    const rules=[...document.querySelectorAll('.sort-rule')].map(n=>({field:n.querySelector('.sort-field').value,dir:n.querySelector('.sort-dir').value}));
    const filtered=items.filter(i=>(view!=='collection' || (i.kind!=='horse' && state(i)[active])) && (view==='collection' || !active || i.category===active) && (!category || (active==='Horses'?i.section===category:category==='__horse__'?i.kind==='horse':i.kind!=='horse' && i.section===category)) && (!breed || i.kind==='horse' && i.section===breed) && (!shop || i.shop===shop) && (!flags.length || (i.kind!=='horse' && flags.every(f=>state(i)[f]))) && `${i.title} ${i.description||''} ${i.shop||''} ${i.section||''} ${(i.aliases||[]).join(' ')}`.toLowerCase().includes(q)).sort((a,b)=>compare(a,b,rules));
    $('database-grid').replaceChildren(...filtered.slice(0,visibleLimit).map(card));
    $('catalog-load-more')?.remove();
    if(filtered.length>visibleLimit){const more=button(`Load 60 more (${filtered.length-visibleLimit} remaining)`,()=>{visibleLimit+=60;render(false);});more.id='catalog-load-more';$('database-grid').after(more);}
    $('result-count').textContent=`${filtered.length} result${filtered.length===1?'':'s'}${filtered.length>visibleLimit?' · Showing '+visibleLimit:''}`;
    if(!filtered.length)$('database-grid').append(text('p','No items match these filters.'));
  }
  function options(select,values,first){if(!select)return;select.replaceChildren(new Option(first,''),...values.map(v=>new Option(v,v)));}
  function updateOptions(){
    const pool=items.filter(i=>view==='collection' || !active || i.category===active);
    const inHorses=view==='database' && active==='Horses';
    const types=[...new Set(pool.filter(i=>inHorses || i.kind!=='horse').map(i=>i.section).filter(Boolean))].sort();
    options($('category-filter'),types,inHorses?'All breeds':'All item types');
    if(!inHorses && pool.some(i=>i.kind==='horse'))$('category-filter')?.add(new Option('Horse','__horse__'));
    options($('breed-filter'),[...new Set(pool.filter(i=>i.kind==='horse').map(i=>i.section))].sort(),'All breeds');
    updateBreedFilter();
    options($('shop-filter'),[...new Set(pool.map(i=>i.shop).filter(Boolean))].sort(),'All sites / shops');
  }
  function updateBreedFilter(){
    const show=active!=='Horses' && $('category-filter')?.value==='__horse__';
    if($('breed-filter-wrap'))$('breed-filter-wrap').hidden=!show;
    if(!show && $('breed-filter'))$('breed-filter').value='';
  }
  function activate(value){
    active=value;
    const tabs=[...document.querySelectorAll('[role="tab"]')];
    tabs.forEach(b=>{b.setAttribute('aria-selected',String(b.dataset.value===value)); b.tabIndex=b.dataset.value===value?0:-1;});
    const tab=tabs.find(b=>b.dataset.value===value); $('tab-heading').textContent=tab.textContent;
    $('catalog-panel').setAttribute('aria-labelledby',tab.id);
    updateOptions(); render();
  }
  function addSort(field='title',dir='asc'){
    const row=text('div','','sort-rule'),f=document.createElement('select'),d=document.createElement('select');
    f.className='sort-field'; f.setAttribute('aria-label','Sort by'); [...fields,['overall','Overall stats (combined)']].forEach(([v,l])=>f.add(new Option(l,v)));f.value=field;
    d.className='sort-dir'; d.setAttribute('aria-label','Sort direction'); d.add(new Option('Ascending / A–Z','asc'));d.add(new Option('Descending / Z–A','desc'));d.value=dir;
    f.addEventListener('change',()=>{if(f.value==='overall'){d.value='desc';render();}});
    [f,d].forEach(n=>n.addEventListener('change',render));
    row.append(f,d,button('Remove rule',()=>{row.remove();render();})); $('sort-rules')?.append(row);
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
    $('search')?.addEventListener('input',render);
    $('category-filter')?.addEventListener('change',()=>{updateBreedFilter();render();});
    ['category-filter','breed-filter','shop-filter','state-filters'].forEach(id=>$(id)?.addEventListener('change',render));
    if(!user){$('state-filters')?.addEventListener('click',e=>{if(e.target.closest('label,input')){e.preventDefault();e.stopImmediatePropagation();requireAccount();}},true);}
    $('add-sort')?.addEventListener('click',()=>{addSort('sc','asc');render();});addSort();
    $('reset-filters')?.addEventListener('click',()=>{$('search').value='';updateOptions();document.querySelectorAll('#state-filters input').forEach(n=>n.checked=false);$('sort-rules').replaceChildren();addSort();render();});
    activate(active);
  }
  async function start(){
    if(window.HMFeatureAccess)await window.HMFeatureAccess;
    try{
      const {data,error}=await supabaseClient.auth.getUser(); if(error && error.name!=='AuthSessionMissingError')throw error;user=data.user;
      const [catalog,horses]=await Promise.all([json('data/database.json'),json('data/horses.json')]);
      items=catalog.map(i=>({...i,kind:'item',title:String(i.title||'Untitled item'),agility:i.agility??i.agil,discipline:i.discipline??i.disc})).concat(horses.map(h=>({...h,kind:'horse',category:'Horses',section:h.breed,title:h.title||`${h.breed} ${h.coat||''}`.trim(),shop:h.location})));
      workspace=await HMOutfitWorkspace.create({items,user,key,slot,image,text,button,number,fields,onChange:render,requireAccount,getOwnedIds:()=>ready?new Set([...states.entries()].filter(([,v])=>v.owned).map(([id])=>id)):null});
      supabaseClient.auth.onAuthStateChange((event,session)=>{if((session?.user?.id||null)!==(user?.id||null))setTimeout(()=>location.reload(),0);});
      if(view==='outfits')return;
      try{await loadStates();ready=true;}catch(e){message(e.message);}
      setup();
      if(view==='collection' && !user)message('Log in to see your collection, wishlist and favorites.');

    }catch(e){message(e.message || 'Could not load the database.');}
  }
  start();
})();
