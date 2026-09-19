export type SyncState = { key: string; pending: boolean; error: string; retry: () => void };
let states: SyncState[] = [];
const listeners = new Set<() => void>();
export const getSyncStates = () => states;
export const subscribeSync = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
export function reportSyncState(state: SyncState) {
  states = [...states.filter(item => item.key !== state.key), ...(state.pending || state.error ? [state] : [])];
  listeners.forEach(listener => listener());
}
