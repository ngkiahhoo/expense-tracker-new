"use client";

import { useState } from "react";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { normalizeAvailableLoads } from "@/lib/gym/progress/calculate";
import type { ProgressSettings } from "@/lib/gym/progress/types";

export default function AvailableLoads({ settings, onSave }: { settings?: ProgressSettings; onSave: (settings: ProgressSettings) => void }) {
  const [value, setValue] = useState(() => (settings?.availableLoads ?? []).join(", "));
  const [message, setMessage] = useState("");
  const [invalid, setInvalid] = useState(false);
  function save() {
    const entries = value.trim() ? value.trim().split(/[\s,]+/).map(Number) : [];
    if (entries.some(n => !Number.isFinite(n) || n <= 0)) { setInvalid(true); setMessage("Enter positive weights in kg, separated by commas."); return; }
    const availableLoads = normalizeAvailableLoads(entries);
    onSave({ availableLoads, weightConvention: "per_dumbbell" });
    setValue(availableLoads.join(", "));
    setInvalid(false);
    setMessage("Available loads saved.");
  }
  return <section className="gym-progress-analysis progress-equipment">
    <h1>Gym Settings</h1><h2>Available Loads</h2>
    <label htmlFor="available-loads">Weights you can configure (kg per dumbbell)</label>
    <textarea id="available-loads" rows={3} value={value} placeholder="2.5, 5, 7.5, 10, 12.5" aria-invalid={invalid} aria-describedby="available-load-help available-load-status" onChange={e => { setValue(e.target.value); setMessage(""); setInvalid(false); }} />
    <p id="available-load-help" className="progress-muted">Only these weights will be suggested for load increases. An empty list leaves load recommendations unconfigured.</p>
    <p className="progress-muted">Dumbbell weights are per dumbbell, including one-arm exercises. Existing workout weights stay as logged.</p>
    <Button onClick={save}><Save size={16} aria-hidden /> Save loads</Button>
    <p id="available-load-status" role="status" className="progress-muted">{message}</p>
  </section>;
}
