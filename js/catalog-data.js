/* JSON baseline plus administrator changes. No private keys or write access here. */
(() => {
  const baseCache=new Map();let changesPromise;
  async function base(kind){
    if(!baseCache.has(kind))baseCache.set(kind,(async()=>{const path=kind==='horse'?'data/horses.json':'data/database.json';const r=await fetch(path,{cache:'no-cache'});if(!r.ok)throw Error('Could not load '+path);const data=await r.json();if(!Array.isArray(data))throw Error('Invalid catalogue file.');return data;})());
    return baseCache.get(kind);
  }
  async function changes(refresh=false){
    if(refresh)changesPromise=null;
    if(!changesPromise)changesPromise=(async()=>{
      const rows=[];
      for(let start=0;;start+=1000){
        const {data,error}=await supabaseClient.from('hm_catalog_changes').select('kind,entry_id,payload,deleted,revision').order('kind').order('entry_id').range(start,start+999);
        if(error){if(['42P01','PGRST205'].includes(error.code))return [];throw Error('Could not load catalogue updates. Please refresh: '+error.message);}
        rows.push(...(data||[]));if(!data||data.length<1000)break;
      }
      return rows;
    })();
    try{return await changesPromise;}catch(e){changesPromise=null;throw e;}
  }
  async function records(kind,includeDeleted=false){
    const [original,updates]=await Promise.all([base(kind),changes()]);const map=new Map(original.map(item=>[String(item.id),{...item}]));
    for(const row of updates.filter(r=>r.kind===kind)){
      if(row.deleted&&!includeDeleted){map.delete(String(row.entry_id));continue;}
      map.set(String(row.entry_id),{...(map.get(String(row.entry_id))||{}),...row.payload,id:Number(row.entry_id),_revision:Number(row.revision),_deleted:row.deleted});
    }
    return [...map.values()];
  }
  window.HMCatalogData={records,changes,load:path=>records(path.includes('horses.json')?'horse':'item')};
})();
