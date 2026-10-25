// Walks public/voices/<character>/ and writes public/voices/index.json: which sentences have a recording.
// Runs automatically before `npm run dev` and `npm run build`, or manually with `npm run voices:index`.
import { existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const VOICES_DIR = join(import.meta.dirname, '..', 'public', 'voices');
const FILE_PATTERN = /^([0-9a-f]{8})\.(mp3|m4a|mp4|aac|webm|ogg|opus|wav)$/;

if (!existsSync(VOICES_DIR)) mkdirSync(VOICES_DIR, { recursive: true });

const index: Record<string, Record<string, string>> = {};
let count = 0;
for (const characterId of readdirSync(VOICES_DIR).sort()) {
  const path = join(VOICES_DIR, characterId);
  if (!statSync(path).isDirectory()) continue;
  for (const file of readdirSync(path).sort()) {
    const m = FILE_PATTERN.exec(file);
    if (!m) continue;
    // same sentence in several formats: mp3 wins, every browser can play it
    if (index[characterId]?.[m[1]] === 'mp3') continue;
    (index[characterId] ??= {})[m[1]] = m[2];
    count++;
  }
}
writeFileSync(join(VOICES_DIR, 'index.json'), JSON.stringify(index));
console.log(`voices: ${count} recordings (${Object.keys(index).join(', ') || 'no characters'})`);
