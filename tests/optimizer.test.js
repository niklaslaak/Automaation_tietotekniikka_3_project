'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const M=require('../scheduler');
const sample=fs.readFileSync(path.join(__dirname,'../data/esimerkkihinnat.csv'),'utf8');
const rows=values=>values.map((price,i)=>({time:Date.UTC(2026,10,4)+i*M.SLOT_MS,price:String(price)}));
const d=(extra={})=>({name:'A',power:1,hours:.5,...extra});
const slots=r=>r.devices[0].slots.map(s=>s.index);

test('Tuntiaineisto: alkuperäinen 1 kW / 2 h, klo 01–03 ja 0,08 €',()=>{
 const data=M.parseCsv(sample,60),r=M.optimize(data,[d({hours:2})],3);
 assert.equal(data.length,16);assert.equal(r.cost,.08);assert.equal(r.energy,2);
 assert.equal(M.formatTime(r.devices[0].start),'04.11.2026 klo 01:00');
 assert.equal(M.formatTime(r.devices[0].end),'04.11.2026 klo 03:00');
});
test('15 minuutin CSV ja puolen tunnin käyttö',()=>{
 const data=M.parseCsv('aika;hinta_snt_kwh\n2026-11-04T00:00;10\n2026-11-04T00:15;2\n2026-11-04T00:30;3',15);
 assert.deepEqual(slots(M.optimize(data,[d()],1)),[1,2]);
 assert.equal(M.optimize(data,[d()],1).cost,.0125);
});
test('Pilkottu käyttö ohittaa kalliin vartin',()=>{
 const r=M.optimize(rows([1,20,2,30]),[d({mode:'split'})],1);
 assert.deepEqual(slots(r),[0,2]);assert.equal(r.devices[0].periods.length,2);assert.equal(r.cost,.0075);
});
test('Yhtenäinen käyttö ei saa taukoja',()=>{
 const r=M.optimize(rows([1,20,2,30]),[d()],1);
 assert.deepEqual(slots(r),[0,1]);assert.equal(r.devices[0].periods.length,1);
});
test('Kahden laitteen yhteisoptimointi noudattaa tehorajaa',()=>{
 const r=M.optimize(rows([1,2,10,20]),[d(),d({name:'B'})],1);
 assert.deepEqual(r.load,[1,1,1,1]);assert.equal(r.cost,33/400);assert.equal(r.energy,1);
});
test('Yhteisoptimointi välttää laitejärjestyksessä ahneen valinnan',()=>{
 const r=M.optimize(rows([1,2,100]),[d({hours:.25}),d({name:'B',power:2,hours:.5})],2);
 // A must use the expensive final slot so B fits into the cheap first two together.
 assert.deepEqual(r.devices[0].slots.map(s=>s.index),[2]);
 assert.deepEqual(r.devices[1].slots.map(s=>s.index),[0,1]);assert.equal(r.cost,106/400);
});
test('Yhtenäinen vaihteleva teho säilyttää järjestyksen',()=>{
 const r=M.optimize(rows([10,1,30]),[d({profile:[2,.5]})],3);
 assert.deepEqual(slots(r),[1,2]);assert.equal(r.cost,17/400);assert.equal(r.energy,.625);
});
test('Pilkottu vaihteleva profiili säilyttää järjestyksen ja nollatehovaiheen',()=>{
 const r=M.optimize(rows([2,50,40,1]),[d({profile:[2,0,.5],mode:'split'})],3);
 assert.deepEqual(slots(r),[0,1,3]);assert.equal(r.cost,4.5/400);
 assert.deepEqual(r.devices[0].slots.map(s=>s.power),[2,0,.5]);
});
test('Riippumattomien laitteiden ratkaisu vastaa yhteiskustannusta',()=>{
 const r=M.optimize(rows([2,1,10,4]),[d(),d({power:2,mode:'split'})],3);
 assert.equal(r.peak,3);assert.equal(r.cost,3/400+6/400);
});
test('Desimaaliteho, negatiiviset hinnat ja tarkka tasahinta',()=>{
 const r=M.optimize(rows([-.1,-.2,-.3,0]),[d({power:'1,5',mode:'split'})],2);
 assert.equal(r.cost,-.001875);assert.deepEqual(slots(r),[1,2]);
 const tie=M.optimize(rows([.1,.2,.3,0]),[d()],1);
 assert.deepEqual(slots(tie),[0,1]);
});
test('Tasahinta suosii aikaisempaa käyttöä',()=>{
 assert.deepEqual(slots(M.optimize(rows([0,0,0,0]),[d()],1)),[0,1]);
 assert.deepEqual(slots(M.optimize(rows([1,1,1,1]),[d({mode:'split'})],1)),[0,1]);
});
test('Lopetuspäivä vaihtuu keskiyöllä',()=>{
 const r=M.optimize([{time:Date.UTC(2026,11,31,23,45),price:'1'}],[d({hours:.25})],1);
 assert.equal(M.formatTime(r.devices[0].end),'01.01.2027 klo 00:00');
});
test('Liian pitkä käyttöaika ja mahdoton yhteiskuorma hylätään',()=>{
 assert.throws(()=>M.optimize(rows([1,2]),[d({hours:1})],1),/ylittää/);
 assert.throws(()=>M.optimize(rows([1,2]),[d(),d()],1),/mahdu|löytynyt/);
 assert.throws(()=>M.optimize(rows([1,2]),[d({power:2})],1),/tehorajan/);
});
test('Virheelliset tehot, ajat ja profiilit hylätään',()=>{
 for(const power of ['',0,-1,'NaN','Infinity',1001,'0.0001'])assert.throws(()=>M.optimize(rows([1,2]),[d({power})],3));
 for(const hours of ['',0,-1,.1,.26,NaN,'1e3'])assert.throws(()=>M.optimize(rows([1,2]),[d({hours})],3));
 for(const profile of [[0,0],[],[1,2,3],['bad'],[Infinity],'1;;2'])assert.throws(()=>M.optimize(rows([1,2]),[d({profile})],3));
});
test('Laite- ja aineistorajat sekä valinnan validointi',()=>{
 assert.throws(()=>M.optimize(rows([1]),[],3));
 assert.throws(()=>M.optimize(rows([1]),Array(5).fill(d({hours:.25})),3));
 assert.throws(()=>M.optimize(rows([1,2]),[d({mode:'bad'})],3));
 assert.throws(()=>M.optimize(rows([1,2]),[d()],0));
 assert.throws(()=>M.parseCsv('aika;hinta_snt_kwh\n2026-11-04T00:00;2',30));
 assert.throws(()=>M.optimize(rows(Array(385).fill(1)),[d()],3));
});
test('CSV:n BOM ja Windows-rivinvaihdot toimivat',()=>{
 assert.equal(M.parseCsv('\ufeff'+sample.replace(/\n/g,'\r\n'),60).length,16);
});
test('CSV:n virheet, väärä jakso, puuttuva vartti ja duplikaatti',()=>{
 for(const text of ['', 'aika;hinta_snt_kwh', 'aika;hinta\n2026-11-04T00:00;1',sample.replace('01:00','02:00'),sample.replace('01:00','00:00'),sample.replace(';10',';abc'),sample.replace(';10',';1,5'),sample.replace(';10',';1;2'),sample.replace('2026-11-04T01','\n2026-11-04T01')])assert.throws(()=>M.parseCsv(text,60));
 assert.throws(()=>M.parseCsv(sample,15),/peräkkäisiä/);
 assert.throws(()=>M.parseCsv('x'.repeat(1000001),15),/1 Mt/);
});
test('Päivämäärät ja vartin alkamisajat tarkistetaan',()=>{
 for(const time of ['2026-02-30T00:00','2026-13-01T00:00','2026-11-04T24:00','2026-11-04T00:01','0000-01-01T00:00'])assert.throws(()=>M.parseCsv(`aika;hinta_snt_kwh\n${time};1`,15));
});
test('Työmääräraja ei anna keskeneräistä tulosta',()=>{
 assert.throws(()=>M.optimize(rows([1,2,3,4]),[d()],1,{maxTransitions:1}),/liian laaja/);
 assert.throws(()=>M.optimize(rows([1,2,3,4]),[d()],1,{maxRecords:1}),/liian laaja/);
});
test('Asynkroninen laskenta voidaan perua ja se antaa saman tuloksen',async()=>{
 const data=rows([1,20,2,30]);let cancel=false;
 await assert.rejects(M.optimizeAsync(data,[d()],1,{cancelled:()=>cancel,onProgress:()=>{cancel=true;}}),{name:'AbortError'});
 assert.deepEqual(await M.optimizeAsync(data,[d({mode:'split'})],1),M.optimize(data,[d({mode:'split'})],1));
});

