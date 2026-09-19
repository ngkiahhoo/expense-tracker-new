"use client";
import { RefreshCw } from "lucide-react";
import { Button } from "./Button";
export default function LoadState({ loading, error, retry }: { loading?: boolean; error?: string; retry?: () => void }) {
  if (error) return <div role="alert" className="flex flex-wrap items-center gap-3 border-l-2 border-rose-500 py-2 pl-3 text-sm text-rose-400"><span className="min-w-0 break-words">{error}</span>{retry && <Button variant="outline" onClick={retry}><RefreshCw size={16} />Retry</Button>}</div>;
  return loading ? <p role="status" aria-live="polite" className="animate-pulse py-3 text-sm text-zinc-400">Loading records...</p> : null;
}
