// Render BPMN and DMN to SVG (and PNG for a quick look).
// Uses the bpmn-js / dmn-js viewers in a headless Chromium-family browser
// (Microsoft Edge by default; set DIAGRAMS_BROWSER=chrome to use Chrome).
// Only SVG is written next to the diagrams; PNG is for checking by eye.
//
// A theme (themes.mjs) is applied here, at render time: every element is tagged with its kind
// and a stylesheet is added to the exported SVG. Nothing about a theme reaches the source files.

import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';
import { getTheme, themeCss } from './themes.mjs';

const here = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const dist = (pkg, file) => path.join(here, 'node_modules', pkg, 'dist', file);

// Runs in the page: tag each element with its kind so a stylesheet can address it.
const TAG_SCRIPT = `
window.__tag = (viewer) => {
  const reg = viewer.get('elementRegistry');
  const canvas = viewer.get('canvas');
  reg.forEach((el) => {
    if (!el.parent) return;
    const add = (...c) => c.forEach((x) => canvas.addMarker(el.id, x));
    const t = el.type;
    if (el.labelTarget) { add('th-label'); if (/Flow|Association|Requirement/.test(el.labelTarget.type)) add('th-label-flow'); return; }
    if (t === 'bpmn:StartEvent') add('th-event', 'th-start');
    else if (t === 'bpmn:EndEvent') add('th-event', 'th-end');
    else if (/^bpmn:(Intermediate|Boundary)/.test(t)) add('th-event', 'th-inter');
    else if (/Gateway$/.test(t)) add('th-gateway');
    else if (/^bpmn:(SubProcess|Transaction|AdHocSubProcess|CallActivity)$/.test(t)) add('th-sub');
    else if (/^bpmn:\\w*Task$/.test(t)) add('th-task');
    else if (/^bpmn:Data(Store|Object)Reference$/.test(t)) add('th-data');
    else if (t === 'bpmn:Participant') add('th-pool', el.businessObject.processRef ? 'th-white' : 'th-blackbox');
    else if (t === 'bpmn:Lane') add('th-pool');
    else if (t === 'bpmn:SequenceFlow') add('th-seq');
    else if (t === 'bpmn:MessageFlow') add('th-msg');
    else if (/Association$/.test(t)) add('th-assoc');
    else if (t === 'dmn:Decision') add('th-decision');
    else if (t === 'dmn:InputData') add('th-input');
    else if (/^dmn:(InformationRequirement)$/.test(t)) add('th-seq');
    else if (/^dmn:(Knowledge|Authority)Requirement$/.test(t)) add('th-assoc');
  });
};
// What a theme must not break. Everything it recolours must have stopped using the viewer's own
// colour, and the rings of start and end events keep their (computed) widths for a ratio check.
window.__audit = (defaultInk) => {
  const bad = [];
  document.querySelectorAll('#c .djs-visual *').forEach((el) => {
    const cs = getComputedStyle(el);
    for (const p of ['fill', 'stroke']) if (cs[p] === defaultInk) bad.push(el.closest('[data-element-id]')?.dataset.elementId + ' ' + p);
  });
  const ring = (cls) => {
    const e = document.querySelector('#c .' + cls + ' .djs-visual > circle');
    return e ? parseFloat(getComputedStyle(e).strokeWidth) : null;
  };
  return { offenders: [...new Set(bad)].slice(0, 12), metrics: { start: ring('th-start'), end: ring('th-end') } };
};
`;

