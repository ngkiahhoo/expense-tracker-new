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
import type {
  Asset,
} from "../types/asset";

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
  assets:Asset[],
  expenses:Expense[],
  incomes:Income[],
  categories:Category[],
  monthlySummaries:MonthlySummary[],
  planningAndEvents:Record<string, unknown>,
  options:ExportOptions
) {
  const parts:string[] = [];

  parts.push("=== EXPORT CONTEXT ===\n");
  parts.push("Current app data export for AI analysis. It includes assets, transactions, categories, monthly summaries, living-cost plans, savings goals, financial events, saved notes, recurring expenses, and payment plans.\n\n");

  if (options.includeAssets) {
    parts.push("=== ASSETS CSV ===\n");
    parts.push("name,current_value,currency,is_main,note,updated_at\n");

    for (const asset of assets) {
      const line = [
        csvEscape(asset.name),
        Number(asset.current_value || 0).toFixed(2),
        csvEscape(asset.currency || "MYR"),
        asset.is_main ? "true" : "false",
        csvEscape(asset.note || ""),
        csvEscape(asset.updated_at || ""),
      ].join(",");

      parts.push(`${line}\n`);
    }

    parts.push("\n");
  }

  if (options.includeIncomes) {
    parts.push("=== INCOMES CSV ===\n");
    parts.push("date,month,amount,currency,note\n");

    for (const income of incomes) {
      const date = income.income_date;
      const line = [
        date,
        toMonth(date),
        Number(income.amount || 0).toFixed(2),
        csvEscape(income.currency || "MYR"),
        csvEscape(income.note || ""),
      ].join(",");

      parts.push(`${line}\n`);
    }

    parts.push("\n");
  }

  if (options.includeExpenses) {
    parts.push("=== EXPENSES CSV ===\n");
    parts.push("date,month,day_of_week,amount,currency,category,type,note\n");

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
          expense.currency || "MYR"
        ),
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
    parts.push("month,currency,income,expense,balance,saving_rate,needs_ratio,commitment_ratio,wants_ratio,transaction_count\n");

    for (const summary of monthlySummaries) {
      const line = [
        summary.month,
        csvEscape(summary.currency || "MYR"),
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
          summary.commitment_ratio || 0
        ).toFixed(1),
        Number(
          summary.wants_ratio || 0
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

  parts.push("=== PLANS, GOALS, EVENTS, NOTES AND SCHEDULES JSON ===\n");
  parts.push("Payment installments include amount, sequence, due_date and status. Treat scheduled installments as dated temporary commitments, not permanent living costs.\n");
  parts.push(JSON.stringify(planningAndEvents, null, 2));
  parts.push("\n\n");

  if (options.includeAIPrompt) {
    parts.push("=== AI ANALYSIS PROMPT ===\n\n");
    parts.push(
      "Analyze my personal finance data using the provided export, then write the analysis in Chinese. Use the plans, goals, events, notes, recurring expenses and payment plans alongside the historical transactions. Treat scheduled payment installments as dated, temporary future commitments; report each plan's installment amount, total count, remaining count, remaining balance and due-date range. Explain how planned cash flow and future events affect each goal, call out currency and data limitations, then provide practical next actions."
    );
    parts.push("\n\n");
  }

  return parts.join("").trim();
}
