export interface ExportOptions {
  includeExpenses: boolean;
  includeMonthlySummary: boolean;
  includeCategories: boolean;
  includeAIPrompt: boolean;
}

export type ExportRange =
  | '30d'
  | '3m'
  | '6m'
  | '1y'
  | 'all';
