import type { ExportOptions } from "../../../types/export";

export default function ExportOptions({
  options,
  onChange,
}: {
  options: ExportOptions;
  onChange: (opts: ExportOptions) => void;
}) {
  return (
    <div className="space-y-3">
      <label className="flex items-center gap-3">
        <input type="checkbox" checked={options.includeExpenses} onChange={(e) => onChange({ ...options, includeExpenses: e.target.checked })} />
        <span className="text-sm">Include expenses</span>
      </label>

      <label className="flex items-center gap-3">
        <input type="checkbox" checked={options.includeMonthlySummary} onChange={(e) => onChange({ ...options, includeMonthlySummary: e.target.checked })} />
        <span className="text-sm">Include monthly summaries</span>
      </label>

      <label className="flex items-center gap-3">
        <input type="checkbox" checked={options.includeCategories} onChange={(e) => onChange({ ...options, includeCategories: e.target.checked })} />
        <span className="text-sm">Include categories</span>
      </label>

      <label className="flex items-center gap-3">
        <input type="checkbox" checked={options.includeAIPrompt} onChange={(e) => onChange({ ...options, includeAIPrompt: e.target.checked })} />
        <span className="text-sm">Include AI analysis prompt</span>
      </label>
    </div>
  );
}
