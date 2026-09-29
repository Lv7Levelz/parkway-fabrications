/* Read-only deployed-UI evidence. This reports the currently deployed main,
 * not the proposed branch; known live defects are reported, never hidden. */
const { chromium } = require('playwright');
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const url = 'https://lv7levelz.github.io/parkway-fabrications/';
const output = path.resolve(process.env.PARKWAY_STAGING_EVIDENCE || 'staging-evidence');
(async()=>{
  await fs.mkdir(output,{recursive:true});
  const browser=await chromium.launch();
  const page=await browser.newPage({viewport:{width:1440,height:900}});
  const report={url,checkedAt:new Date().toISOString(),assets:[],desktop:[],mobile:[],errors:[]};
  page.on('pageerror',e=>report.errors.push(e.message));
  try{
    for(const file of ['','styles.css','navigation.js','script.js']){
      const response=await page.request.get(url+file);
      if(!response.ok())throw new Error(`Asset request failed (${response.status()}): ${file||'homepage'}`);
      report.assets.push({file:file||'index.html',sha256:crypto.createHash('sha256').update(await response.body()).digest('hex'),lastModified:response.headers()['last-modified'],cacheControl:response.headers()['cache-control']});
    }
    await page.goto(url);await page.locator('html.nav-enhanced').waitFor();
    report.robots=await page.locator('meta[name="robots"]').getAttribute('content');
    await page.locator('.hero-media img').evaluate(image=>image.decode());
    for(let i=0;i<3;i++){
      const group=page.locator('.nav-group').nth(i), disclosure=group.locator('details');
      await group.locator(':scope > a').hover();
      await page.screenshot({path:path.join(output,`live-hover-${i}.png`)});
      const hoverOpen=await disclosure.evaluate(el=>el.open);
      await group.locator('li a').last().hover();
      const pointerCanReachLastLink=await disclosure.evaluate(el=>el.open);
      await page.mouse.move(5,500);await page.keyboard.press('Tab');await group.locator(':scope > a').focus();
      await page.keyboard.press('Tab');await page.keyboard.press('Tab');await page.keyboard.press('Escape');
      const escapeCloses=await disclosure.evaluate(el=>!el.open);
      await page.screenshot({path:path.join(output,`live-escape-${i}.png`)});
      report.desktop.push({label:await group.locator(':scope > a').innerText(),hoverOpen,pointerCanReachLastLink,escapeCloses});
    }
    for(const width of [320,390,768,1100]){
      await page.setViewportSize({width,height:900});await page.goto(url);
      await page.locator('.menu').click();
      const open=[];
      for(let i=0;i<3;i++){
        await page.locator('.nav-group').nth(i).locator('summary').click();
        open.push({i,openCount:await page.locator('.nav-disclosure[open]').count(),expanded:await page.locator('.nav-group').nth(i).locator('details').evaluate(el=>el.open)});
      }
      report.mobile.push({width,open,overflow:await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)});
    }
    await fs.writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2));
    console.log(JSON.stringify(report,null,2));
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
