/* Checkbox dropdowns reuse the catalogue's native select state. */
window.HMMultiFilters=(()=>{
 const mounted=new WeakMap();
 function attach(source,parent=source?.parentElement,label='Filter'){
  if(!source||!parent)return null;
  const details=document.createElement('details');details.className='multi-filter-picker';const summary=document.createElement('summary');summary.setAttribute('aria-label',label);const box=document.createElement('div');box.className='multi-filter-options';box.setAttribute('role','group');box.setAttribute('aria-label',label);details.append(summary,box);parent.append(details);
  let signature='',checks=[];
  function sync(){
   const options=[...source.options].filter(o=>o.value),next=options.map(o=>o.value+'|'+o.textContent+'|'+(o.dataset.image||'')).join('\n'),chosen=options.filter(o=>o.selected);
   summary.textContent=chosen.length?chosen.length===1?chosen[0].textContent:`${chosen.length} selected`:(source.options[0]?.textContent||'All');summary.title=chosen.map(o=>o.textContent).join(', ');
   if(next!==signature){signature=next;box.replaceChildren();checks=[];const clear=document.createElement('button');clear.type='button';clear.textContent='Clear selection';clear.addEventListener('click',()=>{for(const o of source.options)o.selected=false;source.dispatchEvent(new Event('change',{bubbles:true}));sync();});box.append(clear);
    for(const option of options){const wrapper=document.createElement('label'),check=document.createElement('input'),text=document.createElement('span');check.type='checkbox';check.value=option.value;text.textContent=option.textContent;check.addEventListener('change',()=>{for(const o of source.options){if(!o.value)o.selected=false;else if(o.value===check.value)o.selected=check.checked;}source.dispatchEvent(new Event('change',{bubbles:true}));sync();});wrapper.append(check);if(option.dataset.image){const img=document.createElement('img');img.src=option.dataset.image;img.alt='';img.className='multi-filter-thumbnail';wrapper.append(img);}wrapper.append(text);box.append(wrapper);checks.push(check);}
   }
   for(const c of checks)c.checked=[...source.selectedOptions].some(o=>o.value===c.value);
  }
  source.addEventListener('change',sync);new MutationObserver(sync).observe(source,{childList:true,subtree:true,attributes:true,attributeFilter:['selected']});details.addEventListener('toggle',()=>{if(details.open)sync();});details.addEventListener('keydown',e=>{if(e.key==='Escape'){details.open=false;summary.focus();}});document.addEventListener('pointerdown',e=>{if(!details.contains(e.target))details.open=false;});sync();return details;
 }
 function mount(){if(document.body.dataset.view!=='database')return;for(const [id,label]of [['category-filter','Categories'],['subcategory-filter','Item types'],['area-filter','Areas'],['shop-filter','Sites / shops']]){const source=document.getElementById(id);if(!source||mounted.has(source))continue;source.multiple=true;source.classList.add('multi-filter-source');source.setAttribute('aria-label',label);
    if(source.parentElement.tagName==='LABEL'){const old=source.parentElement,field=document.createElement('div');for(const attr of old.attributes)field.setAttribute(attr.name,attr.value);field.classList.add('multi-filter-field');while(old.firstChild)field.append(old.firstChild);old.replaceWith(field);}
    mounted.set(source,attach(source,source.parentElement,label));}}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
 return{attach};
})();
