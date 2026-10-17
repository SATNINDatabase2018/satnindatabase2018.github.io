/* Gate account-only pages before fetching or rendering private feature content. */
window.HMFeatureAccess = (async () => {
  const content=document.getElementById('feature-content');
  const gate=document.getElementById('feature-login-gate');
  const status=document.getElementById('feature-access-status');
  try {
    const {data,error}=await supabaseClient.auth.getUser();
    if(error && error.name!=='AuthSessionMissingError')throw error;
    const user=data?.user||null;
    if(content){content.hidden=false;content.inert=!user;content.classList.toggle('feature-blurred',!user);if(!user)content.setAttribute('aria-hidden','true');else content.removeAttribute('aria-hidden');}
    if(gate)gate.hidden=!!user;
    if(status)status.hidden=true;
    supabaseClient.auth.onAuthStateChange((event,session)=>{
      if((session?.user?.id||null)!==(user?.id||null))setTimeout(()=>location.reload(),0);
    });
    return !!user;
  } catch {
    if(status)status.textContent='Could not check your account. Please refresh and try again.';
    return false;
  }
})();
