import { toneStyles, type UiTone } from "@/components/ui/styles";

export type ExpenseType = "needs" | "commitment" | "wants";

function getExpenseTone(typeName: string | undefined): UiTone {
  const normalized = typeName?.toLowerCase().trim();
  if (normalized === "needs") return "needs";
  if (normalized === "commitment") return "commitment";
  if (normalized === "wants") return "wants";
  return "neutral";
}

export function getTypeColor(typeName: string | undefined): string {
  return toneStyles[getExpenseTone(typeName)].text;
}

export function getTypeBgColor(typeName: string | undefined): string {
  return toneStyles[getExpenseTone(typeName)].subtleSurface;
}

export function getTypeColorValue(typeName: string | undefined): string {
  return toneStyles[getExpenseTone(typeName)].chart;
}

