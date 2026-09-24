import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const { chromium } = await import(process.env.GYM_PLAYWRIGHT_PATH ? pathToFileURL(process.env.GYM_PLAYWRIGHT_PATH).href : 'playwright');
const origin = process.env.GYM_TEST_URL || 'http://localhost:3000';
const output = 'coverage/gym-progress';
await mkdir(output, { recursive: true });
const timestamp = '2026-09-01T08:00:00Z';
const exercises = [
  { id: 'press', name: 'Dumbbell Floor Press', trackingType: 'weight_reps', category: 'upper' },
  { id: 'row', name: 'One-Arm Dumbbell Row', trackingType: 'weight_reps', category: 'upper' },
  { id: 'pull', name: 'Pull-up', trackingType: 'reps', category: 'upper' },
  { id: 'plank', name: 'Plank', trackingType: 'time', category: 'core' },
  { id: 'squat', name: 'Bulgarian Split Squat', trackingType: 'weight_reps', category: 'lower' },
].map(e => ({ ...e, createdAt: timestamp, updatedAt: timestamp }));
const plan = { id: 'A', name: 'Plan A', createdAt: timestamp, updatedAt: timestamp,
  exerciseIds: exercises.map(e => ({ id: `plan-${e.id}`, exerciseId: e.id, targetSets: 3, targetRepMin: 8, targetRepMax: 12 })) };
function session(day, progressed = false) {
  const startedAt = `2026-09-${String(day).padStart(2, '0')}T08:00:00Z`;
  const occurrences = exercises.slice(0, 4).map(e => ({ id: `occ-${day}-${e.id}`, exerciseId: e.id, nameSnapshot: e.name, trackingTypeSnapshot: e.trackingType, plannedSetsSnapshot: 3, targetRepMin: 8, targetRepMax: 12, status: 'completed' }));
  return { id: `session-${day}`, planId: 'A', planNameSnapshot: 'Plan A', startedAt, endedAt: startedAt.replace('08:00', '09:00'), status: 'completed', exercises: occurrences,
    sets: occurrences.flatMap(e => Array.from({ length: 3 }, (_, i) => ({ id: `${e.id}-${i}`, workoutExerciseId: e.id, setNumber: i + 1, completedAt: startedAt,
      ...(e.trackingTypeSnapshot === 'time' ? { durationSeconds: progressed ? 45 : 30 } : e.trackingTypeSnapshot === 'reps' ? { reps: progressed ? 3 : 1 } : { weight: progressed ? 7.5 : 5, reps: progressed ? 12 : 10 }) }))) };
}
function fixture(mode = 'baseline') {
  return { data: { exercises, plans: [plan], routines: [], sessions: mode === 'empty' ? [] : mode === 'baseline' ? [session(1)] : [session(1), session(19, true)], progressSettings: { availableLoads: [5, 7.5, 10], weightConvention: 'per_dumbbell' } }, active: null, paused: null };
}

const browser = await chromium.launch({ headless: true });
const errors = [];
async function setup(theme, width, mode = 'baseline') {
  const context = await browser.newContext({ viewport: { width, height: width > 700 ? 960 : 900 }, permissions: ['clipboard-read', 'clipboard-write'], timezoneId: 'Asia/Kuala_Lumpur' });
  let state = fixture(mode);
  await context.addInitScript(({ data, theme }) => {
    localStorage.setItem('expense-tracker-theme', theme);
    localStorage.setItem('expense-tracker-gym-mvp', JSON.stringify(data));
  }, { data: state.data, theme });
  await context.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.origin === origin) return route.continue();
    if (url.pathname.endsWith('/workout_shared_state') || url.pathname.endsWith('/workout_app_state')) {
      if (route.request().method() === 'GET') return route.fulfill({ json: { payload: state } });
      const body = route.request().postDataJSON();
      if (body?.payload) state = body.payload;
      return route.fulfill({ status: 201, json: {} });
    }
    return route.fulfill({ json: {} });
  });
  const page = await context.newPage();
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(`${origin}/gym`);
  await page.getByRole('link', { name: 'Open Progress Analysis' }).waitFor();
  return { context, page };
}

