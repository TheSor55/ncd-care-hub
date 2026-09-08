'use strict';
window.addEventListener('DOMContentLoaded',()=>{
  const sidebar=document.getElementById('sidebar'),main=document.querySelector('.main'),toggle=document.getElementById('mob-menu');
  const small=window.matchMedia('(max-width:900px)');
  const backdrop=document.createElement('button');backdrop.className='nav-backdrop';backdrop.setAttribute('aria-label','ปิดเมนู');backdrop.tabIndex=-1;document.body.append(backdrop);
  const close=document.createElement('button');close.className='sb-toggle';close.type='button';sidebar.querySelector('.sb-logo').append(close);
  sidebar.setAttribute('aria-label','เมนูหลัก');
  toggle.removeAttribute('onclick');toggle.className='nav-toggle';toggle.setAttribute('aria-controls','sidebar');
  const paths=['M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z','M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M17 8h5 M19.5 5.5v5','M12 5v14 M5 12h14','M9 3h6 M10 3v5L4 18q-1 3 2 3h12q3 0 2-3L14 8V3 M8 14h8','M2 12h4l3-7 5 14 3-7h5','M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2 M7 2v6 M17 2v6 M3 11h18','M4 21V10 M10 21V3 M16 21v-8 M22 21H2','M4 12h15 M13 5l7 7-7 7'];
  const items=[...sidebar.querySelectorAll('.sb-item')];
  items.forEach((item,i)=>{
    const label=item.textContent.replace(item.querySelector('.sb-icon').textContent,'').trim();
    item.setAttribute('aria-label',label);item.title=label;
    item.innerHTML=`<span class="sb-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="${paths[i]}"/></svg></span><span class="sb-label"></span>`;
    item.querySelector('.sb-label').textContent=label;
  });
  try{document.body.classList.toggle('nav-compact',localStorage.getItem('ncd_ui_sidebar')==='compact');}catch{}
  function sync(){
    const open=small.matches&&sidebar.classList.contains('open');
    document.body.classList.toggle('nav-drawer-open',open);main.inert=open;sidebar.inert=small.matches&&!open;
    const expanded=small.matches?open:!document.body.classList.contains('nav-compact');
    toggle.setAttribute('aria-expanded',String(expanded));toggle.setAttribute('aria-label',expanded?'ย่อหรือปิดเมนู':'เปิดเมนู');toggle.title=toggle.getAttribute('aria-label');
    close.textContent=small.matches?'×':expanded?'‹':'›';close.setAttribute('aria-label',small.matches?'ปิดเมนู':expanded?'ย่อเมนู':'ขยายเมนู');close.title=close.getAttribute('aria-label');
    items.forEach(item=>{if(item.classList.contains('active'))item.setAttribute('aria-current','page');else item.removeAttribute('aria-current');});
  }
  function dismiss(focus=true){sidebar.classList.remove('open');sync();if(focus)toggle.focus();}
  function change(){
    if(small.matches){sidebar.classList.toggle('open');sync();if(sidebar.classList.contains('open'))close.focus();else toggle.focus();}
    else{document.body.classList.toggle('nav-compact');try{localStorage.setItem('ncd_ui_sidebar',document.body.classList.contains('nav-compact')?'compact':'expanded');}catch{}sync();}
  }
  toggle.addEventListener('click',change);close.addEventListener('click',change);backdrop.addEventListener('click',()=>dismiss());
  const previousGo=go;
  go=function(id,btn){previousGo(id,btn||qsel(id));dismiss(false);if(small.matches){document.getElementById('pg-title').setAttribute('tabindex','-1');document.getElementById('pg-title').focus();}};
  document.addEventListener('keydown',event=>{
    if(!small.matches||!sidebar.classList.contains('open'))return;
    if(event.key==='Escape'){event.preventDefault();dismiss();}
    if(event.key==='Tab'){
      const focusable=[...sidebar.querySelectorAll('button')].filter(el=>!el.disabled);const first=focusable[0],last=focusable.at(-1);
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
    }
  });
  small.addEventListener('change',()=>dismiss(false));sync();
});
