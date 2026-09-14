export type FinancialEventKind = "income" | "expense";
export type FinancialEventFrequency = "once" | "daily";
export interface FinancialEventItem {
  id: string;
  name: string;
  amount: number;
  frequency: FinancialEventFrequency;
}
export interface FinancialEvent {
  id: string;
  name: string;
  description: string;
  currency: string;
  kind: FinancialEventKind;
  startDate: string;
  endDate: string;
  items: FinancialEventItem[];
  createdAt: string;
  updatedAt: string;
  autoApply?: boolean;
  completedAt?: string;
  appliedMyrRate?: number;
  appliedMyrAmount?: number;
}
