import type { PlateInventory } from "./types";

export const DEFAULT_PLATE_INVENTORY: PlateInventory[] = [
  { weightKg: 1.25, quantity: 4 }, { weightKg: 2.5, quantity: 4 }, { weightKg: 3, quantity: 8 },
];

// Four identical plates are needed for a balanced pair on each of two dumbbells.
// Integer grams avoid floating point duplicates. Handles never contribute weight.
export function generateAvailableDumbbellLoads(inventory = DEFAULT_PLATE_INVENTORY): number[] {
  const quantities = new Map<number, number>();
  for (const plate of inventory) {
    if (!Number.isFinite(plate.weightKg) || plate.weightKg <= 0 || !Number.isInteger(plate.quantity) || plate.quantity < 0) continue;
    const grams = Math.round(plate.weightKg * 1000);
    quantities.set(grams, (quantities.get(grams) ?? 0) + plate.quantity);
  }
  const sums = new Set([0]);
  for (const [grams, quantity] of quantities) {
    for (let pair = 0; pair < Math.floor(quantity / 4); pair++) {
      for (const value of [...sums]) sums.add(value + 2 * grams);
    }
  }
  return [...sums].filter(n => n > 0).sort((a, b) => a - b).map(n => n / 1000);
}

export function getNextAvailableLoad(current: number, loads: number[]): number | null {
  const higher = loads.filter(n => Number.isFinite(n) && n > current);
  return higher.length ? Math.min(...higher) : null;
}
