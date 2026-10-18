/* Supabase manages the OAuth redirect and session. Discord secrets stay in Supabase. */
(() => {
  const button=document.getElementById('discord-login-button');
  const message=document.getElementById('discord-login-message');
  if(!button||!message)return;
  const params=new URLSearchParams(location.search);
  const hash=new URLSearchParams(location.hash.slice(1));
  if(params.has('error')||hash.has('error')){
    const code=params.get('error')||hash.get('error');
    message.textContent=code==='access_denied'
      ? 'Discord sign-in was cancelled or could not be authorised. You can try again.'
      : 'Discord sign-in could not finish. Please try again. If this continues, contact SATNIN.';
    // Remove OAuth error details without displaying or retaining provider URLs.
    const url=new URL(location.href);
    for(const key of ['error','error_code','error_description']){url.searchParams.delete(key);hash.delete(key);}
    if(new URLSearchParams(location.hash.slice(1)).has('error'))url.hash=hash.toString();
    history.replaceState(null,'',url.pathname+url.search+url.hash);
  }
  button.addEventListener('click',async()=>{
    if(button.disabled)return;
    button.disabled=true;message.textContent='Opening Discord…';
    try{
      const {error}=await supabaseClient.auth.signInWithOAuth({
        provider:'discord',
        options:{redirectTo:new URL('login/',document.baseURI).href,scopes:'identify email'}
      });
      if(error)throw error;
      // The SDK navigates to Discord; restore the control if navigation is blocked.
      button.disabled=false;message.textContent='Continue on Discord. If it did not open, try the button again.';
    }catch(error){
      const setup=/provider.*(not enabled|disabled)|unsupported provider|validation_failed/i.test((error?.message||'')+' '+(error?.code||''));
      message.textContent=setup
        ? 'Discord sign-in is not enabled yet. Please try again after setup is complete, or use email login.'
        : 'Could not open Discord sign-in. Please try again or use email login.';
      button.disabled=false;
    }
  });
})();
