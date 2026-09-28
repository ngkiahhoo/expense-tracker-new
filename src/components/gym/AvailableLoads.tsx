"use client";

import { useState } from "react";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { DEFAULT_PLATE_INVENTORY, generateAvailableDumbbellLoads } from "@/lib/gym/progress/equipment";
import type { ProgressSettings } from "@/lib/gym/progress/types";

export default function AvailableLoads({ settings, onSave }: { settings?: ProgressSettings; onSave: (settings: ProgressSettings) => void }) {
  const [draft, setDraft] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const value = draft ?? (settings?.plateInventory ?? DEFAULT_PLATE_INVENTORY).map(p => `${p.weightKg}, ${p.quantity}`).join("\n");
  const inventory = value.trim().split("\n").filter(Boolean).map(line => { const [weightKg, quantity, ...extra] = line.split(",").map(Number); return { weightKg, quantity: extra.length ? NaN : quantity }; });
  const invalid = inventory.some(p => !Number.isFinite(p.weightKg) || p.weightKg <= 0 || p.weightKg > 100 || !Number.isInteger(p.quantity) || p.quantity < 0 || p.quantity > 100);
  const loads = invalid ? [] : generateAvailableDumbbellLoads(inventory);
  const singleLoads = invalid ? [] : generateAvailableDumbbellLoads(inventory, 1);
  function save() {
    if (invalid) return;
    onSave({ ...settings, plateInventory: inventory, availableLoads: loads, weightConvention: "per_dumbbell" });
    setDraft(null); setMessage("Equipment saved.");
  }
  return <section className="gym-progress-analysis progress-equipment">
    <h1>Gym Settings</h1><h2>Equipment</h2><p className="progress-eyebrow">Dumbbell equipment</p>
    <label htmlFor="plate-inventory">Plate inventory · weight in kg, total quantity</label>
    <textarea id="plate-inventory" rows={4} value={value} aria-invalid={invalid} aria-describedby="equipment-help" onChange={e => { setDraft(e.target.value); setMessage(""); }} />
    <p id="equipment-help" className="progress-muted">One plate size per line: weight, quantity. Every dumbbell needs matching plates on both sides. A single dumbbell needs two matching plates; two dumbbells used together need four.</p>
    {invalid && <p role="alert">Enter a positive weight up to 100kg and a whole quantity from 0 to 100, separated by a comma.</p>}
    <h2>Two dumbbells · load per dumbbell</h2><p>{loads.length ? `${loads.join(" · ")} kg` : "No balanced loads available"}</p>
    <h2>One dumbbell · available load</h2><p>{singleLoads.length ? `${singleLoads.join(" · ")} kg` : "No balanced loads available"}</p>
    <p className="progress-muted">Plate load only; handles are excluded. Choose one or two dumbbells for each weighted exercise in the exercise library. Older exercises without a setup use two dumbbells until configured.</p>
    <Button onClick={save} disabled={invalid}><Save size={16} aria-hidden /> Save equipment</Button>
    <p role="status" className="progress-muted">{message}</p>
  </section>;
}
