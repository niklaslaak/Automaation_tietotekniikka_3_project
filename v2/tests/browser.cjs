// Optional: npm install --prefix v2; npx --prefix v2 playwright install chromium
// CHROMIUM_PATH may point to an already installed Chromium browser.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'energy-v2-'));
const child=spawn(process.env.PYTHON||'python',['-u','-c',
  'import sys; from server import create_server; s=create_server(0,sys.argv[1]); print(s.server_port,flush=True); s.serve_forever()',path.join(temp,'test.sqlite3')],{cwd:root,stdio:['ignore','pipe','pipe']});
let browser;
(async()=>{
  const port=await new Promise((resolve,reject)=>{
    let output='';const timeout=setTimeout(()=>reject(Error('Server start timed out')),20000);
    child.stdout.on('data',data=>{output+=data.toString();if(output.includes('\n')){clearTimeout(timeout);resolve(Number(output.trim()));}});
    child.on('error',reject);child.on('exit',code=>{clearTimeout(timeout);reject(Error(`Server exit ${code}`));});
    child.stderr.on('data',data=>process.stderr.write(data));
  });
  browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
  const page=await browser.newPage({viewport:{width:1280,height:950}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`http://127.0.0.1:${port}`);
  await page.locator('#username').fill('test-user');
  await page.locator('#password').fill('safe-demo-password-123');
  await page.locator('#register').click();
  await page.locator('#workspace').waitFor({state:'visible'});
  await page.locator('#demo').click();
  await page.waitForFunction(()=>document.querySelectorAll('#price-table tr').length===192);
  assert.equal(await page.locator('#price-chart .bar').count(),192);
  await page.locator('.minutes').fill('30');
  await page.locator('#optimize').click();
  await page.locator('#results').waitFor({state:'visible'});
  assert.match(await page.locator('#total-cost').textContent(),/0,01/);
  assert.ok((await page.locator('#total-cost').textContent()).match(/[-−]/));
  assert.equal(await page.locator('#sim-devices li').count(),1);
  await page.locator('#add-device').click();
  assert.equal(await page.locator('#results').isVisible(),false);
  await page.locator('.power').nth(1).fill('2');
  await page.locator('.minutes').nth(1).fill('45');
  await page.locator('.mode').nth(1).selectOption('split');
  await page.locator('#capacity').fill('2');
  await page.locator('#transfer').fill('3');
  await page.locator('#tax').fill('2');
  await page.locator('#margin').fill('0.5');
  await page.locator('#fixed').fill('8');
  await page.locator('#optimize').click();
  await page.locator('#results').waitFor({state:'visible'});
  assert.ok(Number((await page.locator('#peak').textContent()).replace(' kW','').replace(',','.'))<=2);
  assert.equal(await page.locator('#schedules details').count(),2);
  await page.locator('#plan-name').fill('Tallennettu koe');
  await page.locator('#save').click();
  await page.waitForFunction(()=>document.querySelectorAll('.saved-plan').length===1);
  await page.reload();await page.locator('.saved-plan').waitFor();
  await page.locator('.saved-plan button').first().click();
  assert.equal(await page.locator('.device').count(),2);
  assert.equal(await page.locator('#transfer').inputValue(),'3');
  await page.locator('#forecast').click();
  await page.waitForFunction(()=>document.querySelectorAll('#price-table tr').length===288);
  assert.equal(await page.locator('#price-chart .forecast').count(),96);
  assert.equal(await page.locator('#allow-forecast').isChecked(),false);
  await page.locator('#optimize').click();await page.locator('#results').waitFor({state:'visible'});
  await page.locator('#simulate').click();
  await page.waitForFunction(()=>Number(document.querySelector('#sim-time').value)>0);
  await page.locator('#simulate').click();
  if(process.env.SCREENSHOT_DIR){
    fs.mkdirSync(process.env.SCREENSHOT_DIR,{recursive:true});
    await page.screenshot({path:path.join(process.env.SCREENSHOT_DIR,'v2-desktop.png'),fullPage:true});
  }
  await page.setViewportSize({width:375,height:812});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  if(process.env.SCREENSHOT_DIR)await page.screenshot({path:path.join(process.env.SCREENSHOT_DIR,'v2-mobile.png'),fullPage:true});
  await page.locator('#csv').setInputFiles({name:'bad.csv',mimeType:'text/csv',buffer:Buffer.from('invalid')});
  await page.locator('#error').waitFor({state:'visible'});
  assert.equal(await page.locator('#results').isVisible(),false);
  assert.equal(await page.locator('#optimize').isDisabled(),true);
  await page.locator('#logout').click();await page.locator('#auth').waitFor({state:'visible'});
  assert.deepEqual(errors,[]);
  console.log(`PASS: Chromium ${browser.version()}, account, demo, prices, joint optimization, tariffs, save/reload, forecast, simulator, mobile layout, invalid CSV, logout; no JS errors.`);
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{
  if(browser)await browser.close();child.kill();
  await new Promise(resolve=>child.exitCode!==null?resolve():child.once('exit',resolve));
  fs.rmSync(temp,{recursive:true,force:true});
});
