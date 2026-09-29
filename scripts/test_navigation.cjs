/* Run with Playwright installed: node scripts/test_navigation.cjs.
 * Optional PARKWAY_CHROMIUM_PATH supplies an existing local Chromium executable. */
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require('playwright');
const root = path.resolve(process.env.PARKWAY_TEST_ROOT || path.join(__dirname, '..'));
const types = {'.html':'text/html','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml','.webp':'image/webp','.jpg':'image/jpeg'};
const server = http.createServer(async (req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  if (pathname === '/api/public-config') { res.setHeader('Content-Type','application/json'); res.end('{}'); return; }
  const relative = pathname === '/' ? 'index.html' : decodeURIComponent(pathname.slice(1));
  if (relative.includes('..') || (relative.includes('/') && !relative.startsWith('assets/')) || !types[path.extname(relative)]) {
    res.writeHead(404); res.end(); return;
  }
  try { res.setHeader('Content-Type',types[path.extname(relative)]); res.end(await fs.readFile(path.join(root, relative))); }
  catch { res.writeHead(404); res.end(); }
});

(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({
    ...(process.env.PARKWAY_CHROMIUM_PATH ? {executablePath:process.env.PARKWAY_CHROMIUM_PATH} : {}),
    args:['--disable-gpu','--disable-software-rasterizer'],
  });
  let assertions = 0;
  const check = (condition, message) => { assertions++; assert.ok(condition, message); };
  const hubs = ['services.html','sectors.html','capabilities.html'];
  const counts = [6,8,6];
  const errors = [];
  const makePage = async options => {
    const context = await browser.newContext(options);
    await context.route('**/*', route => route.request().url().startsWith(origin) ? route.continue() : route.abort());
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    return page;
  };
  const go = page => page.goto(origin + '/index.html');
  const openCount = page => page.locator('.nav-disclosure[open]').count();
  const groups = page => page.locator('.nav-group');
  const details = (page, i) => groups(page).nth(i).locator('details');
  const expanded = (page, i) => details(page, i).evaluate(el => el.open);
  const fits = async (page, label) => check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), label + ': page overflow');
  try {
    const page = await makePage({viewport:{width:1440,height:900}});
    const pages = (await fs.readdir(root)).filter(name => name.endsWith('.html'));
    for (const width of [320,390,768,1100,1181,1440]) {
      await page.setViewportSize({width,height:900});
      for (const file of pages) {
        await page.goto(origin + '/' + file);
        await fits(page, `${file} at ${width}`);
        check(await page.locator('meta[name="robots"]').getAttribute('content') === 'noindex,nofollow', file + ': staging robots');
      }
      await go(page);
      if (width <= 1180) await page.locator('.menu').click();
      for (let i=0;i<3;i++) {
        if (width > 1180) await groups(page).nth(i).locator(':scope > a').hover();
        else await details(page,i).locator('summary').click();
        check(await expanded(page,i) && await openCount(page) === 1, `one dropdown at ${width}/${i}`);
        check(await details(page,i).locator('li a:visible').count() === counts[i], `visible links at ${width}/${i}`);
        await fits(page, `expanded ${i} at ${width}`);
        for(const target of [details(page,i).locator('li a').first(),details(page,i).locator('li a').last()]){
          await target.scrollIntoViewIfNeeded();
          check(await target.evaluate(el=>{const r=el.getBoundingClientRect();const x=r.x+r.width/2,y=r.y+r.height/2;return y>=0&&y<innerHeight&&el.contains(document.elementFromPoint(x,y));}),`dropdown is painted above page and receives input at ${width}/${i}`);
        }
        const bounds = await details(page,i).locator('ul').boundingBox();
        check(bounds.x >= 0 && bounds.x + bounds.width <= width, `dropdown bounds at ${width}/${i}`);
      }
    }
    await page.setViewportSize({width:1440,height:900});
    for (let i=0;i<3;i++) {
      await go(page);
      const group = groups(page).nth(i), summary=group.locator('summary');
      await group.locator(':scope > a').hover();
      check(await expanded(page,i), 'hover opens '+i);
      await group.locator('li a').last().hover();
      check(await expanded(page,i), 'pointer can reach last link '+i);
      await page.mouse.move(5,400);
      check(await openCount(page) === 0, 'pointer leave dismisses '+i);
      // Begin in keyboard mode, then traverse actual tab order from the hub.
      await page.keyboard.press('Tab');
      await group.locator(':scope > a').focus();
      check(await expanded(page,i), 'keyboard hub focus opens '+i);
      await page.keyboard.press('Tab');
      check(await summary.evaluate(el=>el===document.activeElement), 'summary follows hub '+i);
      await page.keyboard.press('Tab');
      check(await group.locator('li a').first().evaluate(el=>el===document.activeElement), 'links follow summary '+i);
      await group.locator(':scope > a').hover();
      await page.mouse.move(5,450);
      check(await expanded(page,i), 'pointer leave preserves keyboard content '+i);
      await page.keyboard.press('Escape');
      check(await openCount(page) === 0, 'Escape stays closed '+i);
      check(await summary.evaluate(el=>el===document.activeElement), 'Escape restores summary focus '+i);
      await page.keyboard.press('Enter');
      check(await expanded(page,i), 'Enter expands '+i);
      await page.keyboard.press('Space');
      check(await openCount(page) === 0, 'Space collapses '+i);
      await page.keyboard.press('Enter');
      await page.locator('.navlinks > a[href="contact.html"]').focus();
      check(await openCount(page) === 0, 'focus leaving closes '+i);
      await group.locator(':scope > a').hover();
      await page.locator('h1').click();
      check(await openCount(page) === 0, 'outside click closes '+i);
      await group.locator(':scope > a').focus();
      await Promise.all([page.waitForURL(origin+'/'+hubs[i]),page.keyboard.press('Enter')]);
      check(new URL(page.url()).pathname === '/'+hubs[i], 'hub Enter navigates '+i);
      await go(page);
      await Promise.all([page.waitForURL(origin+'/'+hubs[i]),groups(page).nth(i).locator(':scope > a').click()]);
      check(new URL(page.url()).pathname === '/'+hubs[i], 'hub click navigates '+i);
      await go(page);await groups(page).nth(i).locator(':scope > a').hover();
      const child=details(page,i).locator('li a').last();
      const destination=new URL(await child.getAttribute('href'),origin).href;
      await Promise.all([page.waitForURL(destination),child.click()]);
      check(page.url()===destination,'desktop dropdown link navigates '+i);
    }
    // Zoom-like short desktop viewport: tall sector dropdown remains reachable.
    await page.setViewportSize({width:1440,height:480});
    await go(page);
    await groups(page).nth(1).locator(':scope > a').hover();
    const shortBounds = await details(page,1).locator('ul').boundingBox();
    check(shortBounds.y + shortBounds.height <= 480, 'short desktop dropdown remains within viewport');
    await details(page,1).locator('li a').last().hover();
    check(await expanded(page,1), 'short desktop last sector link reachable');
    if(process.env.PARKWAY_SCREENSHOTS){
      await fs.mkdir(process.env.PARKWAY_SCREENSHOTS,{recursive:true});
      await page.setViewportSize({width:1440,height:900});await go(page);
      await page.locator(".hero-media img").evaluate(image=>image.decode());
      for(let i=0;i<3;i++){
        await groups(page).nth(i).locator(':scope > a').hover();
        await page.screenshot({path:path.join(process.env.PARKWAY_SCREENSHOTS,`desktop-${i}.png`)});
      }
    }
    // Real touch input: no desktop focus/hover side effects on first tap.
    for (const width of [320,390,768,1100,1440]) {
      const mobile = await makePage({viewport:{width,height:844},hasTouch:true,isMobile:true});
      for (let i=0;i<3;i++) {
        await go(mobile);
        if(width<=1180)await mobile.locator('.menu').tap();
        await details(mobile,i).locator('summary').tap();
        check(await expanded(mobile,i), 'first touch expands '+width+'/'+i);
        const next=(i+1)%3;
        await details(mobile,next).locator('summary').tap();
        check(await expanded(mobile,next) && await openCount(mobile) === 1, 'touch one open '+width+'/'+i);
        if(process.env.PARKWAY_SCREENSHOTS && width===390 && i===0)await mobile.screenshot({path:path.join(process.env.PARKWAY_SCREENSHOTS,'mobile.png')});
        await details(mobile,next).locator('summary').tap();
        check(await openCount(mobile) === 0, 'second touch collapses '+width+'/'+i);
        await Promise.all([mobile.waitForURL(origin+'/'+hubs[i]),groups(mobile).nth(i).locator(':scope > a').tap()]);
        check(new URL(mobile.url()).pathname === '/'+hubs[i], 'touch hub navigates '+width+'/'+i);
      }
      if(width<=1180){
        await go(mobile);await mobile.locator('.menu').tap();await details(mobile,0).locator('summary').tap();
        await mobile.keyboard.press('Escape');await mobile.keyboard.press('Escape');
        check(await mobile.locator('.menu').getAttribute('aria-expanded')==='false','mobile Escape closes menu');
        check(await mobile.locator('.menu').evaluate(el=>el===document.activeElement),'mobile Escape restores toggle focus');
        await mobile.locator('.menu').tap();await details(mobile,1).locator('summary').tap();
        const link=details(mobile,1).locator('li a').last();
        const destination=new URL(await link.getAttribute('href'),origin).href;
        await Promise.all([mobile.waitForURL(destination),link.tap()]);
        check(mobile.url()===destination,'touch dropdown link navigates '+width);
        check(await mobile.locator('.menu').getAttribute('aria-expanded')==='false','touch link closes menu '+width);
      }
      await mobile.context().close();
    }
    // Native fallback: crawlable hub/link markup and exclusive details without JS.
    for (const width of [390,1440]) {
      const fallback=await makePage({javaScriptEnabled:false,viewport:{width,height:900}});
      await go(fallback);
      check(await fallback.locator('.navlinks').isVisible(),'no-JS navigation available');
      for(let i=0;i<3;i++){
        await details(fallback,i).locator('summary').click();
        check(await expanded(fallback,i) && await openCount(fallback)===1,'no-JS exclusive disclosure '+i);
        check(await details(fallback,i).locator('li a:visible').count()===counts[i],'no-JS links '+i);
      }
      await fits(fallback,'no-JS '+width);
      await fallback.context().close();
    }
    check(errors.length === 0, 'JavaScript page errors: '+errors.join('; '));
    if(process.env.PARKWAY_SCREENSHOTS)await fs.writeFile(path.join(process.env.PARKWAY_SCREENSHOTS,'report.json'),JSON.stringify({assertions,pages:pages.length,widths:[320,390,768,1100,1181,1440],status:'passed'},null,2));
    console.log(`Navigation browser checks passed: ${assertions} assertions; ${pages.length} pages; responsive, hover, keyboard, touch and no-JS paths.`);
  } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>server.close());