/** Open one browser and render many diagrams with it. Always close() when done. */
export async function openRenderer() {
  const browser = await chromium.launch({ channel: process.env.DIAGRAMS_BROWSER || 'msedge' });

  async function viewerSvg(kind, xml, theme, audit) {
    const page = await browser.newPage({ deviceScaleFactor: 2 });
    try {
      await page.setContent('<!doctype html><body><div id="c" style="width:1600px;height:900px"></div></body>');
      await page.addScriptTag({ path: kind === 'bpmn' ? dist('bpmn-js', 'bpmn-viewer.production.min.js') : dist('dmn-js', 'dmn-viewer.production.min.js') });
      await page.addScriptTag({ content: TAG_SCRIPT });
      const css = themeCss(theme);
      const out = await page.evaluate(async ({ x, kind: k, css: styles, audit: doAudit }) => {
        let viewer;
        if (k === 'bpmn') {
          viewer = new window.BpmnJS({ container: '#c' });
          await viewer.importXML(x);
        } else {
          const dmn = new window.DmnJS({ container: '#c' });
          await dmn.importXML(x);
          await dmn.open(dmn.getViews().find((v) => v.type === 'drd'));
          viewer = dmn.getActiveViewer();
        }
        if (styles) {
          window.__tag(viewer);
          const st = document.createElement('style');
          st.textContent = styles;
          document.head.appendChild(st);
        }
        const audit = styles && doAudit ? window.__audit('rgb(34, 36, 42)') : { offenders: [], metrics: {} };
        const { svg } = await viewer.saveSVG();
        return { svg, ...audit };
      }, { x: xml, kind, css, audit: !!audit });
      return out;
    } finally {
      await page.close();
    }
  }

  return {
    /** BPMN to a framed SVG string. With opts.audit returns { svg, offenders, metrics }: elements still in the viewer's own colour, and the ring widths. */
    async bpmn(xml, { title, source, theme = 'plain', audit = false }) {
      const t = getTheme(theme);
      const { svg, offenders, metrics } = await viewerSvg('bpmn', xml, t, audit);
      const framed = frameSvg(svg, title, source, t);
      return audit ? { svg: framed, offenders, metrics } : framed;
    },
    async drd(xml, { title, source, theme = 'plain', audit = false }) {
      const t = getTheme(theme);
      const { svg, offenders, metrics } = await viewerSvg('dmn', xml, t, audit);
      const framed = frameSvg(svg, title, source, t);
      return audit ? { svg: framed, offenders, metrics } : framed;
    },
    /** Rasterise an SVG string to PNG (for looking at it). */
    async png(svg, file) {
      const page = await browser.newPage({ deviceScaleFactor: 2 });
      try {
        await page.setContent(`<!doctype html><body style="margin:0">${svg.replace(/^<\?xml[^>]*>/, '')}</body>`);
        const el = await page.$('svg');
        await el.screenshot({ path: file });
      } finally {
        await page.close();
      }
    },
    close: () => browser.close(),
  };
}

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

/** Wrap a viewer's SVG: page colour, a title above, the source name below, and the theme's stylesheet. */
export function frameSvg(svg, title, source, theme = getTheme('plain')) {
  const m = svg.match(/<svg[^>]*?width="([\d.]+)"[^>]*?height="([\d.]+)"[^>]*?viewBox="([\d.\- ]+)"/);
  const vb = (m ? m[3] : svg.match(/viewBox="([\d.\- ]+)"/)[1]).split(/\s+/).map(Number);
  const [vx, vy, vw, vh] = vb;
  const PAD = 24;
  const top = 44;
  const bottom = 30;
  const W = vw + 2 * PAD;
  const H = vh + top + bottom + PAD;
  // The viewer's export starts with an XML declaration, a comment and a DOCTYPE; keep only the <svg> body.
  let inner = svg.slice(svg.indexOf('<svg')).replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
  // The viewers put a random suffix on marker ids, so every run would rewrite every file. Number
  // them in order of first appearance instead: the same diagram always renders to the same bytes.
  const random = [...new Set([...inner.matchAll(/id="([^"]*-[a-z0-9]{20,})"/g)].map((x) => x[1]))];
  random.forEach((id, n) => { inner = inner.split(id).join(`${id.replace(/-[a-z0-9]{20,}$/, '')}-${n + 1}`); });
  const css = themeCss(theme);
  const p = theme.page;
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`,
    css ? `<style>${css}</style>` : '',
    `<rect width="${W}" height="${H}" fill="${p.bg}"/>`,
    `<text x="${PAD}" y="30" font-family="${p.font}" font-size="18" font-weight="bold" fill="${p.ink}">${esc(title)}</text>`,
    `<svg x="${PAD}" y="${top}" width="${vw}" height="${vh}" viewBox="${vx} ${vy} ${vw} ${vh}">${inner}</svg>`,
    `<text x="${PAD}" y="${H - 14}" font-family="${p.font}" font-size="11" fill="${p.muted}">${esc(source)}</text>`,
    `</svg>`,
  ].filter(Boolean).join('\n') + '\n';
}

export function write(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content, 'utf8');
}
