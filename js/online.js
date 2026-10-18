/* All pages join one shared site-wide room. Every visitor participates;
   only admins see the total. Temporary connection data contains no account details. */
(() => {
 const nav=document.querySelector('body>header nav');if(!nav||typeof supabaseClient==='undefined'||document.querySelector('.online-count'))return;
 const label=document.createElement('span');label.className='online-count';label.hidden=true;label.textContent='Whole site online: …';label.title='Total connected tabs across ALL website pages, including guests. Multiple tabs or devices can count more than once. Connections may take a moment to disappear after closing.';label.style.cssText='font-size:12px;white-space:nowrap;opacity:.85;padding:8px';nav.append(label);
 let connected=false,permissionCheck=0;
 const channel=supabaseClient.channel('website-online-v1',{config:{presence:{key:crypto.randomUUID()}}});
 function total(){if(connected)label.textContent='Whole site online: '+Object.values(channel.presenceState()).reduce((sum,connections)=>sum+connections.length,0);}
 async function access(){const check=++permissionCheck;try{const {data,error}=await supabaseClient.rpc('hm_is_admin');if(check===permissionCheck)label.hidden=!!error||data!==true;}catch{if(check===permissionCheck)label.hidden=true;}}
 channel.on('presence',{event:'sync'},total).subscribe(async status=>{
 connected=status==='SUBSCRIBED';
 if(connected){const r=await channel.track({online:true});if(r!=='ok'){connected=false;label.textContent='Whole site online: unavailable';}else total();}
 else if(['CHANNEL_ERROR','TIMED_OUT','CLOSED'].includes(status))label.textContent='Whole site online: unavailable';
 });
 access();supabaseClient.auth.onAuthStateChange(()=>{label.hidden=true;setTimeout(access,0);});
 window.addEventListener('pagehide',()=>supabaseClient.removeChannel(channel),{once:true});
 window.addEventListener('pageshow',e=>{if(e.persisted)location.reload();});
})();
