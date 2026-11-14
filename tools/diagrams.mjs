#!/usr/bin/env node
// MonoRail diagrams: check, lay out and render BPMN and DMN files.
//
//   node tools/diagrams.mjs check  <file|folder>...   lint only
//   node tools/diagrams.mjs layout <file|folder>...   add diagram coordinates in place
//   node tools/diagrams.mjs render <file|folder>...   write .svg next to each file [--png]
//   node tools/diagrams.mjs build  <file|folder>...   check, then layout, then render
//
// Agents write the semantic part of a .bpmn / .dmn (no coordinates); `build` does the rest.

import fs from 'node:fs';
import path from 'node:path';
import { collectFiles, lintFiles, formatReports } from './lint.mjs';
import { layoutBpmn } from './layout-bpmn.mjs';
import { layoutDmn } from './layout-dmn.mjs';
import { tablesFromXml } from './tables.mjs';
import { renderBpmn, renderDrd, svgToPng, write } from './render.mjs';

const [cmd, ...rest] = process.argv.slice(2);
const png = rest.includes('--png');
const targets = rest.filter((a) => !a.startsWith('--'));
if (!['check', 'layout', 'render', 'build'].includes(cmd) || !targets.length) {
  console.error('usage: diagrams.mjs <check|layout|render|build> <file|folder>... [--png]');
  process.exit(2);
}
const files = collectFiles(targets);
if (!files.length) { console.error('no .bpmn or .dmn files found'); process.exit(2); }

const titleOf = (xml) => (xml.match(/<(?:\w+:)?(?:process|decision|definitions)\b[^>]*\bname="([^"]*)"/) ?? [])[1];
const nice = (f) => path.basename(f).replace(/\.(bpmn|dmn)$/, '').replace(/-/g, ' ').replace(/^./, (c) => c.toUpperCase());

async function check() {
  const { text, errors } = formatReports(await lintFiles(files));
  console.log(text);
  return errors;
}
async function layout() {
  for (const f of files) {
    const xml = fs.readFileSync(f, 'utf8');
    fs.writeFileSync(f, f.endsWith('.bpmn') ? await layoutBpmn(xml) : await layoutDmn(xml), 'utf8');
    console.log(`laid out ${f}`);
  }
}
async function render() {
  for (const f of files) {
    const xml = fs.readFileSync(f, 'utf8');
    const stem = f.replace(/\.(bpmn|dmn)$/, '');
    const source = path.basename(f);
    const outs = [];
    if (f.endsWith('.bpmn')) {
      outs.push([`${stem}.svg`, await renderBpmn(xml, { title: titleOf(xml) || nice(f), source })]);
    } else {
      outs.push([`${stem}.svg`, await renderDrd(xml, { title: `${nice(f)} (decision requirements)`, source })]);
      const tables = await tablesFromXml(xml, source);
      for (const t of tables) outs.push([tables.length === 1 ? `${stem}-table.svg` : `${stem}-table-${t.id}.svg`, t.svg]);
    }
    for (const [file, svg] of outs) {
      write(file, svg);
      if (png) await svgToPng(svg, file.replace(/\.svg$/, '.png'));
      console.log(`wrote ${file}`);
    }
  }
}

if (cmd === 'check') process.exit((await check()) ? 1 : 0);
if (cmd === 'layout') await layout();
if (cmd === 'render') await render();
if (cmd === 'build') {
  if (await check()) { console.error('\nFix the errors above first; nothing was changed.'); process.exit(1); }
  await layout();
  await render();
}
