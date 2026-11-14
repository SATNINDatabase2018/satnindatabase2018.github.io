let navbarUpdateVersion=0;
function uniqueAdminLink(){
    const links=[...document.querySelectorAll('header nav a[href]')].filter(a=>{const url=new URL(a.href,location.href);return !url.hash&&url.pathname.replace(/\/$/,'').endsWith('/admin');});
    const link=links.find(a=>a.id==='admin-nav-link')||links[0];
    links.forEach(a=>{if(a!==link)a.remove();});
    if(link)link.id='admin-nav-link';
    return link;
}
async function updateNavbar() {
    const version=++navbarUpdateVersion;
    let adminLink=uniqueAdminLink();if(adminLink)adminLink.hidden=true;document.querySelectorAll('.admin-content-shortcut,.admin-activity-shortcut,.admin-edit-shortcut').forEach(n=>n.hidden=true);
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
          const nav=document.querySelector('header nav');
          for(const [cls,label,href]of [['admin-content-shortcut','Site content','admin/#site-content-panel'],['admin-activity-shortcut','Accounts & activity','admin/#accounts-panel']]){
            let link=nav.querySelector('.'+cls);if(!link){link=document.createElement('a');link.className=cls;link.href=href;link.textContent=label;nav.append(link);}link.hidden=false;
          }
          let edit=nav.querySelector('.admin-edit-shortcut');if(!edit){edit=document.createElement('button');edit.type='button';edit.className='admin-edit-shortcut';edit.textContent='Edit website';edit.addEventListener('click',()=>{if(window.HMSiteContent?.toggleEditing)window.HMSiteContent.toggleEditing();else location.href='admin/#site-content-panel';});nav.append(edit);}edit.hidden=false;
          if(location.pathname.replace(/\/$/,'').endsWith('/admin'))adminLink.setAttribute('aria-current','page');else adminLink.removeAttribute('aria-current');
        }
      }catch{}
    }
}
updateNavbar();
supabaseClient.auth.onAuthStateChange(()=>{updateNavbar();});
