import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { moduleURL } from './load-typescript.mjs';
const dataURL = source => `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
let values = [], refs = [], si = 0, ri = 0, mounted = false, cleanups = [];
let row = { data: [], revision: 1, legacy_imported: true }, fail = false, pauseWrite;
const storage = new Map(), listeners = new Map();
globalThis.localStorage = { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) };
globalThis.window = { setTimeout, clearTimeout, addEventListener: (key, fn) => listeners.set(key, fn), removeEventListener: key => listeners.delete(key) };
globalThis.workspaceFixture = {
  useState(initial) { const i = si++; if (!(i in values)) values[i] = typeof initial === 'function' ? initial() : initial; return [values[i], next => { values[i] = typeof next === 'function' ? next(values[i]) : next; }]; },
  useRef(initial) { const i = ri++; return refs[i] ||= { current: initial }; },
  useCallback(fn) { return fn; },
  useEffect(fn) { if (!mounted) cleanups.push(fn()); },
  supabase: { from() { let update, revision; const query = {
    select() { return query; }, eq(key, value) { if (key === 'revision') revision = value; return query; }, update(value) { update = value; return query; },
    async single() { return { data: structuredClone(row) }; },
    async maybeSingle() { if (pauseWrite) await pauseWrite; if (fail) return { error: new Error('offline') }; if (revision !== row.revision) return { data: null }; row = { ...row, ...structuredClone(update) }; return { data: structuredClone(row) }; },
  }; return query; } },
};
let source = ts.transpileModule(readFileSync('src/hooks/useCloudFeatureWorkspace.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 } }).outputText;
source = source.replace(/from "react"/, `from ${JSON.stringify(dataURL('export const {useState,useRef,useEffect,useCallback}=globalThis.workspaceFixture;'))}`)
  .replace(/from "@\/lib\/supabase"/, `from ${JSON.stringify(dataURL('export const {supabase}=globalThis.workspaceFixture;'))}`)
  .replace(/from "\.\/useUnsavedChanges"/, `from ${JSON.stringify(dataURL('export default function useUnsavedChanges() {}'))}`)
  .replace(/from "@\/utils\/syncStatus"/, `from ${JSON.stringify(moduleURL('src/utils/syncStatus.ts'))}`);
const { default: hook } = await import(dataURL(source));
const options = { key: 'financial_events', initial: [], normalize: value => value };
const render = () => { si = 0; ri = 0; const api = hook(options); mounted = true; return api; };
const tick = () => new Promise(resolve => setTimeout(resolve, 20));
const unmount = () => { cleanups.forEach(fn => fn?.()); cleanups = []; };
try {
  let api = render(); await tick(); api = render();
  fail = true; api.save([{ id: 'event', name: 'Offline draft' }]); await tick(); api = render();
  assert.match(api.storageError, /offline/); assert.equal(api.unsynced, true);
  assert.ok(storage.has('workspace-pending:financial_events'));
  api.retry(); await tick(); assert.equal(row.data.length, 0, 'Retry must not replace an unsaved draft with server data');
  unmount(); values = []; refs = []; mounted = false;
  api = render(); await tick(); api = render();
  assert.equal(api.value[0].name, 'Offline draft', 'Reload recovers the unsynced edit');
  fail = false; api.retry(); await tick(); api = render();
  assert.equal(row.data[0].name, 'Offline draft'); assert.equal(api.unsynced, false); assert.equal(storage.size, 0);
  let release; pauseWrite = new Promise(resolve => { release = resolve; });
  api.save([{ id: 'event', name: 'First' }]); api = render(); api.save([{ id: 'event', name: 'Latest' }]); pauseWrite = null; release(); await tick(); api = render();
  assert.equal(row.data[0].name, 'Latest');
  row.revision++; row.data = [{ id: 'event', name: 'Another device' }];
  api.save([{ id: 'event', name: 'Stale edit' }]); await tick(); api = render();
  assert.match(api.storageError, /another device/); assert.equal(row.data[0].name, 'Another device');
  assert.equal(JSON.parse(storage.get('workspace-pending:financial_events')).data[0].name, 'Stale edit');
  console.log('PASS cloud draft recovery, offline retry, latest queued edit and conflict protection.');
} finally { unmount(); delete globalThis.workspaceFixture; }
