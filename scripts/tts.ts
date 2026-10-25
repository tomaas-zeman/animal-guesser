// Records the characters' sentences with neural TTS and saves them to public/voices/<character>/<id>.mp3.
// The API key is read from an environment variable, never commit it.
//
// Free and keyless: `edge` (Microsoft Edge neural voices via the edge-tts tool, `pip install edge-tts`).
// On GitHub the "Record voices" workflow (.github/workflows/voices.yml) does it, nothing needs to be installed.
//
//   npm run voices:tts -- edge
//   AZURE_SPEECH_KEY=… AZURE_SPEECH_REGION=westeurope npm run voices:tts -- azure
//   GOOGLE_TTS_KEY=… npm run voices:tts -- google --character fox
//   ELEVENLABS_API_KEY=… npm run voices:tts -- elevenlabs --character banana --limit 20
//
// Flags: --character <id> (default: all), --limit <n> (for trying out), --overwrite (also what is already recorded),
// TTS_CONCURRENCY=<n> sets how many requests run at once, TTS_PER_MINUTE=<n> caps requests per minute (Google defaults to 30). --compare (test sentence in several voices into compare/), --dry-run (only prints what would be recorded). Without --limit it deletes recordings of sentences the game no longer says. Voices and their pitch/rate are set in scripts/voices-tts.json.
import { execFile } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { allSegments, type Segment } from '../src/voices/keys';
import { LINES } from '../src/characters/lines';

interface VoiceConfig {
  voice: string;
  pitch?: string;
  rate?: string | number;
}

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    character: { type: 'string' },
    limit: { type: 'string' },
    overwrite: { type: 'boolean', default: false },
    'dry-run': { type: 'boolean', default: false },
    compare: { type: 'boolean', default: false },
  },
});

const service = positionals[0] ?? (values.compare ? 'edge' : '');
const root = join(import.meta.dirname, '..');
const config = JSON.parse(readFileSync(join(import.meta.dirname, 'voices-tts.json'), 'utf8'));
if (!['edge', 'azure', 'google', 'elevenlabs'].includes(service)) {
  console.error('Usage: npm run voices:tts -- <edge|azure|google|elevenlabs> [--character fox] [--limit 10] [--overwrite] [--dry-run]');
  process.exit(1);
}

function env(name: string): string {
  const v = process.env[name];
  if (!v) {
    console.error(`Missing environment variable ${name}.`);
    process.exit(1);
  }
  return v;
}

const xml = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Text for TTS: the start of a guess without a trailing period, so it does not fall like the end of a sentence. */
function ttsText(u: Segment): string {
  return u.kind === 'start' ? `${u.text}…` : u.text;
}

async function azure(text: string, h: VoiceConfig): Promise<ArrayBuffer> {
  const region = env('AZURE_SPEECH_REGION');
  const ssml = `<speak version="1.0" xml:lang="cs-CZ"><voice name="${h.voice}"><prosody pitch="${h.pitch ?? '+0%'}" rate="${h.rate ?? '+0%'}">${xml(text)}</prosody></voice></speak>`;
  const r = await fetch(`https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': env('AZURE_SPEECH_KEY'),
      'Content-Type': 'application/ssml+xml',
      'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',
      'User-Agent': 'animal-guesser',
    },
    body: ssml,
  });
  if (!r.ok) throw new Error(`Azure ${r.status}: ${await r.text()}`);
  return r.arrayBuffer();
}

async function google(text: string, h: VoiceConfig): Promise<ArrayBuffer> {
  const r = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${env('GOOGLE_TTS_KEY')}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      input: { text },
      voice: { languageCode: 'cs-CZ', name: h.voice },
      audioConfig: { audioEncoding: 'MP3', ...(h.rate ? { speakingRate: Number(h.rate) } : {}), ...(h.pitch ? { pitch: Number(h.pitch) } : {}) },
    }),
  });
  if (!r.ok) throw new Error(`Google ${r.status}: ${await r.text()}`);
  const { audioContent } = (await r.json()) as { audioContent: string };
  return Uint8Array.from(Buffer.from(audioContent, 'base64')).buffer;
}

async function elevenlabs(text: string, h: VoiceConfig): Promise<ArrayBuffer> {
  if (!h.voice) throw new Error('Fill in voice_id in scripts/voices-tts.json (elevenlabs).');
  const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${h.voice}?output_format=mp3_44100_64`, {
    method: 'POST',
    headers: { 'xi-api-key': env('ELEVENLABS_API_KEY'), 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, model_id: config.elevenlabs.model, language_code: 'cs' }),
  });
  if (!r.ok) throw new Error(`ElevenLabs ${r.status}: ${await r.text()}`);
  return r.arrayBuffer();
}

