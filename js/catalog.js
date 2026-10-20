/* Shared database, collection and outfit workspace. All catalog text uses DOM textContent. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const view = document.body.dataset.view;
  const categories = [['','Everything'],['Hairstyles','Hairstyles'],['Clothes','Player Clothes'],['Player Accessories','Player Accessories'],['Equipment','Horse Equipment'],['Horses','Horses'],['Horse Decorations','Horse Decorations'],['Pets','Pets']];
  const fields = [['title','Name'],['sc','SC'],['js','JS'],['ride','Riding'],['jump','Jumping'],['command','Command'],['care','Care'],['speed','Swiftness'],['strength','Strength'],['agility','Agility'],['discipline','Discipline'],['endurance','Endurance']];
  let items=[], user=null, states=new Map(), active='', workspace=null, ready=false;
  const pending = new Set();
  let visibleLimit=60;
  let accountLoading=true;
  const key = item => `${item.kind}:${item.id}`;
  const draftKey = () => `hm2018:outfit:${user?.id || 'guest'}`;
  const text = (tag, value, cls) => {const n=document.createElement(tag); n.textContent=value; if(cls)n.className=cls; return n;};
  const button = (label, action) => {const n=text('button',label); n.type='button'; n.addEventListener('click',action); return n;};
  function message(value) {$('catalog-message').textContent=value;}
  function requireAccount(){
    if(accountLoading){message('Checking your account…');return false;}
    if(user)return true;
    const existing=$('database-login-dialog');if(existing?.open)return false;
    const dialog=document.createElement('dialog');dialog.id='database-login-dialog';dialog.className='database-login-dialog';dialog.setAttribute('aria-labelledby','database-login-title');
    const heading=text('h2','Account required');heading.id='database-login-title';
    const prompt=text('p','To use this feature, please log in or create an account');
    const actions=text('div','','account-gate-actions');
    const signup=text('a','Create account','button');signup.href='login/#signup';
    const login=text('a','Log in');login.href='login/';
    actions.append(signup,login,button('Close',()=>dialog.close()));dialog.append(heading,prompt,actions);
    const previous=document.activeElement;
    dialog.addEventListener('close',()=>{dialog.remove();if(previous?.isConnected)previous.focus();});
    dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close();});
    document.body.append(dialog);dialog.showModal();return false;
  }
  async function json(path) {if(window.HMCatalogData)return window.HMCatalogData.load(path);const r=await fetch(path,{cache:'no-cache'}); if(!r.ok)throw Error(`Could not load ${path} (${r.status}).`); const a=await r.json(); if(!Array.isArray(a))throw Error(`Invalid data in ${path}.`); return a;}
  function number(v) {if(v===null || v===undefined || String(v).trim()==='')return null; const n=Number(v); return Number.isFinite(n)?n:null;}
  function overallStats(item) {
    const values=fields.slice(3).map(([field])=>number(item[field])).filter(value=>value!==null);
    return values.length ? values.reduce((sum,value)=>sum+value,0) : null;
  }
  function isCompanion(item){return item.category==='Pets'&&(typeof item.is_companion==='boolean'?item.is_companion:/^companion$/i.test(String(item.speciality||'').trim()));}
  function itemType(item){return item.category==='Pets'?(isCompanion(item)?'Pet - companion':'Pet - non-companion'):item.section;}
  function generationNumber(value){
    const v=String(value??'').trim().toLowerCase();if(!v)return null;
    if(v==='first')return 1;if(v==='second')return 2;if(v==='third')return 3;
    const n=Number(v.replace(/^gen(?:eration)?\s*/i,''));return Number.isFinite(n)?n:null;
  }
  function sortValue(item, field) {
    if (field === 'generation') return generationNumber(item.generation);
    if (field === 'title') return item.title;
    if (field === 'color') return String(item.color||'').trim()||null;
    if (field === 'category') return String(item.category || '').trim() || null;
    if (field === 'item_type') return String(itemType(item)||'').trim()||null;
    if (field === 'shop') return String(item.shop || '').trim() || null;
    if (field === 'overall') return overallStats(item);
    return number(item[field]);
  }
  function compare(a,b,rules) {
    const status=window.HMItemStatus?.compare(a,b)||0;if(status)return status;
    for(const {field,dir} of rules){
      const av=sortValue(a,field), bv=sortValue(b,field);
      // Unknown values stay last in either direction. Zero is a known value.
      if(av==null && bv!=null)return 1; if(bv==null && av!=null)return -1;
      const c=av==null?0:(field==='color'||field==='title'||field==='shop'||field==='category'||field==='item_type')?av.localeCompare(bv,undefined,{numeric:true,sensitivity:'base'}):av-bv;
      if(c)return c*(dir==='desc'?-1:1);
    }
    return a.title.localeCompare(b.title) || key(a).localeCompare(key(b));
  }
  // Exposed for small regression checks; no network or writes.
  window.HMCatalog={compare,number,overallStats,searchRank,shopsFor,hasShop,createCard:card};
  function searchRank(item,query){
    const normal=value=>String(value??'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[‐‑–—-]/g,' ').replace(/\s+/g,' ').trim();
    const q=normal(query);if(!q)return 0;
    const stats=['ride','jump','command','care','speed','strength','agility','discipline','endurance'].filter(k=>item[k]!==undefined&&item[k]!==null&&item[k]!=='').map(k=>`${k==='speed'&&item.category==='Equipment'?'swiftness speed':k} ${item[k]}`).join(' ');
    const money=[item.sc!=null?`SC ${item.sc} star coins ${item.sc}`:'',item.js!=null?`JS ${item.js} jorvik shillings ${item.js}`:'',item.price_note||''].join(' ');
    const special=[item.speciality,item.specialty,item.is_companion===true?'companion pet':'',isCompanion(item)?'companion pet':'',item.section,item.category,item.generation?`generation ${item.generation}`:'',/pony/i.test(item.breed||'')?'pony':''].filter(Boolean).join(' ');
    const groups=[[item.title,item.color,item.breed,item.coat,...(item.aliases||[])].filter(Boolean).join(' '),item.description,[item.shop,item.location].filter(Boolean).join(' '),stats,money,special].map(normal);
    for(let tier=0;tier<groups.length;tier++){
      const text=groups[tier];if(!text)continue;
      if(text===q)return tier*100;
      if(text.startsWith(q))return tier*100+1;
      if(text.includes(q))return tier*100+2;
      if(q.split(' ').every(word=>text.includes(word)))return tier*100+3;
    }
    return Infinity;
  }
  let horseWishlist=new Set(),horseFavorites=new Set(),horseCounts=new Map();
  function state(item){return item.kind==='horse'?{owned:(horseCounts.get(String(item.id))||0)>0,wishlist:horseWishlist.has(String(item.id)),favorite:horseFavorites.has(String(item.id))}:states.get(String(item.id)) || {};}
  async function loadStates(){
    states=new Map();horseWishlist=new Set();horseFavorites=new Set();horseCounts=new Map(); if(!user)return;
    for(let start=0;;start+=1000){const stable=await supabaseClient.from('user_horses').select('horse_id').eq('user_id',user.id).range(start,start+999);if(stable.error)throw Error('Could not load your horse ownership: '+stable.error.message);for(const row of stable.data||[])horseCounts.set(String(row.horse_id),(horseCounts.get(String(row.horse_id))||0)+1);if((stable.data||[]).length<1000)break;}
    const wished=await supabaseClient.from('user_horse_wishlist').select('horse_id').eq('user_id',user.id);
    if(!wished.error)horseWishlist=new Set((wished.data||[]).map(r=>String(r.horse_id)));
    const favorites=await supabaseClient.from('user_horse_favorites').select('horse_id').eq('user_id',user.id);if(!favorites.error)horseFavorites=new Set((favorites.data||[]).map(r=>String(r.horse_id)));
    const {data,error}=await supabaseClient.from('user_items').select('item_id,owned,wishlist,favorite').eq('user_id',user.id);
    if(error)throw Error('Could not load your saved item states. '+error.message);
    for(const row of data)states.set(String(row.item_id),row);
  }
  async function toggle(item,field,control){
    if(!requireAccount())return;
    if(item.kind==='horse'){
      if(pending.has(key(item)))return;pending.add(key(item));control.disabled=true;
      const set=field==='favorite'?horseFavorites:horseWishlist,table=field==='favorite'?'user_horse_favorites':'user_horse_wishlist',label=field==='favorite'?'favorites':'wishlist';
      try{const exists=set.has(String(item.id));const result=exists?await supabaseClient.from(table).delete().eq('user_id',user.id).eq('horse_id',item.id):await supabaseClient.from(table).insert({user_id:user.id,horse_id:item.id});if(result.error)throw result.error;
        if(exists)set.delete(String(item.id));else set.add(String(item.id));message(exists?'Removed from horse '+label+'.':'Added to horse '+label+'.');
      }catch(e){message('Could not save horse preference: '+e.message);}finally{pending.delete(key(item));render(false);}return;
    }
    if(pending.has(key(item)))return;
    pending.add(key(item));
    document.querySelectorAll('[data-item-key]').forEach(n=>{if(n.dataset.itemKey===key(item))n.querySelectorAll('button').forEach(b=>b.disabled=true);});
    const before=state(item), next={owned:!!before.owned,wishlist:!!before.wishlist,favorite:!!before.favorite}; next[field]=!next[field];
    const {error}=await supabaseClient.from('user_items').upsert({user_id:user.id,item_id:item.id,...next},{onConflict:'user_id,item_id'});
    pending.delete(key(item));
    if(error){message('Could not save this change: '+error.message); render(false); return;}
    states.set(String(item.id),next); message('Saved.'); render(false);
    if(field==='owned'&&window.HMAdminWardrobe){await HMAdminWardrobe.ownedChanged(item,next.owned);render(false);}
    if(field==='favorite')window.HMAdminWardrobe?.favoriteChanged(item,next.favorite);
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
    if(item.category==='Hairstyles')return 'Hairstyle';
    if(item.category==='Player Accessories')return 'Player Accessories';
    if(item.category==='Pets')return 'Pet';
    const s=String(item.section||'').toLowerCase().replace(/[_-]/g,' ');
    const aliases=[['Mane Decoration',/mane/],['Tail Decoration',/tail/],['Leg Wraps',/leg wrap|socks/],['Saddle Bag',/saddle ?bag/],['Horseshoes',/horseshoe|horse shoe/],['Bridle',/bridle/],['Blanket',/blanket|saddle pad/],['Saddle',/saddle/],['Hat',/hat|helmet/],['Top',/top|shirt|jacket|sweater|coat/],['Gloves',/glove/],['Pants',/pant|breech|trouser/],['Shoes',/shoe|boot/]];
    return aliases.find(([,re])=>re.test(s))?.[0] || (['Clothes','Player Accessories','Equipment','Horse Decorations'].includes(item.category) && item.section ? String(item.section) : null);
  }
  async function addHorseHere(horse,control){
    if(!requireAccount())return;
    const entered=(await HMDialog.prompt(`Name your ${horse.breed||horse.title}:`));
    if(entered===null)return;const name=entered.trim();if(!name){message('Enter a horse name to add it.');return;}
    control.disabled=true;const old=control.textContent;control.textContent='Adding…';
    try{
      const {error}=await supabaseClient.from('user_horses').insert({user_id:user.id,horse_id:horse.id,name,nickname:null});
      if(error)throw error;
      horseCounts.set(String(horse.id),(horseCounts.get(String(horse.id))||0)+1);render(false);
      message(`${name} was added to My Stable!`);
      await workspace?.refreshHorses();
    }catch(e){message('Could not add horse: '+e.message);}finally{control.disabled=false;control.textContent=old;}
  }
  function card(item){
    const card=text('article','','item-card');card.dataset.itemKey=key(item);card.classList.toggle('is-uncertain',!!window.HMItemStatus?.isUncertain(item));
    const horse=item.kind==='horse';card.classList.toggle('horse-catalog-card',horse);
    const visual=text('div','','catalog-card-visual');visual.append(image(item));
    {
      const saved=state(item),statuses=[['owned','✓','I own this'],['wishlist','☆','Wishlist'],['favorite','♡','Favorite']].filter(([field])=>saved[field]);
      if(statuses.length){
        card.classList.add('has-saved-status');
        const colours=statuses.map(([field])=>`var(--${field}-card)`);
        const stops=colours.map((colour,i)=>`${colour} ${i*100/colours.length}%, ${colour} ${(i+1)*100/colours.length}%`).join(', ');
        card.style.setProperty('--saved-status-background',`linear-gradient(120deg, ${stops})`);
        card.style.setProperty('--saved-status-border',`var(--${statuses[0][0]}-ink)`);
        const badges=text('div','','saved-status-badges');
        for(const [field,symbol,label]of statuses){const badge=text('span',symbol,'saved-status-badge saved-status-'+field);badge.title=horse&&field==='owned'?'In My Stable':label;badge.setAttribute('aria-label',badge.title);badge.setAttribute('role','img');badge.tabIndex=0;badges.append(badge);}
        visual.firstElementChild.append(badges);
      }
    }

    if(!horse){const badge=view==='database'?button(itemType(item)||item.category,()=>browseType(item)):text('span',itemType(item)||item.category);badge.className='item-type-bubble';if(view==='database')badge.title='Show all '+(itemType(item)||item.category);visual.firstElementChild.append(badge);}
    if(isCompanion(item)){const star=text('span','★','pet-companion-star');star.tabIndex=0;star.setAttribute('aria-label','companion (able to run beside you)');star.title='companion (able to run beside you)';const tip=text('span','companion (able to run beside you)','pet-companion-tooltip');star.append(tip);visual.append(star);}
    card.append(visual,text('h3',horse?(item.breed||item.title):item.title,'card-title'));
    if(horse&&(String(item.id)==='923989698'||String(item.breed||item.title).toLowerCase()==='spirit')){
      const picture=visual.querySelector('.catalog-image'),trigger=button('',()=>HMSpiritSchedule.open());trigger.className='spirit-picture-button';trigger.setAttribute('aria-label','View Spirit’s schedule');picture.replaceWith(trigger);trigger.append(picture);
      const schedule=button('Spirit’s schedule · UTC',()=>HMSpiritSchedule.open());schedule.className='spirit-schedule-button';card.append(schedule);const spiritTitle=card.querySelector('.card-title');if(spiritTitle){const titleButton=button('Spirit',()=>HMSpiritSchedule.open());titleButton.className='spirit-title-button';spiritTitle.replaceChildren(titleButton);}
    }

    if(horse&&generationNumber(item.generation)!==null)card.append(text('p','Generation '+generationNumber(item.generation),'horse-generation'));
    if(horse&&item.speciality)card.append(text('p',item.speciality,'horse-speciality'));
    if(item.color)card.append(text('p','Color: '+item.color,'card-description'));
    if(!horse && item.description)card.append(text('p',item.description,'card-description'));
    if(item.category==='Hairstyles'&&/^https:\/\//i.test(item.general_image||'')){
      const preview=text('figure','','hairstyle-general-preview'),img=document.createElement('img');img.src=item.general_image;img.alt=item.title+' — general hairstyle preview';img.loading='lazy';preview.append(img,text('figcaption','Hairstyle preview'));card.append(preview);
    }
    const places=shopsFor(item);const place=text('div','','card-location');
    if(view==='database'&&places.length){for(const shop of places){const link=button(shop,()=>browseShop(shop));link.className='card-shop-link';place.append(link);}}else place.textContent=places.join(' | ')||'Site / shop not verified';card.append(place);
    if(item.level!==undefined && item.level!==null && String(item.level).trim()!=='' && String(item.level)!=='0')card.append(text('p',`Level / requirement: ${item.level}`,'card-requirement'));
    const sc=number(item.sc),js=number(item.js),money=[];
    if(sc!==null)money.push(`SC ${sc}`);if(item.category!=='Hairstyles'&&js!==null)money.push(`JS ${js}`);
    if(money.length)card.append(text('p',money.join(' · '),'card-price'));
    else if(!horse)card.append(text('p',item.category==='Hairstyles'?'SC～':'SC～ ✧ JS～','card-price'));
    if(item.price_note)card.append(text('p',item.price_note,'card-price-note'));
    const stats=fields.slice(3).filter(([f])=>number(item[f])!==null&&number(item[f])!==0).map(([f,label])=>`${f==='speed'&&item.category==='Equipment'?'Swiftness':label} ${item[f]}`).join(' · ');
    if(stats)card.append(text('p',stats,'stats card-stats'));
    const actions=text('div','','item-actions');
    if(item.kind==='horse'){
      const stableAction=text('div','','horse-stable-action');stableAction.append(button('Add to My Stable',e=>addHorseHere(item,e.currentTarget)));const count=horseCounts.get(String(item.id))||0;if(count){const ownedLink=button(`${count} in My Stable`,()=>{location.assign(new URL('stable/?horse='+encodeURIComponent(item.id),document.baseURI).href);});ownedLink.className='horse-stable-count';ownedLink.setAttribute('aria-label',`View your ${count} ${item.breed||item.title} in My Stable`);stableAction.append(ownedLink);}actions.append(stableAction);
      const wish=button(state(item).wishlist?'★ Wishlisted':'☆ Wishlist',e=>toggle(item,'wishlist',e.currentTarget));wish.setAttribute('aria-pressed',String(!!state(item).wishlist));wish.disabled=!ready||pending.has(key(item));actions.append(wish);
      const favorite=button(state(item).favorite?'♥ Favorited':'♡ Favorite',e=>toggle(item,'favorite',e.currentTarget));favorite.setAttribute('aria-pressed',String(!!state(item).favorite));favorite.disabled=!ready||pending.has(key(item));actions.append(favorite);
    }else{
      for(const [field,label] of [['owned','✓ I own this'],['wishlist','☆ Wishlist'],['favorite','♡ Favorite']]){
        const b=button(label,e=>toggle(item,field,e.currentTarget)); const selected=!!state(item)[field];
        b.setAttribute('aria-pressed',String(selected)); b.disabled=!ready || pending.has(key(item)); actions.append(b);
      }
    }
    if(!horse&&state(item).owned){const wardrobeButton=window.HMAdminWardrobe?.locationButton(item);if(wardrobeButton)actions.append(wardrobeButton);}
    const s=slot(item);
    if(s){const count=workspace?.count(item)||0; const b=button(count?`✓ In ${count} outfit${count===1?'':'s'}`:'+ Add to outfit',e=>{if(requireAccount()){if(workspace)workspace.openMenu(item,e.currentTarget);else message('Outfit tools are unavailable. Refresh My Outfits and try again.');}});b.className='outfit-menu-trigger';b.setAttribute('aria-expanded','false');b.setAttribute('aria-haspopup','dialog');actions.append(b);}
    card.append(actions); return card;
  }
  function filterValues(id){const select=$(id);return select?[...(select.selectedOptions||[])].map(o=>o.value).filter(Boolean):[];}
  function matchesValues(values,value){return !values.length||values.includes(value);}
  function render(reset=false){
    if(!$('database-grid'))return;
    if(view==='collection'){
      let note=$('horse-wishlist-note');if(!note){note=text('p','','stat-note');note.id='horse-wishlist-note';const link=text('a','My Stable');link.href='stable/';note.append(document.createTextNode('Wishlisted horses are in '),link,document.createTextNode(' → Wishlist.'));$('result-count').before(note);}note.hidden=active!=='wishlist';
    }
    if(reset===true)visibleLimit=60;
    if(view==='database'||view==='collection'){updateDBSubcategories();updateDBShops();}
    const chosenCategories=filterValues('category-filter'),chosenAreas=filterValues('area-filter'),chosenTypes=filterValues('subcategory-filter'),chosenShops=filterValues('shop-filter');
    const q=($('search')?.value||'').trim().toLowerCase(),category=$('category-filter')?.value||'',shop=$('shop-filter')?.value||'',breed=$('breed-filter')?.value||'',subtype=$('subcategory-filter')?.value||'';
    const flags=[...document.querySelectorAll('#state-filters input:checked')].map(n=>n.value);
    const excludedFlags=[...document.querySelectorAll('#hidden-state-filters input:checked')].map(n=>n.value);
    syncSortChoices();
    const rules=[...document.querySelectorAll('.sort-rule')].map(n=>({field:n.querySelector('.sort-field').value,dir:n.querySelector('.sort-dir').value}));
    const filtered=items.filter(i=>!excludedFlags.some(f=>state(i)[f])&&(view!=='collection' || collectionMatch(i)) && (view==='collection' || !active || i.category===active) && (matchesValues(chosenCategories,i.category)&&matchesValues(chosenTypes,itemType(i))) && (!breed || i.kind==='horse' && i.section===breed) && (!($('generation-filter')?.value)||generationNumber(i.generation)===Number($('generation-filter').value)) && (!chosenAreas.length || shopsFor(i).some(value=>chosenAreas.includes(areaForShop(value)))) && (!chosenShops.length || chosenShops.some(value=>hasShop(i,value))) && (!flags.length || flags.some(f=>state(i)[f])) && Number.isFinite(searchRank(i,q))).sort((a,b)=>(window.HMItemStatus?.compare(a,b)||0)||(q?(searchRank(a,q)-searchRank(b,q)):0)||compare(a,b,rules));
    $('database-grid').replaceChildren(...filtered.slice(0,visibleLimit).map(card));
    $('catalog-load-more')?.remove();
    if(filtered.length>visibleLimit){const more=button(`Load 60 more (${filtered.length-visibleLimit} remaining)`,()=>{visibleLimit+=60;render(false);});more.id='catalog-load-more';$('database-grid').after(more);}
    $('result-count').textContent=`${filtered.length} result${filtered.length===1?'':'s'}${filtered.length>visibleLimit?' · Showing '+visibleLimit:''}`;
    if(!filtered.length)$('database-grid').append(text('p','No items match these filters.'));
  }
  function options(select,values,first){if(!select)return;select.replaceChildren(new Option(first,''),...values.map(v=>new Option(v,v)));}
  function updateOptions(){setupDBCascade();}
  function collectionMatch(item){const saved=state(item);return item.kind!=='horse'&&(active==='everything'?!!(saved.owned||saved.wishlist||saved.favorite):!!saved[active]);}
  function categoryPool(){return items.filter(i=>view==='collection'?collectionMatch(i):!active||i.category===active);}
  const mainCategories=[['Horses','Horses'],['Horse Decorations','Horse decoration'],['Equipment','Equipment'],['Hairstyles','Hairstyles'],['Clothes','Clothes'],['Player Accessories','Player accessories'],['Pets','Pets']];
  function updateDBSubcategories(){
    const chosen=filterValues('category-filter'),main=chosen.length===1?chosen[0]:'';
    const pool=categoryPool().filter(i=>matchesValues(chosen,i.category));
    const previousTypes=filterValues('subcategory-filter');
    options($('subcategory-filter'),[...new Set(pool.map(itemType).filter(Boolean))].sort((a,b)=>a.localeCompare(b)),main==='Hairstyles'?'All hairstyles':'All item types');
    if($('subcategory-filter'))for(const option of $('subcategory-filter').options)option.selected=previousTypes.includes(option.value);
    if($('subcategory-wrap'))$('subcategory-wrap').firstChild.textContent=main==='Hairstyles'?'Hairstyle':main==='Horses'?'Horse breed':'Item type';
    $('subcategory-filter')?.setAttribute('aria-label',main==='Hairstyles'?'Hairstyle':main==='Horses'?'Horse breed':'Item type');
    if(main==='Hairstyles')for(const option of $('subcategory-filter')?.options||[]){
      const example=pool.find(i=>itemType(i)===option.value&&i.general_image);
      if(example){const img=document.createElement('img');img.src=example.general_image;img.alt='';img.className='hairstyle-option-image';option.dataset.image=example.general_image;option.prepend(img);}
    }
    if($('subcategory-wrap'))$('subcategory-wrap').hidden=!chosen.length;
  }
  function setupDBCascade(){
    const select=$('category-filter');if(!select)return;if(view==='database'){select.multiple=true;for(const id of ['area-filter','subcategory-filter','shop-filter'])if($(id))$(id).multiple=true;}
    select.replaceChildren(new Option('All categories',''),...mainCategories.filter(([v])=>view!=='collection'||v!=='Horses').map(([v,label])=>new Option(label,v)));
    select.value=view==='database'&&mainCategories.some(([v])=>v===active)?active:'';
    const special=false;
    if($('main-category-wrap')){$('main-category-wrap').hidden=special;$('main-category-wrap').parentElement.hidden=special;}
    updateDBSubcategories();
    options($('breed-filter'),[...new Set(items.filter(i=>i.kind==='horse').map(i=>i.section))].sort(),'All breeds');
    if($('breed-filter-wrap'))$('breed-filter-wrap').hidden=true;
    const generation=$('generation-filter');
    if(generation){options(generation,[...new Set(items.filter(i=>i.kind==='horse').map(i=>generationNumber(i.generation)).filter(v=>v!==null))].sort((a,b)=>a-b),'All generations');$('generation-filter-wrap').hidden=active!=='Horses';}
    updateDBShops();
  }
  function shopKey(value){return String(value||'').normalize('NFKC').toLowerCase().replace(/[—–]/g,'-').replace(/\s*-\s*/g,' - ').replace(/\s+/g,' ').trim();}
  function shopsFor(item){
    const values=[item.shop,item.location].flat().filter(Boolean).flatMap(value=>String(value).split(/\s*\|\s*|[\n;]+/)).map(v=>v.trim()).filter(Boolean);
    return [...new Map(values.map(value=>[shopKey(value),value])).values()];
  }
  function hasShop(item,shop){return shopsFor(item).some(value=>shopKey(value)===shopKey(shop));}
  function areaForShop(value){
    const shop=String(value||'').trim();if(!shop)return '';
    const prefix=shop.split(/\s+[—–-]\s+/)[0];
    if(/^(Jorvik City|Governor['’]s Fall|Aideen['’]s Plaza|Pier 13)/i.test(prefix))return 'Jorvik City';
    if(/^(Fort|Ford) Pinta/i.test(prefix))return 'Fort Pinta';
    for(const name of ['Moorland','Firgrove','Valedale','Silverglade Village','Silverglade Winery','Jarlaheim','Jorvik Stables','New Hillcrest','South Hoof Peninsula','Cape West Fishing Village','Crescent Moon Village','Goldspur Farm','Valley of the Hidden Dinosaur'])if(prefix.toLowerCase().startsWith(name.toLowerCase()))return name;
    return /\s[—–-]\s/.test(shop)?prefix:'Other / unspecified area';
  }
  function clearBrowseFilters(){
    $('search').value='';document.querySelectorAll('#state-filters input, #hidden-state-filters input').forEach(n=>n.checked=false);
    if($('area-filter'))$('area-filter').value='';$('shop-filter').value='';
  }
  function browseType(item){
    clearBrowseFilters();history.replaceState(null,'','#'+encodeURIComponent(item.category));activate(item.category);
    if($('subcategory-filter')&&[...$('subcategory-filter').options].some(o=>o.value===itemType(item)))$('subcategory-filter').value=itemType(item);
    render();
  }
  function browseShop(shop){
    clearBrowseFilters();history.replaceState(null,'',location.pathname);activate('');
    if($('area-filter'))$('area-filter').value=areaForShop(shop);updateDBShops();$('shop-filter').value=shop;render();
  }
  function updateDBShops(){
    const chosen=filterValues('category-filter'),chosenTypes=filterValues('subcategory-filter');
    const main=$('category-filter')?.value||'',sub=$('subcategory-filter')?.value||'',breed=$('breed-filter')?.value||'',search=($('search')?.value||'').trim().toLowerCase();
    const flags=[...document.querySelectorAll('#state-filters input:checked')].map(n=>n.value);
    const excludedFlags=[...document.querySelectorAll('#hidden-state-filters input:checked')].map(n=>n.value);
    const matching=categoryPool().filter(i=>!excludedFlags.some(f=>state(i)[f])&&matchesValues(chosen,i.category)&&matchesValues(chosenTypes,itemType(i))&&(!breed||i.section===breed)&&(!($('generation-filter')?.value)||generationNumber(i.generation)===Number($('generation-filter').value))&&(!flags.length||flags.some(f=>state(i)[f]))&&Number.isFinite(searchRank(i,search)));
    const area=$('area-filter');const previousAreas=filterValues('area-filter');const areas=[...new Set(matching.flatMap(i=>shopsFor(i).map(areaForShop)).filter(Boolean))].sort((a,b)=>a.localeCompare(b));options(area,areas,'All areas');if(area){for(const option of area.options)option.selected=previousAreas.includes(option.value);if(!previousAreas.length&&!area.multiple)area.value='';}
    const shop=$('shop-filter');if(!shop)return;const previousShops=filterValues('shop-filter');
    const pickedAreas=filterValues('area-filter');const entries=matching.flatMap(shopsFor).filter(value=>!pickedAreas.length||pickedAreas.includes(areaForShop(value)));const shops=[...new Map(entries.map(value=>[shopKey(value),value])).values()].sort((a,b)=>a.localeCompare(b));
    options(shop,shops,'All sites / shops');for(const option of shop.options)option.selected=previousShops.some(value=>shopKey(value)===shopKey(option.value));
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
  function sortChoices(){
    const chosen=filterValues('category-filter');const category=chosen.length===1?chosen[0]:'';
    if(category==='Hairstyles')return [['title','Name'],['sc','SC'],['shop','Location (site/shop)'],['color','Hair color'],['item_type','Hairstyle']];
    const allowed={
      Equipment:['speed','strength','agility','discipline'],
      Clothes:['ride','jump','command','care'],
      Horses:['speed','strength','agility','discipline','endurance'],
      Hairstyles:[], 'Horse Decorations':[], 'Player Accessories':[], Pets:[]
    };
    const stats=(Object.hasOwn(allowed,category)?fields.slice(3).filter(([field])=>allowed[category].includes(field)):fields.slice(3)).map(([field,label])=>[field,field==='speed'?'Swiftness':label]);
    return [...fields.slice(0,3),['overall','Overall stats (combined)'],['shop','Location (site/shop)'],['generation','Generation'],['category','Category'],['item_type','Item type'],...stats];
  }
  function syncSortChoices(){
    const choices=sortChoices(),signature=choices.map(([value,label])=>value+':'+label).join('|');
    document.querySelectorAll('.sort-rule').forEach(row=>{
      const select=row.querySelector('.sort-field');
      if([...select.options].map(option=>option.value+':'+option.text).join('|')===signature)return;
      const previous=select.value;select.replaceChildren(...choices.map(([value,label])=>new Option(label,value)));
      if(choices.some(([value])=>value===previous))select.value=previous;
      else{select.value='title';row.querySelector('.sort-dir').value='asc';}
    });
  }
  function addSort(field='title',dir='asc'){
    const row=text('div','','sort-rule'),f=document.createElement('select'),d=document.createElement('select');
    f.className='sort-field'; f.setAttribute('aria-label','Sort by'); sortChoices().forEach(([v,l])=>f.add(new Option(l,v)));f.value=field;
    d.className='sort-dir'; d.setAttribute('aria-label','Sort direction'); d.add(new Option('Ascending / A–Z','asc'));d.add(new Option('Descending / Z–A','desc'));d.value=dir;
    f.addEventListener('change',()=>{if(f.value==='overall'){d.value='desc';render();}});
    [f,d].forEach(n=>n.addEventListener('change',render));
    row.append(f,d,button('Remove rule',()=>{row.remove();render();})); $('sort-rules')?.append(row);
  }
  function setup(){
    const choices=view==='collection'?[['everything','Everything'],['owned','Owned'],['wishlist','Wishlist'],['favorite','Favorites']]:categories;
    let hash='';try{hash=decodeURIComponent(location.hash.slice(1));}catch{}
    active=choices.some(([v])=>v===hash)?hash:choices[0][0];
    const tabs=$('catalog-tabs');
    choices.forEach(([value,label],index)=>{
      const b=button(label,()=>{history.replaceState(null,'','#'+encodeURIComponent(value));activate(value);});b.id='tab-'+index;b.dataset.value=value;b.setAttribute('role','tab');b.setAttribute('aria-controls','catalog-panel');
      b.addEventListener('keydown',e=>{const all=[...tabs.children];const i=all.indexOf(b);const next=e.key==='ArrowRight'?all[(i+1)%all.length]:e.key==='ArrowLeft'?all[(i-1+all.length)%all.length]:e.key==='Home'?all[0]:e.key==='End'?all.at(-1):null;if(next){e.preventDefault();next.click();next.focus();}});tabs.append(b);
    });
    window.addEventListener('hashchange',()=>{let v;try{v=decodeURIComponent(location.hash.slice(1));}catch{return;}if(choices.some(([x])=>x===v))activate(v);});
    $('search')?.addEventListener('input',render);
    $('category-filter')?.addEventListener('change',()=>{
      if(view==='database'){
        const chosen=filterValues('category-filter');active=chosen.length===1?chosen[0]:'';
        history.replaceState(null,'',location.pathname+(active?'#'+encodeURIComponent(active):''));
        for(const b of $('catalog-tabs').querySelectorAll('[role="tab"]')){const on=b.dataset.value===active;b.setAttribute('aria-selected',String(on));b.tabIndex=on?0:-1;}
        $('tab-heading').textContent=chosen.length>1?'Selected categories':$('catalog-tabs').querySelector('[aria-selected="true"]')?.textContent||'Everything';
        if($('subcategory-filter'))$('subcategory-filter').value='';if($('breed-filter'))$('breed-filter').value='';if($('generation-filter'))$('generation-filter').value='';
        if($('breed-filter-wrap'))$('breed-filter-wrap').hidden=true;if($('generation-filter-wrap'))$('generation-filter-wrap').hidden=active!=='Horses';
        updateDBSubcategories();render();
      }else{updateDBSubcategories();render();}
    });
    ['subcategory-filter','breed-filter','generation-filter','area-filter','shop-filter','state-filters','hidden-state-filters'].forEach(id=>$(id)?.addEventListener('change',render));
    $('state-filters')?.addEventListener('click',e=>{if(!user && e.target.closest('label,input')){e.preventDefault();e.stopImmediatePropagation();requireAccount();}},true);
    $('hidden-state-filters')?.addEventListener('click',e=>{if(!user&&e.target.closest('label,input')){e.preventDefault();e.stopImmediatePropagation();requireAccount();}},true);
    $('add-sort')?.addEventListener('click',()=>{addSort('sc','asc');render();});addSort();
    $('reset-filters')?.addEventListener('click',()=>{$('search').value='';if($('area-filter'))$('area-filter').value='';if($('shop-filter'))$('shop-filter').value='';updateOptions();document.querySelectorAll('#state-filters input, #hidden-state-filters input').forEach(n=>n.checked=false);$('sort-rules').replaceChildren();addSort();render(true);});
    activate(active);
  }
  async function start(){
    if(window.HMFeatureAccess)await window.HMFeatureAccess;
    try{
      // Public browsing must not depend on account requests or outfit drafts.
      const [catalog,horses]=await Promise.all([json('data/database.json'),json('data/horses.json')]);
      items=catalog.map(i=>({...i,kind:'item',title:String(i.title||'Untitled item'),agility:i.agility??i.agil,discipline:i.discipline??i.disc})).concat(horses.map(h=>({...h,kind:'horse',category:'Horses',section:h.breed,title:h.title||`${h.breed} ${h.coat||''}`.trim(),shop:h.location})));
      if(view!=='outfits')setup();
    }catch(e){message('Could not load catalog data: '+e.message);return;}
    let authAvailable=true;
    try{
      if(typeof supabaseClient==='undefined')throw Error('Account service is unavailable.');
      const {data,error}=await supabaseClient.auth.getUser();
      if(error && error.name!=='AuthSessionMissingError')throw error;
      user=data?.user||null;
    }catch(e){authAvailable=false;message('Catalog loaded. Account features are temporarily unavailable: '+e.message);}
    finally{accountLoading=false;}
    if(authAvailable){
      try{await loadStates();ready=true;}catch(e){message(e.message);}
      supabaseClient.auth.onAuthStateChange((event,session)=>{if((session?.user?.id||null)!==(user?.id||null))setTimeout(()=>location.reload(),0);});
    }
    if(window.HMAdminWardrobe&&user)await HMAdminWardrobe.init({items,user});
    if(view!=='outfits')render();
    try{
      if(typeof HMOutfitWorkspace==='undefined')throw Error('The outfit script did not load.');
      workspace=await HMOutfitWorkspace.create({items,user,key,slot,image,text,button,number,fields,onChange:()=>render(false),requireAccount,getOwnedIds:()=>ready?new Set([...states.entries()].filter(([,v])=>v.owned).map(([id])=>id)):null});
    }catch(e){
      message((view==='database'?'Catalog loaded. ':'')+'Outfit tools could not load: '+e.message);
      console.error('Outfit workspace initialization failed',e);
    }
    if(view!=='outfits')render();
  }
  document.addEventListener('hm-wardrobe-favorite',event=>{const {id,favorite}=event.detail;states.set(String(id),{...(states.get(String(id))||{}),favorite});if(view!=='outfits')render(false);});
  document.addEventListener('hm-wardrobe-updated',()=>{if(view!=='outfits')render(false);});
  start();
})();
