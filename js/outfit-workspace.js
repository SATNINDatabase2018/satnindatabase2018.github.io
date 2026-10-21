/* Multiple account-scoped outfit drafts, cloud saves, stats and character-sheet layout. */
window.HMOutfitWorkspace = {
  async create({items,user,key,slot,image,text,button,number,fields,onChange,getOwnedIds,requireAccount}) {
    const root=document.getElementById('outfit-workspace');
    const isStudio=document.body.dataset.view==='outfits';
    if(!user && requireAccount){
      const protect=e=>{if(e.target.closest('button,input,select,a,label')){e.preventDefault();e.stopImmediatePropagation();requireAccount();}};
      root.addEventListener('click',protect,true);
      root.addEventListener('pointerdown',e=>{if(e.target.closest('input,select'))protect(e);},true);
      root.addEventListener('keydown',e=>{if(e.key!=='Tab' && e.key!=='Escape')protect(e);},true);
    }
    const statFields=fields.slice(3).map(([field,label])=>[field,field==='speed'?'Swiftness':label]);
    const catalog=new Map(items.map(i=>[key(i),i]));
    const storeKey=`hm2018:outfits:v2:${user?.id||'guest'}`;
    let rows=[], horses=[], drafts={}, current='', busy=false;
    let ownedIds=new Set(),ownedReady=false;const itemStates=new Map(),statusPending=new Set();
    const uid=()=>crypto.randomUUID();
    let notice='';
    const resolve=k=>catalog.get(k);
    const clone=v=>JSON.parse(JSON.stringify(v));
    const selected=()=>drafts[current];
    const outfitTypes={set:'Horse + player set',horse:'Horse equipment only',player:'Player outfit only'};
    function side(s,k){const i=resolve(k);return i?(['Clothes','Player Accessories','Hairstyles'].includes(i.category)?'player':'horse'):(['Bridle','Mane Decoration','Saddle','Blanket','Tail Decoration','Horseshoes','Leg Wraps','Saddle Bag','Pet'].includes(s)?'horse':'player');}
    function scopedSlots(d){return {...d.slots};}
    function autoType(d){
      const sides=new Set(Object.entries(d.slots||{}).map(([s,k])=>side(s,k)));
      if(sides.size>1)d.outfit_type='set';else if(sides.size===1)d.outfit_type=[...sides][0];
      if(d.outfit_type==='player')d.horse_instance_id=null;
      return d;
    }

    function stats(slots){
      const groups={player:[],horse:[]};let unresolved=0;
      for(const k of Object.values(slots||{})){
        const i=resolve(k);if(!i){unresolved++;continue;}
        if(['Pets','Hairstyles'].includes(i.category)||i.category==='Player Accessories'&&statFields.every(([f])=>i[f]===null||i[f]===undefined||String(i[f]).trim()===''))continue; // Companions are displayed, not counted as equipment bonuses.
        groups[['Clothes','Player Accessories','Hairstyles'].includes(i.category)?'player':'horse'].push(i);
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
          dl.append(text('dt',label),text('dd',String(sum)+(incomplete?' + ?':'')));
        }
        dl.append(text('dt','Combined'),text('dd',String(total)+(missing?' + ?':'')));if(dl.childElementCount){section.append(dl);if(missing)section.append(text('p','? = missing or unverified stats.','stat-note'));wrap.append(section);}
      }
      wrap.append(text('p','Equipment bonuses only. Base skills, horse level, training and care are not included. ','stat-note'));return wrap;
    }
    function persist(){
      try{localStorage.setItem(storeKey,JSON.stringify({current,drafts}));}
      catch{notice='Draft storage is unavailable. Save to your account before leaving.';}
    }
    function clean(d){
      const value={id:String(d.id||uid()),name:String(d.name||'New outfit'),slots:d.slots && typeof d.slots==='object' && !Array.isArray(d.slots)?{...d.slots}:{},outfit_type:Object.hasOwn(outfitTypes,d.outfit_type)?d.outfit_type:'set',horse_instance_id:d.horse_instance_id?String(d.horse_instance_id):null,dirty:!!d.dirty};
      if(new Set(Object.entries(value.slots).map(([s,k])=>side(s,k))).size>1)value.outfit_type='set';
      return value;
    }
    function newDraft(source){const d=clean(source||{});d.id=uid();d.dirty=true;drafts[d.id]=d;current=d.id;persist();return d;}
    if(user){
      const results=await Promise.all([
        supabaseClient.from('hm_saved_outfits').select('id,name,slots,horse_instance_id,outfit_type').eq('user_id',user.id).order('created_at',{ascending:false}),
        supabaseClient.from('user_horses').select('*').eq('user_id',user.id),
        supabaseClient.from('user_items').select('item_id,owned,wishlist,favorite').eq('user_id',user.id)
      ]);
      if(results[0].error)notice='Saved outfits could not load. Run OUTFITS_V2_SETUP.sql if needed. '+results[0].error.message;
      else rows=results[0].data||[];
      if(results[1].error)notice+=' Your stable could not load: '+results[1].error.message;
      else horses=results[1].data||[];
      if(!results[2].error){for(const row of results[2].data||[])itemStates.set(String(row.item_id),row);ownedIds=new Set((results[2].data||[]).filter(r=>r.owned).map(r=>String(r.item_id)));ownedReady=true;}
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
    if(isStudio){const requested=new URLSearchParams(location.search).get('outfit');if(requested && drafts[requested])current=requested;}
    function horseInfo(id){
      const own=horses.find(h=>String(h.id)===String(id));
      if(!own)return null;
      const breed=items.find(i=>i.kind==='horse' && String(i.id)===String(own.horse_id));
      return {...breed,...own,title:own.name||breed?.title||'My horse',image:breed?.image||'',breed:breed?.breed||''};
    }
    function tell(s){notice=s;const el=root.querySelector('[data-notice]');if(el)el.textContent=s;}
    function update(){persist();draw();onChange();}
    function add(item){const s=slot(item);if(!s)return;selected().slots[s]=key(item);autoType(selected());selected().dirty=true;tell(`${item.title} added to ${selected().name}.`);update();}
    let menuClose=null;
    const compatible=()=>true; // Any outfit can grow into a complete set.
    const count=item=>Object.values(drafts).filter(d=>compatible(d,item)&&d.slots[slot(item)]===key(item)).length;
    async function refreshHorses(){
      if(!user)return;
      const {data,error}=await supabaseClient.from('user_horses').select('*').eq('user_id',user.id);
      if(error){tell('Horse added, but refresh My Outfits to reload your stable.');return;}
      horses=data||[];draw();browse();
    }
    function openMenu(item,anchor){
      menuClose?.();
      const s=slot(item);if(!s)return;
      const menu=text('div','','outfit-assign-menu');menu.setAttribute('role','dialog');menu.setAttribute('aria-label',`Add ${item.title} to outfits`);menu.tabIndex=-1;
      anchor.setAttribute('aria-expanded','true');
      const header=text('div','','assign-header');header.append(text('strong','Add to outfits'),button('Close',()=>close()));
      menu.append(header,text('p',item.title,'assign-item-name'));
      const list=text('div','','assign-outfit-list'),chosen=new Map();
      for(const d of Object.values(drafts))chosen.set(d.id,compatible(d,item)&&d.slots[s]===key(item));
      const status=text('p','','assign-status');status.setAttribute('role','status');
      let applying=false,hoverTimer=null,preview=null,previewRow=null;
      function hidePreview(){clearTimeout(hoverTimer);preview?.remove();preview=null;previewRow?.removeAttribute('aria-describedby');previewRow=null;}
      function showPreview(d,row){
        hidePreview();if(window.innerWidth<760)return;
        preview=text('aside','','outfit-hover-preview');preview.id='outfit-hover-preview';preview.setAttribute('role','tooltip');
        preview.append(text('h3',d.name||'New outfit'),text('p',outfitTypes[d.outfit_type],'hover-preview-meta'));
        const layout=text('div','','character-sheets');
        if(d.outfit_type!=='player')layout.append(sheet('horse',d,false));if(d.outfit_type!=='horse')layout.append(sheet('player',d,false));
        layout.classList.toggle('single-sheet',d.outfit_type!=='set');
        const body=text('div','','hover-preview-body');body.append(layout);preview.append(body,statTable(scopedSlots(d),d.outfit_type));
        document.body.append(preview);previewRow=row;row.setAttribute('aria-describedby',preview.id);
        const mr=menu.getBoundingClientRect(),r=row.getBoundingClientRect();const right=window.innerWidth-mr.right-20,left=mr.left-20;
        const width=Math.min(460,Math.max(right,left),window.innerWidth-24);preview.style.width=Math.max(260,width)+'px';layout.style.zoom=String(Math.min(.65,(Math.max(260,width)-28)/(d.outfit_type==='set'?700:440)));
        const x=right>=width?mr.right+10:mr.left-width-10;preview.style.left=Math.max(12,Math.min(x,window.innerWidth-preview.offsetWidth-12))+'px';
        preview.style.top=Math.max(12,Math.min(r.top,window.innerHeight-preview.offsetHeight-12))+'px';
      }
      list.addEventListener('scroll',hidePreview);
      function renderList(){
        hidePreview();
        list.replaceChildren();
        for(const d of Object.values(drafts)){
          const label=text('label','','assign-outfit-row'),check=document.createElement('input');check.type='checkbox';check.value=d.id;check.checked=!!chosen.get(d.id);check.disabled=!compatible(d,item)||applying;
          check.addEventListener('change',()=>chosen.set(d.id,check.checked));
          const details=text('span','','assign-outfit-description');details.append(text('strong',d.name||'New outfit'));
          const old=resolve(d.slots[s]);
          const hint=!compatible(d,item)?outfitTypes[d.outfit_type]:old&&key(old)!==key(item)?`Replaces ${old.title} in ${s}`:outfitTypes[d.outfit_type];
          details.append(text('small',hint));label.append(check,details);
          label.addEventListener('mouseenter',()=>{clearTimeout(hoverTimer);hoverTimer=setTimeout(()=>showPreview(d,label),180);});
          label.addEventListener('mouseleave',hidePreview);label.addEventListener('focusin',()=>showPreview(d,label));
          label.addEventListener('focusout',e=>{if(!label.contains(e.relatedTarget))hidePreview();});list.append(label);
        }
      }
      const create=button('+ Create new outfit',async()=>{
        const name=(await HMDialog.prompt('New outfit name:'));if(name===null||!name.trim())return;
        const previous=current;const d=newDraft({name:name.trim().slice(0,100),outfit_type:side(s,key(item))});current=previous;
        chosen.set(d.id,true);persist();renderList();draw();browse();status.textContent='New outfit selected. Click Save selections to add this item.';
      });
      const apply=button('Save selections',async()=>{
        if(applying)return;applying=true;apply.disabled=true;create.disabled=true;renderList();let saved=0,failures=[];
        const changes=Object.values(drafts).filter(d=>compatible(d,item)&&(chosen.get(d.id)?d.dirty||d.slots[s]!==key(item):d.slots[s]===key(item)));
        for(const d of changes){
          const next=clone(d);if(chosen.get(d.id))next.slots[s]=key(item);else if(next.slots[s]===key(item))delete next.slots[s];autoType(next);
          if(user){
            try{
              const payload={id:next.id,user_id:user.id,name:next.name.trim()||'New outfit',slots:scopedSlots(next),horse_instance_id:next.outfit_type==='player'?null:next.horse_instance_id,outfit_type:next.outfit_type};
              const {error}=await supabaseClient.from('hm_saved_outfits').upsert(payload,{onConflict:'id'});if(error)throw error;
              const i=rows.findIndex(r=>r.id===d.id);if(i<0)rows.unshift(payload);else rows[i]=payload;
              drafts[d.id]=clean(payload);saved++;
            }catch(e){failures.push(`${d.name}: ${e.message}`);}
          }else{next.dirty=true;drafts[d.id]=next;saved++;}
        }
        persist();draw();browse();applying=false;
        if(failures.length){status.textContent=`${saved} updated. Could not save ${failures.join('; ')}`;apply.disabled=false;create.disabled=false;renderList();}
        else{notice=user?`Updated ${saved} outfit${saved===1?'':'s'}.`:'Updated outfit drafts. Log in to save them to your account.';close();onChange();tell(notice);}
      });
      menu.append(list,create,apply,status,text('small','One item per slot in each outfit. Checking a different item replaces that slot.','assign-footnote'));
      function outside(e){if(document.querySelector('dialog[open]'))return;if(!applying&&!menu.contains(e.target)&&e.target!==anchor)close();}
      function escape(e){if(e.key==='Escape'&&!applying){e.preventDefault();close();anchor.focus();}}
      function close(){if(applying)return;hidePreview();menu.remove();anchor.setAttribute('aria-expanded','false');document.removeEventListener('pointerdown',outside,true);document.removeEventListener('keydown',escape);window.removeEventListener('resize',position);if(menuClose===close)menuClose=null;}
      function position(){hidePreview();const r=anchor.getBoundingClientRect(),width=Math.min(340,window.innerWidth-24);menu.style.width=width+'px';menu.style.left=Math.max(12,Math.min(r.right+8,window.innerWidth-width-12))+'px';menu.style.top=Math.max(12,Math.min(r.top,window.innerHeight-menu.offsetHeight-12))+'px';}
      menuClose=close;document.body.append(menu);renderList();position();menu.focus();document.addEventListener('pointerdown',outside,true);document.addEventListener('keydown',escape);window.addEventListener('resize',position);
    }
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
        const status=window.HMItemStatus?.compare(a,b)||0;if(status)return status;
        if(sort.value==='az'||sort.value==='za')return a.title.localeCompare(b.title,undefined,{numeric:true,sensitivity:'base'})*(sort.value==='za'?-1:1);
        const av=sort.value==='stats'?statValue(a):number(a[sort.value]),bv=sort.value==='stats'?statValue(b):number(b[sort.value]);
        if(av===null&&bv!==null)return 1;if(bv===null&&av!==null)return -1;
        return (av===null?0:(av-bv)*(sort.value==='stats'?-1:1))||a.title.localeCompare(b.title);
      }
      const render=()=>{
        const query=search.value.trim().toLowerCase();
        const candidates=pool.filter(i=>`${i.title} ${i.color||''} ${i.shop||''}`.toLowerCase().includes(query)&&(!shop.value||i.shop===shop.value)&&(!owned.checked||ownedIds.has(String(i.id)))).sort(compareItems);
        count.textContent=`${candidates.length} item${candidates.length===1?'':'s'} · Choose one for ${s.toLowerCase()}`;
        results.replaceChildren(...candidates.map(i=>{
          const b=button('',()=>{add(i);dialog.close();});b.className='picker-item';b.classList.toggle('is-uncertain',!!window.HMItemStatus?.isUncertain(i));b.setAttribute('aria-pressed',String(selected().slots[s]===key(i)));
          b.append(image(i),text('strong',i.title+(i.color?' — '+i.color:'')),text('span',`SC ${i.sc??'—'} · JS ${i.js??'—'}`,'picker-price'));
          if(i.shop)b.append(text('span',i.shop,'picker-shop'));
          const statText=i.category==='Pets'?'Companion':statFields.filter(([f])=>number(i[f])!==null).map(([f,label])=>`${label} ${i[f]}`).join(' · ');
          if(statText)b.append(text('span',statText,'picker-stats'));
          if(selected().slots[s]===key(i))b.append(text('span','✓ Selected','picker-badge'));
          return b;
        }));
        if(!candidates.length)results.append(text('p','No matching items. Try another search or filter.','picker-empty'));
      };
      search.addEventListener('input',render);[sort,shop,owned].forEach(el=>el.addEventListener('change',render));
      const remove=button('Remove current item',()=>{delete selected().slots[s];autoType(selected());selected().dirty=true;update();dialog.close();});remove.disabled=!selected().slots[s];
      const footer=text('div','','picker-footer');footer.append(remove,text('small','Selecting an item replaces the current item in this slot.'));
      dialog.append(head,search,toolbar,count,results,footer);
      dialog.addEventListener('close',()=>{dialog.remove();const target=[...root.querySelectorAll('.gear-slot')].find(n=>n.dataset.slot===s);target?.focus();});
      document.body.append(dialog);render();dialog.showModal();search.focus();
    }
    function statusIcon(field){
      const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('aria-hidden','true');svg.setAttribute('focusable','false');const path=document.createElementNS('http://www.w3.org/2000/svg','path');path.setAttribute('d',({owned:'M5 12l4 4L19 6',wishlist:'M12 3l2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3l-5.6 2.9 1.1-6.2L3 9.6l6.2-.9Z',favorite:'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z'})[field]);svg.append(path);return svg;
    }
    function colourOutfitItem(node,item){
      const saved=itemStates.get(String(item.id))||{},statuses=['owned','wishlist','favorite'].filter(field=>saved[field]);if(!statuses.length)return;node.classList.add('has-outfit-status');const stops=statuses.map((field,n)=>'var(--'+field+'-card) '+n*100/statuses.length+'%, var(--'+field+'-card) '+(n+1)*100/statuses.length+'%').join(', ');node.style.setProperty('--outfit-status-background','linear-gradient(120deg, '+stops+')');node.style.setProperty('--outfit-status-border','var(--'+statuses[0]+'-ink)');
    }
    function itemStatusControls(item){
      const id=String(item.id),saved=itemStates.get(id)||{},bar=text('div','','outfit-item-status');bar.setAttribute('role','group');bar.setAttribute('aria-label','Collection status for '+item.title);
      for(const [field,symbol,label]of [['owned','✓','I own this'],['wishlist','☆','Wishlist'],['favorite','♡','Favorite']]){
        if(field==='wishlist'&&saved.owned)continue;
        const control=button('',async event=>{
          event.preventDefault();event.stopPropagation();if(!user){requireAccount?.();return;}if(statusPending.has(id)||!ownedReady||field==='owned'&&saved.owned)return;
          statusPending.add(id);bar.querySelectorAll('button').forEach(b=>b.disabled=true);
          const before=itemStates.get(id)||{},next={owned:!!before.owned,wishlist:!!before.wishlist,favorite:!!before.favorite};next[field]=field==='owned'?true:!before[field];
          try{const result=itemStates.has(id)?await supabaseClient.from('user_items').update({[field]:next[field]}).eq('user_id',user.id).eq('item_id',item.id).select('item_id,owned,wishlist,favorite'):await supabaseClient.from('user_items').upsert({user_id:user.id,item_id:item.id,...next},{onConflict:'user_id,item_id'}).select('item_id,owned,wishlist,favorite');if(result.error)throw result.error;if(!result.data?.length)throw Error('Item status could not be saved.');
            const value=result.data[0];itemStates.set(id,value);if(value.owned)ownedIds.add(id);else ownedIds.delete(id);
            document.dispatchEvent(new CustomEvent('hm-outfit-item-status',{detail:{id,state:value}}));
            if(field==='owned')await window.HMAdminWardrobe?.ownedChanged(item,value.owned);if(field==='favorite')window.HMAdminWardrobe?.favoriteChanged(item,value.favorite);
            notice='Collection updated.';
          }catch(e){notice='Could not update item: '+e.message;}finally{statusPending.delete(id);draw();browse();}
        });control.append(statusIcon(field));control.className='outfit-status-symbol';control.dataset.status=field;control.setAttribute('aria-pressed',String(!!saved[field]));control.setAttribute('aria-label',label+(saved[field]?' (selected)':''));control.title=field==='owned'&&saved.owned?'Owned':(saved[field]?'Remove from ':'')+label;control.disabled=!user||!ownedReady||statusPending.has(id)||(field==='owned'&&!!saved.owned);bar.append(control);
      }return bar;
    }
    let itemPreview=null;
    function hideItemPreview(){itemPreview?.remove();itemPreview=null;}
    function showItemPreview(item,anchor){
      if(!matchMedia('(hover:hover) and (pointer:fine)').matches)return;hideItemPreview();const box=text('aside','','outfit-item-preview');itemPreview=box;box.setAttribute('role','tooltip');if(window.HMCatalog?.createCard)box.append(HMCatalog.createCard(item));else box.append(image(item),text('strong',item.title));document.body.append(box);const r=anchor.getBoundingClientRect(),width=Math.min(270,innerWidth-24);box.style.width=width+'px';box.style.left=Math.max(12,Math.min(r.right+8,innerWidth-width-12))+'px';box.style.top=Math.max(12,Math.min(r.top,innerHeight-box.offsetHeight-12))+'px';
    }
    window.addEventListener('scroll',hideItemPreview,true);window.addEventListener('resize',hideItemPreview);
    async function showWardrobeLocation(item){
      hideItemPreview();if(!user){requireAccount?.();return;}const dialog=document.createElement('dialog');dialog.className='outfit-wardrobe-location';dialog.setAttribute('aria-label','Wardrobe location for '+item.title);const body=text('div','Loading your wardrobe…');dialog.append(button('Close',()=>dialog.close()),text('h2',item.title),body);dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close();});dialog.addEventListener('close',()=>dialog.remove());document.body.append(dialog);dialog.showModal();
      const names={clothes:'Clothes',gear:'Horse gear',pets:'Pets'},eligible=['Clothes','Player Accessories','Equipment','Horse Decorations','Pets'].includes(item.category);
      if(!eligible){body.textContent='Hairstyles do not have an in-game wardrobe storage slot.';return;}
      if(!itemStates.get(String(item.id))?.owned){body.textContent='This item is not marked as owned. Mark it “I own this” to organise it in My Wardrobe.';return;}
      try{const {data,error}=await supabaseClient.from('hm_admin_wardrobe').select('layout').eq('user_id',user.id).maybeSingle();if(error)throw error;const layout=data?.layout,pos=layout?.locations?.[String(item.id)];body.replaceChildren();
        if(pos){const columns=pos.group==='pets'?8:12,title=layout.titles?.[pos.group]?.[pos.page];body.append(text('p',(names[pos.group]||pos.group)+' → Page '+pos.page+(title?' · '+title:'')),text('p','Row '+(Math.floor(pos.cell/columns)+1)+', column '+(pos.cell%columns+1)));}else body.append(text('p','This item is in Unsorted items.'));
        const link=text('a','Show in My Wardrobe','button');link.href='collection/?wardrobeItem='+encodeURIComponent(item.id)+'#wardrobe';body.append(link);
      }catch{body.textContent='Your wardrobe location could not load. Please try again.';}
    }
    function slotButton(s,outfit=selected(),interactive=true){
      const item=resolve(outfit.slots[s]);const b=interactive?button('',()=>{if(item&&isStudio)showWardrobeLocation(item);else changeSlot(s);}):text('div');b.className='gear-slot';b.dataset.slot=s;b.classList.toggle('is-filled',!!item);b.classList.toggle('is-uncertain',!!item&&!!window.HMItemStatus?.isUncertain(item));b.setAttribute('aria-label',`${s}: ${item?.title||'Empty'}${interactive?(item&&isStudio?'. View wardrobe location':'. Choose item'):''}`);
      if(item&&isStudio){colourOutfitItem(b,item);b.addEventListener('mouseenter',()=>showItemPreview(item,b));b.addEventListener('mouseleave',hideItemPreview);b.addEventListener('focus',()=>showItemPreview(item,b));b.addEventListener('blur',hideItemPreview);}
      b.append(text('span',s,'slot-label'));if(item)b.append(image(item));else b.append(text('span','+','slot-plus'));
      b.append(text('span',item ? item.title+(item.color?' — '+item.color:'') : (outfit.slots[s]?'Item unavailable':'Choose item'),'slot-title'));
      if(interactive&&outfit.slots[s]){
        const frame=text('div','','gear-slot gear-slot-removable');frame.dataset.slot=s;frame.classList.toggle('is-filled',!!item);frame.classList.toggle('is-uncertain',!!item&&!!window.HMItemStatus?.isUncertain(item));frame.tabIndex=-1;if(item&&isStudio)colourOutfitItem(frame,item);
        b.className='gear-slot-choice';b.removeAttribute('data-slot');
        const remove=button('×',event=>{event.preventDefault();event.stopPropagation();delete outfit.slots[s];autoType(outfit);outfit.dirty=true;notice=s+' removed. Click Save outfit to save this change.';update();browse();});remove.className='remove-slot-item';remove.title='Remove '+(item?(item.title+(item.color?' — '+item.color:'')):s);remove.setAttribute('aria-label','Remove '+(item?(item.title+(item.color?' — '+item.color:'')):s)+' from '+s);frame.append(b,remove);if(item&&isStudio){const change=button('Change item',event=>{event.preventDefault();event.stopPropagation();hideItemPreview();changeSlot(s);});change.className='outfit-change-item';frame.append(change,itemStatusControls(item));}return frame;
      }
      return b;
    }
    function playerFigure(){
      const wrap=text('div','','player-figure');
      // A neutral player silhouette; item thumbnails surround it.
      wrap.innerHTML='<svg viewBox="0 0 100 200" aria-hidden="true"><circle cx="50" cy="26" r="18"/><path d="M30 52 Q50 42 70 52 L85 108 L73 112 L64 80 L64 128 L70 188 L55 188 L50 140 L45 188 L30 188 L36 128 L36 80 L27 112 L15 108Z"/></svg>';
      wrap.append(text('span','Player outfit'));return wrap;
    }
    async function removeSection(kind){
      const d=selected(),label=kind==='horse'?'horse equipment (including saddle bag and pet)':'player outfit';
      if(!(await HMDialog.confirm(`Remove the ${label} section and all its selected items from “${d.name}”? The other section will be kept. Click Save outfit afterward to save this change.`)))return;
      d.slots=Object.fromEntries(Object.entries(d.slots).filter(([s,k])=>side(s,k)!==kind));
      d.outfit_type=kind==='horse'?'player':'horse';
      if(kind==='horse')d.horse_instance_id=null;
      d.dirty=true;notice='Section removed. Click Save outfit to save this change.';update();browse();
    }
    function combineOutfits(){
      const dialog=document.createElement('dialog');dialog.className='combine-outfits-dialog';dialog.setAttribute('aria-labelledby','combine-title');
      const title=text('h2','Combine outfits');title.id='combine-title';
      const hint=text('p','Choose a saved horse outfit and player outfit. A new complete set will be created; both originals are kept.');
      const horse=document.createElement('select'),player=document.createElement('select'),name=document.createElement('input');horse.id='combine-horse';player.id='combine-player';name.id='combine-name';name.maxLength=100;name.placeholder='Name for the new set';
      horse.add(new Option('Choose horse outfit',''));player.add(new Option('Choose player outfit',''));
      const sourceRows=rows.map(clean);
      for(const d of sourceRows.sort((a,b)=>a.name.localeCompare(b.name))){if(d.outfit_type==='horse')horse.add(new Option(d.name,d.id));if(d.outfit_type==='player')player.add(new Option(d.name,d.id));}
      const status=text('p','','combine-status');status.setAttribute('role','status');
      const label=(id,value)=>{const l=text('label',value);l.htmlFor=id;return l;};
      const create=button('Create combined set',()=>{
        const h=sourceRows.find(d=>d.id===horse.value),p=sourceRows.find(d=>d.id===player.value);
        if(!h||!p){status.textContent='Choose one horse outfit and one player outfit.';return;}
        const horseSlots=Object.fromEntries(Object.entries(h.slots).filter(([s,k])=>side(s,k)==='horse'));
        const playerSlots=Object.fromEntries(Object.entries(p.slots).filter(([s,k])=>side(s,k)==='player'));
        if(!Object.keys(horseSlots).length||!Object.keys(playerSlots).length){status.textContent='Both source outfits need at least one selected item.';return;}
        const title=name.value.trim()||`${h.name} + ${p.name}`.slice(0,100);
        newDraft({name:title,outfit_type:'set',horse_instance_id:h.horse_instance_id,slots:{...horseSlots,...playerSlots}});
        notice='Combined set created. Click Save outfit to save it to your account.';update();browse();dialog.close();root.scrollIntoView?.({block:'start',behavior:'smooth'});
      });
      dialog.append(title,hint,label(horse.id,'Horse outfit'),horse,label(player.id,'Player outfit'),player,label(name.id,'New set name'),name);
      if(horse.options.length===1||player.options.length===1)dialog.append(text('p','Save at least one horse-only outfit and one player-only outfit first.','stat-note'));
      const actions=text('div','','outfit-controls');actions.append(create,button('Cancel',()=>dialog.close()));dialog.append(actions,status);
      dialog.addEventListener('close',()=>dialog.remove());document.body.append(dialog);dialog.showModal();horse.focus();
    }
    function sheet(kind,outfit=selected(),interactive=true){
      const panel=text('section','',`character-sheet ${kind}-sheet`);
      const left=kind==='horse'?['Bridle','Saddle','Blanket','Horseshoes']:['Hat','Hairstyle','Top','Gloves'];
      const right=kind==='horse'?['Mane Decoration','Tail Decoration','Leg Wraps']:['Player Accessories','Pants','Shoes'];
      const dock=kind==='horse'?['Saddle Bag','Pet']:[];
      const slots=[...left,...right,...dock];
      const head=text('div','','sheet-header');head.append(text('h2',kind==='horse'?'Horse equipment':'Player outfit'),text('span',`${slots.filter(s=>outfit.slots[s]).length} / ${slots.length} selected`,'sheet-progress'));if(interactive && isStudio && outfit.outfit_type==='set'){const remove=button(kind==='horse'?'Remove horse equipment':'Remove player outfit',()=>removeSection(kind));remove.className='remove-outfit-section';head.append(remove);}panel.append(head);
      const stage=text('div','','gear-stage');
      const centre=text('div','','sheet-centre');
      if(kind==='horse'){
        const h=horseInfo(outfit.horse_instance_id);
        centre.append(h?image(h):text('div','Choose your horse above','horse-placeholder'),text('strong',h?.title||'Your horse'));
        if(h)centre.append(text('small',h.breed));
      }else centre.append(playerFigure());
      const leftRail=text('div','','gear-rail gear-left');leftRail.append(...left.map(s=>slotButton(s,outfit,interactive)));
      const rightRail=text('div','','gear-rail gear-right');rightRail.append(...right.map(s=>slotButton(s,outfit,interactive)));
      stage.append(leftRail,centre,rightRail);panel.append(stage);
      if(dock.length){const group=text('div','','companion-dock');group.append(text('h3','Saddle bag & companion'));const pair=text('div','','companion-pair');pair.append(...dock.map(s=>slotButton(s,outfit,interactive)));group.append(pair);panel.append(group);}
      const extras=Object.keys(outfit.slots).filter(s=>!slots.includes(s)&&resolve(outfit.slots[s])&&side(s,outfit.slots[s])===kind);
      if(extras.length){const extra=text('div','','extra-slots');extra.append(...extras.map(s=>slotButton(s,outfit,interactive)));panel.append(extra);}return panel;
    }
    async function save(){
      if(busy)return;if(!user){requireAccount?.();return;}
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
      const d=drafts[id]||rows.find(r=>r.id===id);if(!(await HMDialog.confirm(`Delete “${d?.name||'this outfit'}”?`)))return;
      if(rows.some(r=>r.id===id)){
        const {error}=await supabaseClient.from('hm_saved_outfits').delete().eq('id',id).eq('user_id',user.id);
        if(error){tell('Could not delete: '+error.message);return;}
        rows=rows.filter(r=>r.id!==id);
      }
      delete drafts[id];if(!Object.keys(drafts).length)newDraft();if(!drafts[current])current=Object.keys(drafts)[0];update();browse();
    }
    function shareOutfit(d){
      if(!user){requireAccount?.();return;}
      if(!window.HMOutfitShare){notice='Sharing could not load. Please refresh.';draw();return;}
      const horse=d.outfit_type==='player'?null:horseInfo(d.horse_instance_id);
      const table=statTable(scopedSlots(d),d.outfit_type);
      const snapshot={name:d.name||'New outfit',type:d.outfit_type,horse:horse?{title:horse.title,breed:horse.breed,image:horse.image}:null,
        slots:Object.entries(scopedSlots(d)).map(([s,k])=>{const item=resolve(k);return{slot:s,side:side(s,k),title:item?(item.title+(item.color?' — '+item.color:'')):'Item unavailable',image:item?.image||''};}),
        stats:[...table.querySelectorAll('.stat-group')].map(group=>({title:group.querySelector('h3')?.textContent||'',values:[...group.querySelectorAll('dt')].map(dt=>[dt.textContent,dt.nextElementSibling?.textContent||''])}))};
      HMOutfitShare.open(snapshot);
    }
    function draw(){
      root.replaceChildren();const d=selected();
      const target=document.createElement('select');target.id='outfit-target';target.setAttribute('aria-label','Choose outfit to edit or add items to');
      for(const v of Object.values(drafts))target.add(new Option(v.name,v.id));target.value=current;
      target.addEventListener('change',()=>{current=target.value;update();});
      const controls=text('div','','outfit-controls');controls.append(target,button('+ New outfit',()=>{newDraft();update();}),button('Duplicate',()=>{newDraft({...selected(),name:selected().name+' (copy)'});update();}));if(isStudio)controls.append(button('Combine outfits',combineOutfits));root.append(controls);
      const name=document.createElement('input');name.id='outfit-name';name.maxLength=100;name.value=d.name;name.placeholder='Outfit name';
      name.addEventListener('input',()=>{d.name=name.value;d.dirty=true;persist();target.selectedOptions[0].textContent=(d.name||'New outfit');browse();});
      const horseSelect=document.createElement('select');horseSelect.id='outfit-horse';horseSelect.add(new Option('No horse selected',''));
      for(const h of horses)horseSelect.add(new Option(horseInfo(h.id).title,String(h.id)));
      if(d.horse_instance_id && !horses.some(h=>String(h.id)===d.horse_instance_id))horseSelect.add(new Option('Previously selected horse unavailable',d.horse_instance_id));
      horseSelect.value=d.horse_instance_id||'';horseSelect.addEventListener('change',()=>{d.horse_instance_id=horseSelect.value||null;d.dirty=true;update();});
      const nl=text('label','Outfit name');nl.htmlFor=name.id;const hl=text('label','Horse from My Stable');hl.htmlFor=horseSelect.id;
      const typeSelect=document.createElement('select');typeSelect.id='outfit-type';
      for(const [value,label] of Object.entries(outfitTypes))typeSelect.add(new Option(label,value));typeSelect.value=d.outfit_type;
      typeSelect.addEventListener('change',()=>{
        const type=typeSelect.value;if(type===d.outfit_type)return;
        if(type==='set'){d.outfit_type='set';d.dirty=true;update();browse();return;}
        const removed=type==='horse'?'player':'horse';
        if(d.outfit_type==='set'||Object.entries(d.slots).some(([s,k])=>side(s,k)===removed)){removeSection(removed);typeSelect.value=selected().outfit_type;}
        else{d.outfit_type=type;if(type==='player')d.horse_instance_id=null;d.dirty=true;update();browse();}
      });
      const typeLabel=text('label','Outfit type');typeLabel.htmlFor=typeSelect.id;
      const form=text('div','','outfit-settings');const nameField=text('div','','setting-field');nameField.append(nl,name);const typeField=text('div','','setting-field');typeField.append(typeLabel,typeSelect);form.append(nameField,typeField);
      if(d.outfit_type!=='player'){const horseField=text('div','','setting-field');horseField.append(hl,horseSelect);form.append(horseField);}root.append(form);
      if(d.outfit_type!=='set'){const expand=button(d.outfit_type==='player'?'+ Add horse equipment':'+ Add player outfit',()=>{d.outfit_type='set';d.dirty=true;update();browse();});expand.className='expand-outfit-button';root.append(expand);}
      if(Object.keys(scopedSlots(d)).length<Object.keys(d.slots).length)root.append(text('p','Only the selected side will be saved. Duplicate this outfit first if you also want to keep the full set.','stat-note'));

      if(!horses.length && d.outfit_type!=='player')root.append(text('p',user?'Add a horse in My Stable to select it here.':'Log in to choose a horse from My Stable.','stat-note'));
      function outfitActions(top=false){
        const actions=text('div','','outfit-controls');
        const saveButton=button(busy?'Saving…':'Save outfit',save);saveButton.disabled=busy;
        if(!top)saveButton.id='save-outfit';
        actions.setAttribute('role','group');actions.setAttribute('aria-label','Outfit actions');
        actions.append(saveButton,button('Share outfit',()=>shareOutfit(d)),button('Delete outfit',()=>remove(d.id)));
        return actions;
      }
      if(isStudio)root.append(outfitActions(true));
      if(isStudio){const layout=text('div','','character-sheets');if(d.outfit_type!=='player')layout.append(sheet('horse'));if(d.outfit_type!=='horse')layout.append(sheet('player'));layout.classList.toggle('single-sheet',d.outfit_type!=='set');root.append(layout);}
      else {
        root.append(text('p',`Items you pick are added to “${d.name||'New outfit'}”.`));
        const tray=text('div','','compact-tray');
        for(const [s,k] of Object.entries(scopedSlots(d))){const item=resolve(k);const row=text('div','','tray-row');if(item)row.append(image(item));row.append(text('span',`${s}: ${item?(item.title+(item.color?' — '+item.color:'')):'Item unavailable'}`),button('Remove',()=>{delete d.slots[s];autoType(d);d.dirty=true;update();}));tray.append(row);}root.append(tray);
      }
      root.append(statTable(scopedSlots(d),d.outfit_type));
      root.append(outfitActions());
      const status=text('p',notice);status.dataset.notice='';status.id='outfit-message';status.setAttribute('role','status');root.append(status);
      if(!isStudio){const a=text('a','','outfit-studio-link');a.href='outfits/';
        const icon=text('span','✦','studio-link-icon');icon.setAttribute('aria-hidden','true');const copy=text('span','','studio-link-copy');copy.append(text('strong','Open outfit studio'),text('small','Create, style & save your looks'));const arrow=text('span','↗','studio-link-arrow');arrow.setAttribute('aria-hidden','true');a.append(icon,copy,arrow);root.append(a);}
    }
    let browsePreview=null;
    function hideBrowsePreview(){browsePreview?.remove();browsePreview=null;}
    function previewOutfit(d,anchor){
      hideBrowsePreview();const preview=text('aside','','outfit-hover-preview browse-outfit-preview');browsePreview=preview;preview.setAttribute('role','tooltip');preview.append(text('h3',d.name||'New outfit'),text('p',outfitTypes[d.outfit_type]));
      const layout=text('div','','character-sheets');if(d.outfit_type!=='player')layout.append(sheet('horse',d,false));if(d.outfit_type!=='horse')layout.append(sheet('player',d,false));layout.classList.toggle('single-sheet',d.outfit_type!=='set');const body=text('div','','hover-preview-body');body.append(layout);preview.append(body,statTable(scopedSlots(d),d.outfit_type));document.body.append(preview);
      const width=Math.min(460,innerWidth-24),r=anchor.getBoundingClientRect();preview.style.width=width+'px';layout.style.zoom=String(Math.min(.65,(width-28)/(d.outfit_type==='set'?700:440)));preview.style.left=Math.max(12,Math.min(r.right+10,innerWidth-width-12))+'px';preview.style.top=Math.max(12,Math.min(r.top,innerHeight-preview.offsetHeight-12))+'px';
    }
    window.addEventListener('scroll',hideBrowsePreview,true);window.addEventListener('resize',hideBrowsePreview);
    let browseSort='name',browseDirection='asc';
    const sortKey=storeKey+':browse-sort';try{const saved=JSON.parse(localStorage.getItem(sortKey)||'null');if(saved?.field)browseSort=saved.field;if(['asc','desc'].includes(saved?.direction))browseDirection=saved.direction;}catch{}
    function outfitMetric(d,field){
      if(field==='items')return {value:Object.keys(scopedSlots(d)).length,incomplete:false};
      const result=stats(scopedSlots(d)),groups=field==='player'?['player']:field==='horse'?['horse']:['player','horse'];let value=0,incomplete=result.unresolved>0;
      for(const group of groups){const spec=group==='player'?statFields.slice(0,4):statFields.slice(4);for(const item of result.groups[group])for(const [key]of spec){if(!['combined','player','horse'].includes(field)&&key!==field)continue;const n=number(item[key]);if(n===null)incomplete=true;else value+=n;}}
      return {value,incomplete};
    }
    function compareOutfits(a,b){const sign=browseDirection==='desc'?-1:1;const names=(a.name||'').localeCompare(b.name||'',undefined,{numeric:true,sensitivity:'base'});if(browseSort==='name')return sign*names;if(browseSort==='type')return sign*outfitTypes[a.outfit_type].localeCompare(outfitTypes[b.outfit_type])||names;const x=outfitMetric(a,browseSort),y=outfitMetric(b,browseSort);return Number(x.incomplete)-Number(y.incomplete)||sign*(x.value-y.value)||names;}
    function mountBrowseSort(){const host=document.getElementById('saved-outfits');if(!host)return;const controls=text('div','','outfit-browse-sorting'),field=document.createElement('select'),direction=document.createElement('select');field.setAttribute('aria-label','Sort outfits by');direction.setAttribute('aria-label','Outfit sort direction');const choices=[['name','Name'],['combined','Combined stats'],['player','Player outfit stats'],['horse','Horse equipment stats'],['type','Outfit type'],['items','Number of items'],...statFields];
      for(const [value,label]of choices)field.add(new Option(label,value));if(!choices.some(([value])=>value===browseSort))browseSort='name';field.value=browseSort;direction.add(new Option('Ascending / A–Z','asc'));direction.add(new Option('Descending / Z–A','desc'));direction.value=browseDirection;
      const fieldLabel=text('label','Sort outfits '),directionLabel=text('label','Order ');fieldLabel.append(field);directionLabel.append(direction);controls.append(fieldLabel,directionLabel);host.before(controls);
      function save(){try{localStorage.setItem(sortKey,JSON.stringify({field:browseSort,direction:browseDirection}));}catch{}browse();}
      field.addEventListener('change',()=>{browseSort=field.value;browseDirection=['name','type'].includes(browseSort)?'asc':'desc';direction.value=browseDirection;save();});direction.addEventListener('change',()=>{browseDirection=direction.value;save();});
    }
    function browse(){
      const host=document.getElementById('saved-outfits');if(!host)return;
      hideBrowsePreview();const q=(document.getElementById('outfit-search')?.value||'').toLowerCase();host.replaceChildren();
      const all=Object.values(drafts).filter(d=>d.name.toLowerCase().includes(q)).sort(compareOutfits);
      for(const d of all){
        const card=text('article','','outfit-overview');const title=text('h3',d.name);title.tabIndex=0;title.addEventListener('mouseenter',()=>previewOutfit(d,title));title.addEventListener('mouseleave',hideBrowsePreview);title.addEventListener('focus',()=>previewOutfit(d,title));title.addEventListener('blur',hideBrowsePreview);card.append(title,text('p',d.dirty?'Unsaved changes':'Saved to your account'));
        card.append(text('p',outfitTypes[d.outfit_type]));const h=d.outfit_type==='player'?null:horseInfo(d.horse_instance_id);if(h)card.append(image(h),text('p',h.title));
        const thumbs=text('div','','outfit-thumbnails');for(const k of Object.values(scopedSlots(d))){const i=resolve(k);if(i)thumbs.append(image(i));}card.append(thumbs,statTable(scopedSlots(d),'set'));
        card.append(button('Share outfit',()=>shareOutfit(d)),button('Open outfit',()=>{current=d.id;update();root.scrollIntoView?.({behavior:'smooth',block:'start'});}),button('Delete',()=>remove(d.id)));host.append(card);
      }
      if(!all.length)host.append(text('p','No outfits match your search.'));
    }
    // Keep drafts and saved outfits visible together; each card clearly marks unsaved work.
    document.getElementById('outfit-search')?.addEventListener('input',browse);
    mountBrowseSort();persist();draw();browse();
    return {get slots(){return scopedSlots(selected());},add,count,openMenu,refreshHorses,stats:statTable};
  }
};
