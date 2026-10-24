/* Promise-based, keyboard-accessible site dialogs. Never overrides browser APIs. */
(() => {
 let queue=Promise.resolve();
 function show(kind,message,initial=''){
  const task=()=>new Promise(resolve=>{
   const previous=document.activeElement,d=document.createElement('dialog');d.className='site-dialog';
   const form=document.createElement('form');form.method='dialog';
   const title=document.createElement('h2');title.id='site-dialog-title';title.textContent=kind==='prompt'?'Enter a name':kind==='confirm'?'Please confirm':"Database";
   const body=document.createElement('p');body.id='site-dialog-message';body.textContent=message;d.setAttribute('aria-labelledby',title.id);d.setAttribute('aria-describedby',body.id);form.append(title,body);
   let input;if(kind==='prompt'){input=document.createElement('input');input.type='text';input.value=initial;input.maxLength=200;input.setAttribute('aria-label',String(message));form.append(input);}
   const actions=document.createElement('div');actions.className='site-dialog-actions';
   if(kind!=='alert'){const cancel=document.createElement('button');cancel.type='button';cancel.textContent='Cancel';cancel.onclick=()=>d.close('cancel');actions.append(cancel);}
   const ok=document.createElement('button');ok.type='submit';ok.textContent=kind==='prompt'?'Save':kind==='confirm'?'Confirm':'OK';actions.append(ok);form.append(actions);d.append(form);
   form.onsubmit=e=>{e.preventDefault();d.close('ok');};d.addEventListener('close',()=>{const result=d.returnValue==='ok'?(kind==='prompt'?input.value:true):(kind==='prompt'?null:false);d.remove();if(previous?.isConnected)previous.focus();resolve(result);},{once:true});
   document.body.append(d);d.showModal();if(input){input.focus();input.select();}else if(kind==='confirm')actions.firstChild.focus();else ok.focus();
  });
  const result=queue.then(task);queue=result.catch(()=>{});return result;
 }
 window.HMDialog={confirm:m=>show('confirm',m),prompt:(m,v)=>show('prompt',m,v),alert:m=>show('alert',m)};
 const css=document.createElement('style');css.textContent='.site-dialog{box-sizing:border-box;width:min(92vw,500px);max-height:85vh;overflow:auto;border:1px solid var(--border,#ccc);border-radius:20px;padding:28px;background:var(--card,#fff);color:var(--text,#222);box-shadow:0 24px 90px #0005}.site-dialog::backdrop{background:#14251d88;backdrop-filter:blur(4px)}.site-dialog h2{font-size:23px;margin:0 0 16px}.site-dialog p{white-space:pre-wrap;line-height:1.6}.site-dialog input{box-sizing:border-box;width:100%;margin:12px 0}.site-dialog-actions{display:flex;justify-content:flex-end;gap:12px;margin-top:24px}';document.head.append(css);
})();

/* Dismiss native dialogs only when both press and release are on their backdrop. */
(() => {
 let pressed=null;
 function outside(dialog,event){const r=dialog.getBoundingClientRect();return event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom;}
 document.addEventListener('pointerdown',event=>{const dialog=event.target;pressed=dialog instanceof HTMLDialogElement&&dialog.open&&outside(dialog,event)?dialog:null;},true);
 document.addEventListener('pointerup',event=>{const dialog=pressed;pressed=null;if(!dialog||event.target!==dialog||!dialog.open||!outside(dialog,event))return;const cancel=new Event('cancel',{cancelable:true});if(dialog.dispatchEvent(cancel))dialog.close('cancel');},true);
 document.addEventListener('pointercancel',()=>{pressed=null;},true);
})();
