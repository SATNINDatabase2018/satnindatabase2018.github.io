/* Anonymous, temporary open-tab presence; no emails, IDs or page history are shared. */
(() => {
 const nav=document.querySelector('body>header nav');if(!nav||typeof supabaseClient==='undefined')return;
 const label=document.createElement('span');label.className='online-count';label.textContent='Online: …';label.title='Approximate number of connected website tabs, including guests. Several tabs or devices can count more than once. Not an exact count of people.';label.style.cssText='font-size:12px;white-space:nowrap;opacity:.85;padding:8px';nav.append(label);
 const channel=supabaseClient.channel('website-online-v1',{config:{presence:{key:crypto.randomUUID()}}});
 channel.on('presence',{event:'sync'},()=>{label.textContent='Online: '+Object.keys(channel.presenceState()).length;}).subscribe(async status=>{
 if(status==='SUBSCRIBED'){const r=await channel.track({online:true});if(r!=='ok')label.textContent='Online: unavailable';}
 else if(['CHANNEL_ERROR','TIMED_OUT','CLOSED'].includes(status))label.textContent='Online: unavailable';
 });
 window.addEventListener('pagehide',()=>supabaseClient.removeChannel(channel),{once:true});
 window.addEventListener('pageshow',e=>{if(e.persisted)location.reload();});
})();
