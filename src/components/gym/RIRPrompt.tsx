"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { ProgressInfo } from "./ProgressAnalysis";

export default function RIRPrompt({ exerciseName, onAnswer }: { exerciseName: string; onAnswer: (rir?: number) => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    dialog.current?.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = overflow; previous?.focus(); };
  }, []);
  return createPortal(<dialog ref={dialog} className="gym-ui gym-progress-analysis progress-rir-dialog" aria-labelledby="rir-title" onCancel={event => { event.preventDefault(); onAnswer(); }}>
    <p className="progress-muted">{exerciseName} · Final working set saved</p>
    <h2 id="rir-title">How many more reps could you do?</h2>
    <p className="progress-muted">Optional RIR · Your own estimate <ProgressInfo label="RIR">Reps in Reserve: how many more good reps you think you could have completed.</ProgressInfo></p>
    <div className="progress-rir-options">{[0, 1, 2, 3, 4].map(value => <button type="button" key={value} onClick={() => onAnswer(value)}>{value === 4 ? "4+" : value}</button>)}</div>
    <button type="button" className="progress-rir-skip" onClick={() => onAnswer()}>Skip</button>
  </dialog>, document.body);
}
