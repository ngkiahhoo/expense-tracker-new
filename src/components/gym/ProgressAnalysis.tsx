"use client";

import Link from "next/link";
import { ArrowRight, Info, TrendingUp, Trophy } from "lucide-react";
import { useId, useState } from "react";
import type { ExerciseProgress, PersonalRecord, ProgressAnalysis as Analysis, ProgressSet, TrackingType } from "@/lib/gym/progress/types";
import "./progress.css";

const number = (value: number) => new Intl.NumberFormat("en", { maximumFractionDigits: 1 }).format(value);
const signed = (value: number, suffix = "") => `${value > 0 ? "+" : ""}${number(value)}${suffix}`;
const date = (value: string) => new Intl.DateTimeFormat("en", { day: "numeric", month: "short", year: "numeric" }).format(new Date(`${value}T12:00:00`));
const labels = { weight_reps: "Weight + Reps", reps: "Reps Only", time: "Time", weight_time: "Weight + Time" };
const prLabels = { load: "Load PR", reps: "Rep PR", estimated_strength: "Estimated strength PR", duration: "Duration PR", volume: "Session volume PR" };

export function ProgressInfo({ label, children }: { label: string; children: string }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return <span className="progress-info">
    <button type="button" aria-label={`About ${label}`} aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)} onKeyDown={event => { if (event.key === "Escape") setOpen(false); }}><Info size={16} aria-hidden /></button>
    {open && <span id={id} role="note" className="progress-info-text">{children}</span>}
  </span>;
}

export function performanceLabel(set: ProgressSet | null | undefined, type: TrackingType) {
  if (!set) return "No completed sets";
  if (type === "reps") return `${set.reps} reps`;
  if (type === "time") return `${number(set.durationSeconds!)}s`;
  return `${number(set.weight!)}kg x ${type === "weight_time" ? `${number(set.durationSeconds!)}s` : set.reps}`;
}

export function recordLabel(record: PersonalRecord) {
  const prefix = record.load !== null && record.type !== "load" && record.type !== "estimated_strength" ? `${number(record.load)}kg: ` : "";
  const unit = record.type === "load" || record.type === "estimated_strength" ? "kg" : record.type === "duration" ? "s" : record.type === "volume" ? "kg-reps" : "reps";
  return `${prefix}${number(record.previousValue)} to ${number(record.value)} ${unit}`;
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return <div className="progress-metric"><dt>{label}</dt><dd>{value}</dd></div>;
}

