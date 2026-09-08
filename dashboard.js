'use strict';
let dashboardGroup='all';
function dashboardPatients(group){
  return DB.get('patients').filter(p=>group==='missing'?!p.ckdResult:group==='screened'?!!p.ckdResult:group==='risk'?['สูง','สูงมาก','ไตวาย'].includes(p.ckdResult?.risk):true);
}
function dashboardFilter(group){dashboardGroup=group;updateDash();document.getElementById('dashboard-directory').scrollIntoView({block:'start',behavior:'smooth'});}
function dashboardOpenPatient(id){
  go('ckd',qsel('ckd'));const select=document.getElementById('ckd-pt');select.value=String(id);select.dispatchEvent(new Event('change'));
  document.getElementById('p-ckd').scrollIntoView({block:'start'});
}
function renderDashboardDirectory(){
  const q=(document.getElementById('dashboard-search')?.value||'').trim().toLowerCase();
  const pts=dashboardPatients(dashboardGroup).filter(p=>`${p.name} ${p.hn}`.toLowerCase().includes(q));
  document.getElementById('dashboard-results').innerHTML=pts.length?pts.map(p=>`<button class="dash-person" onclick="dashboardOpenPatient(${Number(p.id)})"><span class="dash-avatar" aria-hidden="true">${safe(String(p.name||'?').slice(0,1))}</span><span class="dash-person-name"><strong>${safe(p.name)}</strong><small>HN ${safe(p.hn)} · ${safe(p.disease||'ไม่ระบุกลุ่มโรค')}</small></span><span class="dash-person-result">${p.ckdResult?`<strong>${safe(p.ckdResult.eGFR??'—')}</strong><small>eGFR · ${safe(p.ckdResult.gStage||'—')}</small>`:'<small>ยังไม่มีผล eGFR</small>'}</span><span aria-hidden="true">↗</span></button>`).join(''):'<div class="dash-empty">ไม่พบรายชื่อในกลุ่มหรือคำค้นนี้</div>';
  document.getElementById('dashboard-count').textContent=pts.length+' ราย';
}
updateDash=function(){
  const root=document.getElementById('p-dashboard');if(!root)return;
  const pts=DB.get('patients'),screened=pts.filter(p=>p.ckdResult),missing=pts.length-screened.length;
  const risk=dashboardPatients('risk');
  const today=localToday(),end=new Date(today+'T12:00:00');end.setDate(end.getDate()+6);
  const last=`${end.getFullYear()}-${String(end.getMonth()+1).padStart(2,'0')}-${String(end.getDate()).padStart(2,'0')}`;
  const appts=DB.get('appointments').filter(a=>a.date>=today&&a.date<=last).sort((a,b)=>a.date.localeCompare(b.date));
  const pct=pts.length?Math.round(screened.length/pts.length*100):0;
  const stages=['G1','G2','G3a','G3b','G4','G5'];
  const counts=stages.map(s=>screened.filter(p=>p.ckdResult.gStage===s).length);
  const backup=localStorage.getItem('ncd_last_backup');const backupDate=backup?new Date(backup):null;
  const groups={all:'ผู้ป่วยทั้งหมด',screened:'มีผล eGFR',missing:'ยังไม่มีผล eGFR',risk:'ความเสี่ยงสูงขึ้นไป'};
  root.innerHTML=`<div class="dash-test">ข้อมูลจากเบราว์เซอร์เครื่องนี้ · ตรวจสอบและแยกข้อมูลทดสอบก่อนนำรายงานไปใช้อ้างอิง</div>
  <section class="dash-hero"><div><div class="dash-eyebrow">NCD CARE HUB / ภาพรวมการดูแล</div><h2>ดูแลต่อเนื่อง เห็นข้อมูลครบ</h2><p>รพ.สต.หนองค้อ · อ.ศรีราชา จ.ชลบุรี</p><div class="dash-hero-actions"><button class="btn" onclick="go('ckd',qsel('ckd'))">บันทึกผลคัดกรอง ↗</button><button class="btn dash-outline" onclick="go('add-patient',qsel('add-patient'))">+ เพิ่มผู้ป่วย</button></div></div><div class="dash-hero-aside"><span>ข้อมูลในเบราว์เซอร์เครื่องนี้</span><strong>${new Date().toLocaleDateString('th-TH',{day:'numeric',month:'long',year:'numeric'})}</strong><small>ธัญชนก สุวรรณรงค์<br>ผู้พัฒนานวัตกรรม NCD Care Hub</small></div></section>
  <div class="dash-stats">${[['all','ผู้ป่วยทั้งหมด',pts.length,'รายชื่อในระบบ','blue'],['screened','มีผล eGFR',screened.length,'จากผลล่าสุดที่บันทึก','teal'],['missing','ยังไม่มีผล eGFR',missing,'เปิดรายชื่อเพื่อบันทึกผล','amber'],['risk','ความเสี่ยงสูงขึ้นไป',risk.length,'ตามระดับความเสี่ยงที่บันทึก','rose']].map(([g,l,n,h,c])=>`<button class="dash-stat ${c}" onclick="dashboardFilter('${g}')"><span>${l}<b aria-hidden="true">↗</b></span><strong>${n}<small> ราย</small></strong><small>${h}</small></button>`).join('')}</div>
  <div class="dash-grid"><section class="dash-panel"><div class="dash-heading"><div><h3>ความครบถ้วนของผล eGFR</h3><p>ทุกช่วงเวลา · ผู้มีผล / ผู้ลงทะเบียนทั้งหมด</p></div><span class="dash-tag">ภาพรวมข้อมูล</span></div><div class="dash-coverage"><div class="dash-ring" style="--progress:${pct}%"><strong>${pts.length?pct+'%':'—'}</strong></div><div><h3>${screened.length} จาก ${pts.length} ราย</h3><p>มีผล eGFR ในระบบ</p><button class="dash-link" onclick="dashboardFilter('missing')">ดูผู้ที่ยังไม่มีผล ${missing} ราย →</button></div></div><p class="dash-footnote">สัดส่วนข้อมูลที่มี ไม่ใช่อัตราคัดกรองครบตามเกณฑ์ทางคลินิก</p></section>
  <section class="dash-panel"><div class="dash-heading"><div><h3>การกระจายระดับ G</h3><p>ผลล่าสุดรายบุคคลที่บันทึกไว้</p></div><button class="dash-link" onclick="go('reports',qsel('reports'))">รายงาน ↗</button></div><div class="dash-stage-list">${stages.map((s,i)=>`<div><span>${s}</span><div class="dash-track"><i style="width:${screened.length?counts[i]/screened.length*100:0}%;background:${['#0d9488','#14b8a6','#eab308','#f59e0b','#f97316','#e11d48'][i]}"></i></div><strong>${counts[i]}</strong></div>`).join('')}</div></section></div>
  <div class="dash-grid dash-grid-lower"><section class="dash-panel" id="dashboard-directory"><div class="dash-heading"><div><h3>รายชื่อและประวัติการคัดกรอง</h3><p>เลือกผู้ป่วยเพื่อดูผลย้อนหลังและกราฟรายปี</p></div><span class="dash-tag" id="dashboard-count"></span></div><div class="dash-tabs" role="group" aria-label="กรองรายชื่อ">${Object.entries(groups).map(([g,l])=>`<button aria-pressed="${g===dashboardGroup}" onclick="dashboardFilter('${g}')">${l}</button>`).join('')}</div><label class="dash-search">ค้นหาชื่อหรือ HN<input id="dashboard-search" type="search" placeholder="พิมพ์ชื่อหรือ HN…" oninput="renderDashboardDirectory()"></label><div id="dashboard-results" class="dash-results"></div></section>
  <div><section class="dash-panel"><div class="dash-heading"><div><h3>นัดหมาย 7 วัน</h3><p>วันนี้ถึง ${historyDate(last)}</p></div><span class="dash-tag">${appts.length} นัด</span></div>${appts.length?appts.slice(0,5).map(a=>{const p=pts.find(p=>p.id===a.patientId);return `<div class="dash-appointment"><span>${historyDate(a.date)}<small>${safe(a.time||'ไม่ระบุเวลา')}</small></span><strong>${safe(p?.name||'ไม่พบรายชื่อ')}<small>${safe(a.type||'')}</small></strong></div>`;}).join(''):'<div class="dash-empty">ไม่มีนัดหมายในช่วงนี้</div>'}<button class="dash-link" onclick="go('appt',qsel('appt'))">จัดการนัดหมายทั้งหมด →</button></section><section class="dash-backup"><h3>เก็บข้อมูลให้พร้อมใช้</h3><p>สำรองล่าสุด: ${backupDate&&Number.isFinite(backupDate.getTime())?safe(backupDate.toLocaleString('th-TH')):'ยังไม่มีประวัติสำรองในเบราว์เซอร์นี้'}</p><button class="btn btn-outline" onclick="openExportModal()">สำรอง / นำเข้าข้อมูล</button></section></div></div>`;
  renderDashboardDirectory();
};