/** Microsoft Edge voices via the edge-tts tool (Python). Free, no account, the same voices as Azure. */
async function edge(text: string, h: VoiceConfig): Promise<ArrayBuffer> {
  const file = join(tmpdir(), `voice-${process.pid}-${Math.random().toString(36).slice(2)}.mp3`);
  try {
    await new Promise<void>((resolve, reject) =>
      execFile(
        process.env.EDGE_TTS ?? 'edge-tts',
        ['--voice', h.voice, `--pitch=${h.pitch ?? '+0Hz'}`, `--rate=${h.rate ?? '+0%'}`, '--text', text, '--write-media', file],
        { timeout: 60_000 },
        (e, _out, err) => (e ? reject(new Error(`edge-tts: ${err || e.message}`)) : resolve()),
      ),
    );
    const data = readFileSync(file);
    if (data.length === 0) throw new Error('edge-tts returned an empty file');
    return Uint8Array.from(data).buffer;
  } finally {
    rmSync(file, { force: true });
  }
}

const SERVICES = { edge, azure, google, elevenlabs };

/** Sentence with tricky words (c, ch, ř, ě, ď, ť, ň, consonant clusters) for comparing how voices pronounce them. */
const TEST_SENTENCE =
  'Má ocas? Ocásek, ocasem, konec, procent, Cože? Je to čáp, ještěrka, ježek, křeček, kočka, cvrček, chobotnice, ' +
  'chameleon, tchoř, kůň, šimpanz, čolek, štika, labuť, okoun, vydra, sýkorka, ťuhýk, pštros, užovka, hroznýš, ' +
  'nosorožec, tučňák, srnec, zajíc, dikobraz, žralok, medvěd, rys ostrovid, dělá, děti, ďábel, nevím, může být.';

// compare: test sentence in several voices (list in scripts/voices-tts.json under "compare") into the compare/ folder
if (values.compare) {
  const dir = join(root, 'compare');
  mkdirSync(dir, { recursive: true });
  if (process.env.GOOGLE_TTS_KEY) {
    const r = await fetch(`https://texttospeech.googleapis.com/v1/voices?languageCode=cs-CZ&key=${process.env.GOOGLE_TTS_KEY}`);
    const { voices = [] } = r.ok ? ((await r.json()) as { voices?: { name: string; ssmlGender: string }[] }) : {};
    console.log(`Google cs-CZ voices: ${voices.map((v) => `${v.name} (${v.ssmlGender})`).join(', ') || r.status}`);
  }
  const candidates = config.compare as { service: keyof typeof SERVICES; voice: string; pitch?: string; rate?: number | string }[];
  for (const [i, k] of candidates.entries()) {
    if (k.service === 'google' && !process.env.GOOGLE_TTS_KEY) continue;
    const name = `${String(i + 1).padStart(2, '0')}-${k.voice}.mp3`;
    try {
      writeFileSync(join(dir, name), Buffer.from(await SERVICES[k.service](TEST_SENTENCE, k)));
      console.log(`✓ ${name}`);
    } catch (e) {
      console.warn(`✗ ${k.voice}: ${(e as Error).message.slice(0, 200)}`);
    }
  }
  process.exit(0);
}

const characterIds = values.character ? [values.character] : Object.keys(LINES);
const limit = values.limit ? Number(values.limit) : Infinity;
let total = 0;
const errors: string[] = [];
let chars = 0;

