// Map expense types to colors and utility functions
export type ExpenseType = "needs" | "wants" | "savings";

export function getTypeColor(typeName: string | undefined): string {
  const normalized = typeName?.toLowerCase().trim();
  if (normalized === "needs") return "text-red-500";
  if (normalized === "wants") return "text-blue-500";
  if (normalized === "savings") return "text-cyan-500";
  return "text-zinc-400";
}

export function getTypeBgColor(typeName: string | undefined): string {
  const normalized = typeName?.toLowerCase().trim();
  if (normalized === "needs") return "bg-red-500/10 border-red-500/30";
  if (normalized === "wants") return "bg-blue-500/10 border-blue-500/30";
  if (normalized === "savings") return "bg-cyan-500/10 border-cyan-500/30";
  return "bg-zinc-800 border-zinc-700";
}

export function getTypeColorValue(typeName: string | undefined): string {
  const normalized = typeName?.toLowerCase().trim();
  if (normalized === "needs") return "red";
  if (normalized === "wants") return "blue";
  if (normalized === "savings") return "cyan";
  return "zinc";
}
