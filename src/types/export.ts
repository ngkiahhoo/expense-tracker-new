export interface ExportOptions {
  includeExpenses: boolean;
  includeMonthlySummary: boolean;
  includeCategories: boolean;
  includeAIPrompt: boolean;
}

export interface MonthlySummary {
  month:string;
  income:number;
  expense:number;
  balance:number;
  saving_rate:number;
  needs_ratio:number;
  wants_ratio:number;
  savings_ratio:number;
  transaction_count:number;
}

export type ExportRange =
  | '30d'
  | '3m'
  | '6m'
  | '1y'
  | 'all';
