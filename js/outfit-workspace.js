/* Multiple account-scoped outfit drafts, cloud saves, stats and character-sheet layout. */
window.HMOutfitWorkspace = {
  async create({items,user,key,slot,image,text,button,number,fields,onChange,getOwnedIds}) {
    const root=document.getElementById('outfit-workspace');
    const isStudio=document.body.dataset.view==='outfits';
    const statFields=fields.slice(3);
    const catalog=new Map(items.map(i=>[key(i),i]));
    const storeKey=`hm2018:outfits:v2:${user?.id||'guest'}`;
    let rows=[], horses=[], drafts={}, current='', busy=false;
    let ownedIds=new Set(),ownedReady=false;
    const uid=()=>crypto.randomUUID();
    let notice='';
    const resolve=k=>catalog.get(k);
    const clone=v=>JSON.parse(JSON.stringify(v));
    const selected=()=>drafts[current];
    const outfitTypes={set:'Horse + player set',horse:'Horse equipment only',player:'Player outfit only'};
    function side(s,k){const i=resolve(k);return i?(['Clothes','Player Accessories'].includes(i.category)?'player':'horse'):(['Bridle','Mane Decoration','Saddle','Blanket','Tail Decoration','Horseshoes','Leg Wraps','Saddle Bag','Pet'].includes(s)?'horse':'player');}
    function scopedSlots(d){return Object.fromEntries(Object.entries(d.slots||{}).filter(([s,k])=>d.outfit_type==='set' || side(s,k)===d.outfit_type));}

    function stats(slots){
      const groups={player:[],horse:[]};let unresolved=0;
      for(const k of Object.values(slots||{})){
        const i=resolve(k);if(!i){unresolved++;continue;}
        if(i.category==='Pets')continue; // Companions are displayed, not counted as equipment bonuses.
        groups[['Clothes','Player Accessories'].includes(i.category)?'player':'horse'].push(i);
      }
      return {groups,unresolved};
    }
    function statTable(slots,type='set'){
      const wrap=text('div','','outfit-stat-totals');const {groups,unresolved}=stats(slots);
      for(const [group,list] of Object.entries(groups)){
        if(type!=='set' && type!==group)continue;
        const spec=group==='player'?statFields.slice(0,4):statFields.slice(4);
        const section=text('div','','stat-group'); section.append(text('h3',group==='player'?'Player outfit bonuses':'Horse equipment bonuses'));
        const dl=document.createElement('dl');
        let total=0, missing=false;
        for(const [field,label] of spec){
          const values=list.map(i=>number(i[field]));
          const known=values.filter(v=>v!==null);const sum=known.reduce((a,b)=>a+b,0);total+=sum;
          const incomplete=values.some(v=>v===null)||unresolved>0;missing ||=incomplete;
          dl.append(text('dt',label),text('dd',incomplete?`${sum} + unknown`:String(sum)));
        }
        dl.append(text('dt','Combined'),text('dd',`${total}${missing?' + unknown':''}`));section.append(dl);wrap.append(section);
      }
      wrap.append(text('p','Equipment bonuses only. Base skills, horse level, training and care are not included. Missing stats are marked unknown.','stat-note'));return wrap;
    }
    function persist(){
      try{localStorage.setItem(storeKey,JSON.stringify({current,drafts}));}
      catch{notice='Draft storage is unavailable. Save to your account before leaving.';}
    }
    function clean(d){
      return {id:String(d.id||uid()),name:String(d.name||'New outfit'),slots:d.slots && typeof d.slots==='object' && !Array.isArray(d.slots)?{...d.slots}:{},outfit_type:Object.hasOwn(outfitTypes,d.outfit_type)?d.outfit_type:'set',horse_instance_id:d.horse_instance_id?String(d.horse_instance_id):null,dirty:!!d.dirty};
    }
    function newDraft(source){const d=clean(source||{});d.id=uid();d.dirty=true;drafts[d.id]=d;current=d.id;persist();return d;}
    if(user){
      const results=await Promise.all([
        supabaseClient.from('hm_saved_outfits').select('id,name,slots,horse_instance_id,outfit_type').eq('user_id',user.id).order('created_at',{ascending:false}),
        supabaseClient.from('user_horses').select('*').eq('user_id',user.id),
        supabaseClient.from('user_items').select('item_id').eq('user_id',user.id).eq('owned',true)
      ]);
      if(results[0].error)notice='Saved outfits could not load. Run OUTFITS_V2_SETUP.sql if needed. '+results[0].error.message;
      else rows=results[0].data||[];
      if(results[1].error)notice+=' Your stable could not load: '+results[1].error.message;
      else horses=results[1].data||[];
      if(!results[2].error){ownedIds=new Set((results[2].data||[]).map(r=>String(r.item_id)));ownedReady=true;}
    }
    try{
      const saved=JSON.parse(localStorage.getItem(storeKey)||'null');
      if(saved?.drafts && typeof saved.drafts==='object')for(const [id,d] of Object.entries(saved.drafts)){
        if(d && typeof d==='object' && !Array.isArray(d))drafts[id]=clean({...d,id});
      }
      current=saved?.current||'';
    }catch{}
    for(const r of rows)if(!drafts[r.id] || !drafts[r.id].dirty)drafts[r.id]=clean(r);
    if(!Object.keys(drafts).length){
      // Migrate the earlier single draft without changing existing cloud outfits.
      let old=null;try{old=JSON.parse(localStorage.getItem(`hm2018:outfit:${user?.id||'guest'}`)||localStorage.getItem('hm2018:outfit:guest')||'null');}catch{}
      newDraft(old||undefined);
    }
    if(!drafts[current])current=Object.keys(drafts)[0];
    function horseInfo(id){
      const own=horses.find(h=>String(h.id)===String(id));
      if(!own)return null;
      const breed=items.find(i=>i.kind==='horse' && String(i.id)===String(own.horse_id));
      return {...breed,...own,title:own.name||breed?.title||'My horse',image:breed?.image||'',breed:breed?.breed||''};
    }
    function tell(s){notice=s;const el=root.querySelector('[data-notice]');if(el)el.textContent=s;}
    function update(){persist();draw();onChange();}
    function add(item){const s=slot(item);if(!s)return;if(selected().outfit_type!=='set' && side(s,key(item))!==selected().outfit_type){tell('This outfit is '+outfitTypes[selected().outfit_type]+'. Choose a matching outfit or change Save as to Horse + player set.');return;}selected().slots[s]=key(item);selected().dirty=true;tell(`${item.title} added to ${selected().name}.`);update();}
    function changeSlot(s){
      const latestOwned=getOwnedIds?.();if(latestOwned){ownedIds=latestOwned;ownedReady=true;}
      const dialog=document.createElement('dialog');dialog.className='slot-picker';dialog.setAttribute('aria-labelledby','slot-picker-title');
      const head=text('div','','picker-head');const title=text('h2',`Choose ${s}`);title.id='slot-picker-title';
      head.append(title,button('Close',()=>dialog.close()));
      const search=document.createElement('input');search.type='search';search.placeholder=`Search ${s.toLowerCase()}…`;search.setAttribute('aria-label',`Search ${s}`);
      const sort=document.createElement('select');sort.setAttribute('aria-label','Sort items');
      for(const [v,l] of [['az','Name: A–Z'],['za','Name: Z–A'],['stats','Overall stats: best first'],['sc','SC: lowest first'],['js','JS: lowest first']])sort.add(new Option(l,v));
      const shop=document.createElement('select');shop.setAttribute('aria-label','Filter by shop');shop.add(new Option('All sites / shops',''));
      const pool=items.filter(i=>slot(i)===s);
      for(const v of [...new Set(pool.map(i=>i.shop).filter(Boolean))].sort((a,b)=>a.localeCompare(b)))shop.add(new Option(v,v));
      const ownedLabel=text('label','','owned-picker-filter');const owned=document.createElement('input');owned.type='checkbox';owned.disabled=!user||!ownedReady;ownedLabel.append(owned,text('span','Only items I own'));
      const toolbar=text('div','','picker-toolbar');toolbar.append(sort,shop,ownedLabel);
      const results=text('div','','slot-results');const count=text('p','','picker-count');count.setAttribute('role','status');
      function statValue(i){const values=statFields.map(([f])=>number(i[f])).filter(v=>v!==null);return values.length?values.reduce((a,b)=>a+b,0):null;}
      function compareItems(a,b){
        if(sort.value==='az'||sort.value==='za')return a.title.localeCompare(b.title,undefined,{numeric:true,sensitivity:'base'})*(sort.value==='za'?-1:1);
        const av=sort.value==='stats'?statValue(a):number(a[sort.value]),bv=sort.value==='stats'?statValue(b):number(b[sort.value]);
        if(av===null&&bv!==null)return 1;if(bv===null&&av!==null)return -1;
        return (av===null?0:(av-bv)*(sort.value==='stats'?-1:1))||a.title.localeCompare(b.title);
      }
      const render=()=>{
        const query=search.value.trim().toLowerCase();
        const candidates=pool.filter(i=>`${i.title} ${i.shop||''}`.toLowerCase().includes(query)&&(!shop.value||i.shop===shop.value)&&(!owned.checked||ownedIds.has(String(i.id)))).sort(compareItems);
        count.textContent=`${candidates.length} item${candidates.length===1?'':'s'} · Choose one for ${s.toLowerCase()}`;
        results.replaceChildren(...candidates.map(i=>{
          const b=button('',()=>{add(i);dialog.close();});b.className='picker-item';b.setAttribute('aria-pressed',String(selected().slots[s]===key(i)));
          b.append(image(i),text('strong',i.title),text('span',`SC ${i.sc??'—'} · JS ${i.js??'—'}`,'picker-price'));
          if(i.shop)b.append(text('span',i.shop,'picker-shop'));
          const statText=i.category==='Pets'?'Companion':statFields.filter(([f])=>number(i[f])!==null).map(([f,label])=>`${label} ${i[f]}`).join(' · ');
          if(statText)b.append(text('span',statText,'picker-stats'));
          if(selected().slots[s]===key(i))b.append(text('span','✓ Selected','picker-badge'));
          return b;
        }));
        if(!candidates.length)results.append(text('p','No matching items. Try another search or filter.','picker-empty'));
      };
      search.addEventListener('input',render);[sort,shop,owned].forEach(el=>el.addEventListener('change',render));
      const remove=button('Remove current item',()=>{delete selected().slots[s];selected().dirty=true;update();dialog.close();});remove.disabled=!selected().slots[s];
      const footer=text('div','','picker-footer');footer.append(remove,text('small','Selecting an item replaces the current item in this slot.'));
      dialog.append(head,search,toolbar,count,results,footer);
      dialog.addEventListener('close',()=>{dialog.remove();const target=[...root.querySelectorAll('.gear-slot')].find(n=>n.dataset.slot===s);target?.focus();});
      document.body.append(dialog);render();dialog.showModal();search.focus();
    }
    function slotButton(s){
      const item=resolve(selected().slots[s]);const b=button('',()=>changeSlot(s));b.className='gear-slot';b.dataset.slot=s;b.classList.toggle('is-filled',!!item);b.setAttribute('aria-label',`${s}: ${item?.title||'Empty'}. Choose item`);
      b.append(text('span',s,'slot-label'));if(item)b.append(image(item));else b.append(text('span','+','slot-plus'));
      b.append(text('span',item?.title || (selected().slots[s]?'Item unavailable':'Choose item'),'slot-title'));return b;
    }
    function playerFigure(){
      const wrap=text('div','','player-figure');
      // A neutral player silhouette; item thumbnails surround it.
      wrap.innerHTML='<svg viewBox="0 0 100 200" aria-hidden="true"><circle cx="50" cy="26" r="18"/><path d="M30 52 Q50 42 70 52 L85 108 L73 112 L64 80 L64 128 L70 188 L55 188 L50 140 L45 188 L30 188 L36 128 L36 80 L27 112 L15 108Z"/></svg>';
      wrap.append(text('span','Player outfit'));return wrap;
    }
    function sheet(kind){
      const panel=text('section','',`character-sheet ${kind}-sheet`);
      const left=kind==='horse'?['Bridle','Saddle','Blanket','Horseshoes']:['Hat','Top','Gloves'];
      const right=kind==='horse'?['Mane Decoration','Tail Decoration','Leg Wraps']:['Pants','Shoes'];
      const dock=kind==='horse'?['Saddle Bag','Pet']:[];
      const slots=[...left,...right,...dock];
      const head=text('div','','sheet-header');head.append(text('h2',kind==='horse'?'Horse equipment':'Player outfit'),text('span',`${slots.filter(s=>selected().slots[s]).length} / ${slots.length} selected`,'sheet-progress'));panel.append(head);
      const stage=text('div','','gear-stage');
      const centre=text('div','','sheet-centre');
      if(kind==='horse'){
        const h=horseInfo(selected().horse_instance_id);
        centre.append(h?image(h):text('div','Choose your horse above','horse-placeholder'),text('strong',h?.title||'Your horse'));
        if(h)centre.append(text('small',h.breed));
      }else centre.append(playerFigure());
      const leftRail=text('div','','gear-rail gear-left');leftRail.append(...left.map(slotButton));
      const rightRail=text('div','','gear-rail gear-right');rightRail.append(...right.map(slotButton));
      stage.append(leftRail,centre,rightRail);panel.append(stage);
      if(dock.length){const group=text('div','','companion-dock');group.append(text('h3','Saddle bag & companion'));const pair=text('div','','companion-pair');pair.append(...dock.map(slotButton));group.append(pair);panel.append(group);}
      const extras=Object.keys(selected().slots).filter(s=>!slots.includes(s)&&resolve(selected().slots[s])&&side(s,selected().slots[s])===kind);
      if(extras.length){const extra=text('div','','extra-slots');extra.append(...extras.map(slotButton));panel.append(extra);}return panel;
    }
    async function save(){
      if(busy)return;if(!user){tell('Log in to save. Your drafts remain in this browser.');return;}
      const d=clone(selected());d.name=d.name.trim();if(!d.name){tell('Give this outfit a name first.');return;}
      busy=true;draw();
      try{
        const payload={id:d.id,user_id:user.id,name:d.name,slots:scopedSlots(d),horse_instance_id:d.outfit_type==='player'?null:d.horse_instance_id,outfit_type:d.outfit_type};
        const {error}=await supabaseClient.from('hm_saved_outfits').upsert(payload,{onConflict:'id'});if(error)throw error;
        const i=rows.findIndex(r=>r.id===d.id);if(i<0)rows.unshift(payload);else rows[i]=payload;
        // Preserve edits made during the request instead of marking them saved.
        const latest=drafts[d.id];if(latest && JSON.stringify({...latest,dirty:false})===JSON.stringify({...d,dirty:false})){latest.slots=clone(payload.slots);latest.horse_instance_id=payload.horse_instance_id;latest.dirty=false;}
        persist();tell(`Saved “${d.name}”.`);
      }catch(e){tell('Could not save: '+e.message);}finally{busy=false;draw();browse();}
    }
    async function remove(id){
      const d=drafts[id]||rows.find(r=>r.id===id);if(!confirm(`Delete “${d?.name||'this outfit'}”?`))return;
      if(rows.some(r=>r.id===id)){
        const {error}=await supabaseClient.from('hm_saved_outfits').delete().eq('id',id).eq('user_id',user.id);
        if(error){tell('Could not delete: '+error.message);return;}
        rows=rows.filter(r=>r.id!==id);
      }
      delete drafts[id];if(!Object.keys(drafts).length)newDraft();if(!drafts[current])current=Object.keys(drafts)[0];update();browse();
    }
    function draw(){
      root.replaceChildren();const d=selected();
      const target=document.createElement('select');target.id='outfit-target';target.setAttribute('aria-label','Choose outfit to edit or add items to');
      for(const v of Object.values(drafts))target.add(new Option(`${v.name}${v.dirty?' • unsaved':''}`,v.id));target.value=current;
      target.addEventListener('change',()=>{current=target.value;update();});
      const controls=text('div','','outfit-controls');controls.append(target,button('+ New outfit',()=>{newDraft();update();}),button('Duplicate',()=>{newDraft({...selected(),name:selected().name+' (copy)'});update();}));root.append(controls);
      const name=document.createElement('input');name.id='outfit-name';name.maxLength=100;name.value=d.name;name.placeholder='Outfit name';
      name.addEventListener('input',()=>{d.name=name.value;d.dirty=true;persist();target.selectedOptions[0].textContent=(d.name||'New outfit')+' • unsaved';browse();});
      const horseSelect=document.createElement('select');horseSelect.id='outfit-horse';horseSelect.add(new Option('No horse selected',''));
      for(const h of horses)horseSelect.add(new Option(horseInfo(h.id).title,String(h.id)));
      if(d.horse_instance_id && !horses.some(h=>String(h.id)===d.horse_instance_id))horseSelect.add(new Option('Previously selected horse unavailable',d.horse_instance_id));
      horseSelect.value=d.horse_instance_id||'';horseSelect.addEventListener('change',()=>{d.horse_instance_id=horseSelect.value||null;d.dirty=true;update();});
      const nl=text('label','Outfit name');nl.htmlFor=name.id;const hl=text('label','Horse from My Stable');hl.htmlFor=horseSelect.id;
      const typeSelect=document.createElement('select');typeSelect.id='outfit-type';
      for(const [v,l] of Object.entries(outfitTypes))typeSelect.add(new Option(l,v));typeSelect.value=d.outfit_type;
      typeSelect.addEventListener('change',()=>{d.outfit_type=typeSelect.value;d.dirty=true;update();browse();});
      const typeLabel=text('label','Save as');typeLabel.htmlFor=typeSelect.id;
      const form=text('div','','outfit-settings');const nameField=text('div','','setting-field');nameField.append(nl,name);const typeField=text('div','','setting-field');typeField.append(typeLabel,typeSelect);form.append(nameField,typeField);
      if(d.outfit_type!=='player'){const horseField=text('div','','setting-field');horseField.append(hl,horseSelect);form.append(horseField);}root.append(form);
      if(Object.keys(scopedSlots(d)).length<Object.keys(d.slots).length)root.append(text('p','Only the selected side will be saved. Duplicate this outfit first if you also want to keep the full set.','stat-note'));

      if(!horses.length && d.outfit_type!=='player')root.append(text('p',user?'Add a horse in My Stable to select it here.':'Log in to choose a horse from My Stable.','stat-note'));
      if(isStudio){const layout=text('div','','character-sheets');if(d.outfit_type!=='player')layout.append(sheet('horse'));if(d.outfit_type!=='horse')layout.append(sheet('player'));layout.classList.toggle('single-sheet',d.outfit_type!=='set');root.append(layout);}
      else {
        root.append(text('p',`Items you pick are added to “${d.name||'New outfit'}”.`));
        const tray=text('div','','compact-tray');
        for(const [s,k] of Object.entries(scopedSlots(d))){const item=resolve(k);const row=text('div','','tray-row');if(item)row.append(image(item));row.append(text('span',`${s}: ${item?.title||'Item unavailable'}`),button('Remove',()=>{delete d.slots[s];d.dirty=true;update();}));tray.append(row);}root.append(tray);
      }
      root.append(statTable(scopedSlots(d),d.outfit_type));
      const saveButton=button(busy?'Saving…':'Save outfit',save);saveButton.id='save-outfit';saveButton.disabled=busy;
      const actions=text('div','','outfit-controls');actions.append(saveButton,button('Delete outfit',()=>remove(d.id)));root.append(actions);
      const status=text('p',notice);status.dataset.notice='';status.id='outfit-message';status.setAttribute('role','status');root.append(status);
      if(!isStudio){const a=text('a','Open outfit studio');a.href='outfits.html';root.append(a);}
    }
    function browse(){
      const host=document.getElementById('saved-outfits');if(!host)return;
      const q=(document.getElementById('outfit-search')?.value||'').toLowerCase();host.replaceChildren();
      const all=Object.values(drafts).filter(d=>d.name.toLowerCase().includes(q));
      for(const d of all){
        const card=text('article','','outfit-overview');card.append(text('h3',d.name),text('p',d.dirty?'Unsaved changes':'Saved to your account'));
        card.append(text('p',outfitTypes[d.outfit_type]));const h=d.outfit_type==='player'?null:horseInfo(d.horse_instance_id);if(h)card.append(image(h),text('p',h.title));
        const thumbs=text('div','','outfit-thumbnails');for(const k of Object.values(scopedSlots(d))){const i=resolve(k);if(i)thumbs.append(image(i));}card.append(thumbs,statTable(scopedSlots(d),d.outfit_type));
        card.append(button('Open outfit',()=>{current=d.id;update();root.scrollIntoView?.({behavior:'smooth',block:'start'});}),button('Delete',()=>remove(d.id)));host.append(card);
      }
      if(!all.length)host.append(text('p','No outfits match your search.'));
    }
    // Keep drafts and saved outfits visible together; each card clearly marks unsaved work.
    document.getElementById('outfit-search')?.addEventListener('input',browse);
    persist();draw();browse();
    return {get slots(){return scopedSlots(selected());},add,stats:statTable};
  }
};
