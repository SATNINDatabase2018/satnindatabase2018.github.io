(() => {
  const section=document.getElementById('logged-in-section');if(!section)return;
  const box=document.createElement('div');box.className='delete-account-panel';
  const title=document.createElement('h3');title.textContent='Delete my account';
  const note=document.createElement('p');note.textContent='This permanently deletes your account, collection, wishlist, favourites, stable and saved outfits. Your local outfit drafts on this browser will also be removed. This cannot be undone.';
  const button=document.createElement('button');button.type='button';button.textContent='Delete my account';
  const status=document.createElement('p');status.setAttribute('role','status');box.append(title,note,button,status);section.append(box);
  button.addEventListener('click',async()=>{
    let user;try{const result=await supabaseClient.auth.getUser();if(result.error)throw result.error;user=result.data?.user;}catch{status.textContent='Please log in again before deleting your account.';return;}if(!user){status.textContent='Please log in again.';return;}
    const dialog=document.createElement('dialog');dialog.className='delete-account-dialog';dialog.setAttribute('aria-labelledby','delete-account-heading');
    const heading=document.createElement('h2');heading.id='delete-account-heading';heading.textContent='Permanently delete your account?';
    const warning=document.createElement('p');warning.textContent='Your account and saved collection, horses and outfits will be permanently deleted. Type DELETE to confirm.';
    const label=document.createElement('label');label.textContent='Confirmation';const input=document.createElement('input');input.autocomplete='off';input.spellcheck=false;label.append(input);
    const actions=document.createElement('div');actions.className='account-gate-actions';const cancel=document.createElement('button');cancel.type='button';cancel.textContent='Keep my account';const remove=document.createElement('button');remove.type='button';remove.textContent='Permanently delete';remove.disabled=true;
    const message=document.createElement('p');message.setAttribute('role','status');let working=false;
    input.addEventListener('input',()=>remove.disabled=input.value!=='DELETE'||working);cancel.addEventListener('click',()=>dialog.close());
    dialog.addEventListener('cancel',e=>{if(working)e.preventDefault();});dialog.addEventListener('close',()=>dialog.remove());
    remove.addEventListener('click',async()=>{
      if(working||input.value!=='DELETE')return;working=true;remove.disabled=true;cancel.disabled=true;input.disabled=true;message.textContent='Deleting your account…';
      try{
        const {error}=await supabaseClient.rpc('hm_delete_my_account',{p_confirmation:input.value});if(error)throw error;
        try{for(const key of [`hm2018:outfits:v2:${user.id}`,`hm2018:outfit:${user.id}`])localStorage.removeItem(key);}catch{}
        try{await supabaseClient.auth.signOut({scope:'local'});}catch{}
        dialog.close();section.hidden=true;document.querySelectorAll('[data-guest-only]').forEach(n=>n.hidden=false);status.textContent='';
        const done=document.createElement('p');done.setAttribute('role','status');done.textContent='Your account and saved data have been deleted.';section.before(done);
      }catch(e){message.textContent='Could not delete your account: '+e.message;working=false;remove.disabled=input.value!=='DELETE';cancel.disabled=false;input.disabled=false;}
    });
    actions.append(cancel,remove);dialog.append(heading,warning,label,actions,message);document.body.append(dialog);dialog.showModal();input.focus();
  });
})();
