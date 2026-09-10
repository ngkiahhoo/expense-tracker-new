import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';

// Uses a temporary Playwright installation and Edge; all external requests are mocked.
const { chromium } = await import(pathToFileURL(process.argv[2]).href);
const browser = await chromium.launch({ channel: 'msedge', headless: true, timeout: 15000 });
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.setDefaultTimeout(10000);
  const errors = [];
  const writes = [];
  const names = [{ id: 1, name: 'Shopee', is_active: true }];
  const plans = [{ id: 'existing', name: 'Shopee', payment_name_id: 1, currency: 'MYR', category_id: 1, payment_installments: [
    { id: 1, sequence: 1, amount: 25, due_date: '2199-01-31', status: 'scheduled' },
    { id: 2, sequence: 2, amount: 25, due_date: '2199-02-28', status: 'scheduled' },
  ] }];
  let missingSetup = false;
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.hostname === 'localhost') return route.continue();
    const endpoint = url.pathname.split('/').at(-1);
    if (missingSetup && endpoint === 'process_due_payment_installments') return route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ code: 'PGRST202', message: 'Could not find the function public.process_due_payment_installments without parameters in the schema cache' }), headers: { 'access-control-allow-origin': '*' } });
    let body = [];
    if (endpoint === 'payment_names') body = names.filter(name => name.is_active);
    if (endpoint === 'payment_plans') body = plans;
    if (endpoint === 'save_payment_name' && route.request().method() === 'POST') {
      const payload = route.request().postDataJSON();
      if (payload.p_id) {
        names.find(name => name.id === payload.p_id).name = payload.p_name.trim();
        plans.filter(plan => plan.payment_name_id === payload.p_id).forEach(plan => { plan.name = payload.p_name.trim(); });
      }
      body = 1;
    }
    if (endpoint === 'remove_payment_name' && route.request().method() === 'POST') {
      names[0].is_active = false;
      body = null;
    }
    if (endpoint === 'assets') body = [{ id: 1, name: 'Cash', currency: 'MYR', current_value: 2000, is_main: true }];
    if (endpoint === 'categories') body = [{ id: 1, name: 'Shopping', type_id: 1, types: { id: 1, name: 'Wants' } }];
    if (endpoint === 'process_due_payment_installments') body = 0;
    if (endpoint === 'create_payment_plan' && route.request().method() === 'POST') {
      const payload = route.request().postDataJSON();
      writes.push(payload);
      plans.push({ id: payload.p_id, name: payload.p_name, payment_name_id: payload.p_payment_name_id, currency: payload.p_currency, category_id: payload.p_category_id, payment_installments: payload.p_amounts.map((amount, i) => ({ id: plans.length * 100 + i, sequence: i + 1, amount, due_date: ['2199-01-31', '2199-02-28', '2199-03-31'][i], status: 'scheduled' })) });
      body = payload.p_id;
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body), headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' } });
  });
  await page.goto('http://localhost:3100');
  await page.getByRole('button', { name: 'Action Tools' }).click();
  await page.getByRole('button', { name: 'Pay Later Installments' }).click();
  await page.getByRole('heading', { name: 'Pay Later & Installments' }).waitFor();
  await page.getByLabel('Payment type').selectOption('installment');
  await page.getByRole('button', { name: 'Add name', exact: true }).click();
  await page.getByLabel('New name', { exact: true }).fill(' shopee ');
  await page.getByRole('button', { name: 'Save name', exact: true }).click();
  await page.getByLabel('New name', { exact: true }).waitFor({ state: 'hidden' });
  assert.equal(await page.getByLabel('Name', { exact: true }).inputValue(), '1');
  assert.equal(await page.getByLabel('Name', { exact: true }).locator('option').count(), 2);
  await page.getByLabel('Category', { exact: false }).selectOption('1');
  await page.getByLabel('Total payable', { exact: false }).fill('100');
  await page.getByLabel('Number of months').fill('3');
  await page.getByLabel('First payment date').fill('2024-01-31');
  await page.getByText('2. 2024-02-29', { exact: true }).waitFor();
  assert.equal(await page.getByRole('spinbutton', { name: 'Payment 3 amount (MYR)', exact: true }).inputValue(), '33.34');
  await page.getByRole('spinbutton', { name: 'Payment 1 amount (MYR)', exact: true }).fill('20');
  await page.getByText('MYR 13.33 left to allocate.', { exact: true }).waitFor();
  assert.equal(await page.getByRole('button', { name: 'Create plan', exact: true }).isEnabled(), false);
  await page.getByRole('spinbutton', { name: 'Payment 2 amount (MYR)', exact: true }).fill('30');
  await page.getByRole('spinbutton', { name: 'Payment 3 amount (MYR)', exact: true }).fill('50');
  assert.equal(await page.getByRole('button', { name: 'Create & post MYR 100.00', exact: true }).isEnabled(), true);
  await page.getByLabel('First payment date').fill('2199-01-31');
  const submit = page.getByRole('button', { name: 'Create plan', exact: true });
  await submit.click();
  await page.getByText('Payment plan saved.', { exact: true }).waitFor();
  assert.equal(writes.length,1);
  assert.equal(writes[0].p_count,3);
  assert.equal(writes[0].p_total,100);
  assert.equal(writes[0].p_currency,'MYR');
  assert.deepEqual(writes[0].p_amounts,[20,30,50]);
  assert.equal(writes[0].p_payment_name_id,1);
  await page.getByText('2 plan(s) · MYR 150.00 remaining', { exact: true }).waitFor();
  await page.getByText('Shopee', { exact: true }).filter({ visible: true }).click();
  await page.getByText('MYR 45.00', { exact: true }).waitFor();
  await page.getByText('MYR 55.00', { exact: true }).waitFor();
  await page.getByLabel('Payment type').selectOption('later');
  await page.getByLabel('Total payable', { exact: false }).fill('40');
  await page.getByRole('button', { name: 'Create plan', exact: true }).click();
  await page.getByText('3 plan(s) · MYR 190.00 remaining', { exact: true }).waitFor();
  assert.equal(writes.length,2);
  await page.getByRole('button', { name: 'Rename selected name', exact: true }).click();
  await page.getByLabel('Rename name', { exact: true }).fill('Shopee Shopping');
  await page.getByRole('button', { name: 'Save name', exact: true }).click();
  await page.getByLabel('Rename name', { exact: true }).waitFor({ state: 'hidden' });
  await page.getByText('Shopee Shopping', { exact: true }).filter({ visible: true }).waitFor();
  await page.getByRole('button', { name: 'Delete selected name', exact: true }).click();
  await page.getByRole('button', { name: 'Remove from menu', exact: true }).click();
  await page.getByRole('button', { name: 'Close name editor', exact: true }).waitFor({ state: 'hidden' });
  assert.equal(await page.getByLabel('Name', { exact: true }).locator('option').count(),1);
  await page.getByText('3 plan(s) · MYR 190.00 remaining', { exact: true }).waitFor();
  missingSetup = true;
  await page.getByRole('button', { name: 'Refresh', exact: true }).click();
  await page.getByRole('button', { name: 'Close panel', exact: true }).click();
  await page.getByRole('button', { name: 'Action Tools' }).click();
  await page.getByRole('button', { name: 'Pay Later Installments' }).click();
  await page.getByText('Payment plans are not set up in this database yet.', { exact: false }).waitFor();
  assert.equal(await page.getByText('No MYR payment plans yet.', { exact: true }).count(), 0);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),false);
  assert.deepEqual(errors,[]);
  console.log('PASS: mobile name CRUD, duplicate name selection, combined installment and Pay Later totals, custom monthly amounts, archive preserving history, missing setup message and no horizontal overflow or runtime errors. All external requests mocked.');
} finally { await browser.close(); }
