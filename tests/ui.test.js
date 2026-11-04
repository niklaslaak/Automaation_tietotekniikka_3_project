"use strict";
// Kevyt tapahtumakäsittelyn testi, ei oikea selain tai ulkoasun tarkistus.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const code = fs.readFileSync(path.join(__dirname, '../script.js'), 'utf8');
const sample = fs.readFileSync(path.join(__dirname, '../data/esimerkkihinnat.csv'), 'utf8');
function setup() {
  const elements = new Map();
  const get = id => {
    if (!elements.has(id)) elements.set(id, {hidden:false,disabled:false,textContent:'',value:'',files:[],handlers:{},addEventListener(event,handler){this.handlers[event]=handler;}});
    return elements.get(id);
  };
  get('power').value='1';
  get('duration').value='2';
  vm.runInNewContext(code, {document:{getElementById:get},Intl,TextEncoder});
  const submit = () => get('optimizer').handlers.submit({preventDefault(){}});
  const upload = async text => {
    get('prices').files=[{name:'test.csv',size:text.length,text:async()=>text}];
    await get('prices').handlers.change();
  };
  return {get,submit,upload};
}
test('V1/V5: tuonti ja tuloksen esitys', async () => {
  const {get,submit,upload}=setup();
  await upload(sample);
  assert.match(get('file-status').textContent,/4 tuntia/);
  submit();
  assert.equal(get('result').hidden,false);
  assert.match(get('cost').textContent,/0,08/);
  assert.equal(get('energy').textContent,'2 kWh');
  assert.equal(get('end').textContent,'04.11.2026 klo 03:00');
});
test('V3/V5: syötteen muuttaminen tyhjentää tuloksen ja liian pitkä aika hylätään', async () => {
  const {get,submit,upload}=setup(); await upload(sample); submit();
  get('duration').value='5'; get('duration').handlers.input();
  assert.equal(get('result').hidden,true); submit();
  assert.match(get('error').textContent,/ylittää/);
  assert.equal(get('error').hidden,false);
});
test('V2/V5: virheellinen tuonti poistaa aiemman tuloksen eikä jätä vanhaa aineistoa', async () => {
  const {get,submit,upload}=setup(); await upload(sample); submit();
  await upload('virheellinen');
  assert.equal(get('result').hidden,true);
  assert.equal(get('calculate').disabled,true);
  submit(); assert.match(get('error').textContent,/Lataa ensin/);
});
test('V5: hidas aiempi tiedostonluku ei korvaa uudempaa valintaa', async () => {
  const {get,upload}=setup();
  let finish;
  get('prices').files=[{name:'old.csv',size:10,text:()=>new Promise(resolve=>{finish=resolve;})}];
  const pending = get('prices').handlers.change();
  await upload('virheellinen'); finish(sample); await pending;
  assert.equal(get('calculate').disabled,true);
  assert.equal(get('file-status').textContent,'Hintatiedostoa ei hyväksytty.');
});