function ExerciseCard({ exercise: e }: { exercise: ExerciseProgress }) {
  const next = e.nextTarget;
  const baselineOnly = e.sessionCount < 2;
  const currentDate = e.current?.sessionDate;
  return <article className="progress-exercise">
    <header className="progress-exercise-heading">
      <div><h3>{e.exerciseName}</h3><p className="progress-muted">{labels[e.trackingType]} · {e.sessionCount} session{e.sessionCount === 1 ? "" : "s"}</p></div>
      <span className="progress-status">{e.status}{e.status === "Possible plateau" && <ProgressInfo label="Possible plateau">No meaningful performance improvement has been detected across several times performing this exercise.</ProgressInfo>}</span>
    </header>

    {e.trackingType === "weight_reps" ? <div className="progress-change">
      <p>Estimated strength since start <ProgressInfo label="Estimated strength">Estimated from your logged weight and reps. It is useful for tracking trends, not a measured 1-rep max.</ProgressInfo></p>
      <strong className={e.estimatedStrengthChangePercent !== null && e.estimatedStrengthChangePercent > 0 ? "progress-positive" : ""}>{e.estimatedStrengthChangePercent === null ? "Building baseline" : signed(e.estimatedStrengthChangePercent, "%")}</strong>
      {e.e1rmConfidence === "insufficient" && e.current && <p className="progress-muted">Not enough suitable data for estimated strength</p>}
      {e.currentE1RM !== null && <p className="progress-muted">Estimated 1RM {number(e.currentE1RM)}kg{e.e1rmConfidence === "low" ? " · Limited confidence" : ""}{e.currentE1RMDate !== currentDate && e.currentE1RMDate ? ` · Last suitable data: ${date(e.currentE1RMDate)}` : ""}</p>}
    </div> : <div className="progress-change">
      <p>{e.trackingType === "reps" ? "Reps since start" : e.trackingType === "weight_time" ? "Duration at current load" : "Duration since start"}</p>
      <strong>{e.trackingType === "reps" ? e.repChange === null ? "Building baseline" : signed(e.repChange, " reps") : e.durationChange === null ? "Building baseline" : signed(e.durationChange, "s")}</strong>
      {e.durationChangePercent !== null && <p className="progress-muted">{signed(e.durationChangePercent, "%")} duration</p>}
    </div>}

    {e.current ? <>
      <dl className="progress-comparison">
        <Metric label={baselineOnly ? "Baseline" : "Started"} value={e.zeroRepBaselineDate ? "0 reps" : performanceLabel(e.baseline?.bestSet, e.trackingType)} />
        <Metric label="Current" value={performanceLabel(e.current.bestSet, e.trackingType)} />
        <Metric label="Best logged set" value={performanceLabel(e.bestSet, e.trackingType)} />
      </dl>
      <p className="progress-muted progress-date">Latest session: {date(e.current.sessionDate)}</p>
      {e.currentLoad !== null && <dl className="progress-comparison">
        <Metric label="Established load" value={`${number(e.currentLoad)}kg`} />
        <Metric label="Load since start" value={e.loadChangePercent === null ? "Baseline" : signed(e.loadChangePercent, "% load")} />
        {e.daysToCurrentLoad !== null && <Metric label="Reached in" value={`${e.daysToCurrentLoad} days · ${e.sessionsToCurrentLoad} sessions`} />}
      </dl>}
      {e.current.repsInReserve !== null && <p className="progress-muted">Final set RIR: {e.current.repsInReserve === 4 ? "4+" : e.current.repsInReserve} · User-reported <ProgressInfo label="RIR">Reps in Reserve: how many more good reps you think you could have completed.</ProgressInfo></p>}
    </> : <p className="progress-muted">{e.zeroRepBaselineDate ? "Zero-rep attempt recorded. Your first completed rep is next." : "No completed sessions yet"}</p>}

    <div className="progress-target">
      <p className="progress-eyebrow">Next target · Recommendation</p>
      <h4>{next.label}</h4>
      <p className="progress-muted">{next.reason}</p>
      {next.kind === "configure_loads" && <Link className="progress-text-link" href="/gym?tab=settings">Available Loads <ArrowRight size={16} aria-hidden /></Link>}
      {next.progressCurrent !== null && next.progressTarget !== null && <div className="progress-target-bar">
        <div className="progress-bar-label"><span>{e.trackingType === "weight_reps" ? "Rep-range target" : "Next target"}</span><span>{number(next.progressCurrent)} / {number(next.progressTarget)} {e.trackingType === "time" || e.trackingType === "weight_time" ? "s" : "reps"}</span></div>
        <progress max={next.progressTarget} value={Math.min(next.progressCurrent, next.progressTarget)} aria-label={`${e.exerciseName} target progress`} />
      </div>}
    </div>

    {e.loadMilestones.length > 0 && <details className="progress-details"><summary>Load history <span>{e.loadMilestones.length} level{e.loadMilestones.length === 1 ? "" : "s"}</span></summary>
      <ol>{e.loadMilestones.map(m => <li key={`${m.sessionId}-${m.load}`}><strong>{m.previousLoad !== null ? `${number(m.previousLoad)} to ` : ""}{number(m.load)}kg</strong><span>{date(m.date)}{m.previousLoad === null ? " · Baseline established" : ` · ${m.days} days · ${m.sessions} exercise sessions · ${signed(m.changePercent!, "% load")}`}</span></li>)}</ol>
      {e.averageDaysPerLoadIncrease !== null && <p className="progress-muted">Average per increase: {number(e.averageDaysPerLoadIncrease)} days · {number(e.averageSessionsPerLoadIncrease!)} exercise sessions</p>}
    </details>}
    {e.repMilestones.length > 0 && <details className="progress-details"><summary>Rep milestones</summary><ol>{e.repMilestones.map(m => <li key={m.reps}><strong>{m.reps === 1 ? "First rep" : `${m.reps} reps`}</strong><span>{date(m.date)}</span></li>)}</ol></details>}
    <details className="progress-details"><summary>PR history <span>{e.prHistory.length} records</span></summary>
      {e.prHistory.length ? <ol>{[...e.prHistory].reverse().map((pr, i) => <li key={`${pr.sessionId}-${pr.type}-${i}`}><strong>{prLabels[pr.type]} · {recordLabel(pr)}</strong><span>{date(pr.date)}</span></li>)}</ol> : <p className="progress-muted">Your first performance sets the baseline. Later improvements appear here.</p>}
    </details>
    {e.current && <details className="progress-details"><summary>Performance details</summary>
      <dl className="progress-comparison">
        {e.bestE1RM !== null && <Metric label="Best estimated 1RM" value={`${number(e.bestE1RM)}kg`} />}
        {e.personalBestImprovementPercent !== null && <Metric label="Estimated personal-best improvement" value={signed(e.personalBestImprovementPercent, "%")} />}
        {e.current.sessionVolume !== null && <Metric label="Latest session volume (secondary)" value={`${number(e.current.sessionVolume)} kg-reps`} />}
        <Metric label="Sessions without a new performance best" value={e.sessionsWithoutImprovement} />
      </dl>
      {Object.keys(e.bestRepsAtLoad).length > 0 && e.trackingType === "weight_reps" && <ul>{Object.entries(e.bestRepsAtLoad).map(([load, reps]) => <li key={load}><strong>{number(Number(load))}kg</strong><span>Best: {reps} reps</span></li>)}</ul>}
    </details>}
  </article>;
}

