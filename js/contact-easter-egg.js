/* A tiny, keyboard-accessible surprise, placed anew on each Contact page visit. */
(() => {
  const main=document.querySelector('main');if(!main)return;
  const egg=document.createElement('button');egg.type='button';egg.className='kachow-egg';egg.setAttribute('aria-label','A tiny racing surprise');egg.title='A tiny racing surprise';
  const icon=document.createElement('span');icon.textContent='🏎️';icon.setAttribute('aria-hidden','true');
  const words=document.createElement('span');words.className='kachow-words';words.textContent='Ka-chow! ⚡';egg.append(icon,words);
  const spots=['kachow-left','kachow-right','kachow-bottom'];egg.classList.add(spots[Math.floor(Math.random()*spots.length)]);
  egg.addEventListener('click',()=>{const shown=egg.classList.toggle('is-revealed');egg.setAttribute('aria-expanded',String(shown));});egg.setAttribute('aria-expanded','false');main.append(egg);
})();
