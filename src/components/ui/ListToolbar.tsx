"use client";
import { ArrowDownWideNarrow, ArrowUpWideNarrow, Search, X } from "lucide-react";
import { Input, Select } from "./Field";
import { Button } from "./Button";

export interface ListFilters { query: string; status: string; currency: string; sort: string; direction: "asc" | "desc" }
export const defaultListFilters: ListFilters = { query: "", status: "all", currency: "all", sort: "date", direction: "desc" };
export default function ListToolbar({ value, onChange, onClear, statuses = [], currencies = [], sorts = [{ value: "date", label: "Date" }, { value: "name", label: "Name" }] }: {
  value: ListFilters; onChange: (value: ListFilters) => void;
  onClear?: () => void;
  statuses?: { value: string; label: string }[]; currencies?: string[]; sorts?: { value: string; label: string }[];
}) {
  return <div className="space-y-2 border-y border-white/10 py-3">
    <div className="flex items-center gap-2"><Search size={18} className="shrink-0 text-zinc-400" /><Input aria-label="Search records" placeholder="Search records" type="search" value={value.query} onChange={e => onChange({ ...value, query: e.target.value })} /></div>
    <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] gap-2">
      <Select aria-label="Sort records" value={value.sort} onChange={e => onChange({ ...value, sort: e.target.value })}>{sorts.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}</Select>
      <Button size="iconLg" variant="outline" title={value.direction === "asc" ? "Ascending; switch to descending" : "Descending; switch to ascending"} aria-label="Toggle sort direction" onClick={() => onChange({ ...value, direction: value.direction === "asc" ? "desc" : "asc" })}>{value.direction === "asc" ? <ArrowUpWideNarrow size={18} /> : <ArrowDownWideNarrow size={18} />}</Button>
      <Button size="iconLg" variant="outline" title="Clear filters" aria-label="Clear filters" onClick={() => { onChange({ ...defaultListFilters, sort: sorts[0].value }); onClear?.(); }}><X size={18} /></Button>
    </div>
    {(statuses.length > 0 || currencies.length > 0) && <div className="grid grid-cols-2 gap-2">
      {statuses.length > 0 && <Select aria-label="Filter status" value={value.status} onChange={e => onChange({ ...value, status: e.target.value })}><option value="all">All statuses</option>{statuses.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}</Select>}
      {currencies.length > 0 && <Select aria-label="Filter currency" value={value.currency} onChange={e => onChange({ ...value, currency: e.target.value })}><option value="all">All currencies</option>{currencies.map(c => <option key={c}>{c}</option>)}</Select>}
    </div>}
  </div>;
}
