import fs from 'node:fs';
import { svgToPng } from './render.mjs';
const T = process.argv[2]; const S = process.argv[3];
for (const [dir, name] of [['child-turn','send-to-chat'],['connection-check','connection-check'],['update-flow','update-flow']]) {
  await svgToPng(fs.readFileSync(`${T}/${dir}/${name}.svg`, 'utf8'), `${S}/re-${name}.png`);
}
