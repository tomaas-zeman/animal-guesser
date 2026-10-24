// Vypíše všechno, co postavičky říkají, jako seznam nahrávek (manifest):
// id (= název souboru), druh úseku, text, skupina a jestli už nahrávka existuje.
//   npm run hlasy:seznam                 → hlasy-seznam.json
//   npm run hlasy:seznam -- jiny.json    → jiný soubor
import { existsSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { vsechnyUseky } from '../src/hlasy/klice';
import { HLASKY } from '../src/postavicky/hlasky';

const koren = join(import.meta.dirname, '..');
const vystup = process.argv[2] ?? join(koren, 'hlasy-seznam.json');

const seznam: Record<string, object[]> = {};
for (const postava of Object.keys(HLASKY)) {
  const slozka = join(koren, 'public', 'hlasy', postava);
  const soubory = existsSync(slozka) ? readdirSync(slozka) : [];
  const useky = vsechnyUseky(postava);
  seznam[postava] = useky.map((u) => ({ ...u, soubor: `hlasy/${postava}/${u.id}.mp3`, nahrano: soubory.some((s) => s.startsWith(`${u.id}.`)) }));
  const druhy = Object.entries(Object.groupBy(useky, (u) => u.druh)).map(([d, x]) => `${d} ${x!.length}`);
  console.log(`${postava}: ${useky.length} nahrávek (${druhy.join(', ')}), ${useky.reduce((a, u) => a + u.text.length, 0)} znaků`);
}
writeFileSync(vystup, JSON.stringify(seznam, null, 2));
console.log(`zapsáno do ${vystup}`);