for (const characterId of characterIds) {
  const h: VoiceConfig | undefined = config[service][characterId];
  if (!h) {
    console.error(`Missing voice for ${service}/${characterId}.`);
    process.exit(1);
  }
  const dir = join(root, 'public', 'voices', characterId);
  const existing = new Set(existsSync(dir) ? readdirSync(dir).map((s) => s.split('.')[0]) : []);
  // what each recording was recorded with (service, voice, settings, text): whatever differs from today gets
  // recorded again, so a character keeps one voice even when the voice config changed in the meantime
  const sourceFile = join(dir, 'source.json');
  const source: Record<string, string> = existsSync(sourceFile) ? JSON.parse(readFileSync(sourceFile, 'utf8')) : {};
  const signature = (u: Segment) => JSON.stringify([service, h, ttsText(u)]);
  const saveSource = () => writeFileSync(sourceFile, `${JSON.stringify(source, null, 1)}\n`);
  const all = allSegments(characterId);
  // recordings of sentences the game no longer says (text changed or disappeared) are deleted; the rest stay
  if (!values['dry-run'] && limit === Infinity && existsSync(dir)) {
    const valid = new Set(all.map((u) => u.id));
    const stale = readdirSync(dir).filter((s) => /^[0-9a-f]{8}\./.test(s) && !valid.has(s.split('.')[0]));
    for (const s of stale) rmSync(join(dir, s));
    for (const id of Object.keys(source)) if (!valid.has(id)) delete source[id];
    if (stale.length) console.log(`${characterId}: deleted ${stale.length} recordings of sentences the game no longer says`);
  }
  const queue = all
    .filter((u) => values.overwrite || !existing.has(u.id) || source[u.id] !== signature(u))
    .slice(0, Math.max(0, limit - total));
  console.log(`${characterId}: ${queue.length} sentences to record (${h.voice})`);
  if (values['dry-run']) {
    for (const u of queue) console.log(`  ${u.id}  ${ttsText(u)}`);
    total += queue.length;
    chars += queue.reduce((a, u) => a + u.text.length, 0);
    continue;
  }

  mkdirSync(dir, { recursive: true });
  // a few requests at once so it does not take forever, but the service does not start refusing
  let next = 0;
  let inRow = 0;
  // request cap per minute so we do not hit the API quota (Google has a per-minute limit)
  const perMinute = Number(process.env.TTS_PER_MINUTE) || (service === 'google' ? 30 : 0);
  let nextFree = Date.now();
  const waitForTurn = async () => {
    if (!perMinute) return;
    const when = Math.max(nextFree, Date.now());
    nextFree = when + 60_000 / perMinute;
    await new Promise((r) => setTimeout(r, when - Date.now()));
  };
  const worker = async () => {
    while (next < queue.length) {
      const u = queue[next++];
      let rateLimitHits = 0;
      for (let attempt = 1; ; attempt++) {
        try {
          await waitForTurn();
          const audio = await SERVICES[service as keyof typeof SERVICES](ttsText(u), h);
          writeFileSync(join(dir, `${u.id}.mp3`), Buffer.from(audio));
          source[u.id] = signature(u);
          saveSource();
          total++;
          chars += u.text.length;
          inRow = 0;
          if (total % 25 === 0) console.log(`  … ${total} (errors ${errors.length})`);
          break;
        } catch (e) {
          // per-minute quota exceeded: wait until it frees up, and do not count it as a sentence failure
          if (/\b429\b|RESOURCE_EXHAUSTED|quota/i.test((e as Error).message) && ++rateLimitHits <= 20) {
            if (rateLimitHits === 1) console.warn(`  ⏳ API limit, waiting: ${(e as Error).message.slice(0, 200)}`);
            await new Promise((r) => setTimeout(r, 30_000));
            attempt--;
            continue;
          }
          // Edge returns empty audio when overloaded: wait a moment and retry
          if (attempt < 5) {
            await new Promise((r) => setTimeout(r, 1500 * 2 ** attempt));
            continue;
          }
          // one failed sentence does not stop the others, the browser's speech synthesis says it instead
          errors.push(`${characterId}/${u.id} „${ttsText(u)}“: ${(e as Error).message.split('\n').filter(Boolean).at(-1)}`);
          console.warn(`  ✗ ${errors.at(-1)}`);
          if (errors.length >= 20 && total === 0) throw new Error('Nothing could be recorded, stopping.');
          // the service probably blocked us: better to stop, what is done gets saved and the next run fills in the rest
          if (++inRow >= 12) {
            console.warn(`  ${inRow} errors in a row, stopping with ${characterId}.`);
            next = queue.length;
          }
          break;
        }
      }
    }
  };
  await Promise.all(Array.from({ length: Number(process.env.TTS_CONCURRENCY) || (service === 'edge' ? 2 : 4) }, worker));
}

console.log(`Done: ${total} recordings, ${chars} chars.${values['dry-run'] ? ' (dry run only, nothing was recorded)' : ''}`);
if (errors.length) console.warn(`Failed ${errors.length} sentences:\n${errors.join('\n')}`);
if (!values['dry-run'] && existsSync(join(root, 'scripts', 'index-voices.ts'))) await import('./index-voices');
