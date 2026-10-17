/* Compact controls mirror the existing catalog controls, preserving one filter state. */
(() => {
  if(document.body.dataset.view!=='database')return;
  const header=document.querySelector('body>header'),panel=document.querySelector('.filter-panel'),search=document.getElementById('search');
  if(!header||!panel||!search)return;
  const bar=document.createElement('div');bar.className='database-mini-toolbar';bar.hidden=true;bar.setAttribute('role','region');bar.setAttribute('aria-label','Quick database search, filters and sorting');
  const query=document.createElement('input');query.type='search';query.placeholder='Search the database…';query.setAttribute('aria-label','Quick database search');bar.append(query);
  query.addEventListener('input',()=>{search.value=query.value;search.dispatchEvent(new Event('input',{bubbles:true}));});
  const controls=[];
  for(const [id,label]of [['category-filter','Category'],['subcategory-filter','Item type'],['breed-filter','Breed'],['generation-filter','Generation'],['area-filter','Area'],['shop-filter','Site / shop'],['.sort-field','Sort by'],['.sort-dir','Direction']]){
    const select=document.createElement('select');select.setAttribute('aria-label','Quick '+label);bar.append(select);controls.push({id,select});
    select.addEventListener('change',()=>{const source=id.startsWith('.')?document.querySelector(id):document.getElementById(id);if(source){source.value=select.value;source.dispatchEvent(new Event('change',{bubbles:true}));}});
  }
  const more=document.createElement('button');more.type='button';more.textContent='All filters & sorts';more.addEventListener('click',()=>{panel.open=true;panel.scrollIntoView({behavior:'smooth',block:'center'});});bar.append(more);header.after(bar);
  let queued=false;
  function sync(){
    queued=false;if(document.activeElement!==query)query.value=search.value;
    for(const {id,select}of controls){const source=id.startsWith('.')?document.querySelector(id):document.getElementById(id);select.hidden=!source||!!source.closest('[hidden]');if(!source)continue;const signature=source.innerHTML;if(select.innerHTML!==signature)select.innerHTML=signature;select.value=source.value;}
  }
  function schedule(){if(!queued){queued=true;requestAnimationFrame(sync);}}
  function position(){const bottom=header.getBoundingClientRect().bottom;document.documentElement.style.setProperty('--catalog-header-bottom',bottom+'px');bar.hidden=panel.getBoundingClientRect().bottom>bottom;}
  new MutationObserver(schedule).observe(panel,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden']});
  panel.addEventListener('change',schedule);search.addEventListener('input',schedule);
  window.addEventListener('scroll',position,{passive:true});window.addEventListener('resize',position);new ResizeObserver(position).observe(header);sync();position();
})();
