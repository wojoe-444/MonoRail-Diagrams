// Render BPMN and DMN to SVG (and PNG for a quick look).
// Uses the bpmn-js / dmn-js viewers in a headless Chromium-family browser
// (Microsoft Edge by default; set DIAGRAMS_BROWSER=chrome to use Chrome).
// Only SVG is written next to the diagrams; PNG is for checking by eye.

import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';

const here = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const dist = (pkg, file) => path.join(here, 'node_modules', pkg, 'dist', file);

async function withPage(fn) {
  const browser = await chromium.launch({ channel: process.env.DIAGRAMS_BROWSER || 'msedge' });
  try {
    const page = await browser.newPage({ deviceScaleFactor: 2 });
    return await fn(page);
  } finally {
    await browser.close();
  }
}

/** Wrap an SVG from a viewer: white background, a title above and the source name below. */
export function frameSvg(svg, title, source) {
  const m = svg.match(/<svg[^>]*?width="([\d.]+)"[^>]*?height="([\d.]+)"[^>]*?viewBox="([\d.\- ]+)"/);
  const vb = (m ? m[3] : svg.match(/viewBox="([\d.\- ]+)"/)[1]).split(/\s+/).map(Number);
  const [vx, vy, vw, vh] = vb;
  const PAD = 24;
  const top = 44;
  const bottom = 30;
  const W = vw + 2 * PAD;
  const H = vh + top + bottom + PAD;
  const inner = svg.replace(/^<\?xml[^>]*>\s*/, '').replace(/<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`,
    `<rect width="${W}" height="${H}" fill="#ffffff"/>`,
    `<text x="${PAD}" y="30" font-family="Arial, sans-serif" font-size="18" font-weight="bold" fill="#111111">${esc(title)}</text>`,
    `<svg x="${PAD}" y="${top}" width="${vw}" height="${vh}" viewBox="${vx} ${vy} ${vw} ${vh}">${inner}</svg>`,
    `<text x="${PAD}" y="${H - 14}" font-family="Arial, sans-serif" font-size="11" fill="#555555">${esc(source)}</text>`,
    `</svg>`,
    '',
  ].join('\n');
}

export async function renderBpmn(xml, { title, source }) {
  return withPage(async (page) => {
    await page.setContent('<!doctype html><body><div id="c" style="width:1600px;height:900px"></div></body>');
    await page.addScriptTag({ path: dist('bpmn-js', 'bpmn-viewer.production.min.js') });
    const svg = await page.evaluate(async (x) => {
      const viewer = new window.BpmnJS({ container: '#c' });
      await viewer.importXML(x);
      return (await viewer.saveSVG()).svg;
    }, xml);
    return frameSvg(svg, title, source);
  });
}

export async function renderDrd(xml, { title, source }) {
  return withPage(async (page) => {
    await page.setContent('<!doctype html><body><div id="c" style="width:1600px;height:900px"></div></body>');
    await page.addScriptTag({ path: dist('dmn-js', 'dmn-viewer.production.min.js') });
    const svg = await page.evaluate(async (x) => {
      const viewer = new window.DmnJS({ container: '#c' });
      await viewer.importXML(x);
      const drd = viewer.getViews().find((v) => v.type === 'drd');
      await viewer.open(drd);
      return (await viewer.getActiveViewer().saveSVG()).svg;
    }, xml);
    return frameSvg(svg, title, source);
  });
}

/** Rasterise an SVG string to PNG (for looking at it). */
export async function svgToPng(svg, file) {
  return withPage(async (page) => {
    await page.setContent(`<!doctype html><body style="margin:0">${svg.replace(/^<\?xml[^>]*>/, '')}</body>`);
    const el = await page.$('svg');
    await el.screenshot({ path: file });
  });
}

export function write(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content, 'utf8');
}
