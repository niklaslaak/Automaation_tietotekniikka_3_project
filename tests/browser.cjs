'use strict';
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
 try{
  const context=await browser.newContext({viewport:{width:1280,height:900},offline:true});
  const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto(pathToFileURL(path.resolve(__dirname,'../index.html')).href);
  assert.equal(await page.locator('#calculate').isDisabled(),true);
  await page.locator('#prices').setInputFiles(path.resolve(__dirname,'../data/esimerkkihinnat.csv'));
  await page.waitForFunction(()=>!document.querySelector('#calculate').disabled);
  await page.locator('#calculate').click();await page.locator('#result').waitFor({state:'visible'});
  assert.match(await page.locator('#cost').textContent(),/0,08/);
  assert.equal(await page.locator('#start').textContent(),'04.11.2026 klo 01:00');
  assert.equal(await page.locator('#end').textContent(),'04.11.2026 klo 03:00');
  assert.equal(await page.locator('.chart-bar').count(),16);
  assert.equal(await page.locator('.chart-bar.selected').count(),8);
  await page.locator('#add-device').click();await page.locator('#capacity').fill('1');
  await page.locator('#calculate').click();await page.locator('#result').waitFor({state:'visible'});
  assert.equal(await page.locator('.device-summary').count(),2);
  assert.equal(await page.locator('#peak').textContent(),'1 / 1 kW');
  await page.locator('.remove-device').last().click();
  await page.locator('#example').click();await page.locator('#capacity').fill('3');
  await page.locator('.use-profile').check();await page.locator('.profile').fill('2; 0,5');
  await page.locator('.mode').selectOption('split');
  await page.locator('#calculate').click();await page.locator('#result').waitFor({state:'visible'});
  assert.equal(await page.locator('#energy').textContent(),'0,625 kWh');
  assert.equal(await page.locator('.chart-bar.selected').count(),2);
  const bars=await page.locator('.chart-bar').evaluateAll(nodes=>nodes.map(e=>({x:Number(e.getAttribute('x')),w:Number(e.getAttribute('width'))})));
  for(let i=1;i<bars.length;i++)assert.ok(bars[i-1].x+bars[i-1].w<bars[i].x);
  if(process.env.SCREENSHOT_DIR){fs.mkdirSync(process.env.SCREENSHOT_DIR,{recursive:true});await page.screenshot({path:path.join(process.env.SCREENSHOT_DIR,'desktop.png'),fullPage:true});}
  await page.setViewportSize({width:375,height:812});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  if(process.env.SCREENSHOT_DIR)await page.screenshot({path:path.join(process.env.SCREENSHOT_DIR,'mobile.png'),fullPage:true});
  await page.locator('#prices').setInputFiles({name:'bad.csv',mimeType:'text/csv',buffer:Buffer.from('invalid')});
  await page.locator('#error').waitFor({state:'visible'});assert.equal(await page.locator('#result').isVisible(),false);assert.equal(await page.locator('#chart-wrapper').isVisible(),false);
  await page.reload();assert.equal(await page.locator('#calculate').isDisabled(),true);assert.equal(await page.locator('.device').count(),1);
  assert.deepEqual(errors,[]);
  console.log(`PASS Chromium ${browser.version()}: offline file://, CSV, original example, two devices, capacity, split profile, chart, mobile width, invalid import, reload; no JS errors.`);
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
