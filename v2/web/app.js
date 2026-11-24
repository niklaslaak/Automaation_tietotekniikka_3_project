"use strict";
const $ = id => document.getElementById(id);
const nf = new Intl.NumberFormat('fi-FI', {maximumFractionDigits: 4});
const euro = new Intl.NumberFormat('fi-FI', {style:'currency',currency:'EUR'});
const dt = new Intl.DateTimeFormat('fi-FI', {timeZone:'Europe/Helsinki',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',timeZoneName:'shortOffset'});
const fmt = value => dt.format(new Date(value));
let rows = [], source = '', result = null, revision = 0, loggedIn = false, simulationTimer = null;
let priceRequest = 0, live = false;

function node(tag, text, className) {
  const el = document.createElement(tag);
  if (text !== undefined) el.textContent = text;
  if (className) el.className = className;
  return el;
}
function announce(text) { $('notice').textContent = text; }
function error(err) { $('error').textContent = err.message || String(err); $('error').hidden = false; }
function clearError() { $('error').hidden = true; }
async function api(path, payload) {
  const response = await fetch('/api/' + path, payload === undefined ? {} : {
    method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)
  });
  const data = await response.json();
  if (!response.ok) {
    if (response.status === 401) setUser(null);
    throw new Error(data.error || 'Pyyntö epäonnistui.');
  }
  return data;
}
function action(id, fn) {
  $(id).addEventListener('click', async () => {
    clearError(); $(id).disabled = true;
    try { await fn(); } catch(e) { error(e); }
    finally { $(id).disabled = false; syncButtons(); }
  });
}
function stopSimulation() {
  clearInterval(simulationTimer); simulationTimer = null;
  $('simulate').textContent = 'Toista simulaatio';
}
function invalidate() {
  revision++; result = null; $('results').hidden = true;
  stopSimulation(); clearError();
}
function syncButtons() {
  $('optimize').disabled = !rows.length;
  $('save').disabled = !rows.length;
  $('forecast').disabled = rows.length < 96 || rows.length > 288 || rows.some(r=>r.kind==='forecast');
  $('add-device').disabled = $('devices').children.length >= 6;
}
function setUser(name) {
  loggedIn = Boolean(name);
  $('auth').hidden = loggedIn; $('workspace').hidden = !loggedIn;
  $('account-name').textContent = name ? 'Kirjautunut: ' + name : '';
  if (!name) {
    priceRequest++; rows = []; source = ''; live = false; invalidate();
    $('devices').replaceChildren(); $('saved-plans').replaceChildren();
    $('auto-prices').checked = false; $('source').textContent = 'Valitse hintatiedot.';
    $('plan-name').value = ''; $('password').value = '';
    for (const id of ['transfer','tax','margin','fixed']) $(id).value='0';
    $('capacity').value='3'; $('allow-forecast').checked=false;
    renderPrices();
  }
}
async function afterLogin() {
  const data = await api('me'); setUser(data.user);
  $('password').value='';
  if (data.user) { if (!$('devices').children.length) addDevice(); await listPlans(); }
}
$('login-form').addEventListener('submit', async event => {
  event.preventDefault(); clearError();
  try { await api('login',{name:$('username').value,password:$('password').value}); await afterLogin(); }
  catch(e) { error(e); }
});
action('register',async()=>{
  if (!$('login-form').reportValidity()) return;
  const credentials = {name:$('username').value,password:$('password').value};
  await api('register',credentials); await api('login',credentials); await afterLogin();
  announce('Paikallinen tili luotu. Kokeile ensin esimerkkiaineistoa.');
});
action('logout',async()=>{await api('logout',{}); setUser(null); announce('Kirjauduit ulos.');});

function boundary(index) {
  if (index < rows.length) return rows[index].time;
  return new Date(new Date(rows.at(-1).time).getTime()+900000).toISOString();
}
function defaultStart() {
  if (!live) return 0;
  const start = rows.findIndex(r=>new Date(r.time).getTime()>=Date.now());
  return start < 0 ? Math.max(0,rows.length-1) : start;
}
function addWindow(card, limits) {
  const group = card.querySelector('.windows');
  if (group.children.length >= 12) return error(new Error('Enintään 12 käyttöikkunaa laitteelle.'));
  const windowEl = node('div',undefined,'window');
  const start = document.createElement('select'), end = document.createElement('select');
  start.className='window-start'; end.className='window-end';
  if (!rows.length) {
    start.append(new Option('Lataa ensin hintatiedot','0'));
    end.append(new Option('Lataa ensin hintatiedot','0'));
  } else {
    for(let i=0;i<rows.length;i++) start.append(new Option(fmt(boundary(i)),String(i)));
    for(let i=1;i<=rows.length;i++) end.append(new Option(fmt(boundary(i)),String(i)));
  }
  start.value=String(limits?.[0]??defaultStart()); end.value=String(limits?.[1]??rows.length);
  const a=node('label','Sallittu aloitus'), b=node('label','Viimeistään valmis');
  a.append(start); b.append(end); windowEl.append(a,b);
  const remove=node('button','Poista ikkuna','secondary'); remove.type='button';
  remove.addEventListener('click',()=>{if(group.children.length>1){windowEl.remove();invalidate();}});
  windowEl.append(remove); group.append(windowEl);
}
function addDevice(data={}) {
  if ($('devices').children.length>=6) return;
  const card=node('div',undefined,'device');
  card.innerHTML=`<div class="fields"><label>Laitteen nimi<input class="name" maxlength="60"></label><label>Teho (kW)<input class="power" type="number" min="0.001" max="1000" step="any"></label><label>Käyttöaika (min)<input class="minutes" type="number" min="15" max="5760" step="15"></label><label>Käyttötapa<select class="mode"><option value="continuous">Yhtenäinen käyttöjakso</option><option value="split">Saa pilkkoa vartteihin</option></select></label></div><details><summary>Vaihteleva teho</summary><label>Tehot per vartti (kW; erota puolipisteillä)<textarea class="profile" rows="2" placeholder="2; 2; 0,5; 0,5"></textarea></label><p class="hint">Jos täytät tehoprofiilin, sen pituus määrää käyttöajan ja se korvaa yllä annetun vakiotehon. Esimerkki on 60 minuuttia: ensin 30 min 2 kW, sitten 30 min 0,5 kW. Pilkottaessa vaiheiden järjestys säilyy.</p></details><h3>Sallitut käyttöikkunat</h3><div class="windows"></div><div class="actions"><button type="button" class="secondary add-window">+ Lisää käyttöikkuna</button><button type="button" class="secondary danger remove-device">Poista laite</button></div>`;
  card.querySelector('.name').value=data.name??`Laite ${$('devices').children.length+1}`;
  card.querySelector('.power').value=data.power??1;
  card.querySelector('.minutes').value=data.minutes??60;
  card.querySelector('.mode').value=data.mode??'continuous';
  card.querySelector('.profile').value=data.profile?.join('; ')??'';
  for(const window of data.windows??[[defaultStart(),rows.length]]) addWindow(card,window);
  card.querySelector('.add-window').addEventListener('click',()=>{addWindow(card);invalidate();});
  card.querySelector('.remove-device').addEventListener('click',()=>{card.remove();invalidate();syncButtons();});
  card.addEventListener('input',invalidate);
  $('devices').append(card); syncButtons();
}
action('add-device',()=>{addDevice();invalidate();});
function deviceData(card) {
  const profile=card.querySelector('.profile').value.trim();
  return {name:card.querySelector('.name').value,power:card.querySelector('.power').value,
    minutes:card.querySelector('.minutes').value,mode:card.querySelector('.mode').value,
    ...(profile ? {profile:profile.split(';').map(s=>s.trim())}:{}),
    windows:[...card.querySelectorAll('.window')].map(w=>[Number(w.querySelector('.window-start').value),Number(w.querySelector('.window-end').value)])};
}
function payload() {
  return {rows,devices:[...$('devices').children].map(deviceData),capacity:$('capacity').value,
    tariffs:Object.fromEntries(['transfer','tax','margin','fixed'].map(k=>[k,$(k).value])),allowForecast:$('allow-forecast').checked};
}
function setRows(data, newSource, isLive=false, reset=true) {
  rows=data; source=newSource; live=isLive; invalidate();
  if(reset) for(const card of $('devices').children){card.querySelector('.windows').replaceChildren();addWindow(card);}
  $('source').textContent=`${source} · ${rows.length} varttia · ${fmt(rows[0].time)} – ${fmt(boundary(rows.length))}`;
  renderPrices(); syncButtons();
}
async function loadPrices(kind, data={}) {
  const token=++priceRequest;
  announce('Ladataan hintatietoja…');
  const response=await api(kind,data);
  if(token!==priceRequest || !loggedIn) return;
  setRows(response.rows,kind==='prices' ? `Julkaistut verkkohinnat, haettu ${fmt(response.updated)}`:response.source,kind==='prices');
  announce('Hintatiedot ladattu. Tarkista laitteiden käyttöajat ja käyttöikkunat.');
}
action('fetch-prices',()=>loadPrices('prices'));
action('demo',()=>loadPrices('demo'));
$('csv').addEventListener('change',async()=>{
  const file=$('csv').files[0]; if(!file) return;
  const token=++priceRequest; clearError(); invalidate();
  try {
    if(file.size>1000000) throw new Error('CSV:n enimmäiskoko on 1 Mt.');
    const text=await file.text();
    if(token!==priceRequest) return;
    const data=await api('csv',{text,interval:$('csv-interval').value});
    if(token!==priceRequest || !loggedIn) return;
    setRows(data.rows,`CSV: ${file.name}`); announce('CSV ladattu. Tarkista käyttöikkunat.');
  } catch(e) {
    if(token!==priceRequest) return;
    rows=[]; live=false; renderPrices(); syncButtons(); $('source').textContent='CSV-tuonti epäonnistui.'; error(e);
  } finally { $('csv').value=''; }
});
action('forecast',async()=>{
  const current=revision;
  const data=await api('forecast',{rows});
  if(current!==revision) return;
  // Preserve existing windows; users explicitly extend them if they want the forecast.
  const devices=[...$('devices').children].map(deviceData);
  setRows(data.rows,source+' + kokeellinen 24 h ennuste',live,false);
  $('devices').replaceChildren(); devices.forEach(addDevice);
  announce('Ennuste lisätty keltaisena. Sen käyttö edellyttää valintaa ”Salli myös ennustetut vartit” ja käyttöikkunan laajentamista.');
});
for(const id of ['capacity','transfer','tax','margin','fixed','allow-forecast']) $(id).addEventListener('input',invalidate);
function kindLabel(kind) {return {published:'Julkaistu',forecast:'Ennuste',demo:'Esimerkki',csv:'CSV'}[kind];}
function svg(tag, attributes) {
  const e=document.createElementNS('http://www.w3.org/2000/svg',tag);
  for(const [key,value] of Object.entries(attributes)) e.setAttribute(key,value);
  return e;
}
function renderPrices() {
  $('price-chart').replaceChildren(); $('price-table').replaceChildren();
  $('price-table-details').hidden=!rows.length;
  currentPrice(); if(!rows.length) return;
  const width=Math.max(680,rows.length*12+100), height=240;
  const values=rows.map(r=>r.price), low=Math.min(0,...values), high=Math.max(0,...values);
  const span=Math.max(high-low,1), y=p=>25+(high-p)/span*155, band=(width-110)/rows.length;
  const chart=svg('svg',{viewBox:`0 0 ${width} ${height}`,width,height,role:'img','aria-label':'Varttihinnat snt/kWh. Keltainen = ennuste. Kaikki arvot saatavilla taulukossa.'});
  chart.append(svg('line',{x1:65,x2:width-45,y1:y(0),y2:y(0),class:'axis'}));
  for(const price of [...new Set([low,0,high])]){const label=svg('text',{x:58,y:y(price)+4,'text-anchor':'end',class:'chart-text'});label.textContent=nf.format(price);chart.append(label);}
  rows.forEach((row,i)=>{
    const bar=svg('rect',{x:65+i*band,y:Math.min(y(row.price),y(0)),width:Math.max(.5,band*.7),height:Math.max(1,Math.abs(y(row.price)-y(0))),class:'bar'+(row.kind==='forecast'?' forecast':'')});
    const title=svg('title',{});title.textContent=`${fmt(row.time)}: ${nf.format(row.price)} snt/kWh (${kindLabel(row.kind)})`;bar.append(title);chart.append(bar);
    if(i%16===0){const label=svg('text',{x:65+i*band,y:205,class:'chart-text'});label.textContent=fmt(row.time);chart.append(label);}
    const tr=node('tr');tr.append(node('td',fmt(row.time)),node('td',nf.format(row.price)),node('td',kindLabel(row.kind)));$('price-table').append(tr);
  });
  $('price-chart').append(chart);
}
function currentPrice() {
  const now=Date.now();
  const row=rows.find(r=>r.kind==='published' && new Date(r.time).getTime()<=now && now<new Date(r.time).getTime()+900000);
  $('current-price').textContent=row?nf.format(row.price)+' snt/kWh':'Ei julkaistua hintaa';
}
action('optimize',async()=>{
  const current=revision; const request=payload();
  announce('Lasketaan yhteistä aikataulua…');
  const data=await api('optimize',request);
  if(current!==revision || !loggedIn) return;
  result=data; renderResult(); announce('Laskenta valmis. Tulos käyttää yllä näkyviä hintoja ja syötteitä.');
});
function renderResult() {
  $('results').hidden=false;
  $('solution-status').textContent=(result.optimal?'Halvin yhteinen aikataulu löydetty.':'Aikaraja saavutettiin: kelvollinen aikataulu löytyi, mutta halvinta ratkaisua ei varmistettu.')+(result.forecastUsed?' Tulos sisältää ennustettuja hintoja.':'');
  $('total-cost').textContent=euro.format(result.totals.variable);
  $('total-energy').textContent=nf.format(result.totals.energy)+' kWh';
  $('peak').textContent=nf.format(Math.max(...result.load))+' kW';
  $('cost-breakdown').replaceChildren();
  for(const [key,label] of [['spot','Sähköenergia'],['transfer','Sähkönsiirto'],['tax','Sähkövero'],['margin','Myyjän marginaali'],['fixedMonthly','Perusmaksut erikseen / kk']]){
    const div=node('div');div.append(node('dt',label),node('dd',euro.format(result.totals[key])));$('cost-breakdown').append(div);
  }
  $('schedules').replaceChildren();
  for(const device of result.devices){
    const detail=node('details');detail.append(node('summary',`${device.name}: ${euro.format(device.cost)} · ${nf.format(device.energy)} kWh · ${device.slots.length*15} min`));
    const wrap=node('div',undefined,'table-scroll'), table=node('table');
    const heading=node('tr');['Vartin alku','Teho kW','Hinnan tyyppi'].forEach(t=>heading.append(node('th',t)));const head=node('thead');head.append(heading);table.append(head);
    const body=node('tbody');for(const slot of device.slots){const tr=node('tr');tr.append(node('td',fmt(slot.time)),node('td',nf.format(slot.power)),node('td',kindLabel(slot.kind)));body.append(tr);}table.append(body);wrap.append(table);detail.append(wrap);$('schedules').append(detail);
  }
  $('sim-time').max=String(rows.length);$('sim-time').value='0';renderSimulation();
}
function renderSimulation() {
  if(!result) return;
  const index=Number($('sim-time').value);
  $('sim-label').textContent=fmt(boundary(index))+(index===rows.length?' · valmis':'');
  $('sim-devices').replaceChildren();
  for(const d of result.devices){const slot=d.slots.find(s=>s.index===index);$('sim-devices').append(node('li',`${d.name}: ${slot?'käyntivaihe, '+nf.format(slot.power)+' kW':'pois päältä'} (simulaatio)`));}
}
$('sim-time').addEventListener('input',()=>{stopSimulation();renderSimulation();});
$('simulate').addEventListener('click',()=>{
  if(simulationTimer){stopSimulation();return;}
  if(Number($('sim-time').value)>=rows.length) $('sim-time').value='0';
  $('simulate').textContent='Pysäytä simulaatio';renderSimulation();
  simulationTimer=setInterval(()=>{const next=Number($('sim-time').value)+1;$('sim-time').value=String(next);renderSimulation();if(next>=rows.length)stopSimulation();},500);
});
action('save',async()=>{
  await api('save',{name:$('plan-name').value,payload:payload()});await listPlans();announce('Suunnitelma tallennettu tämän koneen tietokantaan.');
});
async function listPlans() {
  const data=await api('plans'); if(!loggedIn) return;
  $('saved-plans').replaceChildren();
  if(!data.plans.length) $('saved-plans').append(node('p','Ei tallennettuja suunnitelmia.','hint'));
  for(const plan of data.plans){
    const div=node('div',undefined,'saved-plan');div.append(node('span',`${plan.name} · ${fmt(plan.created)}`));
    const open=node('button','Avaa','secondary');open.addEventListener('click',()=>{
      priceRequest++; $('auto-prices').checked=false;
      setRows(plan.payload.rows,`Tallennettu aineisto: ${plan.name}`,false,false);
      $('devices').replaceChildren();plan.payload.devices.forEach(addDevice);
      for(const id of ['transfer','tax','margin','fixed']) $(id).value=plan.payload.tariffs[id]??0;
      $('capacity').value=plan.payload.capacity;$('allow-forecast').checked=plan.payload.allowForecast;
      $('plan-name').value=plan.name;syncButtons();announce('Tallennettu aineisto avattu. Se voi olla vanhentunut: tarkista päivämäärät ennen laskentaa.');
    });
    const remove=node('button','Poista','secondary danger');remove.addEventListener('click',async()=>{
      if(!confirm(`Poistetaanko suunnitelma ”${plan.name}”?`)) return;
      try{await api('delete',{id:plan.id});await listPlans();}catch(e){error(e);}
    });div.append(open,remove);$('saved-plans').append(div);
  }
}
setInterval(currentPrice,60000);
setInterval(async()=>{
  if(!loggedIn || !$('auto-prices').checked) return;
  const current=revision;
  try{
    const data=await api('prices',{});
    if(!loggedIn || !$('auto-prices').checked || current!==revision) return;
    if(live && JSON.stringify(data.rows.map(r=>r.time))===JSON.stringify(rows.map(r=>r.time))){
      if(JSON.stringify(rows)!==JSON.stringify(data.rows)) setRows(data.rows,`Julkaistut hinnat, tarkistettu ${fmt(data.updated)}`,true,false);
      else currentPrice();
    }else announce('Uusi verkkohintojen aineisto saatavilla. Paina ”Hae Suomen varttihinnat”, kun haluat vaihtaa siihen.');
  }catch(e){error(e);}
},900000);
afterLogin().catch(error);
