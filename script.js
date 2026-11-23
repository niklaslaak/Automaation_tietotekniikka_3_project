"use strict";
(() => {
  const get = id => document.getElementById(id);
  const number = new Intl.NumberFormat('fi-FI', {maximumFractionDigits:6});
  const currency = new Intl.NumberFormat('fi-FI', {style:'currency',currency:'EUR'});
  let rows=[], loadVersion=0, calculationVersion=0, serial=0, busy=false;
  function el(tag,text,className) {
    const node=document.createElement(tag);
    if(text!==undefined)node.textContent=text;
    if(className)node.className=className;
    return node;
  }
  function syncButtons() {
    get('calculate').disabled=!rows.length||busy;
    get('cancel').hidden=!busy;
    get('add-device').disabled=get('devices').children.length>=MultiOptimizer.MAX_DEVICES;
  }
  function clearResult() {
    calculationVersion++; busy=false;
    get('result').hidden=true;get('device-results').hidden=true;get('schedules').replaceChildren();
    get('empty-result').hidden=false;get('error').hidden=true;get('error').textContent='';
    get('progress').hidden=true;get('progress').textContent='';
    syncButtons();markChart(null);
  }
  function showError(message) {get('error').textContent=message;get('error').hidden=false;}
  function field(parent,title,className,value) {
    const box=el('div'),id=`device-${serial}-${className}`;
    const label=el('label',title);label.htmlFor=id;
    const input=el('input');input.id=id;input.className=className;input.type='text';input.value=value;
    if(['power','duration'].includes(className))input.inputMode='decimal';
    if(className==='name')input.maxLength=60;
    box.append(label,input);parent.append(box);return input;
  }
  function addDevice() {
    if(get('devices').children.length>=MultiOptimizer.MAX_DEVICES)return;
    serial++;
    const card=el('fieldset',undefined,'device');card.append(el('legend',`Laite ${serial}`));
    const fields=el('div',undefined,'fields device-fields');
    field(fields,'Laitteen nimi','name',`Laite ${serial}`);
    const power=field(fields,'Vakioteho (kW)','power','1');
    const duration=field(fields,'Käyttöaika (h)','duration','2');
    const modeBox=el('div'),label=el('label','Käyttötapa'),mode=el('select');
    mode.className='mode';mode.id=`device-${serial}-mode`;label.htmlFor=mode.id;
    for(const [value,text] of [['continuous','Yhtenäinen jakso'],['split','Saa pilkkoa vartteihin']]){
      const option=el('option',text);option.value=value;mode.append(option);
    }
    modeBox.append(label,mode);fields.append(modeBox);card.append(fields);
    card.append(el('p','Käyttöaika esimerkiksi 0,25 h = 15 min, 0,5 h = 30 min tai 1,5 h = 90 min.','hint'));
    const checkLabel=el('label',undefined,'check'),check=el('input');check.type='checkbox';check.className='use-profile';
    checkLabel.append(check,document.createTextNode('Laitteen teho vaihtelee käytön aikana'));
    const profileBox=el('div',undefined,'profile-box');profileBox.hidden=true;
    const profileLabel=el('label','Tehot per vartti (kW; erota puolipisteillä)'),profile=el('textarea');
    profile.className='profile';profile.id=`device-${serial}-profile`;profile.rows=2;profile.value='2; 2; 0,5; 0,5';profileLabel.htmlFor=profile.id;
    profileBox.append(profileLabel,profile,el('p','Jokainen arvo kestää 15 minuuttia. Esimerkissä 30 min teholla 2 kW ja 30 min teholla 0,5 kW. Profiili korvaa vakiotehon ja käyttöajan. Vaiheiden järjestys säilyy myös pilkottaessa.','hint'));
    check.addEventListener('change',()=>{profileBox.hidden=!check.checked;power.disabled=check.checked;duration.disabled=check.checked;clearResult();});
    const remove=el('button','Poista laite','secondary remove-device');remove.type='button';
    remove.addEventListener('click',()=>{card.remove();clearResult();});
    card.append(checkLabel,profileBox,remove);card.addEventListener('input',clearResult);
    get('devices').append(card);clearResult();
  }
  function readDevices() {
    return [...get('devices').children].map(card=>{
      const data={name:card.querySelector('.name').value,mode:card.querySelector('.mode').value};
      if(card.querySelector('.use-profile').checked){
        data.profile=card.querySelector('.profile').value.trim();
        if(!data.profile)throw new Error(`${data.name}: anna tehoprofiili.`);
      }else{data.power=card.querySelector('.power').value;data.hours=card.querySelector('.duration').value;}
      return data;
    });
  }
  function svg(name,attributes={}) {
    const node=document.createElementNS('http://www.w3.org/2000/svg',name);
    Object.entries(attributes).forEach(([key,value])=>node.setAttribute(key,value));return node;
  }
  function drawChart() {
    const chart=get('price-chart');chart.replaceChildren();get('price-table').replaceChildren();
    get('chart-wrapper').hidden=!rows.length;get('chart-empty').hidden=Boolean(rows.length);
    if(!rows.length)return;
    const prices=rows.map(row=>Number(row.price)),minimum=Math.min(0,...prices),maximum=Math.max(0,...prices);
    const range=Math.max(maximum-minimum,.000001),low=minimum-range*.08,high=maximum+range*.08;
    const width=Math.max(800,rows.length*14+144),height=320,left=104,right=40,top=25,bottom=55;
    const band=(width-left-right)/rows.length,y=p=>top+(high-p)/(high-low)*(height-top-bottom),x=i=>left+(i+.5)*band;
    chart.setAttribute('viewBox',`0 0 ${width} ${height}`);chart.setAttribute('width',width);chart.setAttribute('height',height);
    for(const value of [...new Set([minimum,0,maximum])]){
      chart.append(svg('line',{x1:left,x2:width-right,y1:y(value),y2:y(value),class:value===0?'chart-zero':'chart-grid'}));
      const label=svg('text',{x:left-8,y:y(value)+4,'text-anchor':'end',class:'chart-axis-label'});label.textContent=number.format(value);chart.append(label);
    }
    const unit=svg('text',{x:left,y:14,class:'chart-axis-label'});unit.textContent='snt/kWh';chart.append(unit);
    rows.forEach((row,i)=>{
      const price=Number(row.price),barWidth=Math.min(24,band*.72);
      const bar=svg('rect',{x:x(i)-barWidth/2,y:Math.min(y(price),y(0)),width:barWidth,height:Math.max(1,Math.abs(y(price)-y(0))),class:'chart-bar'});
      const title=svg('title');title.textContent=`${MultiOptimizer.formatTime(row.time)}: ${number.format(price)} snt/kWh`;bar.append(title);chart.append(bar);
      const tr=el('tr');tr.append(el('td',MultiOptimizer.formatTime(row.time)),el('td',number.format(price)),el('td','—'));get('price-table').append(tr);
    });
    const labels=new Set([0,rows.length-1]);for(let i=16;i<rows.length-8;i+=16)labels.add(i);
    labels.forEach(i=>{
      const label=svg('text',{x:x(i),y:height-20,'text-anchor':i===0?'start':i===rows.length-1?'end':'middle',class:'chart-axis-label'});
      label.textContent=MultiOptimizer.formatTime(rows[i].time);chart.append(label);
    });
  }
  function markChart(result) {
    const selected=new Set(result?.devices.flatMap(d=>d.slots.map(s=>s.index))??[]);
    get('price-chart').querySelectorAll('.chart-bar').forEach((bar,i)=>bar.classList.toggle('selected',selected.has(i)));
    [...get('price-table').children].forEach((row,i)=>{row.lastElementChild.textContent=result?number.format(result.load[i]):'—';});
  }
  function acceptCsv(text,interval,name) {
    rows=MultiOptimizer.parseCsv(text,interval);
    get('file-status').textContent=`${name}: ladattu ${number.format(rows.length/4)} tuntia (${rows.length} varttia).`;
    drawChart();syncButtons();
  }
  function resetPrices() {
    loadVersion++;rows=[];clearResult();drawChart();get('file-status').textContent='Hintatiedostoa ei ole vielä ladattu.';
  }
  get('interval').addEventListener('change',()=>{resetPrices();get('prices').value='';get('file-status').textContent='Hintajakso vaihtui. Valitse tiedosto uudelleen.';});
  get('prices').addEventListener('change',async()=>{
    resetPrices();const version=loadVersion,file=get('prices').files[0];if(!file)return;
    const interval=Number(get('interval').value);get('file-status').textContent='Luetaan hintatiedostoa…';
    try{
      if(file.size>MultiOptimizer.MAX_BYTES)throw new Error('Tiedoston enimmäiskoko on 1 Mt.');
      const text=await file.text();if(version!==loadVersion)return;acceptCsv(text,interval,file.name);
    }catch(error){
      if(version!==loadVersion)return;rows=[];drawChart();syncButtons();get('file-status').textContent='Hintatiedostoa ei hyväksytty.';showError(error.message||'Tiedoston lukeminen epäonnistui.');
    }
  });
  get('example').addEventListener('click',()=>{
    resetPrices();get('prices').value='';get('interval').value='15';
    const prices=[10,5,12,-2,9,2,10,7,4,3,8,1,12,6,5,9];
    const csv='aika;hinta_snt_kwh\n'+prices.map((p,i)=>`2026-11-04T${String(Math.floor(i/4)).padStart(2,'0')}:${String(i%4*15).padStart(2,'0')};${p}`).join('\n');
    acceptCsv(csv,15,'Synteettinen varttiesimerkki');
  });
  get('add-device').addEventListener('click',addDevice);get('capacity').addEventListener('input',clearResult);
  get('cancel').addEventListener('click',()=>{clearResult();get('empty-result').textContent='Laskenta peruttu. Voit muuttaa syötteitä ja laskea uudelleen.';});
  function showResult(result) {
    get('cost').textContent=currency.format(result.cost);
    get('start').textContent=MultiOptimizer.formatTime(Math.min(...result.devices.map(d=>d.start)));
    get('end').textContent=MultiOptimizer.formatTime(Math.max(...result.devices.map(d=>d.end)));
    get('energy').textContent=`${number.format(result.energy)} kWh`;
    get('peak').textContent=`${number.format(result.peak)} / ${number.format(result.capacity)} kW`;
    for(const d of result.devices){
      const section=el('section',undefined,'device-summary');section.append(el('h3',d.name),el('p',`${currency.format(d.cost)} · ${number.format(d.energy)} kWh · ${number.format(d.hours)} h käyttöä`));
      const list=el('ul');for(const p of d.periods)list.append(el('li',`${MultiOptimizer.formatTime(p.start)} – ${MultiOptimizer.formatTime(p.end)}`));section.append(list);
      const details=el('details'),wrap=el('div',undefined,'table-scroll'),table=el('table'),head=el('thead'),heading=el('tr');
      for(const title of ['Vartin alku','Teho (kW)']){const th=el('th',title);th.scope='col';heading.append(th);}head.append(heading);table.append(head);
      const body=el('tbody');for(const s of d.slots){const tr=el('tr');tr.append(el('td',MultiOptimizer.formatTime(s.time)),el('td',number.format(s.power)));body.append(tr);}
      table.append(body);wrap.append(table);details.append(el('summary','Varttikohtaiset tehot'),wrap);section.append(details);get('schedules').append(section);
    }
    get('empty-result').hidden=true;get('result').hidden=false;get('device-results').hidden=false;markChart(result);
  }
  get('optimizer').addEventListener('submit',async event=>{
    event.preventDefault();clearResult();const version=calculationVersion;
    try{
      const devices=readDevices();busy=true;syncButtons();get('progress').hidden=false;get('progress').textContent='Lasketaan yhteistä aikataulua…';
      const result=await MultiOptimizer.optimizeAsync(rows,devices,get('capacity').value,{
        cancelled:()=>calculationVersion!==version,
        onProgress:step=>{if(version===calculationVersion)get('progress').textContent=`Lasketaan: vartti ${step.slot}/${step.slots}. Voit perua laskennan.`;}
      });
      if(version===calculationVersion)showResult(result);
    }catch(error){if(version===calculationVersion&&error.name!=='AbortError')showError(error.message);}
    finally{if(version===calculationVersion){busy=false;get('progress').hidden=true;syncButtons();}}
  });
  addDevice();
})();
