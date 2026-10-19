/* Compact controls mirror the existing catalog controls, preserving one filter state. */
(() => {
  const view=document.body.dataset.view,stable=view==='stable';if(!['database','collection','stable'].includes(view))return;
  const header=document.querySelector('body>header'),panel=document.querySelector(stable?'.stable-sort-controls':'.filter-panel'),search=document.getElementById(stable?'stable-search':'search');
  if(!header||!panel||!search)return;
  const bar=document.createElement('div');bar.className='database-mini-toolbar';bar.hidden=true;bar.setAttribute('role','region');bar.setAttribute('aria-label',stable?'Quick stable search and sorting':'Quick catalogue search, filters and sorting');
  const query=document.createElement('input');query.type='search';query.placeholder=stable?'Search your horses…':'Search the database…';query.setAttribute('aria-label',stable?'Quick horse search':'Quick catalogue search');bar.append(query);
  query.addEventListener('input',()=>{search.value=query.value;search.dispatchEvent(new Event('input',{bubbles:true}));});
  const controls=[];
  const controlSpecs=stable?[['stable-sort','Sort horses'],['stable-sort-direction','Order']]:[['category-filter','Category'],['subcategory-filter','Item type'],['breed-filter','Breed'],['generation-filter','Generation'],['area-filter','Area'],['shop-filter','Site / shop'],['.sort-field','Sort by'],['.sort-dir','Direction']];
  for(const [id,label]of controlSpecs){
    const select=document.createElement('select');select.setAttribute('aria-label','Quick '+label);bar.append(select);controls.push({id,select});
    select.addEventListener('change',()=>{const source=id.startsWith('.')?document.querySelector(id):document.getElementById(id);if(source){source.value=select.value;source.dispatchEvent(new Event('change',{bubbles:true}));}});
  }
  const more=document.createElement('button');more.type='button';more.textContent=stable?'All stable controls':'All filters & sorts';more.addEventListener('click',()=>{panel.open=true;panel.scrollIntoView({behavior:'smooth',block:'center'});});const actions=document.createElement('div');actions.className='database-mini-actions';
  const reset=document.createElement('button');reset.type='button';reset.textContent=stable?'Reset search & sorting':'Reset filters & sorting';reset.className='database-mini-reset';reset.addEventListener('click',()=>{if(stable){search.value='';document.getElementById('stable-sort').value='name';document.getElementById('stable-sort-direction').value='asc';search.dispatchEvent(new Event('input',{bubbles:true}));}else document.getElementById('reset-filters')?.click();schedule();});
  actions.append(more,reset);bar.append(actions);header.after(bar);
  let queued=false;
  function sync(){
    queued=false;if(document.activeElement!==query)query.value=search.value;
    for(const {id,select}of controls){const source=id.startsWith('.')?document.querySelector(id):document.getElementById(id);select.hidden=!source||!!source.closest('[hidden]');if(!source)continue;const signature=source.innerHTML;if(select.innerHTML!==signature)select.innerHTML=signature;select.value=source.value;if(id==='subcategory-filter')select.setAttribute('aria-label','Quick '+(source.getAttribute('aria-label')||'Item type'));}
  }
  function schedule(){if(!queued){queued=true;requestAnimationFrame(sync);}}
  function position(){const bottom=header.getBoundingClientRect().bottom;document.documentElement.style.setProperty('--catalog-header-bottom',bottom+'px');bar.hidden=!!panel.closest('[hidden]')||panel.getBoundingClientRect().bottom>bottom;}
  new MutationObserver(schedule).observe(panel,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden']});
  panel.addEventListener('change',schedule);panel.addEventListener('input',schedule);new MutationObserver(()=>{position();schedule();}).observe(document.getElementById('feature-content')||panel,{attributes:true,attributeFilter:['hidden']});search.addEventListener('input',schedule);
  window.addEventListener('scroll',position,{passive:true});window.addEventListener('resize',position);new ResizeObserver(position).observe(header);sync();position();
})();
