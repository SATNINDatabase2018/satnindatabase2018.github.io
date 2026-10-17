/* Account-scoped stable with multiple saved outfits per horse. */
(() => {
  'use strict';
  const $=id=>document.getElementById(id);
  const el=(tag,value='',cls='')=>{const n=document.createElement(tag);n.textContent=value;if(cls)n.className=cls;return n;};
  const button=(label,action)=>{const b=el('button',label);b.type='button';b.addEventListener('click',action);return b;};
  let user=null, catalog=[], horseCatalog=[], horses=[], outfits=[], outfitsReady=false;
  function message(s){$('stable-message').textContent=s;}
  async function json(path){const r=await fetch(path);if(!r.ok)throw Error('Could not load '+path);return r.json();}
  const getItem=k=>catalog.find(i=>`item:${i.id}`===k);
  const horseSide=i=>i && !['Clothes','Player Accessories'].includes(i.category);
  function photo(item,title){
    const box=el('div','','catalog-image');
    if(/^https?:\/\//i.test(item?.image||'')){const img=document.createElement('img');img.src=item.image;img.alt=title;img.loading='lazy';img.addEventListener('error',()=>box.replaceChildren(el('span','Image unavailable')),{once:true});box.append(img);}
    else box.append(el('span','Image unavailable'));return box;
  }
  async function load(){
    const results=await Promise.all([
      supabaseClient.from('user_horses').select('*').eq('user_id',user.id),
      supabaseClient.from('hm_saved_outfits').select('id,name,slots,outfit_type').eq('user_id',user.id).order('name',{ascending:true})
    ]);
    if(results[0].error)throw results[0].error;horses=results[0].data||[];
    outfitsReady=!results[1].error;
    outfits=outfitsReady?(results[1].data||[]).filter(o=>o.outfit_type!=='player'):[];
    if(!outfitsReady)message('Your horses loaded, but saved outfits could not load: '+results[1].error.message);
    render();
  }
  function outfitPreview(outfit){
    const box=el('div','','stable-outfit-preview');
    box.append(el('h4',outfit.name));
    const thumbs=el('div','','stable-outfit-items');let missing=false;
    const statFields=[['speed','Speed'],['strength','Strength'],['agility','Agility'],['discipline','Discipline']];
    const values=Object.fromEntries(statFields.map(([f])=>[f,0]));const unknown=new Set();let count=0;
    for(const [s,k] of Object.entries(outfit.slots||{})){
      const i=getItem(k);if(!i){missing=true;continue;}if(!horseSide(i))continue;
      count++;const chip=el('div','','stable-gear-chip');chip.append(photo(i,i.title),el('span',s+': '+i.title));thumbs.append(chip);
      if(i.category==='Pets')continue;
      for(const [f] of statFields){const v=i[f]??(f==='agility'?i.agil:f==='discipline'?i.disc:undefined);const n=v===null||v===undefined||String(v).trim()===''?NaN:Number(v);if(Number.isFinite(n))values[f]+=n;else unknown.add(f);}
    }
    box.append(thumbs);if(!count)box.append(el('p','No horse equipment selected in this outfit.'));
    box.append(el('p',statFields.map(([f,l])=>`${l} ${values[f]}${missing||unknown.has(f)?' + unknown':''}`).join(' · '),'stats'));
    box.append(el('small','Equipment bonuses only. Player clothing and horse level are not included.'));
    const link=el('a','Edit outfit in My Outfits','stable-outfit-link');link.href='outfits.html?outfit='+encodeURIComponent(outfit.id);box.append(link);return box;
  }
  function horseCard(own){
    const h=horseCatalog.find(x=>String(x.id)===String(own.horse_id));const card=el('article','','item-card stable-horse-card');card.dataset.horseId=own.id;
    card.append(photo(h,own.name||h?.breed||'Horse'),el('h3',own.name||h?.breed||'My horse'),el('p',[h?.breed,h?.coat,own.nickname].filter(Boolean).join(' · ')));
    const assigned=new Set((Array.isArray(own.outfit_ids)?own.outfit_ids:[]).map(String));
    const details=document.createElement('details');details.className='horse-outfit-picker';details.append(el('summary','Choose outfits'));
    const list=el('div','','horse-outfit-options');
    if(!outfits.length)list.append(el('p',outfitsReady?'No saved horse outfits yet. Create and save one in My Outfits first.':'Saved outfits are unavailable. Try refreshing.'));
    for(const o of outfits){
      const label=el('label','','horse-outfit-option'),check=document.createElement('input');check.type='checkbox';check.value=o.id;check.checked=assigned.has(String(o.id));
      label.append(check,el('span',o.name),el('small',o.outfit_type==='set'?'Horse + player set':'Horse equipment'));list.append(label);
    }
    const status=el('p','','horse-outfit-status');status.setAttribute('role','status');
    const save=button('Save outfits',async()=>{
      // Keep references to temporarily unavailable outfits until the user can inspect them.
      const known=new Set(outfits.map(o=>String(o.id)));
      const ids=[...assigned].filter(id=>!known.has(id)).concat([...list.querySelectorAll('input:checked')].map(n=>n.value));
      save.disabled=true;list.querySelectorAll('input').forEach(n=>n.disabled=true);status.textContent='Saving…';
      try{
        const {error}=await supabaseClient.from('user_horses').update({outfit_ids:ids}).eq('id',own.id).eq('user_id',user.id);
        if(error)throw error;own.outfit_ids=ids;assigned.clear();ids.forEach(id=>assigned.add(id));refreshPreview();status.textContent='Outfits saved to this horse.';
      }catch(e){status.textContent='Could not save outfits: '+e.message;}
      finally{save.disabled=!outfitsReady;list.querySelectorAll('input').forEach(n=>n.disabled=false);}
    });save.disabled=!outfitsReady;
    const studio=el('a','Create an outfit in My Outfits');studio.href='outfits.html';details.append(list,save,status,studio);card.append(details);
    const previews=el('div','','horse-assigned-outfits');card.append(previews);
    function refreshPreview(){
      previews.replaceChildren();const available=outfits.filter(o=>assigned.has(String(o.id)));
      if(!available.length)previews.append(el('p','No outfits assigned yet.','stat-note'));
      else for(const outfit of available)previews.append(outfitPreview(outfit));
      if([...assigned].some(id=>!outfits.some(o=>String(o.id)===id)))previews.append(el('p','An assigned outfit is unavailable or has been deleted.','stat-note'));
    }
    refreshPreview();return card;
  }
  function render(){const grid=$('stable-grid');grid.replaceChildren(...horses.map(horseCard));if(!horses.length)grid.append(el('p','Your stable is empty. Add your first horse above or from the database.'));}
  function picker(){
    $('horse-options').replaceChildren(...horseCatalog.map(h=>{
      const c=el('article','','item-card');c.append(photo(h,h.breed),el('h3',h.breed),el('p',h.coat||''),button('Add to Stable',async e=>{
        const name=prompt("What is your horse’s name?");if(name===null||!name.trim())return;e.currentTarget.disabled=true;
        try{const {error}=await supabaseClient.from('user_horses').insert({user_id:user.id,horse_id:h.id,name:name.trim(),nickname:null});if(error)throw error;$('horse-picker').hidden=true;message(name.trim()+' added to your stable.');await load();}
        catch(error){message('Could not add horse: '+error.message);}finally{e.target.disabled=false;}
      }));return c;
    }));
  }
  async function start(){
    if(window.HMFeatureAccess)await window.HMFeatureAccess;
    try{
      const {data,error}=await supabaseClient.auth.getUser();if(error && error.name!=='AuthSessionMissingError')throw error;user=data.user;
      if(!user){
        horseCatalog=await json('data/horses.json');
        horses=horseCatalog.slice(0,2).map((h,index)=>({id:'preview-'+index,horse_id:h.id,name:'Your horse',outfit_ids:[]}));
        render();return;
      }
      [horseCatalog,catalog]=await Promise.all([json('data/horses.json'),json('data/database.json')]);await load();
      $('add-horse-button').addEventListener('click',()=>{$('horse-picker').hidden=!$('horse-picker').hidden;picker();});
      supabaseClient.auth.onAuthStateChange((event,session)=>{if(session?.user?.id!==user.id)setTimeout(()=>location.reload(),0);});
    }catch(e){message(e.message||'Could not load your stable.');}
  }
  start();
})();
