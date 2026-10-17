async function updateNavbar() {
    let user=null;
    try {const result=await supabaseClient.auth.getUser();user=result.data?.user||null;} catch {return;}
    const accountLink=document.getElementById('account-link');
    const signupLink=document.getElementById('signup-nav-link');
    if(accountLink)accountLink.textContent=user?(user.user_metadata?.username||'My Account'):'Log in';
    if(signupLink)signupLink.hidden=!!user;
}
updateNavbar();
supabaseClient.auth.onAuthStateChange(()=>{updateNavbar();});
