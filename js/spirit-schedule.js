(() => {
 const rows=[
 ['8:00 AM','South Hoof Peninsula','Forgotten Fields','Hollow Woods','Everwind Fields','Forgotten Fields','Golden Hills Valley','Everwind Fields'],
 ['9:00 AM','Sunfield Farm','South Hoof Peninsula','Everwind Fields','Dew’s Farm, Epona','Valedale Lake','Seahorse Point','Everwind Fields'],
 ['10:00 AM','Stormgarden','Everwind Fields','','Everwind Fields','South Hoof Peninsula','Golden Hills Valley','Forgotten Fields'],
 ['11:00 AM','Everwind Fields','Silverglade Acres, near Marley','Dew’s Farm, Epona','South Hoof Peninsula','Golden Hills Valley','Everwind Fields','Sunfield Farm'],
 ['12:00 PM','Hollow Woods','Golden Hills Valley','South Hoof Peninsula','Dew’s Farm, Epona','Greendale','Firgrove','Valedale Lake'],
 ['1:00 PM','Cauldron, Epona','Sunfield Farm','Hollow Woods','South Hoof Peninsula','Fort Pinta','Golden Fields','South Hoof Peninsula'],
 ['2:00 PM','Forgotten Fields','Forgotten Fields','Firgrove','Firgrove','Seahorse Point','Goldspur','Everwind Fields'],
 ['3:00 PM','Everwind Fields','Goldspur','Firgrove','Firgrove','Sunfield Farm','South Hoof Peninsula','Golden Hills Valley'],
 ['4:00 PM','Seahorse Point','South Hoof Peninsula','Firgrove','Forgotten Fields','Moorland','Firgrove','Golden Fields'],
 ['5:00 PM','Greendale','Seahorse Point','South Hoof Peninsula','Moorland','South Hoof Peninsula','Moorland','Fort Pinta'],
 ['6:00 PM','Valedale Lake','Fort Pinta','Seahorse Point','Moorland','Golden Hills Valley','Nilmer’s Highland','South Hoof Peninsula'],
 ['7:00 PM','Seahorse Point','Nilmer’s Highland','Fort Pinta','Fort Pinta','Dew’s Farm, Epona','Stormgarden','Forgotten Fields'],
 ['8:00 PM','Everwind Fields','Moorland','Nilmer’s Highland','Dew’s Farm, Epona','Fort Pinta','Silverglade Acres, near Marley','Dew’s Farm, Epona'],
 ['9:00 PM','Nilmer’s Highland','Everwind Fields','New Hillcrest','Dew’s Farm, Epona','Riding Hall','Moorland','Moorland']
 ];
 const el=(tag,text)=>{const n=document.createElement(tag);n.textContent=text;return n;};
 window.HMSpiritSchedule={open(){
 if(document.querySelector('.spirit-schedule-dialog'))return;
 const previous=document.activeElement,d=el('dialog','');d.className='spirit-schedule-dialog';d.setAttribute('aria-labelledby','spirit-schedule-title');
 const heading=el('h2','Spirit’s schedule');heading.id='spirit-schedule-title';const close=el('button','Close');close.type='button';close.onclick=()=>d.close();d.append(heading,el('strong','UTC TIME'),el('p','Swipe or scroll sideways to see each day.'));
 const scroller=el('div','');scroller.className='spirit-schedule-scroll';scroller.tabIndex=0;scroller.setAttribute('role','region');scroller.setAttribute('aria-label','Spirit’s weekly UTC schedule');const table=el('table',''),thead=el('thead',''),tr=el('tr','');for(const day of ['Clock','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']){const th=el('th',day);th.scope='col';tr.append(th);}thead.append(tr);table.append(thead);const body=el('tbody','');
 for(const row of rows){const tr=el('tr','');row.forEach((value,i)=>{const cell=el(i===0?'th':'td',value);if(i===0)cell.scope='row';if(!value)cell.setAttribute('aria-label','No location supplied');tr.append(cell);});body.append(tr);}table.append(body);scroller.append(table);d.append(scroller,el('p','Spirit follows a weekly schedule and appears at different places depending on the day.'));
 const info=el('p','Times in this table are UTC (Coordinated Universal Time). Check or convert a time with '),a=el('a','UTC Time Converter ↗');a.href='https://www.utctime.net/';a.target='_blank';a.rel='noopener noreferrer';info.append(a);d.append(info,el('p','Spirit disappears at 21:00 UTC and returns the next morning.'),close);
 d.addEventListener('close',()=>{d.remove();if(previous?.isConnected)previous.focus();},{once:true});document.body.append(d);d.showModal();close.focus();
 }};
})();
