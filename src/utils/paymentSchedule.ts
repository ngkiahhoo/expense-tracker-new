export function paymentToday() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kuala_Lumpur', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

export function buildPaymentSchedule(total: string, count: number, firstDate: string) {
  if (!/^\d+(\.\d{1,2})?$/.test(total) || !/^\d{4}-\d{2}-\d{2}$/.test(firstDate)) return [];
  const cents = Math.round(Number(total) * 100);
  const first = new Date(`${firstDate}T00:00:00Z`);
  if (!Number.isSafeInteger(cents) || cents > 999999999999 || !Number.isInteger(count) || count < 1 || count > 360 || cents < count || Number.isNaN(first.getTime()) || first.toISOString().slice(0,10) !== firstDate || firstDate < '1900-01-01' || firstDate > '2200-01-01') return [];
  const base = Math.floor(cents / count);
  return Array.from({ length: count }, (_, index) => {
    const month = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + index, 1));
    const lastDay = new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + 1, 0)).getUTCDate();
    month.setUTCDate(Math.min(first.getUTCDate(), lastDay));
    return { due_date: month.toISOString().slice(0,10), amount: (index === count - 1 ? cents - base * (count - 1) : base) / 100 };
  });
}
