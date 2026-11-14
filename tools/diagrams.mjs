#!/usr/bin/env node
// MonoRail diagrams: check, lay out and render BPMN and DMN files.
//
//   node tools/diagrams.mjs check  <file|folder>...   lint only
//   node tools/diagrams.mjs layout <file|folder>...   add diagram coordinates in place
//   node tools/diagrams.mjs render <file|folder>...   write .svg next to each file
//   node tools/diagrams.mjs build  <file|folder>...   check, then layout, then render
//
//   --theme <id>   render in this theme (plain, cards, dusk). Default: the "theme" in the nearest
//                  diagrams.config.json above the files, else plain.
//   --theme all    write name.<theme>.svg for every theme, to compare; name.svg is not touched.
//   --png          also write a .png of each render, for looking at (the repo ignores them).
//
// Agents write the semantic part of a .bpmn / .dmn (no coordinates, no style); `build` does the rest.

import fs from 'node:fs';
import path from 'node:path';
import { collectFiles, lintFiles, formatReports } from './lint.mjs';
import { layoutBpmn } from './layout-bpmn.mjs';
import { layoutDmn } from './layout-dmn.mjs';
import { tablesFromXml } from './tables.mjs';
import { openRenderer, write } from './render.mjs';
import { THEMES, DEFAULT_THEME, getTheme } from './themes.mjs';

const args = process.argv.slice(2);
const cmd = args[0];
const flagValue = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);
const png = args.includes('--png');
const themeFlag = flagValue('--theme');
const targets = args.slice(1).filter((a, i, all) => !a.startsWith('--') && all[i - 1] !== '--theme');
if (!['check', 'layout', 'render', 'build'].includes(cmd) || !targets.length) {
  console.error('usage: diagrams.mjs <check|layout|render|build> <file|folder>... [--theme <id|all>] [--png]');
  process.exit(2);
}
const files = collectFiles(targets);
if (!files.length) { console.error('no .bpmn or .dmn files found'); process.exit(2); }

/** The theme named by the nearest diagrams.config.json above a file, if any. */
function configuredTheme(file) {
  for (let dir = path.dirname(path.resolve(file)); ; dir = path.dirname(dir)) {
    const cfg = path.join(dir, 'diagrams.config.json');
    if (fs.existsSync(cfg)) {
      try { return JSON.parse(fs.readFileSync(cfg, 'utf8')).theme; } catch { throw new Error(`${cfg} is not valid JSON`); }
    }
    if (path.dirname(dir) === dir) return undefined;
  }
}
if (themeFlag && themeFlag !== 'all') getTheme(themeFlag); // fail early on a typo

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
  const renderer = await openRenderer();
  try {
    for (const f of files) {
      const xml = fs.readFileSync(f, 'utf8');
      const stem = f.replace(/\.(bpmn|dmn)$/, '');
      const source = path.basename(f);
      const primary = themeFlag && themeFlag !== 'all' ? themeFlag : configuredTheme(f) ?? DEFAULT_THEME;
      const jobs = themeFlag === 'all' ? Object.keys(THEMES).map((t) => [t, `.${t}`]) : [[primary, '']];
      for (const [theme, suffix] of jobs) {
        getTheme(theme);
        const outs = [];
        if (f.endsWith('.bpmn')) {
          outs.push([`${stem}${suffix}.svg`, await renderer.bpmn(xml, { title: titleOf(xml) || nice(f), source, theme })]);
        } else {
          outs.push([`${stem}${suffix}.svg`, await renderer.drd(xml, { title: `${nice(f)} (decision requirements)`, source, theme })]);
          const tables = await tablesFromXml(xml, source, theme);
          for (const t of tables) outs.push([tables.length === 1 ? `${stem}-table${suffix}.svg` : `${stem}-table-${t.id}${suffix}.svg`, t.svg]);
        }
        for (const [file, svg] of outs) {
          write(file, svg);
          if (png) await renderer.png(svg, file.replace(/\.svg$/, '.png'));
          console.log(`wrote ${file}${theme !== DEFAULT_THEME ? `  (${theme})` : ''}`);
        }
      }
    }
  } finally {
    await renderer.close();
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
