async function updateNavbar() {
    let user=null;
    try {const result=await supabaseClient.auth.getUser();user=result.data?.user||null;} catch {return;}
    const accountLink=document.getElementById('account-link');
    const signupLink=document.getElementById('signup-nav-link');
    if(accountLink)accountLink.textContent=user?(user.user_metadata?.username||'My Account'):'Log in';
    if(signupLink)signupLink.hidden=!!user;
    let adminLink=document.getElementById('admin-nav-link');
    if(adminLink)adminLink.hidden=true;
    if(user){
      try{const {data,error}=await supabaseClient.rpc('hm_is_admin');if(!error&&data===true){
        if(!adminLink){adminLink=document.createElement('a');adminLink.id='admin-nav-link';adminLink.href='admin.html';adminLink.textContent='Admin';document.querySelector('header nav')?.append(adminLink);}
        adminLink.hidden=false;if(location.pathname.endsWith('/admin.html'))adminLink.setAttribute('aria-current','page');
      }}catch{}
    }
}
updateNavbar();
supabaseClient.auth.onAuthStateChange(()=>{updateNavbar();});
