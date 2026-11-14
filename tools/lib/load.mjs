// Reading BPMN and DMN files. Shared by the linter, the layouters and the renderer.
import fs from 'node:fs';
import { BpmnModdle } from 'bpmn-moddle';
import { DmnModdle } from 'dmn-moddle';

/** Parse BPMN XML. Returns { defs, byId, moddle, warnings }. Throws on unreadable XML. */
export async function parseBpmn(xml) {
  const moddle = new BpmnModdle();
  const { rootElement, warnings } = await moddle.fromXML(xml);
  const byId = collectIds(rootElement);
  return { defs: rootElement, byId, moddle, warnings: warnings.map(String) };
}

/** Parse DMN XML. Returns { defs, byId, moddle, warnings }. */
export async function parseDmn(xml) {
  const moddle = new DmnModdle();
  const { rootElement, warnings } = await moddle.fromXML(xml);
  const byId = collectIds(rootElement);
  return { defs: rootElement, byId, moddle, warnings: warnings.map(String) };
}

export function readFile(file) {
  return fs.readFileSync(file, 'utf8');
}

/** Walk a moddle tree and index every element that has an id. */
export function collectIds(root) {
  const byId = new Map();
  const seen = new Set();
  (function walk(el) {
    if (!el || typeof el !== 'object' || seen.has(el)) return;
    seen.add(el);
    if (typeof el.id === 'string') byId.set(el.id, el);
    const props = el.$descriptor?.properties ?? [];
    for (const p of props) {
      if (p.isReference) continue;
      const v = el.get ? el.get(p.name) : el[p.name];
      if (Array.isArray(v)) v.forEach(walk);
      else if (v && typeof v === 'object' && v.$type) walk(v);
    }
  })(root);
  return byId;
}

/** Short type name without the prefix: 'bpmn:UserTask' -> 'userTask'. */
export function typeName(el) {
  const t = el.$type.split(':')[1];
  return t[0].toLowerCase() + t.slice(1);
}

export const is = (el, type) => el.$instanceOf(type);