export default function ProgressAnalysis({ analysis }: { analysis: Analysis }) {
  const { overall, monthly, recentSignal } = analysis;
  const milestone = recentSignal?.type === "load" ? analysis.exercises.find(e => e.exerciseId === recentSignal.exerciseId)?.loadMilestones.find(m => m.sessionId === recentSignal.sessionId && m.load === recentSignal.value) : null;
  return <div className="gym-progress-analysis">
    <header className="progress-page-heading"><div><p className="progress-eyebrow">Progress</p><h1>Progress Analysis</h1></div><TrendingUp aria-hidden size={26} /></header>
    <section className="progress-overview" aria-label="Overall progress">
      <div><p className="progress-muted">Training for</p><h2>{overall.trainingDays === null ? "Your first session awaits" : overall.trainingDays < 2 ? "Training started today" : `${overall.trainingDays} days`}</h2>{overall.trainingStartDate && <p className="progress-muted">Since {date(overall.trainingStartDate)}</p>}</div>
      <div className="progress-overall-estimate"><p>Estimated strength <ProgressInfo label="Estimated strength">Estimated from your logged weight and reps. It is useful for tracking trends, not a measured 1-rep max.</ProgressInfo></p><strong>{overall.estimatedStrengthChangePercent === null ? "Building baseline" : signed(overall.estimatedStrengthChangePercent, "%")}</strong><p className="progress-muted">{overall.estimatedStrengthChangePercent === null ? "Complete more workouts to unlock strength analysis." : `Since start · ${overall.eligibleExerciseCount} comparable exercises`}</p></div>
      <dl className="progress-overall-counts"><Metric label="Workouts completed" value={overall.workoutsCompleted} /><Metric label="Improvement PRs" value={overall.lifetimePRs} /><Metric label="Valid work sets" value={overall.validSets} /></dl>
    </section>
    {overall.workoutsCompleted <= 1 && <section className="progress-baseline" aria-label="Baseline"><h2>{overall.workoutsCompleted === 1 ? "Your baseline is set" : "Start your training history"}</h2><p className="progress-muted">{overall.workoutsCompleted === 1 ? "1 workout completed. Keep training. Progress analysis will appear as your history grows." : "Log your first workout to establish your baseline."}</p></section>}
    <section className="progress-month" aria-label="This month"><div className="progress-section-heading"><h2>This month</h2><span className="progress-muted">{monthly.month} · {monthly.workoutsCompleted} workouts</span></div><dl className="progress-month-grid"><Metric label="Exercises improved" value={monthly.exercisesImproved} /><Metric label="Load increases" value={monthly.loadIncreases} /><Metric label="PRs" value={monthly.prs} /><Metric label="Progress slowing" value={monthly.progressSlowing} /><Metric label="Possible plateaus" value={monthly.possiblePlateaus} /></dl></section>
    {recentSignal && <section className="progress-recent" aria-label="Recent progress signal"><Trophy size={22} aria-hidden /><div><p className="progress-eyebrow">{recentSignal.type === "reps" && recentSignal.previousValue === 0 && recentSignal.value >= 1 ? "First completed rep" : prLabels[recentSignal.type]}</p><h2>{recentSignal.exerciseName}</h2><p>{recordLabel(recentSignal)}</p><p className="progress-muted">{date(recentSignal.date)}{milestone ? ` · Reached in ${milestone.days} days · ${milestone.sessions} exercise sessions` : ""}</p></div></section>}
    <section aria-label="Exercise progress"><div className="progress-section-heading"><h2>Exercise progress</h2><span className="progress-muted">{analysis.exercises.length} exercises</span></div><div className="progress-exercise-grid">{analysis.exercises.map(e => <ExerciseCard key={e.exerciseId} exercise={e} />)}</div>{!analysis.exercises.length && <p className="progress-muted">Add an exercise to your plan to get started.</p>}</section>
    <p className="progress-muted progress-footnote">Dumbbell weights are per dumbbell. Estimates, recorded results and app recommendations are shown separately. RIR is user-reported.</p>
  </div>;
}
