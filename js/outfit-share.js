/* Portable, read-only snapshots. The URL contains only the explicitly shared outfit. */
window.HMOutfitShare=(()=>{
  const text=(tag,value,cls)=>{const n=document.createElement(tag);n.textContent=value;if(cls)n.className=cls;return n;};
  const safe=s=>String(s??'').slice(0,2000);
  const picture=i=>{const box=text('div','','catalog-image');if(/^https:\/\//i.test(i?.image||'')){const img=document.createElement('img');img.src=i.image;img.alt=safe(i.title);box.append(img);}return box;};
  async function encode(value){let bytes=new TextEncoder().encode(JSON.stringify(value)),mode='j';if(window.CompressionStream){bytes=new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate'))).arrayBuffer());mode='z';}return mode+btoa(String.fromCharCode(...bytes)).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');}
  async function decode(value){
    if(value.length>30000||!['j','z'].includes(value[0]))throw Error('Invalid outfit link.');
    let bytes=Uint8Array.from(atob(value.slice(1).replaceAll('-','+').replaceAll('_','/')),c=>c.charCodeAt(0));
    if(value[0]==='z'){
      if(!window.DecompressionStream)throw Error('Please open this link in an up-to-date browser.');
      const reader=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate')).getReader();let size=0,chunks=[];
      try{while(true){const {done,value:chunk}=await reader.read();if(done)break;size+=chunk.length;if(size>80000)throw Error('This outfit link is too large.');chunks.push(chunk);}}finally{await reader.cancel();}
      bytes=new Uint8Array(size);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length;}
    }
    if(bytes.length>80000)throw Error('This outfit link is too large.');const data=JSON.parse(new TextDecoder().decode(bytes));
    if(data.v!==1||!['set','horse','player'].includes(data.type)||!Array.isArray(data.slots)||data.slots.length>30||!Array.isArray(data.stats)||data.stats.length>4)throw Error('Invalid outfit snapshot.');return data;
  }
  async function open(snapshot){
    try{
      const url=new URL('outfit-share/',document.baseURI);url.hash=await encode({...snapshot,v:1});if(url.href.length>30000)throw Error('This outfit is too large to share as a link.');
      const dialog=text('dialog','','slot-picker share-dialog');dialog.setAttribute('aria-labelledby','share-heading');const heading=text('h2','Share '+snapshot.name);heading.id='share-heading';
      const note=text('p','Anyone with this link can view the outfit name, selected horse, items and stats without logging in. This shares a snapshot: later edits or deletion won’t change the link.');
      const label=text('label','Share link'),input=document.createElement('input');input.readOnly=true;input.value=url.href;label.append(input);const status=text('p','');status.setAttribute('role','status');
      const actions=text('div','','outfit-controls');const copy=text('button','Copy link');copy.type='button';copy.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(url.href);status.textContent='Link copied!';}catch{input.select();status.textContent='Select and copy the link above.';}});actions.append(copy);
      if(navigator.share){const share=text('button','Share…');share.type='button';share.addEventListener('click',async()=>{try{await navigator.share({title:snapshot.name,url:url.href});}catch(e){if(e.name!=='AbortError')status.textContent='Please copy the link above.';}});actions.append(share);}
      const close=text('button','Close');close.type='button';close.addEventListener('click',()=>dialog.close());actions.append(close);dialog.append(heading,note,label,actions,status);dialog.addEventListener('close',()=>dialog.remove());document.body.append(dialog);dialog.showModal();input.focus();input.select();
    }catch(e){HMDialog.alert('Could not share outfit: '+e.message);}
  }
  function slot(row,name){const box=text('div','','gear-slot');box.dataset.slot=name;box.append(text('span',name,'slot-label'));if(row)box.append(picture(row),text('span',safe(row.title),'slot-title'));else box.append(text('span','Empty','slot-title'));return box;}
  function sheet(kind,data){
    const panel=text('section','',`character-sheet ${kind}-sheet`);panel.append(text('h2',kind==='horse'?'Horse equipment':'Player outfit'));
    const names=kind==='horse'?['Mane Decoration','Tail Decoration','Bridle','Saddle','Horseshoes','Leg Wraps','Blanket']:['Hairstyle','Hat','Player Accessories','Top','Gloves','Pants','Shoes'];
    const stage=text('div','','gear-stage');for(const name of names)stage.append(slot(data.slots.find(s=>s.slot===name&&s.side===kind),name));
    const centre=text('div','','sheet-centre');if(kind==='horse'&&data.horse)centre.append(picture(data.horse),text('strong',safe(data.horse.title)),text('small',safe(data.horse.breed)));else centre.append(text('span',kind==='horse'?'Horse':'Player','horse-placeholder'));stage.append(centre);panel.append(stage);
    const extras=data.slots.filter(s=>s.side===kind&&!names.includes(s.slot));if(extras.length){const dock=text('div','','companion-pair');extras.forEach(s=>dock.append(slot(s,s.slot)));panel.append(dock);}return panel;
  }
  async function render(){const root=document.getElementById('shared-outfit');if(!root)return;try{
    const data=await decode(location.hash.slice(1));root.replaceChildren(text('h1',safe(data.name)||'Shared outfit'),text('p','A shared snapshot · '+({set:'Horse + player set',horse:'Horse equipment',player:'Player outfit'})[data.type]));
    const sheets=text('div','','character-sheets');sheets.classList.toggle('single-sheet',data.type!=='set');if(data.type!=='player')sheets.append(sheet('horse',data));if(data.type!=='horse')sheets.append(sheet('player',data));root.append(sheets);
    const stats=text('div','','outfit-stat-totals');for(const group of data.stats){const box=text('section','','stat-group');box.append(text('h3',safe(group.title)));const dl=document.createElement('dl');for(const pair of (Array.isArray(group.values)?group.values:[]).slice(0,15))if(Array.isArray(pair)&&pair.length===2)dl.append(text('dt',safe(pair[0]==='Speed'?'Swiftness':pair[0])),text('dd',safe(pair[1])));box.append(dl);stats.append(box);}root.append(stats,text('p','Stats are the item bonuses captured when this link was created.'));
  }catch(e){root.replaceChildren(text('h1','Could not open this outfit'),text('p',e.message));}}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',render,{once:true});else render();return{open,encode,decode};
})();
