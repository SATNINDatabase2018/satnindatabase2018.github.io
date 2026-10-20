/* Admin-only visitor previews. The real session is retained for leaving preview. */
(() => {
  const real=supabaseClient,key='hm2018:admin-preview';let mode='',isAdmin=false;
  try{mode=sessionStorage.getItem(key)||'';}catch{}
  if(!['member','guest'].includes(mode))mode='';
  const guest=supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
  const ready=(async()=>{try{const {data,error}=await real.auth.getUser();if(!error&&data?.user){const check=await real.rpc('hm_is_admin');isAdmin=!check.error&&check.data===true;}}catch{}if(!isAdmin){mode='';try{sessionStorage.removeItem(key);}catch{}}})();
  const active=()=>mode==='guest'?guest:real;
  const blocked=async()=>({data:null,error:{message:'Leave preview mode to change your account or sign in.'}});
  const auth=new Proxy(real.auth,{get(target,prop){
    if(prop==='getUser'||prop==='getSession')return async(...args)=>{await ready;return active().auth[prop](...args);};
    if(prop==='onAuthStateChange')return callback=>real.auth.onAuthStateChange((event,session)=>{setTimeout(async()=>{await ready;callback(event,mode==='guest'?null:session);},0);});
    const value=Reflect.get(target,prop,target);if(typeof value!=='function')return value;
    return async(...args)=>{await ready;if(mode)return blocked();return value.apply(target,args);};
  }});
  supabaseClient=new Proxy(real,{get(target,prop){
    if(prop==='auth')return auth;
    if(prop==='rpc')return async(name,...args)=>{await ready;if(mode&&name==='hm_is_admin')return {data:false,error:null};return active().rpc(name,...args);};
    const owner=active(),value=Reflect.get(owner,prop,owner);return typeof value==='function'?value.bind(owner):value;
  }});
  function switchMode(next){try{if(next)sessionStorage.setItem(key,next);else sessionStorage.removeItem(key);}catch{alert('Browser storage is unavailable, so preview cannot stay active between pages.');return;}location.reload();}
  async function mount(){await ready;if(!isAdmin)return;const nav=document.querySelector('body>header nav');if(!nav)return;
    const box=document.createElement('div');box.className='admin-preview-controls';box.setAttribute('role','group');box.setAttribute('aria-label','Administrator visitor previews');
    for(const [value,title,leave]of [['member','View as logged-in user','Leave logged-in view'],['guest','View as logged-out visitor','Leave un-logged view']]){const b=document.createElement('button');b.type='button';b.textContent=mode===value?leave:title;b.setAttribute('aria-pressed',String(mode===value));b.addEventListener('click',()=>switchMode(mode===value?'':value));box.append(b);}nav.append(box);
    if(mode){const label=document.createElement('span');label.className='admin-preview-label';label.textContent=mode==='guest'?'Preview: logged-out visitor':'Preview: logged-in non-admin';box.prepend(label);}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();
