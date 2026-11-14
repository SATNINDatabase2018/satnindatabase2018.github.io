/* Account directory is fetched exclusively through an admin-authorized RPC. */
(() => {
 const $=id=>document.getElementById(id),node=(tag,text)=>{const n=document.createElement(tag);n.textContent=text;return n;};
 if(!$('accounts-panel'))return;
 let page=0,busy=false,allowed=false,version=0,matching=0;
 const summary=$('accounts-panel').querySelector('summary');if(summary)summary.textContent='Accounts & recent activity';
 const hint=node('p','Shows all current accounts, including unconfirmed accounts. Page activity starts with this update and is recorded at most every five minutes while a signed-in visitor is active. Earlier sign-ins are shown separately.');
 const label=node('label','Sort accounts '),sort=document.createElement('select');sort.id='accounts-sort';
 for(const [value,text]of [['activity','Recent activity / sign-in'],['created','Newest accounts'],['email','Email A–Z']])sort.append(new Option(text,value));label.append(sort);
 $('accounts-search-form').after(label,hint);
 const date=value=>value?new Date(value).toLocaleString():'Not recorded';
 async function load(){
   if(busy||!allowed)return;busy=true;for(const control of document.querySelectorAll('#accounts-search-form input,#accounts-search-form button,#accounts-sort,#accounts-prev,#accounts-next'))control.disabled=true;const request=version;$('accounts-status').textContent='Loading accounts…';$('accounts-table').replaceChildren();
   try{
     const {data,error}=await supabaseClient.rpc('hm_admin_accounts_activity_overview',{p_search:$('accounts-search').value.trim(),p_page:page,p_sort:sort.value});
     if(request!==version||!allowed)return;if(error)throw error;matching=Number(data.matching)||0;
     $('accounts-summary').textContent=`${data.total} accounts · ${data.matching} match your search · ${data.active_24h} active or signed in in the last 24 hours`;
     const table=document.createElement('table'),thead=document.createElement('thead'),head=document.createElement('tr');
     for(const text of ['Email','Name','Created','Last sign-in','Last page activity','Last recorded page','Email confirmed','Role','User ID']){const th=node('th',text);th.scope='col';head.append(th);}thead.append(head);table.append(thead);
     const body=document.createElement('tbody');
     for(const account of data.accounts||[]){const tr=document.createElement('tr');
       for(const text of [account.email||'No email',account.username||'—',date(account.created_at),date(account.last_sign_in_at),date(account.last_seen_at),account.last_page||'Not recorded yet',account.email_confirmed_at?'Yes':'No',account.is_admin?'Admin':'Member',account.id])tr.append(node('td',text));
       const copy=document.createElement('button');copy.type='button';copy.textContent='Copy ID';copy.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(account.id);$('accounts-status').textContent='User ID copied.';}catch{$('accounts-status').textContent='Select and copy the displayed ID.';}});tr.lastChild.append(copy);body.append(tr);
     }
     table.append(body);$('accounts-table').append(table);if(!data.accounts?.length)$('accounts-table').append(node('p','No accounts match this search.'));
     $('accounts-prev').disabled=page===0;$('accounts-next').disabled=(page+1)*50>=data.matching;
     $('accounts-status').textContent=`Page ${page+1} · ${data.accounts?.length||0} accounts shown. Account information is visible to admins only.`;
   }catch(error){if(request===version){$('accounts-summary').textContent='';$('accounts-status').textContent='Could not load accounts: '+error.message+'. Run the new admin setup SQL and refresh.';}}
   finally{busy=false;for(const control of document.querySelectorAll('#accounts-search-form input,#accounts-search-form button,#accounts-sort'))control.disabled=false;$('accounts-prev').disabled=page===0;$('accounts-next').disabled=(page+1)*50>=matching;if(request!==version&&allowed)load();}
 }
 $('accounts-search-form').onsubmit=event=>{event.preventDefault();if(busy)return;page=0;load();};sort.addEventListener('change',()=>{if(busy)return;page=0;load();});
 $('accounts-refresh').onclick=load;$('accounts-prev').onclick=()=>{if(busy)return;page=Math.max(0,page-1);load();};$('accounts-next').onclick=()=>{if(busy)return;page++;load();};
 async function access(){const check=++version;let result;try{result=await supabaseClient.rpc('hm_is_admin');}catch{result={data:false};}if(check!==version)return;
   allowed=result.data===true&&!result.error;$('accounts-panel').hidden=!allowed;
   if(!allowed){$('accounts-table').replaceChildren();$('accounts-summary').textContent='';return;}
   if(location.hash==='#accounts-panel')$('accounts-panel').open=true;load();
 }
 window.addEventListener('hashchange',()=>{if(allowed&&location.hash==='#accounts-panel'){$('accounts-panel').open=true;$('accounts-panel').scrollIntoView({block:'start'});}});
 supabaseClient.auth.onAuthStateChange(()=>setTimeout(access,0));access();
})();
