'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const text=file=>fs.readFileSync(path.join(root,file),'utf8');
const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function setup(t){
 const {Window}=await import('happy-dom');
 const w=new Window({url:'http://localhost/',settings:{disableJavaScriptFileLoading:true,disableCSSFileLoading:true}});
 t.after(()=>w.happyDOM.close());
 w.TextEncoder=TextEncoder;
 w.document.write(text('index.html'));
 w.eval(text('scheduler.js')+'\n'+text('script.js'));
 const get=id=>w.document.getElementById(id);
 const change=(node,value,type='input')=>{node.value=value;node.dispatchEvent(new w.Event(type,{bubbles:true}));};
 const wait=async predicate=>{for(let i=0;i<500;i++){if(predicate())return;await delay(5);}throw Error('UI timed out: '+get('error').textContent);};
 const upload=async data=>{
  Object.defineProperty(get('prices'),'files',{configurable:true,value:[{name:'test.csv',size:data.length,text:async()=>data}]});
  get('prices').dispatchEvent(new w.Event('change'));await wait(()=>!get('file-status').textContent.includes('Luetaan'));
 };
 const submit=()=>get('optimizer').dispatchEvent(new w.Event('submit',{cancelable:true}));
 const calculate=async()=>{submit();await wait(()=>get('progress').hidden);};
 return {w,get,change,wait,upload,submit,calculate};
}
test('DOM: tuntituonti, tulos, kuvaajan valinta ja tehot',async t=>{
 const {get,upload,calculate}=await setup(t);await upload(text('data/esimerkkihinnat.csv'));await calculate();
 assert.equal(get('result').hidden,false);assert.match(get('cost').textContent,/0,08/);
 assert.equal(get('start').textContent,'04.11.2026 klo 01:00');assert.equal(get('energy').textContent,'2 kWh');
 assert.equal(get('price-chart').querySelectorAll('.chart-bar').length,16);
 assert.equal(get('price-chart').querySelectorAll('.selected').length,8);
});
test('DOM: pilkottu käyttö ja tehoprofiilin valinta',async t=>{
 const {w,get,change,upload,calculate}=await setup(t);
 change(get('interval'),'15','change');
 await upload('aika;hinta_snt_kwh\n2026-11-04T00:00;2\n2026-11-04T00:15;50\n2026-11-04T00:30;1');
 const card=get('devices').firstElementChild,check=card.querySelector('.use-profile');
 check.checked=true;check.dispatchEvent(new w.Event('change'));
 assert.equal(card.querySelector('.power').disabled,true);
 change(card.querySelector('.profile'),'2; 0,5');change(card.querySelector('.mode'),'split');
 await calculate();assert.equal(get('result').hidden,false);assert.match(get('energy').textContent,/0,625/);
 assert.equal(get('schedules').querySelectorAll('ul li').length,2);
});
test('DOM: kaksi laitetta, tehoraja, lisääminen ja poistaminen',async t=>{
 const {get,change,upload,calculate}=await setup(t);await upload(text('data/esimerkkihinnat.csv'));
 get('add-device').click();change(get('capacity'),'1');await calculate();
 assert.equal(get('schedules').children.length,2);assert.equal(get('peak').textContent,'1 / 1 kW');
 get('devices').lastElementChild.querySelector('.remove-device').click();assert.equal(get('result').hidden,true);
});
test('DOM: syötteen muutos ja virheellinen CSV poistavat tulokset',async t=>{
 const {get,change,upload,calculate}=await setup(t);await upload(text('data/esimerkkihinnat.csv'));await calculate();
 change(get('devices').querySelector('.duration'),'5');assert.equal(get('result').hidden,true);await calculate();
 assert.match(get('error').textContent,/ylittää/);await upload('invalid');
 assert.equal(get('calculate').disabled,true);assert.equal(get('chart-wrapper').hidden,true);
 assert.equal(get('price-chart').querySelectorAll('.selected').length,0);
});
test('DOM: vanha tiedostonluku ei syrjäytä uudempaa',async t=>{
 const {w,get,upload}=await setup(t);let finish;
 Object.defineProperty(get('prices'),'files',{configurable:true,value:[{name:'slow.csv',size:100,text:()=>new Promise(r=>{finish=r;})}]});
 get('prices').dispatchEvent(new w.Event('change'));await upload('invalid');finish(text('data/esimerkkihinnat.csv'));await delay(20);
 assert.equal(get('calculate').disabled,true);assert.match(get('file-status').textContent,/ei hyväksytty/);
});
test('DOM: laskennan peruminen ja syötteiden muutos estävät myöhäisen tuloksen',async t=>{
 const {get,upload,submit,change}=await setup(t);await upload(text('data/esimerkkihinnat.csv'));
 submit();get('cancel').click();await delay(50);assert.equal(get('result').hidden,true);assert.equal(get('cancel').hidden,true);
 submit();change(get('capacity'),'2');await delay(50);assert.equal(get('result').hidden,true);
});
test('DOM: hintajakson vaihto tyhjentää aineiston, esimerkki toimii',async t=>{
 const {get,change,calculate}=await setup(t);get('example').click();await calculate();assert.equal(get('result').hidden,false);
 change(get('interval'),'60','change');assert.equal(get('calculate').disabled,true);assert.equal(get('result').hidden,true);
});
test('DOM: nimet esitetään tekstinä eikä HTML:nä',async t=>{
 const {get,change,calculate}=await setup(t);get('example').click();
 change(get('devices').querySelector('.name'),'<img src=x onerror=alert(1)>');await calculate();
 assert.equal(get('schedules').querySelector('img'),null);assert.match(get('schedules').textContent,/<img/);
});
