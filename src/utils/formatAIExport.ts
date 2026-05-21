import type { Expense } from "../types/expense";
import type { Income } from "../types/income";
import type { Category } from "../types/category";

function csvEscape(s: string | number | null | undefined) {
  if (s === null || s === undefined) return "";
  const str = String(s);
  if (str.includes(",") || str.includes('\n') || str.includes('"')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toMonth(dateStr: string) {
  return dateStr.slice(0, 7);
}

function dayOfWeek(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, { weekday: "long" });
}

export function formatAIExport(
  expenses: Expense[],
  incomes: Income[],
  categories: Category[],
  monthlySummaries: any[],
  options: {
    includeExpenses: boolean;
    includeMonthlySummary: boolean;
    includeCategories: boolean;
    includeAIPrompt: boolean;
  }
) {
  const parts: string[] = [];

  if (options.includeExpenses) {
    parts.push("=== EXPENSES CSV ===\n");
    parts.push("date,month,day_of_week,amount,category,type,note\n");
    for (const e of expenses) {
      const date = e.expense_date;
      const month = toMonth(date);
      const dow = dayOfWeek(date);
      const amount = Number(e.amount).toFixed(2);
      const category = e.categories?.name || "Uncategorized";
      const type = e.categories?.types?.name || "Type";
      const note = e.note || "";
      const line = [date, month, dow, amount, category, type, csvEscape(note)].join(",");
      parts.push(line + "\n");
    }
    parts.push("\n");
  }

  if (options.includeMonthlySummary) {
    parts.push("=== MONTHLY SUMMARY CSV ===\n");
    parts.push("month,income,expense,saving_rate,needs_ratio,wants_ratio,savings_ratio,transaction_count\n");
    for (const m of monthlySummaries) {
      const line = [
        m.month,
        Number(m.income || 0).toFixed(2),
        Number(m.expense || 0).toFixed(2),
        Number(m.saving_rate || 0).toFixed(1),
        Number(m.needs_ratio || 0).toFixed(1),
        Number(m.wants_ratio || 0).toFixed(1),
        Number(m.savings_ratio || 0).toFixed(1),
        m.transaction_count || 0,
      ].join(",");
      parts.push(line + "\n");
    }
    parts.push("\n");
  }

  if (options.includeCategories) {
    parts.push("=== CATEGORIES CSV ===\n");
    parts.push("category,type\n");
    for (const c of categories) {
      parts.push([csvEscape(c.name), csvEscape(c.types?.name || "")].join(",") + "\n");
    }
    parts.push("\n");
  }

  if (options.includeAIPrompt) {
    parts.push("=== AI ANALYSIS PROMPT ===\n\n");
    parts.push(
      `Analyze my spending behavior using the provided financial data 然后用中文写出来.\n\nPlease provide:\n\n1. Spending trends\n2. Financial health evaluation\n3. Budgeting suggestions\n4. Unusual spending patterns\n5. Savings analysis\n6. Spending categories that increased significantly\n7. Recurring expenses detection\n8. Suggestions to improve financial habits\n\nFocus on actionable insights instead of generic advice.`
    );
    parts.push("\n\n");
  }

  // Keep overall payload compact: trim extra whitespace
  return parts.join("").trim();
}
