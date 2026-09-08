'use strict';
// Extension of the original application: existing storage keys and backup format remain usable.
const originalCalcCKD = calcCKD;
const historyFields=['ckd-pt','ckd-date','ckd-age','ckd-sex','ckd-cr','ckd-uacr','ckd-microalb','ckd-dipstick','ckd-k','ckd-fbs','ckd-hba1c','ckd-ast','ckd-alt','ckd-chol','ckd-tg','ckd-hdl','ckd-ldl'];
const historyMetrics={eGFR:['eGFR','mL/min/1.73m²'],cr:['Creatinine','mg/dL'],uacr:['UACR','mg/g'],microalb:['Urine Microalbumin','mg/L'],k:['Potassium','mmol/L'],fbs:['FBS / BS','mg/dL'],hba1c:['HbA1C','%'],ast:['AST','U/L'],alt:['ALT','U/L'],chol:['Cholesterol','mg/dL'],tg:['Triglyceride','mg/dL'],hdl:['HDL','mg/dL'],ldl:['LDL','mg/dL']};
const hx=id=>document.getElementById(id);
const safe=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const localToday=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
const fingerprint=()=>JSON.stringify(historyFields.map(id=>hx(id).value));
let editingHistory=null;
function cancelHistoryEdit(){editingHistory=null;invalidateCKD();const b=hx('history-edit-banner');if(b)b.remove();}
function editCKDHist(id){
  const row=DB.get('ckd-hist').find(r=>Number(r.id)===Number(id));if(!row)return;
  hx('ckd-pt').value=String(row.patientId);hx('ckd-pt').dispatchEvent(new Event('change'));
  hx('ckd-date').value=row.date||'';updateHistoryAge();
  if(row.ageAtScreening!=null)hx('ckd-age').value=row.ageAtScreening;
  if(row.sexAtScreening!=null)hx('ckd-sex').value=row.sexAtScreening;
  Object.keys(historyMetrics).filter(k=>k!=='eGFR').forEach(k=>hx('ckd-'+k).value=row[k]??'');hx('ckd-dipstick').value=row.dipstick||'';
  editingHistory=JSON.parse(JSON.stringify(row));invalidateCKD();
  const banner=document.createElement('div');banner.id='history-edit-banner';banner.className='history-preview';
  banner.innerHTML='กำลังแก้ไขผลตรวจ '+safe(historyDate(row.date))+' · ต้องคำนวณใหม่ก่อนบันทึก <button type="button" class="btn btn-outline btn-sm" onclick="cancelHistoryEdit()">ยกเลิกการแก้ไข</button>';
  hx('p-ckd').prepend(banner);banner.scrollIntoView({block:'center'});
}
function invalidateCKD(){hx('ckd-result').style.display='none';delete hx('ckd-result').dataset.res;delete hx('ckd-result').dataset.fingerprint;document.querySelectorAll('.hm-active').forEach(e=>e.classList.remove('hm-active'));}
function updateHistoryAge(){
  const p=DB.get('patients').find(p=>Number(p.id)===Number(hx('ckd-pt').value));
  const hasDob=p && CKDHistory.validDate(p.dob);
  hx('ckd-age').readOnly=!!hasDob;
  hx('ckd-age').value=hasDob?(CKDHistory.ageAt(p.dob,hx('ckd-date').value)??''):'';
  hx('ckd-age-hint').textContent=hasDob?'คำนวณจากวันเกิด ณ วันที่ตรวจ':'ไม่มีวันเกิด: กรุณาระบุอายุ ณ วันตรวจจากเอกสารผลตรวจ ไม่ใช่อายุปัจจุบัน';
}
calcCKD=function(){
  invalidateCKD();
  const p=DB.get('patients').find(p=>Number(p.id)===Number(hx('ckd-pt').value));
  if(!p)return toast('เลือกผู้ป่วยก่อนคำนวณ','error');
  const date=hx('ckd-date').value;
  if(!CKDHistory.validDate(date)||date>localToday())return toast('ระบุวันที่ตรวจจริง ไม่เกินวันนี้','error');
  if(CKDHistory.validDate(p.dob))hx('ckd-age').value=CKDHistory.ageAt(p.dob,date)??'';
  const age=Number(hx('ckd-age').value);
  if(!Number.isInteger(age)||age<18||age>120)return toast('ต้องระบุอายุ ณ วันตรวจ 18–120 ปีสำหรับเครื่องมือนี้','error');
  for(const id of historyFields.filter(id=>!['ckd-pt','ckd-date','ckd-age','ckd-sex','ckd-dipstick'].includes(id))){
    if(hx(id).value!=='' && (!Number.isFinite(Number(hx(id).value))||Number(hx(id).value)<0))return toast('ค่าแล็บต้องเป็นตัวเลขที่ไม่ติดลบ','error');
  }
  originalCalcCKD();
  const result=hx('ckd-result');
  if(!result.dataset.res)return;
  const res=JSON.parse(result.dataset.res);
  Object.assign(res,{cr:Number(hx('ckd-cr').value),ageAtScreening:age,sexAtScreening:hx('ckd-sex').value,ageSource:CKDHistory.validDate(p.dob)?'dob':'manual',patientId:Number(p.id),date});
  // Do not label missing quantitative ACR as confirmed A1.
  if(hx('ckd-uacr').value===''){
    res.aStage=null;res.risk=null;
    hx('r-a').textContent='—';
    hx('r-alert').textContent='ยังประเมินระดับ A และความเสี่ยงร่วม G/A ไม่ได้: ไม่มี UACR';
    hx('r-advice').textContent='เก็บผล Microalbumin และ Dipstick ตามชนิดตรวจเดิม แยกจาก UACR';
    document.querySelectorAll('.hm-active').forEach(e=>e.classList.remove('hm-active'));
  }
  result.dataset.res=JSON.stringify(res);result.dataset.fingerprint=fingerprint();
};
function synchronizeLatest(id){
  const pts=DB.get('patients'),p=pts.find(p=>Number(p.id)===Number(id));
  if(!p)return;
  p.ckdResult=CKDHistory.latest(DB.get('ckd-hist'),id);
  DB.set('patients',pts);
}
// Preserve an older profile-only result before recording a new visit.
function preserveLegacyResult(hist,p){
  const r=p.ckdResult;
  if(!r || hist.some(h=>Number(h.patientId)===Number(p.id)&&h.date===r.date&&Number(h.eGFR)===Number(r.eGFR)))return;
  hist.push({...r,id:Math.max(0,...hist.map(h=>Number(h.id)||0))+1,patientId:p.id,legacy:true,at:r.at||''});
}
saveCKDRes=function(){
  const result=hx('ckd-result');
  if(!result.dataset.res||result.dataset.fingerprint!==fingerprint())return toast('ข้อมูลเปลี่ยนแล้ว กรุณาคำนวณใหม่ก่อนบันทึก','error');
  const res=JSON.parse(result.dataset.res),pid=Number(hx('ckd-pt').value);
  const p=DB.get('patients').find(p=>Number(p.id)===pid);
  if(!p||res.patientId!==pid)return toast('กรุณาเลือกผู้ป่วยและคำนวณใหม่','error');
  if(editingHistory){
    const prior=editingHistory;
    const hist=DB.get('ckd-hist'),index=hist.findIndex(r=>r.id===prior.id&&r.patientId===pid);
    if(index<0||JSON.stringify(hist[index])!==JSON.stringify(prior))return toast('รายการเดิมเปลี่ยนแล้ว กรุณาเปิดแก้ไขอีกครั้ง','error');
    const {revisions,...snapshot}=prior;
    hist[index]={...res,id:prior.id,patientId:pid,at:prior.at,updatedAt:new Date().toISOString(),revisions:[...(revisions||[]),{...snapshot,revisedAt:new Date().toISOString()}]};
    try{DB.set('ckd-hist',hist);synchronizeLatest(pid);cancelHistoryEdit();renderCKDHist();updateDash();renderPtTable();renderReports();toast('แก้ไขผลตรวจแล้ว เก็บข้อมูลก่อนแก้ไว้ในประวัติ');}catch(e){toast('บันทึกไม่ครบ กรุณาตรวจพื้นที่จัดเก็บ','error');}
    return;
  }
  const commit=()=>{
    try{
      const hist=DB.get('ckd-hist');preserveLegacyResult(hist,p);
      hist.push({...res,id:Math.max(0,...hist.map(h=>Number(h.id)||0))+1,patientId:pid,at:new Date().toISOString()});
      DB.set('ckd-hist',hist);synchronizeLatest(pid);invalidateCKD();
      renderCKDHist();updateDash();renderPtTable();renderReports();toast('บันทึกวันที่ตรวจ '+res.date+' แล้ว');
    }catch(e){toast('บันทึกไม่ครบ กรุณาสำรองและตรวจพื้นที่จัดเก็บก่อนทำต่อ','error');}
  };
  if(CKDHistory.forPatient(DB.get('ckd-hist'),pid).some(h=>h.date===res.date)){
    confirm2('พบผลตรวจวันเดียวกัน','เพิ่มเป็นอีกครั้งของวันเดียวกัน โดยเก็บผลเดิมไว้ด้วยหรือไม่?',commit);
  }else commit();
};
delCKDHist=function(id){
  const row=DB.get('ckd-hist').find(r=>Number(r.id)===Number(id));if(!row)return;
  confirm2('ลบผลตรวจวันที่ '+(row.date||'ไม่ระบุ'),'ผลนี้จะถูกลบจากประวัติและกราฟ กรุณาสำรองข้อมูลก่อนลบ',()=>{
    try{DB.set('ckd-hist',DB.get('ckd-hist').filter(r=>Number(r.id)!==Number(id)));synchronizeLatest(row.patientId);renderCKDHist();updateDash();renderPtTable();renderReports();toast('ลบผลตรวจและปรับผลล่าสุดแล้ว');}
    catch(e){toast('ลบข้อมูลไม่สำเร็จ กรุณาตรวจพื้นที่จัดเก็บ','error');}
  });
};
function historyDate(date){return CKDHistory.validDate(date)?`${date.slice(8)}/${date.slice(5,7)}/${Number(date.slice(0,4))+543}`:'ไม่ระบุวันที่';}
function drawHistoryChart(rows,key){
  const pts=CKDHistory.points(rows,key),[label,unit]=historyMetrics[key];
  if(!pts.length)return '<div class="history-empty">ไม่มีค่า '+safe(label)+' ในช่วงปีที่เลือก (ไม่แทนข้อมูลที่ขาดด้วยศูนย์)</div>';
  const W=620,H=240,L=65,R=25,T=22,B=48;
  const times=pts.map(p=>Date.parse(p.date+'T12:00:00Z')),minT=Math.min(...times),maxT=Math.max(...times);
  const vals=pts.map(p=>p.value),lo=Math.min(...vals),hi=Math.max(...vals),pad=Math.max((hi-lo)*.15,hi*.05,1),minV=Math.max(0,lo-pad),maxV=hi+pad;
  const x=t=>maxT===minT?(L+W-R)/2:L+(t-minT)/(maxT-minT)*(W-L-R);
  const y=v=>H-B-(v-minV)/(maxV-minV)*(H-T-B);
  let svg=`<svg class="history-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${safe(label+' ('+unit+') เรียงตามวันที่ตรวจ ดูตัวเลขในตารางด้านล่าง')}">`;
  for(let i=0;i<=4;i++){const v=minV+(maxV-minV)*i/4;svg+=`<line x1="${L}" y1="${y(v)}" x2="${W-R}" y2="${y(v)}" stroke="#e2e8f0"/><text x="${L-8}" y="${y(v)+4}" text-anchor="end" fill="#475569" font-size="12">${v.toFixed(1)}</text>`;}
  svg+=`<polyline points="${pts.map((p,i)=>`${x(times[i])},${y(p.value)}`).join(' ')}" fill="none" stroke="#0e7c6b" stroke-width="2.5"/>`;
  pts.forEach((p,i)=>{svg+=`<circle cx="${x(times[i])}" cy="${y(p.value)}" r="5" fill="#0e7c6b"><title>${safe(historyDate(p.date)+': '+p.value+' '+unit)}</title></circle>`;});
  [0,pts.length-1].filter((v,i,a)=>a.indexOf(v)===i).forEach(i=>{svg+=`<text x="${x(times[i])}" y="${H-18}" text-anchor="${pts.length===1?'middle':i===0?'start':'end'}" font-size="12" fill="#475569">${historyDate(pts[i].date)}</text>`;});
  return `<div class="history-note">${safe(label)} · ${safe(unit)} · ${pts.length} ผลตรวจ${pts.length===1?' — ต้องมีอย่างน้อย 2 ครั้งเพื่อดูแนวโน้ม':''}</div><div class="history-scroll">${svg}</svg></div>`;
}
renderCKDHist=function(){
  const container=hx('ckd-hist');if(!container)return;
  const pid=Number(hx('ckd-pt').value),p=DB.get('patients').find(p=>Number(p.id)===pid);
  if(!p){container.innerHTML='<div class="history-empty">เลือกผู้ป่วยด้านซ้ายเพื่อดูประวัติรายปีและกราฟ</div>';return;}
  let rows=CKDHistory.forPatient(DB.get('ckd-hist'),pid);
  if(p.ckdResult&&!rows.some(h=>h.date===p.ckdResult.date&&Number(h.eGFR)===Number(p.ckdResult.eGFR)))rows=CKDHistory.chronological([...rows,{...p.ckdResult,patientId:pid,legacy:true,id:null}]);
  const priorYear=hx('history-year')?.value||'',key=hx('history-metric')?.value||'eGFR';
  const years=[...new Set(rows.filter(r=>CKDHistory.validDate(r.date)).map(r=>r.date.slice(0,4)))].sort().reverse();
  const selected=years.includes(priorYear)?priorYear:'';
  const filtered=selected?rows.filter(r=>r.date?.startsWith(selected+'-')):rows;
  const [label,unit]=historyMetrics[key];
  container.innerHTML=`<div class="history-summary"><strong>${safe(p.name)}</strong> · HN ${safe(p.hn)}<br>${rows.length} ผลตรวจ · ${years.length} ปีที่มีข้อมูล</div>
    <div class="history-toolbar"><label>ปีที่ตรวจ (พ.ศ.)<select id="history-year" class="form-input" onchange="renderCKDHist()"><option value="">ทุกปี</option>${years.map(y=>`<option value="${y}" ${y===selected?'selected':''}>${Number(y)+543}</option>`).join('')}</select></label>
    <label>ค่าที่แสดงในกราฟ<select id="history-metric" class="form-input" onchange="renderCKDHist()">${Object.entries(historyMetrics).map(([k,v])=>`<option value="${k}" ${k===key?'selected':''}>${safe(v[0])} (${safe(v[1])})</option>`).join('')}</select></label></div>
    ${drawHistoryChart(filtered,key)}<p class="history-note">แสดงแต่ละครั้งตามวันที่ตรวจจริง ไม่เฉลี่ยผลทั้งปี · ผลเก่าที่ไม่มีค่าแล็บต้นทางจะแสดง “—”</p>
    <div class="history-scroll"><table class="history-table"><caption>ผลตรวจ ${safe(label)} (${safe(unit)})</caption><thead><tr><th>วันที่ตรวจ (พ.ศ.)</th><th>${safe(label)}</th><th>G / A ที่บันทึก</th><th>รายละเอียด</th></tr></thead><tbody>${[...filtered].reverse().map(r=>`<tr><td>${historyDate(r.date)}</td><td>${safe(r[key]??'—')}</td><td>${safe(r.gStage||'—')} / ${safe(r.aStage||'ไม่ระบุ')}</td><td><details><summary>ดูผลทั้งหมด</summary><div class="history-detail">${Object.entries(historyMetrics).map(([k,v])=>`${safe(v[0])}: ${safe(r[k]??'—')} ${safe(v[1])}`).join('<br>')}<br>อายุ ณ วันตรวจ: ${safe(r.ageAtScreening??'ไม่บันทึก')}<br>บันทึกเมื่อ: ${safe(r.at||'ไม่ระบุ')}${r.legacy?'<br>ผลจากข้อมูลเดิม':''}${(r.revisions||[]).map(v=>'<br>ก่อนแก้ '+safe(v.revisedAt)+': วันที่ '+safe(v.date)+' · eGFR '+safe(v.eGFR)+'<br>'+Object.keys(historyMetrics).filter(k=>k!=='eGFR').map(k=>safe(k)+': '+safe(v[k]??'—')).join(' · ')).join('')}</div></details>${r.id!=null?`<button class="btn btn-outline btn-sm" onclick="editCKDHist(${Number(r.id)})">แก้ไข</button><button class="btn btn-danger btn-sm" onclick="delCKDHist(${Number(r.id)})" aria-label="ลบผลตรวจ ${historyDate(r.date)}">ลบ</button>`:''}</td></tr>`).join('')||'<tr><td colspan="4">ยังไม่มีผลตรวจ</td></tr>'}</tbody></table></div>`;
};
window.addEventListener('DOMContentLoaded',()=>{
  hx('ckd-date').value=localToday();hx('ckd-date').max=localToday();
  hx('ckd-pt').addEventListener('change',()=>{
    cancelHistoryEdit();
    historyFields.filter(id=>!['ckd-pt','ckd-date','ckd-age','ckd-sex'].includes(id)).forEach(id=>hx(id).value='');
    updateHistoryAge();invalidateCKD();renderCKDHist();
  });
  hx('ckd-date').addEventListener('change',()=>{updateHistoryAge();invalidateCKD();});
  historyFields.forEach(id=>['input','change'].forEach(event=>hx(id).addEventListener(event,invalidateCKD)));
  hx('toast').setAttribute('role','status');hx('toast').setAttribute('aria-live','polite');
  updateHistoryAge();renderCKDHist();
});
