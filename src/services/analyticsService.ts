import type { Expense } from "../types/expense";
import type { Category } from "../types/category";
import type { CategoryBreakdownItem } from "../types/analytics";

// Reserved colors (needs, wants, savings) that category colors should avoid
const RESERVED_COLORS = ["#ef4444", "#3b82f6", "#22c55e"];

function hslToHex(h: number, s: number, l: number) {
  // Convert HSL to RGB, then to HEX. h in [0,360), s and l in [0,100]
  s /= 100;
  l /= 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hh = h / 60;
  const x = c * (1 - Math.abs((hh % 2) - 1));
  let r1 = 0,
    g1 = 0,
    b1 = 0;
  if (hh >= 0 && hh < 1) {
    r1 = c;
    g1 = x;
    b1 = 0;
  } else if (hh >= 1 && hh < 2) {
    r1 = x;
    g1 = c;
    b1 = 0;
  } else if (hh >= 2 && hh < 3) {
    r1 = 0;
    g1 = c;
    b1 = x;
  } else if (hh >= 3 && hh < 4) {
    r1 = 0;
    g1 = x;
    b1 = c;
  } else if (hh >= 4 && hh < 5) {
    r1 = x;
    g1 = 0;
    b1 = c;
  } else {
    r1 = c;
    g1 = 0;
    b1 = x;
  }
  const m = l - c / 2;
  const r = Math.round((r1 + m) * 255);
  const g = Math.round((g1 + m) * 255);
  const b = Math.round((b1 + m) * 255);
  const toHex = (v: number) => v.toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function hexToRgb(hex: string) {
  const clean = hex.replace('#', '');
  const bigint = parseInt(clean, 16);
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255,
  };
}

function colorDistance(a: string, b: string) {
  const x = hexToRgb(a);
  const y = hexToRgb(b);
  // Euclidean distance in RGB space
  return Math.sqrt((x.r - y.r) ** 2 + (x.g - y.g) ** 2 + (x.b - y.b) ** 2);
}

function pickColor(index: number, used: string[]) {
  // Use golden angle to spread hues, then ensure distance from reserved and already used colors
  const GOLDEN_ANGLE = 137.508; // degrees
  let hue = (index * GOLDEN_ANGLE) % 360;
  let sat = 72;
  let light = 46;
  let hex = hslToHex(hue, sat, light);

  let attempts = 0;
  while (
    (RESERVED_COLORS.some((r) => colorDistance(r, hex) < 100) ||
      used.some((u) => colorDistance(u, hex) < 80)) &&
    attempts < 24
  ) {
    hue = (hue + 35) % 360;
    // slightly vary lightness every few attempts to increase contrast options
    if (attempts % 3 === 0) {
      light = 42 + (attempts % 7);
    }
    hex = hslToHex(hue, sat, light);
    attempts++;
  }

  return hex;
}

export function getCategoryBreakdown(
  expenses: Expense[],
  categories: Category[]
): CategoryBreakdownItem[] {
  const totals = new Map<
    number | string,
    {
      categoryId: number | null;
      categoryName: string;
      totalAmount: number;
      expenses: Expense[];
    }
  >();

  const categoryLookup = new Map<number, Category>();
  categories.forEach((category) => {
    categoryLookup.set(category.id, category);
  });

  let overallTotal = 0;

  expenses.forEach((expense) => {
    const amount = Number(expense.amount) || 0;
    overallTotal += amount;

    const category =
      expense.categories ||
      categoryLookup.get(expense.category_id) ||
      undefined;

    const categoryId = category?.id ?? null;
    const categoryName = category?.name ?? "Uncategorized";
    const mapKey = categoryId ?? `uncategorized-${categoryName}`;

    const existing = totals.get(mapKey);

    if (existing) {
      existing.totalAmount += amount;
      existing.expenses.push(expense);
    } else {
      totals.set(mapKey, {
        categoryId,
        categoryName,
        totalAmount: amount,
        expenses: [expense],
      });
    }
  });

  const usedColors: string[] = [];
  const breakdown = Array.from(totals.values())
    .filter((item) => item.totalAmount > 0)
    .sort((a, b) => b.totalAmount - a.totalAmount)
    .map((item, index) => {
      const color = pickColor(index, usedColors);
      usedColors.push(color);
      return {
        ...item,
        percentage: overallTotal > 0 ? Number(((item.totalAmount / overallTotal) * 100).toFixed(1)) : 0,
        color,
      };
    });

  return breakdown;
}
