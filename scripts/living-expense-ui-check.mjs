import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
const { chromium } = await import(pathToFileURL(process.argv[2]).href);
const base = process.argv[3] || 'http://localhost:3101';
const browser = await chromium.launch({ channel: 'msedge', headless: true });
try {
  const page = await browser.newPage();
  const errors = [], external = [];
  page.on('pageerror', e => errors.push(e.message));
  const types = [{id:4,name:'Income'},{id:3,name:'commitment'},{id:2,name:'wants'},{id:1,name:'needs'}];
  const categories = ['Housing','Food','Utilities','Family','Entertainment'].map((name,index)=>({id:index+1,name,type_id:index===4?2:1}));
  await page.route('**/*', route => {
    if (new URL(route.request().url()).origin === base) return route.continue();
    const table = new URL(route.request().url()).pathname.split('/').at(-1);
    if (route.request().method() === 'GET' && ['types','categories'].includes(table)) return route.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify(table==='types'?types:categories)});
    external.push(route.request().url()); return route.abort();
  });
  await page.goto(`${base}/future-expense-plans`);
  await page.getByRole('button', { name: 'Create plan', exact: true }).click();
  assert.equal(await page.getByText('Manage Types & Categories', { exact: true }).count(), 0);
  assert.equal(await page.getByLabel('Behavior', { exact: true }).count(), 0);

  for (const [name, amount, type, category] of [
    ['Rent', 800, 'Needs', 'Housing'], ['Grocery', 300, 'Needs', 'Food'],
    ['Meals', 250, 'Needs', 'Food'], ['Electricity / Water', 120, 'Needs', 'Utilities'],
    ['Mother', 800, 'Needs', 'Family'], ['Games', 100, 'Wants', 'Entertainment'],
  ]) {
    await page.getByRole('button', { name: 'Add expense', exact: true }).click();
    assert.deepEqual(await page.getByRole('article', {name:'Expense New expense',exact:true}).getByRole('combobox',{name:/^Expense type/}).locator('option').allTextContents(), ['Choose type','Needs','Wants','Commitment']);
    await page.getByRole('article', { name: 'Expense New expense', exact: true }).getByLabel('Expense name', { exact: true }).fill(name);
    const row = page.getByRole('article', { name: `Expense ${name}`, exact: true });
    await row.getByLabel('Monthly amount', { exact: true }).fill(String(amount));
    await row.getByRole('combobox', { name: /^Expense type/ }).selectOption({ label: type });
    await row.getByRole('combobox', { name: /^Expense category/ }).selectOption({ label: category });
  }
  await page.getByLabel('Months to project', { exact: true }).fill('6');
  assert.match(await page.getByLabel('Total monthly cost', { exact: true }).innerText(), /2,370\.00/);
  assert.match(await page.getByLabel('Money required', { exact: true }).innerText(), /14,220\.00/);
  await page.getByRole('article', { name: 'Expense Games', exact: true }).getByLabel('Include expense').uncheck();
  assert.match(await page.getByLabel('Money required', { exact: true }).innerText(), /13,620\.00/);
  await page.reload();
  await page.waitForFunction(() => document.querySelector('[aria-label="Total monthly cost"]')?.textContent?.includes('2,270.00'));
  assert.match(await page.getByLabel('Total monthly cost', { exact: true }).innerText(), /2,270\.00/);
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('expense-tracker-future-planning-v2')));
  assert.equal(stored.scenarios.length, 0);
  assert.equal(stored.library.plans[0].items.length, 6);
  categories[0].name = 'Home';
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await page.getByRole('article', {name:'Expense Rent',exact:true}).getByRole('combobox',{name:/^Expense category/}).locator('option', {hasText:'Home'}).waitFor({state:'attached'});
  assert.match(await page.getByLabel('Total monthly cost', { exact: true }).innerText(), /2,270\.00/);
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  assert.deepEqual(errors, []); assert.deepEqual(external, []);
  console.log('PASS standalone CRUD, RM2370 example, projection, toggles, persistence, mobile width, zero scenarios and read-only bookkeeping requests and refreshed category names');
} finally { await browser.close(); }
