(function(root){
  'use strict';
  const validDate = value => {
    if(!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return false;
    const date = new Date(value + 'T12:00:00Z');
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0,10) === value;
  };
  const chronological = rows => [...rows].sort((a,b) => (a.date || '').localeCompare(b.date || '') || (a.at || '').localeCompare(b.at || '') || Number(a.id)-Number(b.id));
  const forPatient = (rows, id) => chronological(rows.filter(r => Number(r.patientId) === Number(id)));
  function latest(rows,id){return forPatient(rows,id).filter(r=>validDate(r.date)).at(-1) || null;}
  function points(rows,key){
    return chronological(rows).filter(r=>validDate(r.date)).map(r=>({date:r.date,value:r[key],id:r.id})).filter(p=>p.value!==null && p.value!==undefined && p.value!=='' && Number.isFinite(Number(p.value))).map(p=>({...p,value:Number(p.value)}));
  }
  function ageAt(dob,date){
    if(!validDate(dob)||!validDate(date)||dob>date)return null;
    const [y,m,d]=dob.split('-').map(Number),[ry,rm,rd]=date.split('-').map(Number);
    return ry-y-((rm<m || (rm===m && rd<d))?1:0);
  }
  const api={validDate,chronological,forPatient,latest,points,ageAt};
  root.CKDHistory=api;
  if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
