/* Coarse signed-in activity only: one timestamp and page, at most every five minutes. */
(() => {
  if(typeof supabaseClient==='undefined')return;
  const pages={home:'Home',database:'Database',collection:'My Collection',stable:'My Stable',outfits:'My Outfits',about:'About & credits',contact:'Contact',privacy:'Privacy',tutorial:'How to use',spirit:'Spirit timetable',championships:'Championships',areas:'Unlocking areas',admin:'Admin',login:'Account', 'outfit-share':'Shared outfits'};
  const parts=location.pathname.replace(/\/index\.html$/,'/').replace(/\/$/,'').split('/').filter(Boolean);
  const route=(parts.at(-1)||'home').replace(/\.html$/,'');const page=pages[route]||'Home';
  let pending=false,lastAttempt=0,lastInteraction=Date.now();
  const mark=()=>{lastInteraction=Date.now();};
  for(const name of ['pointerdown','keydown','scroll','touchstart'])document.addEventListener(name,mark,{passive:true});
  async function record(){
    if(pending||document.hidden||Date.now()-lastAttempt<60000||Date.now()-lastInteraction>300000)return;
    pending=true;lastAttempt=Date.now();
    try{
      const {data,error}=await supabaseClient.auth.getSession();const user=data?.session?.user;if(error||!user)return;
      const key='hm2018:last-activity:'+user.id;let previous=0;try{previous=Number(localStorage.getItem(key)||0);}catch{}
      if(previous>0&&Date.now()-previous<300000)return;
      const result=await supabaseClient.rpc('hm_record_account_activity',{p_page:page});
      if(!result.error){try{localStorage.setItem(key,String(Date.now()));}catch{}}
    }catch{}finally{pending=false;}
  }
  const timer=setInterval(record,300000);record();
  supabaseClient.auth.onAuthStateChange((event)=>{if(['SIGNED_IN','SIGNED_OUT','USER_UPDATED'].includes(event))setTimeout(()=>{lastAttempt=0;lastInteraction=Date.now();record();},0);});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden){mark();record();}});
  window.addEventListener('pagehide',()=>clearInterval(timer),{once:true});
})();
