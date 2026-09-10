import type { Currency } from '../types/currency';
import type { PaymentPlan } from '../types/paymentPlan';

export interface PaymentPlanGroup {
  key: string;
  name: string;
  plans: PaymentPlan[];
  remaining: number;
  posted: number;
  monthly: { month: string; amount: number }[];
}

export function groupPaymentPlans(plans: PaymentPlan[], currency: Currency): PaymentPlanGroup[] {
  const groups = new Map<string, {
    key: string;
    name: string;
    plans: PaymentPlan[];
    remainingCents: number;
    postedCents: number;
    monthlyCents: Map<string, number>;
  }>();

  for (const plan of plans) {
    if (plan.currency !== currency) continue;

    const name = plan.name.trim().replace(/\s+/g, ' ');
    const key = plan.payment_name_id != null ? `id:${plan.payment_name_id}` : `name:${name.toLowerCase()}`;
    let group = groups.get(key);
    if (!group) {
      group = { key, name, plans: [], remainingCents: 0, postedCents: 0, monthlyCents: new Map() };
      groups.set(key, group);
    }
    group.plans.push(plan);

    for (const installment of plan.payment_installments) {
      const cents = Math.round(installment.amount * 100);
      if (installment.status === 'scheduled') {
        group.remainingCents += cents;
        const month = installment.due_date.slice(0, 7);
        group.monthlyCents.set(month, (group.monthlyCents.get(month) ?? 0) + cents);
      } else if (installment.status === 'posted') {
        group.postedCents += cents;
      }
    }
  }

  return Array.from(groups.values(), (group) => ({
    key: group.key,
    name: group.name,
    plans: group.plans,
    remaining: group.remainingCents / 100,
    posted: group.postedCents / 100,
    monthly: Array.from(group.monthlyCents, ([month, cents]) => ({ month, amount: cents / 100 }))
      .sort((a, b) => a.month.localeCompare(b.month)),
  }));
}
