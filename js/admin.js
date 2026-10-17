(() => {
  const $=id=>document.getElementById(id),text=(tag,value,cls)=>{const n=document.createElement(tag);n.textContent=value;if(cls)n.className=cls;return n;};
  const fields=[['title','Title'],['category','Category'],['section','Item type'],['breed','Horse breed'],['coat','Coat'],['generation','Generation'],['speciality','Speciality'],['description','Description'],['image','Picture URL (HTTPS)'],['shop','Site / shop'],['level','Level / requirement'],['sc','SC'],['js','JS'],['ride','Riding'],['jump','Jumping'],['command','Command'],['care','Care'],['speed','Speed'],['strength','Strength'],['agility','Agility'],['discipline','Discipline'],['endurance','Endurance'],['availability','Availability / status'],['price_note','Price note'],['is_companion','Runs beside you (pets)']];
  let kind='item',records=[],current=null,dirty=false,busy=false,limit=60;
  const message=value=>{$('admin-message').textContent=value;};
  const name=row=>row.title||[row.breed,row.coat].filter(Boolean).join(' ')||'Untitled';
  function allowDiscard(){return !dirty||confirm('Discard your unsaved changes?');}
  function configure(){
    const horse=kind==='horse';
    for(const [key] of fields){const wrapper=$('edit-'+key).parentElement;wrapper.hidden=key==='is_companion'?(horse||$('edit-category').value!=='Pets'):horse?['category','section','ride','jump','command','care'].includes(key):['breed','coat','generation','speciality'].includes(key);}
    $('edit-title').required=!horse;$('edit-breed').required=horse;$('edit-section').required=!horse;
  }
  function open(row=null){
    if(busy||!allowDiscard())return;
    current=row?structuredClone(row):null;dirty=false;configure();
    for(const [key]of fields)$('edit-'+key).value=row?.[key]??(key==='category'?'Clothes':key==='is_companion'?'false':'');
    $('admin-editor-title').textContent=row?'Edit '+name(row):'Add '+(kind==='horse'?'horse':'item');
    $('admin-entry-id').textContent=row?'Record ID: '+row.id:'A new ID will be assigned when you save.';
    $('admin-remove').hidden=!row||!!row._deleted;$('admin-save').textContent=row?row._deleted?'Restore and save':'Save changes':'Add to database';
    $('admin-form').hidden=false;configure();updateTypes();
  }
  function updateTypes(){
    const values=new Set(records.filter(r=>r.category===$('edit-category').value).map(r=>r.section).filter(Boolean));
    $('admin-item-types').replaceChildren(...[...values].sort().map(value=>{const n=document.createElement('option');n.value=value;return n;}));
  }
  function renderList(){
    const q=$('admin-search').value.trim().toLowerCase(),removed=$('admin-show-removed').checked;
    const filtered=records.filter(r=>(removed||!r._deleted)&&`${name(r)} ${r.id} ${r.section||''} ${r.shop||r.location||''}`.toLowerCase().includes(q)).sort((a,b)=>name(a).localeCompare(name(b),undefined,{numeric:true}));
    const list=$('admin-results');list.replaceChildren();
    for(const row of filtered.slice(0,limit)){
      const b=document.createElement('button');b.type='button';b.className='admin-entry';b.disabled=busy;
      b.append(text('strong',name(row)),text('small',`${row._deleted?'Removed · ':''}#${row.id} · ${kind==='horse'?row.breed:row.section} · ${row.shop||row.location||'No shop listed'}`));
      b.addEventListener('click',()=>{open(row);$('admin-form').scrollIntoView({behavior:'smooth',block:'nearest'});});list.append(b);
    }
    if(!filtered.length)list.append(text('p','No matching records.'));
    $('admin-count').textContent=`${filtered.length} matching records${filtered.length>limit?' · Showing '+limit:''}`;
    $('admin-more').hidden=filtered.length<=limit;
  }
  function setBusy(value){busy=value;$('admin-form').querySelectorAll('input,select,textarea,button').forEach(n=>n.disabled=value);['admin-kind','admin-add','admin-export'].forEach(id=>$(id).disabled=value);renderList();}
  async function reload(){await HMCatalogData.changes(true);records=await HMCatalogData.records(kind,true);renderList();}
  function payload(){
    const row={...(current||{})};delete row._deleted;delete row._revision;
    for(const [key]of fields){const input=$('edit-'+key);if(input.parentElement.hidden)continue;const value=input.value.trim();row[key]=key==='is_companion'?value==='true':['sc','js','ride','jump','command','care','speed','strength','agility','discipline','endurance'].includes(key)&&value!==''&&Number.isFinite(Number(value))?Number(value):value;}
    if(kind==='horse'){row.location=row.shop;row.category='Horses';row.section=row.breed;}
    return row;
  }
  async function save(deleted=false){
    if(busy)return;if(!deleted&&!$('admin-form').reportValidity())return;
    if(deleted&&!confirm(`Remove “${name(current)}” from the public database? Saved collections or outfits may refer to this entry. You can restore it from “Include removed entries”.`))return;
    if(!deleted&&current?._deleted&&!confirm('Restore this entry to the public database?'))return;
    setBusy(true);message(deleted?'Removing entry…':'Saving entry…');
    try{
      const row=deleted?{...current}:payload();delete row._revision;delete row._deleted;
      const {data,error}=await supabaseClient.rpc('hm_save_catalog_entry',{p_kind:kind,p_id:current?.id??null,p_payload:row,p_deleted:deleted,p_expected_revision:current?._revision||0});
      if(error)throw error;const saved=Array.isArray(data)?data[0]:data;if(!saved)throw Error('No saved entry returned. Refresh before retrying.');
      current={...saved.payload,id:Number(saved.entry_id),_revision:Number(saved.revision),_deleted:saved.deleted};dirty=false;
      // Update locally even if a subsequent refresh fails; the server save succeeded.
      records=records.filter(r=>String(r.id)!==String(current.id));records.push(current);
      message(deleted?'Entry removed from the public database.':'Saved. Visitors will see the change when they refresh the database.');
    }catch(e){message('Could not save: '+e.message);}
    finally{setBusy(false);if(!dirty&&current)open(current);}
  }
  async function start(){
    try{
      const {data,error}=await supabaseClient.auth.getUser();if(error&&error.name!=='AuthSessionMissingError')throw error;
      if(!data?.user){$('admin-access').textContent='Please log in with your admin account to use this page.';return;}
      const result=await supabaseClient.rpc('hm_is_admin');if(result.error)throw result.error;
      if(result.data!==true){$('admin-access').textContent='This page is available to the database administrator only.';return;}
      $('admin-access').hidden=true;$('admin-workspace').hidden=false;
      for(const [key,label]of fields){
        const wrapper=text('label',label);let input;
        if(key==='is_companion'){input=document.createElement('select');input.add(new Option('No — stays in the saddle bag','false'));input.add(new Option('Yes — companion','true'));}
        else if(key==='category'){input=document.createElement('select');for(const value of ['Clothes','Player Accessories','Equipment','Horse Decorations','Pets'])input.add(new Option(value,value));}
        else if(key==='description')input=document.createElement('textarea');else{input=document.createElement('input');input.type=key==='image'?'url':'text';if(key==='image')input.pattern='https://.*';}
        input.id='edit-'+key;if(key==='section')input.setAttribute('list','admin-item-types');if(['description','image'].includes(key))wrapper.className='admin-field-wide';input.maxLength=key==='description'?10000:2000;wrapper.append(input);$('admin-fields').append(wrapper);
      }
      $('admin-form').addEventListener('input',()=>{dirty=true;});$('edit-category').addEventListener('change',()=>{configure();updateTypes();});
      $('admin-form').addEventListener('submit',e=>{e.preventDefault();save();});$('admin-remove').addEventListener('click',()=>save(true));
      $('admin-add').addEventListener('click',()=>open());$('admin-kind').addEventListener('change',async()=>{
        if(!allowDiscard()){$('admin-kind').value=kind;return;}kind=$('admin-kind').value;current=null;dirty=false;limit=60;$('admin-form').hidden=true;
        try{await reload();open();}catch(e){records=[];renderList();message(e.message);}
      });
      ['admin-search','admin-show-removed'].forEach(id=>$(id).addEventListener(id==='admin-search'?'input':'change',()=>{limit=60;renderList();}));
      $('admin-more').addEventListener('click',()=>{limit+=60;renderList();});
      $('admin-export').addEventListener('click',async()=>{try{const data=await HMCatalogData.records(kind);const blob=new Blob([JSON.stringify(data.map(({_revision,_deleted,...row})=>row),null,2)],{type:'application/json'});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=kind==='horse'?'horses.json':'database.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}catch(e){message(e.message);}});
      window.addEventListener('beforeunload',e=>{if(dirty||busy){e.preventDefault();e.returnValue='';}});
      await reload();open();
    }catch(e){$('admin-access').textContent='Admin tools could not load: '+e.message+'. Complete the Supabase setup, then refresh.';message(e.message);}
  }
  start();
})();
