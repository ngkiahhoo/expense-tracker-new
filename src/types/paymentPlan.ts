import type { Currency } from './currency';

export interface PaymentName {
  id: number;
  name: string;
  is_active: boolean;
}

export interface PaymentInstallment {
  id: number;
  sequence: number;
  amount: number;
  due_date: string;
  status: 'scheduled' | 'posted' | 'cancelled' | 'reversed';
  asset_id?: number | null;
}
export interface PaymentPlan {
  id: string;
  name: string;
  payment_name_id?: number | null;
  currency: Currency;
  category_id: number;
  asset_id?: number | null;
  payment_installments: PaymentInstallment[];
}
