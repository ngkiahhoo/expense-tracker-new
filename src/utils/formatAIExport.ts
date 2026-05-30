import type {
  Category,
} from "../types/category";
import type {
  Expense,
} from "../types/expense";
import type {
  ExportOptions,
  MonthlySummary,
} from "../types/export";
import type {
  Income,
} from "../types/income";

function csvEscape(
  value:string | number | null | undefined
) {
  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  const str =
    String(value);

  if (
    str.includes(",") ||
    str.includes("\n") ||
    str.includes("\"")
  ) {
    return `"${str.replace(/"/g, "\"\"")}"`;
  }

  return str;
}

function toMonth(
  dateStr:string
) {
  return dateStr.slice(
    0,
    7
  );
}

function dayOfWeek(
  dateStr:string
) {
  const date =
    new Date(dateStr);

  return date.toLocaleDateString(
    undefined,
    {
      weekday:"long",
    }
  );
}

export function formatAIExport(
  expenses:Expense[],
  incomes:Income[],
  categories:Category[],
  monthlySummaries:MonthlySummary[],
  options:ExportOptions
) {
  const parts:string[] = [];

  if (options.includeExpenses) {
    parts.push("=== EXPENSES CSV ===\n");
    parts.push("date,month,day_of_week,amount,category,type,note\n");

    for (const expense of expenses) {
      const date =
        expense.expense_date;

      const line = [
        date,
        toMonth(date),
        dayOfWeek(date),
        Number(
          expense.amount
        ).toFixed(2),
        csvEscape(
          expense.categories?.name ||
          "Uncategorized"
        ),
        csvEscape(
          expense.categories?.types?.name ||
          "Type"
        ),
        csvEscape(
          expense.note || ""
        ),
      ].join(",");

      parts.push(`${line}\n`);
    }

    parts.push("\n");
  }

  if (options.includeMonthlySummary) {
    parts.push("=== MONTHLY SUMMARY CSV ===\n");
    parts.push("month,income,expense,balance,saving_rate,needs_ratio,wants_ratio,savings_ratio,transaction_count\n");

    for (const summary of monthlySummaries) {
      const line = [
        summary.month,
        Number(
          summary.income || 0
        ).toFixed(2),
        Number(
          summary.expense || 0
        ).toFixed(2),
        Number(
          summary.balance || 0
        ).toFixed(2),
        Number(
          summary.saving_rate || 0
        ).toFixed(1),
        Number(
          summary.needs_ratio || 0
        ).toFixed(1),
        Number(
          summary.wants_ratio || 0
        ).toFixed(1),
        Number(
          summary.savings_ratio || 0
        ).toFixed(1),
        summary.transaction_count || 0,
      ].join(",");

      parts.push(`${line}\n`);
    }

    parts.push("\n");
  }

  if (options.includeCategories) {
    parts.push("=== CATEGORIES CSV ===\n");
    parts.push("category,type\n");

    for (const category of categories) {
      parts.push(
        [
          csvEscape(category.name),
          csvEscape(
            category.types?.name || ""
          ),
        ].join(",") + "\n"
      );
    }

    parts.push("\n");
  }

  if (options.includeAIPrompt) {
    parts.push("=== AI ANALYSIS PROMPT ===\n\n");
    parts.push(
      "Analyze my spending behavior using the provided financial data, then write the analysis in Chinese.\n\nPlease provide:\n\n1. Spending trends\n2. Financial health evaluation\n3. Monthly balance analysis\n4. Where each month's money went\n5. Budgeting suggestions\n6. Unusual spending patterns\n7. Savings analysis\n8. Spending categories that increased significantly\n9. Recurring expenses detection\n10. Suggestions to improve financial habits\n\nFocus on actionable insights instead of generic advice."
    );
    parts.push("\n\n");
  }

  return parts.join("").trim();
}
