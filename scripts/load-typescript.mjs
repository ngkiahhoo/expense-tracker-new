import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import ts from 'typescript';

// Small in-memory loader for dependency-free TypeScript financial modules.
export function moduleURL(file, cache = new Map()) {
  const path = resolve(file);
  if (cache.has(path)) return cache.get(path);
  let source = ts.transpileModule(readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 } }).outputText;
  source = source.replace(/(from\s+)["'](\.[^"']+)["']/g, (_, prefix, target) => prefix + JSON.stringify(moduleURL(resolve(dirname(path), `${target}.ts`), cache)));
  const url = `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
  cache.set(path, url);
  return url;
}
