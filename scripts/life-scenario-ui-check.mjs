import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { mkdirSync } from 'node:fs';

// node scripts/life-scenario-ui-check.mjs <temporary-playwright>/index.mjs [base-url]
// Isolated browser context; all external traffic is mocked, including financial writes.
const { chromium } = await import(pathToFileURL(process.argv[2]).href);
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const base = process.argv[3] || 'http://localhost:3101';
const errors = [], writes = [];
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  await page.clock.setFixedTime(new Date('2026-09-13T04:00:00Z'));
  page.on('pageerror', e => errors.push(e.message));
  await page.route('**/*', async route => {
    const req = route.request(), url = new URL(req.url());
    if (url.origin === base) return route.continue();
    if (!['GET', 'OPTIONS'].includes(req.method())) writes.push(url.pathname);
    const data = {
      assets: [{ id: 1, name: 'Available cash', current_value: 24000, currency: 'MYR' }, { id: 2, name: 'Home', current_value: 500000, currency: 'MYR' }],
      incomes: [{ id: 1, amount: 5500, income_date: '2026-08-25', currency: 'MYR' }, { id: 2, amount: 99999, income_date: '2026-09-02', currency: 'MYR' }],
      expenses: [{ id: 1, amount: 1000, expense_date: '2026-08-15', category_id: 1, currency: 'MYR' }, { id: 2, amount: 55, expense_date: '2026-08-20', category_id: 1, recurring_expense_id: 1, currency: 'MYR' }],
      categories: [{ id: 1, name: 'Food', type_id: 1 }],
      recurring_expenses: [{ id: 1, name: 'Netflix', amount: 55, is_active: true, repeat_day: 20, currency: 'MYR' }],
      payment_plans: [{ id: 'phone', name: 'Phone instalment', currency: 'MYR', payment_installments: [{ id: 1, amount: 300, due_date: '2026-10-10', status: 'scheduled' }, { id: 2, amount: 300, due_date: '2026-11-10', status: 'scheduled' }] }],
    };
    await route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' }, body: JSON.stringify(data[url.pathname.split('/').at(-1)] || []) });
  });
  await page.goto(`${base}/life-scenarios`);
  await page.getByRole('button', { name: 'New scenario', exact: true }).click();
  await page.getByLabel('Scenario name', { exact: true }).fill('Career break test');
  assert.equal(await page.getByLabel('Monthly income', { exact: true }).inputValue(), '5500');
  await page.getByLabel('Available cash', { exact: false }).check();
  assert.equal(await page.getByLabel('Starting liquid assets', { exact: true }).inputValue(), '24000');
  assert.equal(await page.getByLabel('Home ·', { exact: false }).isChecked(), false);
  await page.getByLabel('Minimum safety reserve', { exact: false }).fill('10000');
  await page.getByRole('button', { name: 'Create expense plan', exact: true }).click();
  await page.getByText('Manage Types & Categories', { exact: true }).click();
  await page.getByRole('button', { name: 'Use optional starter structure', exact: true }).click();
  await page.getByText('Manage Types & Categories', { exact: true }).click();
  await page.getByRole('button', { name: 'Build from historical spending', exact: true }).click();
  await page.getByRole('button', { name: 'Import recurring commitments', exact: true }).click();
  await page.getByRole('article', { name: 'Expense Netflix', exact: true }).getByRole('button', { name: 'Edit expense', exact: true }).click();
  await page.getByRole('article', { name: 'Expense Netflix', exact: true }).getByRole('combobox', { name: 'Expense type', exact: true }).selectOption({ label: 'Commitments' });
  await page.getByRole('article', { name: 'Expense Netflix', exact: true }).getByRole('combobox', { name: 'Expense category', exact: true }).selectOption({ label: 'Subscriptions' });
  await page.getByRole('button', { name: 'Confirm future expense plan', exact: true }).click();
  await page.getByLabel('I have reviewed liquid assets', { exact: false }).check();
  await page.getByRole('button', { name: 'Plan Leaving My Job / Job Transition' }).click();
  await page.getByLabel('New job start (blank = unknown)', { exact: true }).fill('2027-01-01');
  await page.getByLabel('Expected first salary date', { exact: true }).fill('2027-02-28');
  await page.getByLabel('Expected new monthly salary', { exact: false }).fill('6000');
  await page.getByLabel('Planned travel cost', { exact: false }).fill('4000');
  await page.getByRole('button', { name: 'Generate phases', exact: true }).click();
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await page.getByRole('button', { name: 'Projection', exact: true }).click();
  await page.getByRole('heading', { name: 'Liquid asset projection' }).waitFor();
  await page.getByText('Reserve', { exact: true }).waitFor();
  await page.getByText('Month-by-month details', { exact: true }).click();
  const october = page.getByRole('row').filter({ has: page.getByRole('rowheader', { name: '2026-10', exact: true }) });
  assert.ok((await october.innerText()).includes('300.00'));
  const december = page.getByRole('row').filter({ has: page.getByRole('rowheader', { name: '2026-12', exact: true }) });
  assert.equal(await december.locator('td').nth(5).innerText(), '0.00');
  await page.getByRole('button', { name: 'Create savings goal', exact: true }).click();
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('expense-tracker-savings-goals') || '[]').length), 0);
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await page.getByRole('button', { name: 'Create savings goal', exact: true }).click();
  await page.getByRole('button', { name: 'Confirm create savings goal', exact: true }).click();
  await page.getByRole('link', { name: 'Open linked savings goal' }).waitFor();
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('expense-tracker-savings-goals')).length), 1);
  await page.getByRole('button', { name: 'Duplicate', exact: true }).click();
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('expense-tracker-future-planning-v2')).scenarios.length), 2);
  for (const checkbox of await page.getByLabel('Compare', { exact: true }).all()) await checkbox.check();
  await page.getByRole('heading', { name: 'Compare financial consequences' }).waitFor();
  await page.reload();
  await page.getByRole('button', { name: 'Career break test (Copy)', exact: false }).click();
  await page.getByRole('heading', { name: 'Liquid asset projection' }).waitFor();
  mkdirSync('.ai', { recursive: true });
  await page.screenshot({ path: '.ai/life-scenarios-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'Mobile page must not overflow horizontally');
  await page.screenshot({ path: '.ai/life-scenarios-mobile.png', fullPage: true });
  await page.getByRole('button', { name: 'Light theme', exact: true }).click();
  assert.equal(await page.locator('main').evaluate(el => el.classList.contains('light-theme')), true);
  assert.equal(await page.locator('[data-card-variant]').first().evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(255, 255, 255)', 'Light cards should have an opaque readable surface');
  await page.screenshot({ path: '.ai/life-scenarios-mobile-light.png', fullPage: true });
  await page.getByRole('button', { name: 'Edit plan', exact: true }).click();
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'Mobile editor must not overflow horizontally');
  await page.getByLabel('Scenario name', { exact: true }).fill('Unsaved test');
  page.once('dialog', dialog => dialog.accept());
  await page.reload();
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('expense-tracker-future-planning-v2')).scenarios[1].name), 'Career break test (Copy)');
  await page.evaluate(() => localStorage.setItem('expense-tracker-future-planning-v2', '{damaged'));
  await page.reload();
  await page.getByText('Saved planning data could not be read.', { exact: false }).waitFor();
  assert.equal(await page.getByRole('button', { name: 'New scenario', exact: true }).isEnabled(), false);
  assert.equal(await page.evaluate(() => localStorage.getItem('expense-tracker-future-planning-v2')), '{damaged');
  assert.deepEqual(writes, [], 'Scenario actions must not write actual financial records');
  assert.deepEqual(errors, [], 'No browser runtime errors');
  console.log('PASS imported baseline, asset review, transition, repayment end, goal confirmation, duplication, comparison, persistence, mobile layout and no actual writes');
} finally { await browser.close(); }