async function inspect(page) {
  return page.evaluate(() => {
    const violations = [];
    const rgb = s => (s.match(/[\d.]+/g) || []).map(Number);
    const composite = (fg, bg) => fg.slice(0, 3).map((v, i) => v * (fg[3] ?? 1) + bg[i] * (1 - (fg[3] ?? 1)));
    const luminance = channels => channels.map(v => { const c = v / 255; return c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4; }).reduce((sum, c, i) => sum + c * [.2126, .7152, .0722][i], 0);
    for (const element of document.querySelectorAll('.gym-progress-analysis :is(h1,h2,h3,h4,p,dt,dd,strong,summary,label,button), .gym-progress-entry :is(h2,p)')) {
      if (!element.checkVisibility() || !element.textContent.trim()) continue;
      const style = getComputedStyle(element);
      let bg = [3, 8, 6];
      const ancestors = [];
      for (let node = element; node; node = node.parentElement) ancestors.unshift(node);
      for (const node of ancestors) bg = composite(rgb(getComputedStyle(node).backgroundColor), bg);
      const foreground = composite(rgb(style.webkitTextFillColor || style.color), bg);
      const a = luminance(foreground), b = luminance(bg);
      const contrast = (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
      if (contrast < 4.5) violations.push({ text: element.textContent.slice(0, 60), contrast, color: style.color, background: bg });
      const box = element.getBoundingClientRect();
      if (box.right > innerWidth + 1 || box.left < -1) violations.push({ text: element.textContent.slice(0, 60), overflow: [box.left, box.right, innerWidth] });
    }
    return { violations, overflow: document.documentElement.scrollWidth > innerWidth };
  });
}

try {
  for (const theme of ['dark', 'light']) {
    for (const width of [360, 440, 1440]) {
      const { context, page } = await setup(theme, width);
      await page.getByRole('link', { name: 'Open Progress Analysis' }).click();
      await page.getByRole('heading', { name: 'Progress Analysis', exact: true, level: 1 }).waitFor();
      assert.ok(await page.getByRole('heading', { name: 'Your baseline is set' }).isVisible());
      const findings = await inspect(page);
      await page.screenshot({ path: `${output}/baseline-${theme}-${width}.png`, fullPage: true });
      assert.deepEqual(findings.violations, [], `${theme}/${width} text must remain readable`);
      assert.equal(findings.overflow, false);
      await context.close();
    }
  }

  const { context, page } = await setup('dark', 440, 'history');
  await page.getByRole('link', { name: 'Open Progress Analysis' }).click();
  const card = page.getByRole('article').filter({ has: page.getByRole('heading', { name: 'Dumbbell Floor Press', exact: true }) });
  await card.getByText('Load history', { exact: false }).click();
  assert.ok(await card.getByText('5 to 7.5kg', { exact: true }).isVisible());
  await card.getByText('PR history', { exact: false }).click();
  assert.ok(await card.getByText('Load PR · 5 to 7.5 kg', { exact: true }).isVisible());
  await page.getByRole('button', { name: 'About Estimated strength', exact: true }).first().click();
  assert.ok(await page.getByRole('note').first().isVisible());
  await page.screenshot({ path: `${output}/history-mobile.png`, fullPage: true });
  assert.deepEqual((await inspect(page)).violations, []);

  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('link', { name: 'Available Loads', exact: true }).click();
  await page.getByLabel('Weights you can configure').fill('5, 7.5, 12.5');
  await page.getByRole('button', { name: 'Save loads' }).click();
  await page.getByText('Available loads saved.', { exact: true }).waitFor();
  await page.getByRole('link', { name: 'Progress', exact: true }).click();
  await page.getByRole('heading', { name: '12.5kg x 8', exact: true }).first().waitFor();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('button', { name: 'Export for AI', exact: true }).click();
  await page.getByText('AI export copied', { exact: true }).waitFor();
  const exported = await page.evaluate(() => navigator.clipboard.readText());
  assert.ok(exported.includes('PROGRESS ANALYSIS JSON'));
  assert.ok(exported.includes('12.5kg x 8'));
  await page.getByRole('button', { name: 'Settings', exact: true }).click();

  await page.getByRole('link', { name: 'Go to Gym home', exact: true }).click();
  await page.getByRole('button', { name: 'Start Workout', exact: true }).click();
  await page.getByRole('checkbox', { name: 'Complete all sets', exact: true }).check();
  await page.getByRole('button', { name: 'Complete All Sets', exact: true }).click();
  const rir = page.getByRole('dialog', { name: 'How many more reps could you do?' });
  await rir.waitFor();
  assert.ok(await rir.getByText('Dumbbell Floor Press · Final working set saved', { exact: true }).isVisible());
  await page.screenshot({ path: `${output}/rir-mobile.png` });
  await rir.getByRole('button', { name: '2', exact: true }).click();
  assert.ok(await page.getByRole('heading', { name: 'One-Arm Dumbbell Row', exact: true }).first().isVisible());
  const active = await page.evaluate(() => JSON.parse(localStorage.getItem('expense-tracker-gym-active')));
  assert.equal(active.session.sets.length, 3);
  assert.equal(active.session.sets[2].repsInReserve, 2);
  assert.equal(active.session.sets[0].repsInReserve, undefined);
  await page.getByRole('checkbox', { name: 'Complete all sets', exact: true }).uncheck();
  await page.getByRole('button', { name: 'Complete Set', exact: true }).click();
  assert.equal(await page.getByRole('dialog').count(), 0);
  await page.getByRole('button', { name: 'Complete Set', exact: true }).click();
  assert.equal(await page.getByRole('dialog').count(), 0);
  await page.getByRole('button', { name: 'Complete Set', exact: true }).click();
  await rir.waitFor();
  await page.keyboard.press('Escape');
  await rir.waitFor({ state: 'detached' });
  const skippedRir = await page.evaluate(() => JSON.parse(localStorage.getItem('expense-tracker-gym-active')));
  assert.equal(skippedRir.session.sets.length, 6);
  assert.equal(skippedRir.session.sets.at(-1).repsInReserve, undefined, 'Skipping RIR must not record zero');
  await context.close();

  const empty = await setup('light', 360, 'empty');
  await empty.page.getByRole('link', { name: 'Open Progress Analysis' }).click();
  await empty.page.getByRole('heading', { name: 'Start your training history', exact: true }).waitFor();
  await empty.page.screenshot({ path: `${output}/empty-mobile.png`, fullPage: true });
  assert.equal((await inspect(empty.page)).overflow, false);
  await empty.context.close();
  assert.deepEqual(errors, []);
  console.log(`PASS dark/light at 360/440/1440px, >=4.5 text contrast, empty/baseline/rich history, navigation, disclosures, settings, clipboard export, final-set RIR and auto-advance. Screenshots: ${output}`);
} finally {
  await browser.close();
}
