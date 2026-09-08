const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const H=require('../history-core.js');
assert.equal(H.ageAt('1980-09-10','2024-09-09'),43);
assert.equal(H.ageAt('1980-09-10','2024-09-10'),44);
assert.equal(H.validDate('2025-02-29'),false);
assert.equal(H.validDate('2024-02-29'),true);
const rows=[{id:1,patientId:1,date:'2026-06-14',eGFR:90},{id:2,patientId:2,date:'2026-07-01',eGFR:70},{id:3,patientId:1,date:'2025-08-07',eGFR:80},{id:4,patientId:1,date:'2024-03-01',eGFR:null}];
assert.equal(H.latest(rows,1).id,1);
assert.deepEqual(H.points(H.forPatient(rows,1),'eGFR').map(p=>p.value),[80,90]);
assert.deepEqual(H.points([{date:'2024-01-01',uacr:0},{date:'2024-02-01',uacr:null}],'uacr').map(p=>p.value),[0]);
const html=fs.readFileSync('index.html','utf8');
assert.equal((html.match(/id="ckd-date"/g)||[]).length,1);
for(const match of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))new vm.Script(match[1]);
const script=fs.readFileSync('history.js','utf8');
new vm.Script(script);
let data={patients:[{id:1,name:'SAMPLE A',hn:'SAMPLE-A',ckdResult:{date:'2026-06-14',eGFR:90}}],'ckd-hist':[{id:1,patientId:1,date:'2026-06-14',eGFR:90}]};
const nodes=new Proxy({}, {get:(target,key)=>target[key]??(target[key]={value:'',dataset:{},style:{},textContent:'',innerHTML:''})});
let callback;
const context={CKDHistory:H,calcCKD:()=>{},saveCKDRes:()=>{},delCKDHist:()=>{},renderCKDHist:()=>{},window:{addEventListener:()=>{}},document:{getElementById:id=>nodes[id],querySelectorAll:()=>[]},DB:{get:k=>structuredClone(data[k]||[]),set:(k,v)=>{data[k]=structuredClone(v)}},toast:()=>{},confirm2:(a,b,fn)=>callback=fn,updateDash:()=>{},renderPtTable:()=>{},renderReports:()=>{}};
vm.createContext(context);vm.runInContext(script,context);
// Exercise real save logic: backdated record cannot overwrite a newer clinical date.
nodes['ckd-pt'].value='1';nodes['ckd-date'].value='2025-08-07';
nodes['ckd-result'].dataset.res=JSON.stringify({patientId:1,date:'2025-08-07',eGFR:80,cr:1.2});
vm.runInContext("document.getElementById('ckd-result').dataset.fingerprint=fingerprint();saveCKDRes();",context);
assert.equal(data['ckd-hist'].length,2);assert.equal(data.patients[0].ckdResult.eGFR,90);
// Invalidated result cannot be saved twice, or against a different patient.
vm.runInContext('saveCKDRes()',context);assert.equal(data['ckd-hist'].length,2);
nodes['ckd-result'].dataset.res=JSON.stringify({patientId:1,date:'2025-08-07',eGFR:80});nodes['ckd-pt'].value='2';
vm.runInContext("document.getElementById('ckd-result').dataset.fingerprint=fingerprint();saveCKDRes();",context);
assert.equal(data['ckd-hist'].length,2);
// Same-day entries require explicit confirmation; multiple tests per year remain separate.
nodes['ckd-pt'].value='1';
nodes['ckd-result'].dataset.res=JSON.stringify({patientId:1,date:'2025-08-07',eGFR:81,cr:1.19});
vm.runInContext("document.getElementById('ckd-result').dataset.fingerprint=fingerprint();saveCKDRes();",context);
assert.equal(data['ckd-hist'].length,2);callback();assert.equal(data['ckd-hist'].length,3);
assert.equal(data.patients[0].ckdResult.eGFR,90);
// Deleting newest record selects next latest actual screening date.
vm.runInContext('delCKDHist(1)',context);callback();assert.equal(data.patients[0].ckdResult.eGFR,81);
// Rendering isolates patients and escapes names.
nodes['ckd-pt'].value='1';data.patients[0].name='<b>SAMPLE</b>';
vm.runInContext('renderCKDHist()',context);assert.ok(nodes['ckd-hist'].innerHTML.includes('&lt;b&gt;SAMPLE&lt;/b&gt;'));
// Editing updates the same visit, preserves a revision and recalculates latest.
nodes['history-edit-banner']=null;
nodes['ckd-result'].dataset.res=JSON.stringify({patientId:1,date:'2024-01-01',eGFR:65,cr:1.3});
vm.runInContext("editingHistory=JSON.parse(JSON.stringify(DB.get('ckd-hist')[1]));document.getElementById('ckd-result').dataset.fingerprint=fingerprint();saveCKDRes();",context);
assert.equal(data['ckd-hist'].length,2);
assert.equal(data['ckd-hist'][1].eGFR,65);
assert.equal(data['ckd-hist'][1].revisions[0].eGFR,81);
assert.equal(data.patients[0].ckdResult.eGFR,80);
console.log('PASS: date validation, historical age, patient isolation, chronological ordering, missing values, zero values, save guard, latest-result selection, deletion, escaping, and script syntax');
