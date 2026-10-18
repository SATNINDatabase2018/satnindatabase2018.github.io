/* Supabase handles sign-in and linking; provider secrets stay in Supabase. */
(() => {
  const button=document.getElementById('discord-login-button');
  const message=document.getElementById('discord-login-message');
  const linkButton=document.getElementById('discord-link-button');
  const linkMessage=document.getElementById('discord-link-message');
  if(!button||!message||!linkButton||!linkMessage)return;
  const params=new URLSearchParams(location.search),hash=new URLSearchParams(location.hash.slice(1));
  let callbackError='';
  if(params.has('error')||hash.has('error')){
    const code=params.get('error_code')||hash.get('error_code')||params.get('error')||hash.get('error');
    callbackError=/identity_already_exists|identity_already_linked/.test(code)
      ? 'That Discord account is already linked to a website account. Linking cannot merge existing accounts. Please contact SATNIN for help.'
      : code==='access_denied'
        ? 'Discord authorisation was cancelled or denied. You can try again.'
        : 'Discord sign-in or linking could not finish. Please try again. If this continues, contact SATNIN.';
    message.textContent=callbackError;linkMessage.textContent=callbackError;
    const url=new URL(location.href);
    for(const key of ['error','error_code','error_description']){url.searchParams.delete(key);hash.delete(key);}
    if(new URLSearchParams(location.hash.slice(1)).has('error'))url.hash=hash.toString();
    history.replaceState(null,'',url.pathname+url.search+url.hash);
  }
  const options=()=>({redirectTo:new URL('login/',document.baseURI).href,scopes:'identify email'});
  let linking=false,refreshVersion=0;
  function linked(user){return !!user?.identities?.some(identity=>identity.provider==='discord');}
  async function refreshLink(){
    const version=++refreshVersion;
    try{
      const {data,error}=await supabaseClient.auth.getUser();if(error)throw error;
      if(version!==refreshVersion)return;
      const user=data?.user,hasDiscord=linked(user);
      linkButton.textContent=hasDiscord?'Discord linked':'Link with Discord';
      linkButton.disabled=!user||hasDiscord||linking;
      if(!callbackError&&!linking)linkMessage.textContent=hasDiscord?'Your Discord account is linked. You can use Continue with Discord next time.':user?'Connect Discord to the account you’re logged in to.':'Log in before linking Discord.';
    }catch{
      if(version!==refreshVersion)return;
      linkButton.disabled=true;
      if(!callbackError)linkMessage.textContent='Could not check linked accounts. Reload this page and try again.';
    }
  }
  button.addEventListener('click',async()=>{
    if(button.disabled)return;button.disabled=true;message.textContent='Opening Discord…';
    try{
      const {error}=await supabaseClient.auth.signInWithOAuth({provider:'discord',options:options()});if(error)throw error;
      message.textContent='Continue on Discord. If it did not open, try the button again.';
    }catch(error){
      const setup=/provider.*(not enabled|disabled)|unsupported provider|validation_failed/i.test((error?.message||'')+' '+(error?.code||''));
      message.textContent=setup?'Discord sign-in is not enabled yet. Please try again after setup is complete, or use email login.':'Could not open Discord sign-in. Please try again or use email login.';
    }finally{button.disabled=false;}
  });
  linkButton.addEventListener('click',async()=>{
    if(linkButton.disabled||linking)return;
    linking=true;linkButton.disabled=true;callbackError='';linkMessage.textContent='Opening Discord to link your account…';
    try{
      const {data,error}=await supabaseClient.auth.getUser();if(error)throw error;
      if(!data?.user)throw new Error('not_signed_in');
      if(linked(data.user)){linking=false;await refreshLink();return;}
      const result=await supabaseClient.auth.linkIdentity({provider:'discord',options:options()});if(result.error)throw result.error;
      linkMessage.textContent='Finish authorising on Discord. Your linked account will be shown when you return.';
    }catch(error){
      const details=(error?.code||'')+' '+(error?.message||'');
      linkMessage.textContent=/manual.*link.*(disabled|not enabled)|manual_linking_disabled/i.test(details)
        ? 'Discord linking is not enabled yet. Please contact SATNIN.'
        : /identity_already_exists|identity_already_linked|already.*linked/i.test(details)
          ? 'That Discord account is already linked to a website account. Linking cannot merge existing accounts. Please contact SATNIN for help.'
          : /not_signed_in|session.*missing/i.test(details)
            ? 'Please log in again before linking Discord.'
            : 'Could not link Discord. Your saved items have not been changed. Please try again.';
    }finally{linking=false;linkButton.disabled=linkButton.textContent==='Discord linked';}
  });
  refreshLink();
  // Do account reads outside Supabase’s auth callback to avoid blocking session updates.
  supabaseClient.auth.onAuthStateChange(()=>setTimeout(refreshLink,0));
})();
