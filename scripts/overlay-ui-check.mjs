import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
const { chromium } = await import(pathToFileURL(process.argv[2]).href);
const base = process.argv[3] || 'http://localhost:3100';
const browser = await chromium.launch({ channel: 'msedge', headless: true });
try {
 for (const size of [{width:430,height:932},{width:320,height:568},{width:932,height:430},{width:1440,height:900}]) {
  const page = await browser.newPage({viewport:size});
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>localStorage.setItem('expense-tracker-theme','light'));
  const month=new Date().toISOString().slice(0,7);
  const types=[{id:1,name:'Commitment'},{id:2,name:'Needs'}];
  const categories=[{id:1,name:'Rent',type_id:1,types:types[0]},{id:2,name:'Grocery',type_id:2,types:types[1]}];
  const expenses=Array.from({length:25},(_,i)=>({id:i+1,amount:i===0?1800:10,currency:'MYR',expense_date:month+'-03',category_id:i===0?1:2,note:'planned '+i}));
  await page.route('**/*',route=>{
   const url=new URL(route.request().url());
   if(url.origin===base)return route.continue();
   const table=url.pathname.split('/').at(-1);
   const body=({types,categories,expenses,incomes:[],assets:[],process_due_payment_installments:0})[table]??[];
   return route.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify(body)});
  });
  await page.goto(base);
  await page.getByRole('button',{name:'RM 2040.00',exact:true}).click();
  const overlay=page.locator('body > div.fixed').filter({has:page.getByRole('button',{name:'Close',exact:true})});
  await overlay.waitFor();
  async function checkPanel(){
   assert.equal(await overlay.evaluate(el=>{const r=el.getBoundingClientRect();const p=el.firstElementChild.getBoundingClientRect();const hit=document.elementFromPoint(innerWidth/2,innerHeight-30);return r.top===0&&Math.abs(r.height-innerHeight)<2&&p.top>=0&&p.bottom<=innerHeight&&el.contains(hit)}),true,'Overlay must cover navigation and remain within viewport');
  }
  await checkPanel();
  await overlay.getByRole('button',{name:/Commitment/}).click();
  await overlay.getByRole('button',{name:/Rent/}).click();
  assert.equal(await overlay.getByText('Uncategorized',{exact:true}).count(),0);
  await overlay.getByRole('button',{name:'Back',exact:true}).click();
  await overlay.getByRole('button',{name:'Back',exact:true}).click();
  await overlay.getByRole('button',{name:/Needs/}).click();
  await overlay.getByRole('button',{name:/Grocery/}).click();
  await checkPanel();
  const last=overlay.getByRole('button',{name:'Edit expense'}).last();
  await last.scrollIntoViewIfNeeded();
  assert.equal(await last.evaluate(el=>{const r=el.getBoundingClientRect();return el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))}),true);
  await last.click();
  await page.getByRole('button',{name:'Close panel',exact:true}).waitFor();
  await page.getByRole('button',{name:'Close panel',exact:true}).click();
  await page.getByText('Total Assets',{exact:true}).click();
  const assets=page.locator('body > div.fixed').filter({has:page.getByRole('heading',{name:'Asset Details',exact:true})});
  await assets.waitFor();
  assert.equal(await assets.evaluate(el=>el.contains(document.elementFromPoint(innerWidth/2,innerHeight-30))),true);
  await page.getByRole('button',{name:'Close asset details'}).click();
  await page.getByRole('button',{name:'Settings',exact:true}).click();
  await page.getByRole('link',{name:'Goals',exact:true}).click();
  await page.waitForURL('**/savings-goals');
  assert.equal(await page.locator('html').evaluate(el=>el.classList.contains('light-theme')),true);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  assert.deepEqual(errors,[]);
  console.log('PASS overlay bounds, navigation coverage, drilldown, category labels, last-record edit, assets, theme navigation',size);
  await page.close();
 }
} finally {await browser.close()}
