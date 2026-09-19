import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
// Optional external Playwright installation: node scripts/ux-browser-check.mjs <path-to-playwright/index.mjs>
const { chromium } = await import(process.argv[2] ? pathToFileURL(process.argv[2]).href : 'playwright');
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kuala_Lumpur' }).format(new Date());
const month = date.slice(0, 7);
const category = { id: 1, name: 'Food', type_id: 1, types: { id: 1, name: 'Needs' } };
const incomes = [{ id: 1, amount: 5000, note: 'Salary MYR', income_date: `${month}-17`, currency: 'MYR' }, { id: 2, amount: 1000, note: 'Salary SGD', income_date: `${month}-11`, currency: 'SGD' }];
const expenses = [{ id: 1, amount: 25, note: 'Lunch', expense_date: `${month}-15`, category_id: 1, categories: category, currency: 'MYR' }, { id: 2, amount: 80, note: 'Foreign meal', expense_date: `${month}-15`, category_id: 1, categories: category, currency: 'SGD' }];
let failExpense = false, failIncome = false, failRead = false, failCloud = false, writes = 0;
const event = { id: 'trip', name: 'Trip', description: 'Holiday', currency: 'MYR', kind: 'expense', startDate: '2028-12-01', endDate: '2028-12-01', items: [{ id: 'hotel', name: 'Hotel', amount: 200, frequency: 'once' }], createdAt: date, updatedAt: date };
const workspaceRows = { financial_events: { data: [event], revision: 1, legacy_imported: true }, saved_notes: { data: [], revision: 1, legacy_imported: true }, event_currencies: { data: ['MYR', 'SGD'], revision: 1, legacy_imported: true } };
const errors = [];
try {
  const page = await browser.newPage({ viewport: { width: 339, height: 760 } });
  page.on('pageerror', e => errors.push(e.message));
  page.on('dialog', dialog => dialog.accept());
  await page.route('**/rest/v1/**', async route => {
    const request = route.request(), url = new URL(request.url()), table = url.pathname.split('/').at(-1);
    if (url.pathname.includes('/rpc/')) return route.fulfill({ json: 0 });
    if (table === 'cloud_feature_workspaces') {
      const key = (url.searchParams.get('key') || '').replace('eq.', '');
      if (request.method() !== 'GET') {
        if (failCloud && key === 'financial_events') return route.fulfill({ status: 500, json: { message: 'Offline test', code: 'TEST' } });
        workspaceRows[key] = { ...workspaceRows[key], ...request.postDataJSON() };
      }
      return route.fulfill({ json: workspaceRows[key] ?? { data: [], revision: 1, legacy_imported: true } });
    }
    if ((failRead && table === 'assets') || (request.method() !== 'GET' && ((failExpense && table === 'expenses') || (failIncome && table === 'incomes')))) return route.fulfill({ status: 500, json: { message: 'Test connection failed', code: 'TEST' } });
    if (request.method() !== 'GET') {
      if (table === 'expenses' || table === 'incomes') {
        writes++;
        const rows = table === 'expenses' ? expenses : incomes;
        const body = request.postDataJSON();
        const id = Number((url.searchParams.get('id') || '').replace('eq.', ''));
        if (request.method() === 'PATCH') Object.assign(rows.find(row => row.id === id), body);
        if (request.method() === 'POST') rows.push({ ...body[0], id: rows.length + 1, ...(table === 'expenses' ? { categories: category } : {}) });
      }
      return route.fulfill({ status: 204 });
    }
    const tables = { incomes, expenses, assets: [{ id: 1, name: 'MYR Bank', current_value: 8000, currency: 'MYR', is_main: true }, { id: 2, name: 'SGD Bank', current_value: 2000, currency: 'SGD', is_main: true }], categories: [category], types: [{ id: 1, name: 'Needs' }], recurring_expenses: [], payment_plans: [], payment_names: [], cloud_feature_workspaces: { data: [], revision: 1, legacy_imported: true } };
    let rows = tables[table] ?? [];
    if (Array.isArray(rows)) {
      rows = rows.filter(row => [...url.searchParams].every(([key, value]) => {
        if (value.startsWith('eq.')) return String(row[key]) === value.slice(3);
        if (value.startsWith('gte.')) return String(row[key]) >= value.slice(4);
        if (value.startsWith('lte.')) return String(row[key]) <= value.slice(4);
        return true;
      }));
      if (request.headers().accept?.includes('vnd.pgrst.object')) rows = rows[0] ?? null;
    }
    await route.fulfill({ json: rows });
  });
  await page.goto('http://localhost:3000');
  await page.getByRole('button', { name: 'View Monthly Income details' }).click();
  let dialog = page.getByRole('dialog');
  await dialog.getByText('Salary MYR', { exact: true }).waitFor();
  assert.equal(await dialog.getByText('Salary SGD', { exact: true }).count(), 0);
  await dialog.getByRole('button', { name: 'Edit income', exact: true }).click();
  assert.equal(await dialog.getByLabel('Income date').inputValue(), `${month}-17`);
  await dialog.getByLabel('Income amount').fill('5100');
  failIncome = true;
  await dialog.getByRole('button', { name: 'Update Income', exact: true }).click();
  await dialog.getByText('Test connection failed', { exact: true }).waitFor();
  assert.equal(await dialog.getByLabel('Income amount').inputValue(), '5100');
  failIncome = false;
  await dialog.getByRole('button', { name: 'Update Income', exact: true }).click();
  await dialog.getByRole('button', { name: '+ Add Income', exact: true }).waitFor();
  assert.equal(incomes[0].income_date, `${month}-17`);
  await dialog.getByRole('button', { name: 'Close panel' }).click();
  await page.getByRole('button', { name: 'View Total Spending details' }).click();
  dialog = page.getByRole('dialog');
  await dialog.getByText('Lunch', { exact: true }).waitFor();
  assert.equal(await dialog.getByLabel('Filter currency').inputValue(), 'MYR');
  assert.equal(await dialog.getByLabel('From date').inputValue(), `${month}-01`);
  await dialog.getByLabel('Search records').fill('Lunch');
  await dialog.getByRole('button', { name: 'Edit expense' }).click();
  await dialog.getByLabel('Expense category').selectOption('1');
  assert.equal(await dialog.getByLabel('Expense amount').evaluate(el => el === document.activeElement), true);
  await dialog.getByLabel('Expense amount').fill('30');
  failExpense = true;
  await dialog.getByRole('button', { name: 'Update Expense', exact: true }).click();
  await dialog.getByText('Test connection failed', { exact: true }).waitFor();
  assert.equal(await dialog.getByLabel('Expense amount').inputValue(), '30');
  await page.setViewportSize({ width: 339, height: 430 });
  const saveBounds = await dialog.getByRole('button', { name: 'Update Expense', exact: true }).boundingBox();
  assert.ok(saveBounds.y >= 0 && saveBounds.y + saveBounds.height <= 430, 'Save stays in the viewport');
  await page.screenshot({ path: `${process.env.TEMP}/ux-mobile-editor.png` });
  failExpense = false;
  await dialog.getByRole('button', { name: 'Update Expense', exact: true }).click();
  await dialog.getByLabel('Search records').waitFor();
  assert.equal(await dialog.getByLabel('Search records').inputValue(), 'Lunch');
  assert.equal(await dialog.locator('[data-record-id="expense-1"]').count(), 1);
  await dialog.getByRole('button', { name: 'Close panel' }).click();
  await page.setViewportSize({ width: 1440, height: 950 });
  await page.getByRole('button', { name: 'Action', exact: true }).click();
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  dialog = page.getByRole('dialog');
  await dialog.getByLabel('Expense amount').fill('5');
  assert.equal(await dialog.getByLabel('Expense date').inputValue(), date);
  await page.reload();
  await page.getByRole('button', { name: 'Action', exact: true }).click();
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  dialog = page.getByRole('dialog');
  assert.equal(await dialog.getByLabel('Expense amount').inputValue(), '5');
  assert.equal(await dialog.getByLabel('Expense category').inputValue(), '1');
  await dialog.getByRole('button', { name: 'Add Expense', exact: true }).evaluate(button => { button.click(); button.click(); });
  await page.getByText('Expense added successfully', { exact: true }).waitFor();
  assert.equal(await dialog.getByLabel('Expense amount').inputValue(), '');
  await dialog.getByRole('button', { name: 'Close panel' }).click();
  await page.getByRole('button', { name: 'View Total Assets details' }).click();
  dialog = page.getByRole('dialog', { name: 'Asset Details' });
  await dialog.getByText('MYR Bank', { exact: true }).waitFor();
  assert.equal(await dialog.getByText('SGD Bank', { exact: true }).count(), 0);
  await dialog.getByRole('button', { name: 'Close asset details' }).click();
  await page.screenshot({ path: `${process.env.TEMP}/ux-desktop-dashboard.png` });
  failRead = true;
  await page.reload();
  await page.getByText('Failed to fetch assets', { exact: true }).waitFor();
  assert.match(await page.getByRole('button', { name: 'View Total Assets details' }).innerText(), /Unavailable/);
  failRead = false;
  const retry = page.getByRole('button', { name: 'Retry', exact: true }).first();
  if (await retry.count()) await retry.evaluate(button => button.click());
  await page.getByText('RM 8000.00', { exact: true }).waitFor();
  assert.equal(writes, 3, 'Double-click must not create duplicate transactions');
  await page.goto('http://localhost:3000/financial-events');
  await page.getByRole('button', { name: /^Trip / }).click();
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await page.getByRole('button', { name: /^Trip / }).waitFor();
  await page.getByLabel('Search records').fill('Trip');
  failCloud = true;
  await page.getByRole('button', { name: 'Duplicate', exact: true }).click();
  await page.getByText(/Cloud sync failed/).first().waitFor();
  await page.reload();
  await page.getByText(/Unsynced changes recovered/).first().waitFor();
  assert.equal(await page.getByLabel('Search records').inputValue(), 'Trip');
  failCloud = false;
  await page.getByRole('button', { name: 'Retry financial_events', exact: true }).click();
  await page.getByText(/Unsynced changes recovered/).first().waitFor({ state: 'hidden' });
  assert.equal(workspaceRows.financial_events.data.length, 2, 'Recovered duplicate is saved without losing the original event');
  await page.setViewportSize({ width: 339, height: 760 });
  await page.screenshot({ path: `${process.env.TEMP}/ux-mobile-events.png`, fullPage: true });
  assert.deepEqual(errors, []);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  console.log('UX checks passed: scoped drilldowns, edit dates, failed-save recovery, filter memory, mobile save footer, asset retry, event undo, cloud recovery after reload, and no runtime errors.');
} finally { await browser.close(); }
