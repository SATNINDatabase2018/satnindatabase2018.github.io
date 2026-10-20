/* Administrator-only HM wardrobe. Positions are account-owned, revision-checked records. */
window.HMAdminWardrobe=(()=>{
  const groups={clothes:{label:'Clothes',pages:15,cols:12,rows:8,categories:['Clothes','Player Accessories']},gear:{label:'Horse gear',pages:15,cols:12,rows:8,categories:['Equipment','Horse Decorations']},pets:{label:'Pets',pages:7,cols:8,rows:5,categories:['Pets']}};
  const el=(tag,value='',cls)=>{const n=document.createElement(tag);n.textContent=value;if(cls)n.className=cls;return n;};
  const btn=(label,fn,cls)=>{const b=el('button',label,cls);b.type='button';b.addEventListener('click',fn);return b;};
  const groupFor=item=>Object.keys(groups).find(g=>groups[g].categories.includes(item?.category));
  const validPosition=p=>!!p&&!!groups[p.group]&&Number.isInteger(p.page)&&p.page>=1&&p.page<=groups[p.group].pages&&Number.isInteger(p.cell)&&p.cell>=0&&p.cell<groups[p.group].cols*groups[p.group].rows-1;
  let favorites=new Set(),favoriteBusy=new Set();
  let account=null,admin=false,catalog=new Map(),owned=new Set(),state={titles:{},locations:{}},revision=0,busy=false,root=null,tab=null,viewGroup='clothes',viewPage=1,selected=null,query='',limit=80,notice='',hover=null;
  const itemName=i=>(i?.title||'Unavailable item')+(i?.color?' — '+i.color:'');
  const label=(g,p)=>p+(state.titles?.[g]?.[p]?' · '+state.titles[g][p]:'');
  function available(id){return owned.has(String(id))&&groupFor(catalog.get(String(id)));}
  function clean(value){
    const next={titles:{},locations:{}};
    for(const g of Object.keys(groups)){next.titles[g]={};for(let p=1;p<=groups[g].pages;p++){const t=value?.titles?.[g]?.[p];if(typeof t==='string'&&t.trim())next.titles[g][p]=t.trim().slice(0,80);}}
    const occupied=new Set();for(const [id,pos]of Object.entries(value?.locations||{})){
      if(!available(id)||!validPosition(pos)||groupFor(catalog.get(id))!==pos.group)continue;
      const key=pos.group+':'+pos.page+':'+pos.cell;if(occupied.has(key))continue;occupied.add(key);next.locations[id]={group:pos.group,page:pos.page,cell:pos.cell};
    }return next;
  }
  async function loadOwned(){
    const ids=new Set(),stars=new Set();for(let n=0;;n+=1000){const {data,error}=await supabaseClient.from('user_items').select('item_id,favorite').eq('user_id',account.id).eq('owned',true).range(n,n+999);if(error)throw error;for(const row of data||[]){ids.add(String(row.item_id));if(row.favorite)stars.add(String(row.item_id));}if((data||[]).length<1000)break;}owned=ids;favorites=stars;
  }
  async function reload(){
    await loadOwned();const {data,error}=await supabaseClient.from('hm_admin_wardrobe').select('layout,revision').eq('user_id',account.id).maybeSingle();if(error)throw error;
    state=clean(data?.layout);revision=Number(data?.revision||0);
  }
  async function commit(change){
    if(!admin||busy)return false;const next=clean(state);change(next);const checked=clean(next);busy=true;notice='Saving wardrobe…';draw();
    try{const {data,error}=await supabaseClient.rpc('hm_save_admin_wardrobe',{p_layout:checked,p_expected_revision:revision});if(error)throw error;const row=Array.isArray(data)?data[0]:data;if(!row)throw Error('No saved wardrobe returned.');state=clean(row.layout);revision=Number(row.revision);notice='Wardrobe saved.';document.dispatchEvent(new CustomEvent('hm-wardrobe-updated'));return true;}
    catch(e){notice='Could not save: '+e.message+' Use Refresh wardrobe before trying again.';return false;}
    finally{busy=false;draw();}
  }
  let hoverTimer;
  function hideHover(){clearTimeout(hoverTimer);hover?.remove();hover=null;}
  function scheduleHide(){clearTimeout(hoverTimer);hoverTimer=setTimeout(hideHover,220);}
  function preview(item,anchor){
    hideHover();if(!item)return;hover=el('div','','wardrobe-hover-card');
    if(window.HMCatalog?.createCard)hover.append(HMCatalog.createCard(item));else hover.append(el('strong',itemName(item)));
    hover.querySelectorAll('.saved-status-owned,.saved-status-favorite').forEach(n=>n.remove());if(favorites.has(String(item.id))){const star=el('span','★','wardrobe-favorite-indicator');star.setAttribute('role','img');star.setAttribute('aria-label','Favorite');hover.append(star);}hover.setAttribute('role','tooltip');hover.setAttribute('aria-label','Item preview');hover.addEventListener('mouseenter',()=>clearTimeout(hoverTimer));hover.addEventListener('mouseleave',scheduleHide);hover.addEventListener('focusin',()=>clearTimeout(hoverTimer));hover.addEventListener('focusout',scheduleHide);document.body.append(hover);const r=anchor.getBoundingClientRect(),width=Math.min(230,innerWidth-24);hover.style.width=width+'px';hover.style.left=Math.max(12,Math.min(r.right+10,innerWidth-width-12))+'px';hover.style.top=Math.max(12,Math.min(r.top,innerHeight-hover.offsetHeight-12))+'px';
  }
  function pagePreview(group,page,anchor){
    hideHover();const spec=groups[group],entries=Object.entries(state.locations).filter(([id,p])=>p.group===group&&p.page===page&&available(id));
    hover=el('div','','wardrobe-hover-card wardrobe-page-preview');hover.setAttribute('role','tooltip');hover.append(el('strong',spec.label+' · '+label(group,page)),el('p',entries.length+' item'+(entries.length===1?'':'s')));
    if(entries.length){const grid=el('div','','wardrobe-preview-grid');grid.style.setProperty('--preview-columns',spec.cols);const cells=new Map(entries.map(([id,p])=>[p.cell,catalog.get(id)]));for(let cell=0;cell<spec.cols*spec.rows;cell++){const tile=el('span','','wardrobe-preview-cell'),item=cells.get(cell);if(item){tile.append(picture(item));tile.title=itemName(item);}grid.append(tile);}hover.append(grid);}else hover.append(el('p','This page is empty.'));
    hover.addEventListener('mouseenter',()=>clearTimeout(hoverTimer));hover.addEventListener('mouseleave',scheduleHide);(anchor.closest?.('dialog')||document.body).append(hover);const r=anchor.getBoundingClientRect(),width=Math.min(420,innerWidth-24);hover.style.width=width+'px';hover.style.left=Math.max(12,Math.min(r.left??r.right,innerWidth-width-12))+'px';hover.style.top=Math.max(12,Math.min(r.bottom??r.top,innerHeight-hover.offsetHeight-12))+'px';
  }
  function pageHover(node,group,page){node.addEventListener('mouseenter',()=>pagePreview(group,page,node));node.addEventListener('mouseleave',scheduleHide);node.addEventListener('focus',()=>pagePreview(group,page,node));node.addEventListener('blur',scheduleHide);}
  function picture(item){const wrap=el('span','','wardrobe-picture');if(/^https:\/\//i.test(item?.image||'')){const image=document.createElement('img');image.src=item.image;image.alt=itemName(item);image.loading='lazy';image.draggable=false;image.addEventListener('error',()=>wrap.replaceChildren(el('span',itemName(item))),{once:true});wrap.append(image);}else wrap.append(el('span',itemName(item)));return wrap;}
  function startDrag(event,id){
    if(busy||!available(id)){event.preventDefault();return;}
    selected=id;event.dataTransfer.effectAllowed='move';event.dataTransfer.setData('text/plain',id);root?.classList.add('is-dragging');hideHover();
  }
  function endDrag(){root?.classList.toggle('is-dragging',false);root?.querySelectorAll('.is-drop-target').forEach(n=>n.classList.toggle('is-drop-target',false));}
  function favoriteChanged(item,value){const id=String(item.id);if(value)favorites.add(id);else favorites.delete(id);draw();}
  function favoriteControl(item){
    const id=String(item.id);
    const star=btn('★',async event=>{
      event.preventDefault();event.stopPropagation();hideHover();if(favoriteBusy.has(id))return;favoriteBusy.add(id);star.disabled=true;const next=!favorites.has(id);
      try{const {data,error}=await supabaseClient.from('user_items').update({favorite:next}).eq('user_id',account.id).eq('item_id',item.id).eq('owned',true).select('item_id,favorite');if(error)throw error;if(!data?.length)throw Error('Item is no longer owned. Refresh wardrobe.');
        if(next)favorites.add(id);else favorites.delete(id);document.dispatchEvent(new CustomEvent('hm-wardrobe-favorite',{detail:{id,favorite:next}}));notice=next?'Item favorited.':'Item unfavorited.';
      }catch(e){notice='Could not update favorite: '+e.message;}finally{favoriteBusy.delete(id);draw();}
    },'wardrobe-favorite-star');
    star.classList.toggle('is-favorite',favorites.has(id));star.setAttribute('aria-pressed',String(favorites.has(id)));star.setAttribute('aria-label',(favorites.has(id)?'Unfavorite ':'Favorite ')+itemName(item));star.title=favorites.has(id)?'Remove favorite':'Favorite item';star.disabled=busy||favoriteBusy.has(id);star.draggable=false;
    return star;
  }
  function withFavorite(tile,item,unsorted=false){if(!item)return tile;const frame=el('div','',unsorted?'wardrobe-unsorted-cell':'wardrobe-cell');frame.append(tile,favoriteControl(item));return frame;}
  function hoverable(node,item){node.addEventListener('mouseenter',()=>preview(item,node));node.addEventListener('mouseleave',scheduleHide);node.addEventListener('focus',()=>preview(item,node));node.addEventListener('blur',scheduleHide);}
  function match(item){return !query||[item.title,item.color,item.category,item.section,item.shop].filter(Boolean).join(' ').toLowerCase().includes(query.toLowerCase());}
  async function place(id,group,page,cell){
    if(!available(id)||groupFor(catalog.get(id))!==group||!validPosition({group,page,cell}))return false;
    const occupied=Object.entries(state.locations).find(([other,p])=>other!==id&&p.group===group&&p.page===page&&p.cell===cell);
    if(occupied){notice='That square is occupied. Choose an empty square, or move its item to unsorted first.';draw();return false;}
    const ok=await commit(next=>{next.locations[id]={group,page,cell};});if(ok){selected=null;draw();}return ok;
  }
  function draw(){
    hideHover();if(!root)return;root.replaceChildren();
    const heading=el('h2','Wardrobe (My Storage)'),hint=el('p','Choose an owned item, then an empty square to place it. Click a placed item to move it. Dragging also works. The last square stays blank.','stat-note');root.append(heading,hint);
    const actions=el('div','','wardrobe-actions');const search=document.createElement('input');search.type='search';search.placeholder='Search owned wardrobe items…';search.setAttribute('aria-label','Search wardrobe');search.value=query;
    // Keep focus and cursor when updating search results.
    search.addEventListener('input',()=>{query=search.value;limit=80;const position=search.selectionStart;draw();const replacement=root.querySelector('input[type="search"]');replacement.focus();try{replacement.setSelectionRange(position,position);}catch{}});
    const refresh=btn('Refresh wardrobe',async()=>{if(busy)return;busy=true;try{await reload();selected=null;notice='Wardrobe refreshed.';}catch(e){notice=e.message;}finally{busy=false;draw();}});refresh.disabled=busy;actions.append(search,refresh);root.append(actions);
    const categories=el('div','','wardrobe-group-tabs');categories.setAttribute('role','group');categories.setAttribute('aria-label','Wardrobe category');
    for(const [g,spec]of Object.entries(groups)){const b=btn(spec.label,()=>{viewGroup=g;viewPage=1;selected=null;limit=80;draw();});b.setAttribute('aria-pressed',String(g===viewGroup));categories.append(b);}root.append(categories);
    const pageTabs=el('div','','wardrobe-page-tabs');pageTabs.setAttribute('role','group');pageTabs.setAttribute('aria-label','Wardrobe numbered pages');
    for(let p=1;p<=groups[viewGroup].pages;p++){const b=btn(label(viewGroup,p),()=>{viewPage=p;draw();});b.setAttribute('aria-pressed',String(p===viewPage));pageHover(b,viewGroup,p);pageTabs.append(b);}root.append(pageTabs);
    const pageActions=el('div','','wardrobe-actions');pageActions.append(el('h3',groups[viewGroup].label+' · '+label(viewGroup,viewPage)));
    const rename=btn('Name this page',async()=>{const g=viewGroup,p=viewPage;const value=await HMDialog.prompt('Title for '+groups[g].label+' page '+p+' (the number always stays in front):',state.titles[g]?.[p]||'');if(value===null)return;await commit(next=>{next.titles[g]??={};next.titles[g][p]=value.trim().slice(0,80);});});rename.disabled=busy;pageActions.append(rename);
    if(selected){pageActions.append(el('span','Selected: '+itemName(catalog.get(selected))));const remove=btn('Move to unsorted',async()=>{const id=selected;const ok=await commit(next=>delete next.locations[id]);if(ok){selected=null;draw();}});remove.disabled=busy||!state.locations[selected];pageActions.append(remove,btn('Cancel selection',()=>{selected=null;draw();}));}root.append(pageActions);
    const layout=el('div','','wardrobe-layout'),scroll=el('div','','wardrobe-grid-scroll'),grid=el('div','','wardrobe-grid');const spec=groups[viewGroup];grid.style.setProperty('--wardrobe-columns',spec.cols);grid.dataset.group=viewGroup;grid.setAttribute('aria-label',groups[viewGroup].label+' storage grid');
    for(let cell=0;cell<spec.cols*spec.rows;cell++){
      const reserved=cell===spec.cols*spec.rows-1,id=Object.keys(state.locations).find(id=>{const p=state.locations[id];return p.group===viewGroup&&p.page===viewPage&&p.cell===cell;}),item=catalog.get(id);
      const square=btn('',()=>{if(busy)return;if(id){selected=selected===id?null:id;draw();}else if(selected)place(selected,viewGroup,viewPage,cell);},'wardrobe-square');square.dataset.cell=cell;square.disabled=reserved||busy;square.classList.toggle('is-reserved',reserved);square.classList.toggle('is-selected',!!id&&id===selected);square.setAttribute('aria-label',reserved?'Reserved blank square':`Row ${Math.floor(cell/spec.cols)+1}, column ${cell%spec.cols+1}: ${item?itemName(item):'Empty'}`);
      if(item&&!reserved){square.append(picture(item));square.classList.toggle('is-dimmed',!match(item));hoverable(square,item);square.draggable=true;square.addEventListener('dragstart',e=>startDrag(e,id));square.addEventListener('dragend',endDrag);}
      if(!reserved){square.addEventListener('dragover',e=>{if(!busy&&selected&&available(selected)&&groupFor(catalog.get(selected))===viewGroup&&(!id||id===selected)){e.preventDefault();e.dataTransfer.dropEffect='move';square.classList.add('is-drop-target');}});square.addEventListener('dragleave',()=>square.classList.toggle('is-drop-target',false));square.addEventListener('drop',e=>{e.preventDefault();endDrag();if(!busy)place(e.dataTransfer.getData('text/plain'),viewGroup,viewPage,cell);});}grid.append(withFavorite(square,item));
    }scroll.append(grid);layout.append(scroll);
    const unsorted=el('aside','','wardrobe-unsorted'),items=[...catalog.values()].filter(i=>owned.has(String(i.id))&&groupFor(i)===viewGroup&&!state.locations[String(i.id)]&&match(i)).sort((a,b)=>itemName(a).localeCompare(itemName(b),undefined,{numeric:true,sensitivity:'base'}));unsorted.addEventListener('dragover',e=>{if(!busy&&selected&&state.locations[selected]){e.preventDefault();e.dataTransfer.dropEffect='move';unsorted.classList.add('is-drop-target');}});unsorted.addEventListener('dragleave',()=>unsorted.classList.toggle('is-drop-target',false));unsorted.addEventListener('drop',async e=>{e.preventDefault();e.stopPropagation();endDrag();const id=e.dataTransfer.getData('text/plain');if(!busy&&available(id)&&state.locations[id]){if(await commit(next=>delete next.locations[id])){selected=null;draw();}}});unsorted.append(el('h3','Unsorted items ('+items.length+')'),el('p','Owned '+spec.label.toLowerCase()+' not placed on any page.','stat-note'));
    const tray=el('div','','wardrobe-unsorted-grid');for(const item of items.slice(0,limit)){const id=String(item.id),b=btn('',()=>{selected=selected===id?null:id;draw();},'wardrobe-unsorted-item');b.disabled=busy;b.setAttribute('aria-label','Select '+itemName(item));b.classList.toggle('is-selected',id===selected);b.append(picture(item),el('small',itemName(item)));b.draggable=true;b.addEventListener('dragstart',e=>startDrag(e,id));b.addEventListener('dragend',endDrag);hoverable(b,item);tray.append(withFavorite(b,item,true));}unsorted.append(tray);if(items.length>limit)unsorted.append(btn('Load more unsorted items',()=>{limit+=80;draw();}));if(!items.length)unsorted.append(el('p','No unsorted items match this category and search.'));layout.append(unsorted);root.append(layout);
    const status=el('p',notice,'wardrobe-status');status.setAttribute('role','status');root.append(status);
  }
  function mount(){
    if(document.body.dataset.view!=='collection'||root)return;const tabs=document.getElementById('catalog-tabs'),panel=document.getElementById('catalog-panel');if(!tabs||!panel)return;
    root=el('section','','admin-wardrobe');root.id='admin-wardrobe';root.hidden=true;root.setAttribute('role','tabpanel');root.setAttribute('aria-labelledby','wardrobe-tab');panel.after(root);
    tab=btn('Wardrobe (My Storage)',()=>{panel.hidden=true;root.hidden=false;for(const b of tabs.querySelectorAll('[role="tab"]')){b.setAttribute('aria-selected',String(b===tab));b.tabIndex=b===tab?0:-1;}const builder=document.getElementById('outfit-builder');if(builder)builder.hidden=true;draw();});tab.id='wardrobe-tab';tab.dataset.value='wardrobe';tab.setAttribute('role','tab');tab.setAttribute('aria-controls',root.id);tab.setAttribute('aria-selected','false');tab.tabIndex=-1;tabs.append(tab);
    tabs.addEventListener('click',e=>{if(e.target.closest('[role="tab"]')!==tab&&e.target.closest('[role="tab"]')){root.hidden=true;panel.hidden=false;hideHover();const builder=document.getElementById('outfit-builder');if(builder)builder.hidden=false;}},true);
  }
  async function init({items,user}){
    account=user;if(!user)return;try{const {data,error}=await supabaseClient.rpc('hm_is_admin');if(error||data!==true)return;admin=true;catalog=new Map(items.filter(i=>i.kind!=='horse'&&groupFor(i)).map(i=>[String(i.id),i]));mount();await reload();notice='';draw();}catch(e){notice='Wardrobe could not load: '+e.message+'. Apply the wardrobe SQL setup, then refresh.';if(admin){mount();draw();}}
  }
  async function chooseLocation(item){
    if(!admin||!owned.has(String(item.id))||!groupFor(item))return;const g=groupFor(item),id=String(item.id);const dialog=el('dialog','','wardrobe-location-dialog');dialog.setAttribute('aria-label','Choose HM Wardrobe location');dialog.append(el('h2','HM Wardrobe · '+itemName(item)),el('p','Choose a numbered page and an empty square, or keep this item unsorted.'));
    let page=state.locations[id]?.page||1;
    const pageButtons=el('div','','wardrobe-page-tabs');pageButtons.setAttribute('role','group');pageButtons.setAttribute('aria-label','Wardrobe numbered pages');dialog.append(pageButtons);
    const scroller=el('div','','wardrobe-grid-scroll'),grid=el('div','','wardrobe-grid');grid.style.setProperty('--wardrobe-columns',groups[g].cols);scroller.append(grid);dialog.append(scroller);const feedback=el('p','');feedback.setAttribute('role','status');
    function render(){
      pageButtons.replaceChildren();for(let p=1;p<=groups[g].pages;p++){const b=btn(label(g,p),()=>{page=p;hideHover();render();});b.setAttribute('aria-pressed',String(p===page));pageHover(b,g,p);pageButtons.append(b);}
      grid.replaceChildren();const spec=groups[g];for(let cell=0;cell<spec.cols*spec.rows;cell++){const reserved=cell===spec.cols*spec.rows-1,other=Object.keys(state.locations).find(k=>{const p=state.locations[k];return p.group===g&&p.page===page&&p.cell===cell;});const b=btn('',async()=>{if(await place(id,g,page,cell))dialog.close();else feedback.textContent=notice;},'wardrobe-square');b.disabled=reserved||busy||!!other&&other!==id;b.classList.toggle('is-reserved',reserved);b.setAttribute('aria-label',reserved?'Reserved blank square':`Row ${Math.floor(cell/spec.cols)+1}, column ${cell%spec.cols+1}${other?': occupied':': empty'}`);if(other&&!reserved)b.append(picture(catalog.get(other)));grid.append(b);}
    }
    dialog.append(feedback,btn('Keep unsorted',async()=>{if(!state.locations[id]||await commit(next=>delete next.locations[id]))dialog.close();}),btn('Close',()=>dialog.close()));dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close();});dialog.addEventListener('close',()=>{hideHover();dialog.remove();});document.body.append(dialog);render();dialog.showModal();
  }
  async function ownedChanged(item,isOwned){
    if(!admin||!groupFor(item))return;const id=String(item.id);if(isOwned)owned.add(id);else owned.delete(id);
    if(!isOwned&&state.locations[id])await commit(next=>delete next.locations[id]);draw();
  }
  function locationButton(item){if(!admin||!available(item.id))return null;const pos=state.locations[String(item.id)],b=btn(pos?'HM Wardrobe · '+groups[pos.group].label+' '+label(pos.group,pos.page):'Choose HM Wardrobe location',()=>chooseLocation(item),'wardrobe-item-location');return b;}
  return {init,ownedChanged,locationButton,favoriteChanged,groupFor,validPosition};
})();
