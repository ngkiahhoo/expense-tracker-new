import type { ExportRange } from "../../../types/export";

export default function ExportRangeSelector({
  value,
  onChange,
}: {
  value: ExportRange;
  onChange: (r: ExportRange) => void;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <button onClick={() => onChange('30d')} className={`rounded-2xl p-3 ${value === '30d' ? 'bg-zinc-800' : 'bg-zinc-900'} `}>Last 30 Days</button>
      <button onClick={() => onChange('3m')} className={`rounded-2xl p-3 ${value === '3m' ? 'bg-zinc-800' : 'bg-zinc-900'} `}>Last 3 Months</button>
      <button onClick={() => onChange('6m')} className={`rounded-2xl p-3 ${value === '6m' ? 'bg-zinc-800' : 'bg-zinc-900'} `}>Last 6 Months</button>
      <button onClick={() => onChange('1y')} className={`rounded-2xl p-3 ${value === '1y' ? 'bg-zinc-800' : 'bg-zinc-900'} `}>Last 1 Year</button>
      <button onClick={() => onChange('all')} className={`rounded-2xl p-3 ${value === 'all' ? 'bg-zinc-800' : 'bg-zinc-900'} `}>All Time</button>
    </div>
  );
}
