(() => {
 const spirit=document.getElementById('spirit-page');if(spirit)HMSpiritSchedule.open(spirit);
 const target=document.getElementById('champ-table');if(!target)return;
 const days=['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
 const cycle=['Firgrove','New Hillcrest','Silverglade','Pony','Jorvik Stables','Goldenhills','Fort Pinta','Moorland','Valedale'];
 const locationAt=(hour,day)=>cycle[((day-(hour-6))%9+9)%9];
 function nextRace(now){for(let offset=0;offset<8;offset++){const date=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate()+offset));for(let hour=6;hour<=23;hour++){const time=new Date(date.getTime()+hour*3600000);if(time>=now){const day=(time.getUTCDay()+6)%7;return{time,hour,day,place:locationAt(hour,day)};}}}}
 const el=(tag,text)=>{const n=document.createElement(tag);n.textContent=text;return n;};
 const scroll=el('div','');scroll.className='spirit-schedule-scroll';scroll.tabIndex=0;scroll.setAttribute('role','region');scroll.setAttribute('aria-label','Weekly championship schedule in UTC');const table=el('table',''),head=el('thead',''),headRow=el('tr','');for(const label of ['Time',...days]){const th=el('th',label);th.scope='col';headRow.append(th);}head.append(headRow);table.append(head);const body=el('tbody','');
 for(let hour=6;hour<=23;hour++){const row=el('tr',''),clock=el('th',String(hour).padStart(2,'0')+':00');clock.scope='row';row.append(clock);for(let day=0;day<7;day++)row.append(el('td',locationAt(hour,day)));body.append(row);}table.append(body);scroll.append(table);target.append(scroll);
 function update(){const now=new Date(),next=nextRace(now);table.querySelectorAll('.spirit-current-day,.spirit-current-hour,.spirit-current-cell').forEach(n=>n.classList.remove('spirit-current-day','spirit-current-hour','spirit-current-cell'));table.querySelectorAll('[aria-current]').forEach(n=>n.removeAttribute('aria-current'));
 headRow.cells[next.day+1].classList.add('spirit-current-day');const row=body.rows[next.hour-6];row.cells[0].classList.add('spirit-current-hour');row.cells[next.day+1].classList.add('spirit-current-cell');row.cells[next.day+1].setAttribute('aria-current','time');
 const seconds=Math.max(0,Math.ceil((next.time-now)/1000)),hours=Math.floor(seconds/3600),minutes=Math.floor(seconds%3600/60);const left=seconds===0?'Starting now':`in ${hours?hours+'h ':''}${minutes}m ${seconds%60}s`;
 document.getElementById('champ-next').textContent=`Next championship · ${next.place} · ${days[next.day]}, ${String(next.hour).padStart(2,'0')}:00 UTC · ${left}`;
 }
 update();const timer=setInterval(update,1000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)update();});window.addEventListener('pagehide',()=>clearInterval(timer),{once:true});
})();
