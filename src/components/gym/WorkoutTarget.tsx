import { Button } from "@/components/ui/Button";
import type { ExerciseProgress, ProgressExerciseOccurrence, ProgressSet } from "@/lib/gym/progress/types";

type SetTarget = { setNumber: number; weight: number | null; reps: number | null; durationSeconds: number | null; provisional?: boolean };
export function targetSetLabel(set: SetTarget) {
  const amount = set.durationSeconds !== null ? `${set.durationSeconds}s` : set.reps !== null ? `${set.reps} reps` : "Find a controlled starting effort";
  return `${set.weight !== null ? `${set.weight}kg × ` : ""}${amount}`;
}

export default function WorkoutTarget({ progress, exercise, completedSets, onUseTarget }: {
  progress: ExerciseProgress;
  exercise: ProgressExerciseOccurrence;
  completedSets: ProgressSet[];
  onUseTarget: (target: SetTarget) => void;
}) {
  const next = progress.nextTarget;
  const upcoming = next.setTargets[completedSets.length];
  const weighted = progress.trackingType.startsWith("weight");
  const belowTarget = completedSets.some((set, index) => {
    const goal = next.setTargets[index];
    return goal && ((goal.weight !== null && set.weight !== goal.weight) || (goal.reps !== null && (set.reps ?? 0) < goal.reps) || (goal.durationSeconds !== null && (set.durationSeconds ?? 0) < goal.durationSeconds) || set.repsInReserve === 0);
  });
  return (
    <section className="gym-card rounded-3xl border p-5" aria-labelledby="workout-target-title">
      <p className="text-sm font-semibold text-emerald-200">Today&apos;s plan · {exercise.nameSnapshot}</p>
      <h2 id="workout-target-title" className="mt-2 text-2xl font-bold text-emerald-50">{next.label}</h2>
      <p className="mt-3 text-sm text-slate-200">{next.reason}</p>
      <ol className="mt-4 grid gap-2" aria-label="Targets for each set">
        {next.setTargets.map((target, index) => {
          const logged = completedSets[index];
          return <li key={target.setNumber} className={`rounded-xl border p-3 ${index === completedSets.length ? "border-emerald-300/50 bg-emerald-400/10" : "border-white/10"}`}>
            <div className="flex items-center justify-between gap-2 text-sm">
              <span>Set {target.setNumber}</span><strong>{targetSetLabel(target)}</strong>
            </div>
            {target.provisional && <p className="mt-1 text-xs text-slate-400">Starting attempt — no comparable set recorded yet</p>}
            {logged && <p className="mt-1 text-xs text-slate-300">Logged: {weighted ? `${logged.weight}kg × ` : ""}{logged.durationSeconds !== undefined ? `${logged.durationSeconds}s` : `${logged.reps} reps`}</p>}
          </li>;
        })}
      </ol>
      {upcoming && (upcoming.reps !== null || upcoming.durationSeconds !== null || upcoming.weight !== null) && <Button className="gym-button-primary mt-4 w-full" onClick={() => onUseTarget(upcoming)}>Use target for set {upcoming.setNumber}</Button>}
      {weighted && upcoming?.weight === null && <p className="mt-3 text-sm text-amber-200">Choose a starting weight you can control. No starting kg is inferred from missing history.</p>}
      {belowTarget && <p className="mt-3 rounded-xl bg-amber-300/10 p-3 text-sm text-amber-100">Today differs from the plan. Rest, keep technique controlled, and repeat or reduce the effort if needed. Do not make up missed reps or force a personal best.</p>}
      <p className="mt-4 text-sm text-slate-200">{next.effort}</p>
      <p className="mt-2 text-sm text-slate-300">{next.rest}</p>
      {weighted && <p className="mt-2 text-xs text-slate-400">Plate kg per dumbbell · {progress.dumbbellCount === 1 ? "single dumbbell" : "matched pair"} · use the same logging convention each time.</p>}
      <details className="mt-4 text-sm text-slate-300">
        <summary className="cursor-pointer font-semibold text-emerald-200">Why this plan</summary>
        <div className="mt-3 space-y-2">
          {next.basis.map((reason, index) => <p key={index}>{reason}</p>)}
          <p>{next.confidence === "normal" ? "Repeated comparable records available." : "Limited information: this is a cautious starting plan."} Targets are attempts, not a promise of today&apos;s performance. Stop a set when technique deteriorates; stop the exercise if it causes pain.</p>
          <p>Same engine as Progress. This workout uses its saved plan targets and previous history; logging sets does not move the targets upward.</p>
          <p>Evidence: <a className="underline" href="https://acsm.org/resistance-training-guidelines-update-2026/" target="_blank" rel="noreferrer">ACSM 2026</a> · <a className="underline" href="https://pubmed.ncbi.nlm.nih.gov/36199287/" target="_blank" rel="noreferrer">Load and repetition progression trial</a>. Exact per-set steps are conservative app rules, not a scientifically measured capacity.</p>
        </div>
      </details>
    </section>
  );
}
