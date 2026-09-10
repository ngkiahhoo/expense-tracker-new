"use client";

import { useCallback, useEffect, useState } from 'react';
import { getPaymentNames, getPaymentPlans, processDuePayments } from '@/services/paymentPlanService';
import type { PaymentName, PaymentPlan } from '@/types/paymentPlan';

export default function usePaymentPlans(onChanged: () => Promise<void>) {
  const [plans, setPlans] = useState<PaymentPlan[]>([]);
  const [names, setNames] = useState<PaymentName[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    try {
      await processDuePayments();
      const [nextPlans, nextNames] = await Promise.all([getPaymentPlans(), getPaymentNames()]);
      setPlans(nextPlans);
      setNames(nextNames);
      setError('');
      window.dispatchEvent(new Event('asset:updated'));
      await onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load payment plans');
    } finally {
      setLoading(false);
    }
  }, [onChanged]);
  useEffect(() => {
    const initial = setTimeout(() => { void refresh(); }, 0);
    const timer = setInterval(() => { void refresh(); }, 60_000);
    const onFocus = () => { void refresh(); };
    window.addEventListener('focus', onFocus);
    window.addEventListener('transactions:changed', onFocus);
    return () => {
      clearTimeout(initial);
      clearInterval(timer);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('transactions:changed', onFocus);
    };
  }, [refresh]);
  return { plans, names, error, loading, refresh };
}
