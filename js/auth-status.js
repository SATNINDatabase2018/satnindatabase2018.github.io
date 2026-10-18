let navbarUpdateVersion=0;
function uniqueAdminLink(){
    const links=[...document.querySelectorAll('header nav a[href]')].filter(a=>new URL(a.href,location.href).pathname.replace(/\/$/,'').endsWith('/admin'));
    const link=links.find(a=>a.id==='admin-nav-link')||links[0];
    links.forEach(a=>{if(a!==link)a.remove();});
    if(link)link.id='admin-nav-link';
    return link;
}
async function updateNavbar() {
    const version=++navbarUpdateVersion;
    let adminLink=uniqueAdminLink();if(adminLink)adminLink.hidden=true;
    let user=null;
    try {const result=await supabaseClient.auth.getUser();user=result.data?.user||null;} catch {return;}
    if(version!==navbarUpdateVersion)return;
    const accountLink=document.getElementById('account-link');
    const signupLink=document.getElementById('signup-nav-link');
    if(accountLink)accountLink.textContent=user?(user.user_metadata?.username||'My Account'):'Log in';
    if(signupLink)signupLink.hidden=!!user;
    if(user){
      try{
        const {data,error}=await supabaseClient.rpc('hm_is_admin');
        if(version!==navbarUpdateVersion)return;
        if(!error&&data===true){
          // Re-read the DOM after asynchronous checks; another update may have created it.
          adminLink=uniqueAdminLink();
          if(!adminLink){adminLink=document.createElement('a');adminLink.id='admin-nav-link';adminLink.href='admin/';adminLink.textContent='Admin';document.querySelector('header nav')?.append(adminLink);}
          adminLink.hidden=false;
          if(location.pathname.replace(/\/$/,'').endsWith('/admin'))adminLink.setAttribute('aria-current','page');else adminLink.removeAttribute('aria-current');
        }
      }catch{}
    }
}
updateNavbar();
supabaseClient.auth.onAuthStateChange(()=>{updateNavbar();});
