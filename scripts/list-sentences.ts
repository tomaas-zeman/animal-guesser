// Lists everything the characters say as a list of recordings (manifest):
// id (= file name), segment kind, text, group and whether the recording already exists.
//   npm run voices:list                 → voice-list.json
//   npm run voices:list -- other.json   → a different file
import { existsSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { allSegments } from '../src/voices/keys';
import { LINES } from '../src/characters/lines';

const root = join(import.meta.dirname, '..');
const output = process.argv[2] ?? join(root, 'voice-list.json');

const list: Record<string, object[]> = {};
for (const characterId of Object.keys(LINES)) {
  const dir = join(root, 'public', 'voices', characterId);
  const files = existsSync(dir) ? readdirSync(dir) : [];
  const segments = allSegments(characterId);
  list[characterId] = segments.map((u) => ({ ...u, file: `voices/${characterId}/${u.id}.mp3`, recorded: files.some((s) => s.startsWith(`${u.id}.`)) }));
  const kinds = Object.entries(Object.groupBy(segments, (u) => u.kind)).map(([d, x]) => `${d} ${x!.length}`);
  console.log(`${characterId}: ${segments.length} recordings (${kinds.join(', ')}), ${segments.reduce((a, u) => a + u.text.length, 0)} chars`);
}
writeFileSync(output, JSON.stringify(list, null, 2));
console.log(`written to ${output}`);
