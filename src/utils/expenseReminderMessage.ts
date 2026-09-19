import { dateKey } from "./expenseMath";

export const defaultAppUrl = "https://expense-tracker-next-eta.vercel.app/";

export function getExpenseReminderAppUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    defaultAppUrl
  );
}

export function buildExpenseReminderMessage(today = dateKey()) {
  return [
    `Money reminder - ${today}`,
    "No expense recorded today.",
    "Open the app and add anything you missed:",
    getExpenseReminderAppUrl(),
  ].join("\n");
}
