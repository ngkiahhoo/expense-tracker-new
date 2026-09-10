import { supabase } from '@/lib/supabase';
import type { PaymentName, PaymentPlan } from '@/types/paymentPlan';

function paymentError(error: { code?: string; message: string }) {
  if (['PGRST202', 'PGRST205', '42P01', '42883'].includes(error.code || '')) {
    return new Error('Payment plans are not set up in this database yet. Run the latest supabase/payment_plans.sql in your Supabase SQL Editor, then click Refresh. Enable Cron with supabase/payment_plans_cron.sql for automatic posting while the app is closed.');
  }
  return new Error(error.message);
}

export async function getPaymentPlans() {
  const { data, error } = await supabase.from('payment_plans').select('*, payment_installments(*)').order('created_at', { ascending: false });
  if (error) throw paymentError(error);
  return (data || []) as PaymentPlan[];
}

export async function processDuePayments() {
  const { data, error } = await supabase.rpc('process_due_payment_installments');
  if (error) throw paymentError(error);
  return Number(data || 0);
}

export async function savePaymentPlan(payload: { p_id: string; p_name: string; p_category_id: number; p_currency: string; p_total: number; p_count: number; p_first_date: string; p_amounts: number[]; p_payment_name_id: number }) {
  const { error } = await supabase.rpc('create_payment_plan', payload);
  if (error) throw paymentError(error);
}

export async function changePaymentInstallment(id: number, cancel: boolean, amount: number, date: string) {
  const { error } = await supabase.rpc('change_payment_installment', { p_id: id, p_cancel: cancel, p_amount: amount, p_date: date });
  if (error) throw paymentError(error);
}

export async function getPaymentNames() {
  const { data, error } = await supabase.from('payment_names').select('*').eq('is_active', true).order('name');
  if (error) throw paymentError(error);
  return (data || []) as PaymentName[];
}

export async function savePaymentName(name: string, id: number | null = null) {
  const { data, error } = await supabase.rpc('save_payment_name', { p_name: name, p_id: id });
  if (error) throw paymentError(error);
  return Number(data);
}

export async function removePaymentName(id: number) {
  const { error } = await supabase.rpc('remove_payment_name', { p_id: id });
  if (error) throw paymentError(error);
}
