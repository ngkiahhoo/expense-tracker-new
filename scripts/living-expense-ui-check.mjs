import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";

const { chromium } = await import(pathToFileURL(process.argv[2]).href);
const base = process.argv[3] || "http://localhost:3100";
const browser = await chromium.launch({ channel: "msedge", headless: true });

try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [],
    external = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const types = [
    { id: 3, name: "commitment" },
    { id: 2, name: "wants" },
    { id: 1, name: "needs" },
  ];
  const categories = [
    { id: 1, name: "Food", type_id: 1 },
    { id: 2, name: "Entertainment", type_id: 2 },
    { id: 3, name: "Loans", type_id: 3 },
  ];
  let workspace = {
    library: { plans: [], types: [], categories: [], mappings: [] },
    revision: 0,
    imported_ids: [],
  };
  await page.route("**/*", (route) => {
    if (new URL(route.request().url()).origin === base) return route.continue();
    const table = new URL(route.request().url()).pathname.split("/").at(-1);
    if (table === "future_expense_workspace") {
      if (route.request().method() === "PATCH")
        workspace = { ...workspace, ...route.request().postDataJSON() };
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: { "access-control-allow-origin": "*" },
        body: JSON.stringify(workspace),
      });
    }
    if (
      route.request().method() === "GET" &&
      ["types", "categories"].includes(table)
    )
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: { "access-control-allow-origin": "*" },
        body: JSON.stringify(table === "types" ? types : categories),
      });
    external.push(route.request().url());
    return route.abort();
  });
  await page.goto(`${base}/future-expense-plans`);
  await page.getByText(/Saved to database/).waitFor();
  const planMenu = page.locator("select").first();
  await planMenu.selectOption({ label: "＋ Create plan" });
  await page.getByRole("button", { name: "Edit plan", exact: true }).waitFor();

  // A draft appears above the collapsed type list and stays out of totals until Save.
  await page.getByRole("button", { name: "Add expense", exact: true }).click();
  const draft = page.getByRole("article", {
    name: "Expense New expense",
    exact: true,
  });
  assert.equal(
    await draft.getByLabel("Expense name", { exact: true }).count(),
    0,
  );
  await draft.getByRole("button").click();
  await draft.locator("input").first().fill("Grocery");
  const draftEditor = page.getByRole("article", {
    name: "Expense Grocery",
    exact: true,
  });
  await draftEditor.locator('input[type="number"]').fill("400");
  await draftEditor.locator("select").nth(1).selectOption({ label: "Needs" });
  await draftEditor.locator("select").nth(2).selectOption({ label: "Food" });
  assert.equal(workspace.library.plans[0].items.length, 0);
  await draftEditor
    .getByRole("button", { name: "Save expense", exact: true })
    .click();
  await page.getByText(/Saved to database/).waitFor();
  assert.equal(workspace.library.plans[0].items.length, 1);
  assert.match(
    await page.getByLabel("Total monthly cost", { exact: true }).innerText(),
    /400\.00/,
  );

  // Type → category → record details each expand and collapse independently.
  const needs = page.getByRole("button", { name: /Needs.*400/ });
  await needs.click();
  const food = page.getByRole("button", { name: /Food.*400/ });
  await food.click();
  const grocery = page.getByRole("article", {
    name: "Expense Grocery",
    exact: true,
  });
  await grocery.getByRole("button").first().click();
  await grocery.locator("input:not([type])").last().fill("\u7ed9\u5bb6\u4eba");
  await grocery.getByRole("button").first().click();
  assert.equal(await grocery.getByLabel("Note", { exact: true }).count(), 0);
  await food.click();
  assert.equal(await grocery.count(), 0);

  // Summary starts condensed; the remaining projection data is intentional opt-in.
  assert.equal(
    await page.getByLabel("Expected Monthly Income", { exact: true }).count(),
    0,
  );
  await page.getByRole("button", { name: /Total Monthly Expenses/ }).click();
  await page.getByLabel("Months to project", { exact: true }).fill("6");
  assert.match(
    await page.getByLabel("Money required", { exact: true }).innerText(),
    /2,400\.00/,
  );
  assert.equal(
    await page.getByText("Expected Monthly Saving", { exact: true }).count(),
    1,
  );

  // Plan metadata lives only in the edit modal.
  await page.getByRole("button", { name: "Edit plan", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Edit plan", exact: true });
  await dialog.getByLabel("Plan name", { exact: true }).fill("Current life");
  await dialog.getByLabel("Description", { exact: true }).fill("Living costs");
  await dialog
    .getByRole("button", { name: "Close edit plan", exact: true })
    .click();
  assert.equal(await page.getByLabel("Plan name", { exact: true }).count(), 0);
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
  );
  assert.deepEqual(errors, []);
  assert.deepEqual(external, []);
  console.log(
    "PASS plan-menu creation, saved drafts, hierarchical collapse, summary collapse, edit modal and mobile width",
  );
} finally {
  await browser.close();
}
