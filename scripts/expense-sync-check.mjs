import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { moduleURL } from './load-typescript.mjs';
const dataURL = s => `data:text/javascript;base64,${Buffer.from(s).toString('base64')}`;
const values = [], refs = []; let si = 0, ri = 0, mounted = false, cleanup;
let row = { library: { plans: [], types: [], categories: [], mappings: [] }, revision: 0, imported_ids: [] };
let fail = false, pauseRead, pauseWrite;
const listeners = new Map();
const storage = new Map();
globalThis.localStorage = { getItem: k => storage.get(k) ?? null, setItem: (k,v) => storage.set(k,v), removeItem: k => storage.delete(k) };
globalThis.window = { setTimeout, setInterval, addEventListener: (k,v) => listeners.set(k,v), removeEventListener: k => listeners.delete(k) };
globalThis.fixture = {
 useState(init) { const i = si++; if (!(i in values)) values[i] = typeof init === 'function' ? init() : init; return [values[i], v => { values[i] = v; }]; },
 useRef(init) { const i = ri++; return refs[i] ||= { current: init }; },
 useEffect(fn) { if (!mounted) cleanup = fn(); },
 supabase: { from() { let update, revision; const query = { update(v) { update=v; return query; }, select() { return query; }, eq(k,v) { if(k==='revision') revision=v; return query; }, async single() { const snapshot=structuredClone(row); if(pauseRead) await pauseRead; return fail ? {error:{message:'offline'}} : {data:snapshot}; }, async maybeSingle() { if(pauseWrite) await pauseWrite; if(fail)return {error:{message:'offline'}}; if(revision!==row.revision)return {data:null}; row={...row,...structuredClone(update)};return {data:structuredClone(row)}; } }; return query; } }
};
let source = ts.transpileModule(readFileSync('src/hooks/useFutureExpensePlans.ts','utf8'), {compilerOptions:{module:ts.ModuleKind.ES2022,target:ts.ScriptTarget.ES2022}}).outputText;
source=source.replace(/from "react"/,`from ${JSON.stringify(dataURL('export const {useState,useRef,useEffect}=globalThis.fixture;'))}`).replace(/from "\.\.\/lib\/supabase"/,`from ${JSON.stringify(dataURL('export const {supabase}=globalThis.fixture;'))}`).replace(/from "\.\.\/utils\/([^" ]+)"/g,(_,p)=>`from ${JSON.stringify(moduleURL('src/utils/'+p+'.ts'))}`);
const {default:hook}=await import(dataURL(source));
const render=()=>{si=0;ri=0;const result=hook();mounted=true;return result;};
const tick=()=>new Promise(r=>setTimeout(r,15));
try {
 let api=render();await tick();api=render();assert.equal(api.loading,false);
 const plan={id:'one',name:'Desktop',description:'',currency:'MYR',items:[],confirmed:false,created_at:'',updated_at:''};
 api.saveLibrary({...api.library,plans:[plan]});await tick();api=render();assert.equal(row.library.plans[0].name,'Desktop');
 row.library.plans[0].name='Phone';row.revision++;listeners.get('focus')();await tick();api=render();assert.equal(api.library.plans[0].name,'Phone');
 let release;pauseRead=new Promise(r=>release=r);listeners.get('focus')();api.saveLibrary({...api.library,plans:[{...plan,name:'Edit while refreshing'}]});pauseRead=null;release();await tick();api=render();assert.equal(row.library.plans[0].name,'Edit while refreshing');
 pauseWrite=new Promise(r=>release=r);api.saveLibrary({...api.library,plans:[{...plan,name:'First keystroke'}]});api=render();api.saveLibrary({...api.library,plans:[{...plan,name:'Latest keystroke'}]});pauseWrite=null;release();await tick();api=render();assert.equal(row.library.plans[0].name,'Latest keystroke');
 fail=true;api.saveLibrary({...api.library,plans:[{...plan,name:'Offline edit'}]});await tick();api=render();assert.match(api.storageError,/offline/);assert.ok(storage.has('expense-tracker-expense-pending-v1'));
 fail=false;api.retry();await tick();api=render();assert.equal(row.library.plans[0].name,'Offline edit');assert.equal(api.storageError,'');
 row.revision++;row.library.plans[0].name='Other device wins';api.saveLibrary({...api.library,plans:[{...plan,name:'Stale edit'}]});await tick();api=render();assert.match(api.storageError,/Another device/);assert.equal(row.library.plans[0].name,'Other device wins');assert.ok(storage.has('expense-tracker-expense-pending-v1'));
 console.log('PASS database writes, other-device refresh, edits during refresh, queued writes, offline retry and stale-write protection');
} finally { cleanup?.(); delete globalThis.fixture; }