// Independent exhaustive reference: enumerate each device's possible placements, then
// compare every combination. No scheduler states or transition logic is reused here.
function enumerate(profile,n,mode){
 const output=[];
 function go(indices,start){if(indices.length===profile.length){output.push(indices);return;}
  for(let t=start;t<n;t++)go([...indices,t],t+1);
 }
 if(mode==='continuous')for(let s=0;s+profile.length<=n;s++)output.push(profile.map((_,i)=>s+i));else go([],0);
 return output;
}
function brute(prices,devices,capacity){
 let best=Infinity;
 function go(d,load,cost){
  if(d===devices.length){best=Math.min(best,cost);return;}
  for(const indices of enumerate(devices[d].profile,prices.length,devices[d].mode)){
   const next=load.slice();let value=cost;
   indices.forEach((t,q)=>{next[t]+=devices[d].profile[q];value+=prices[t]*devices[d].profile[q]/400;});
   if(next.every(p=>p<=capacity))go(d+1,next,value);
  }
 }
 go(0,Array(prices.length).fill(0),0);return best;
}
test('Yhteisoptimointi vastaa kaikkien aikataulujen vertailua 40 tapauksessa',()=>{
 let seed=123456;const rand=n=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed%n;};
 for(let trial=0;trial<40;trial++){
  const prices=Array.from({length:5},()=>rand(20)-5),capacity=2+rand(3);
  const devices=Array.from({length:2+trial%2},(_,i)=>({name:`D${i}`,profile:[1+rand(2),rand(2)],mode:rand(2)?'continuous':'split'}));
  const expected=brute(prices,devices,capacity);
  if(expected===Infinity)assert.throws(()=>M.optimize(rows(prices),devices,capacity));
  else assert.ok(Math.abs(M.optimize(rows(prices),devices,capacity).cost-expected)<1e-12,`trial ${trial}`);
 }
});
