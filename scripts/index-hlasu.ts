// Projde public/hlasy/<postava>/ a zapíše public/hlasy/index.json: které věty mají nahrávku.
// Spouští se samo před `npm run dev` a `npm run build`, ručně `npm run hlasy:index`.
import { existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const SLOZKA = join(import.meta.dirname, '..', 'public', 'hlasy');
const SOUBOR = /^([0-9a-f]{8})\.(mp3|m4a|mp4|aac|webm|ogg|opus|wav)$/;

if (!existsSync(SLOZKA)) mkdirSync(SLOZKA, { recursive: true });

const index: Record<string, Record<string, string>> = {};
let pocet = 0;
for (const postava of readdirSync(SLOZKA).sort()) {
  const cesta = join(SLOZKA, postava);
  if (!statSync(cesta).isDirectory()) continue;
  for (const soubor of readdirSync(cesta).sort()) {
    const m = SOUBOR.exec(soubor);
    if (!m) continue;
    // stejná věta ve víc formátech: mp3 má přednost, ten přehraje každý prohlížeč
    if (index[postava]?.[m[1]] === 'mp3') continue;
    (index[postava] ??= {})[m[1]] = m[2];
    pocet++;
  }
}
writeFileSync(join(SLOZKA, 'index.json'), JSON.stringify(index));
console.log(`hlasy: ${pocet} nahrávek (${Object.keys(index).join(', ') || 'žádná postavička'})`);
