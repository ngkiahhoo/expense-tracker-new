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
  options:ExportOptions
) {
  const parts:string[] = [];

  parts.push("=== EXPORT CONTEXT ===\n");
  parts.push("Current app data export for AI analysis. It includes the current asset snapshot plus income, expense, monthly summary, and category records for the selected range.\n\n");

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

  if (options.includeAIPrompt) {
    parts.push("=== AI ANALYSIS PROMPT ===\n\n");
    parts.push(
      "Analyze my personal finance data using the provided export, then write the analysis in Chinese.\n\nThe export may include:\n- ASSETS CSV: current asset balances, currencies, main asset flags, notes, and update times.\n- INCOMES CSV: income records in the selected range.\n- EXPENSES CSV: expense records with category and needs/commitment/wants type data.\n- MONTHLY SUMMARY CSV: income, expense, balance, saving rate, spending ratios, and transaction count by month/currency.\n- CATEGORIES CSV: available category/type mapping.\n\nPlease provide:\n\n1. Asset overview and liquidity/cash position\n2. Income stability and main income patterns\n3. Spending trends by month and category\n4. Needs, commitment, and wants ratio evaluation\n5. Monthly balance and saving rate analysis\n6. Relationship between income, expenses, and current asset balances\n7. Unusual or risky spending patterns\n8. Budgeting and cashflow suggestions\n9. Savings and emergency-fund observations\n10. Practical next actions for the coming month\n\nFocus on actionable insights and mention data limitations when a section has missing or insufficient records."
    );
    parts.push("\n\n");
  }

  return parts.join("").trim();
}
