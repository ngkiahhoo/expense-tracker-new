export function getMonthDateRange(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);
  const lastDay = new Date(year, month, 0).getDate();

  return {
    start: `${monthKey}-01`,
    end: `${monthKey}-${String(lastDay).padStart(2, "0")}`,
  };
}

export function isCompletedMonth(
  monthKey: string,
  currentDate = new Date()
) {
  const [year, month] = monthKey.split("-").map(Number);

  if (!Number.isFinite(year) || !Number.isFinite(month)) {
    return false;
  }

  const nextMonthStart =
    new Date(year, month, 1);

  return nextMonthStart.getTime() <= currentDate.getTime();
}

export function getLastCompletedMonthKey(
  currentDate = new Date()
) {
  const year =
    currentDate.getFullYear();
  const month =
    currentDate.getMonth();
  const lastCompletedMonth =
    new Date(year, month - 1, 1);

  return [
    lastCompletedMonth.getFullYear(),
    String(lastCompletedMonth.getMonth() + 1).padStart(2, "0"),
  ].join("-");
}
