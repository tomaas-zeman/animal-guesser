// Namluví věty postaviček neuronovým TTS a uloží je do public/hlasy/<postava>/<id>.mp3.
// Klíč k API se bere z proměnné prostředí, nikdy ho necommituj.
//
// Zdarma a bez klíče: `edge` (neuronové hlasy Microsoft Edge přes nástroj edge-tts, `pip install edge-tts`).
// Na GitHubu to umí workflow „Namluvit hlasy“ (.github/workflows/hlasy.yml), nic se nemusí instalovat.
//
//   npm run hlasy:tts -- edge
//   AZURE_SPEECH_KEY=… AZURE_SPEECH_REGION=westeurope npm run hlasy:tts -- azure
//   GOOGLE_TTS_KEY=… npm run hlasy:tts -- google --postava liska
//   ELEVENLABS_API_KEY=… npm run hlasy:tts -- elevenlabs --postava banan --limit 20
//
// Přepínače: --postava <id> (jinak všechny), --limit <n> (na zkoušku), --prepsat (i už nahrané),
// --zkouska (jen vypíše, co by se namlouvalo). Hlasy a jejich výšku/tempo nastavíš v scripts/hlasy-tts.json.
import { execFile } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { vsechnyUseky, type Usek } from '../src/hlasy/klice';
import { HLASKY } from '../src/postavicky/hlasky';

interface NastaveniHlasu {
  hlas: string;
  vyska?: string;
  tempo?: string | number;
}

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    postava: { type: 'string' },
    limit: { type: 'string' },
    prepsat: { type: 'boolean', default: false },
    zkouska: { type: 'boolean', default: false },
  },
});

const sluzba = positionals[0];
const koren = join(import.meta.dirname, '..');
const nastaveni = JSON.parse(readFileSync(join(import.meta.dirname, 'hlasy-tts.json'), 'utf8'));
if (!['edge', 'azure', 'google', 'elevenlabs'].includes(sluzba)) {
  console.error('Použití: npm run hlasy:tts -- <edge|azure|google|elevenlabs> [--postava liska] [--limit 10] [--prepsat] [--zkouska]');
  process.exit(1);
}

function env(jmeno: string): string {
  const v = process.env[jmeno];
  if (!v) {
    console.error(`Chybí proměnná prostředí ${jmeno}.`);
    process.exit(1);
  }
  return v;
}

const xml = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Text pro TTS: začátek tipu bez tečky na konci, ať neklesá jako konec věty. */
function textProTts(u: Usek): string {
  return u.druh === 'zacatek' ? `${u.text}…` : u.text;
}

async function azure(text: string, h: NastaveniHlasu): Promise<ArrayBuffer> {
  const region = env('AZURE_SPEECH_REGION');
  const ssml = `<speak version="1.0" xml:lang="cs-CZ"><voice name="${h.hlas}"><prosody pitch="${h.vyska ?? '+0%'}" rate="${h.tempo ?? '+0%'}">${xml(text)}</prosody></voice></speak>`;
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

async function google(text: string, h: NastaveniHlasu): Promise<ArrayBuffer> {
  const r = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${env('GOOGLE_TTS_KEY')}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      input: { text },
      voice: { languageCode: 'cs-CZ', name: h.hlas },
      audioConfig: { audioEncoding: 'MP3', ...(h.tempo ? { speakingRate: Number(h.tempo) } : {}), ...(h.vyska ? { pitch: Number(h.vyska) } : {}) },
    }),
  });
  if (!r.ok) throw new Error(`Google ${r.status}: ${await r.text()}`);
  const { audioContent } = (await r.json()) as { audioContent: string };
  return Uint8Array.from(Buffer.from(audioContent, 'base64')).buffer;
}

async function elevenlabs(text: string, h: NastaveniHlasu): Promise<ArrayBuffer> {
  if (!h.hlas) throw new Error('Doplň voice_id do scripts/hlasy-tts.json (elevenlabs).');
  const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${h.hlas}?output_format=mp3_44100_64`, {
    method: 'POST',
    headers: { 'xi-api-key': env('ELEVENLABS_API_KEY'), 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, model_id: nastaveni.elevenlabs.model, language_code: 'cs' }),
  });
  if (!r.ok) throw new Error(`ElevenLabs ${r.status}: ${await r.text()}`);
  return r.arrayBuffer();
}

/** Hlasy Microsoft Edge přes nástroj edge-tts (Python). Zdarma, bez účtu, stejné hlasy jako Azure. */
async function edge(text: string, h: NastaveniHlasu): Promise<ArrayBuffer> {
  const soubor = join(tmpdir(), `hlas-${process.pid}-${Math.random().toString(36).slice(2)}.mp3`);
  try {
    await new Promise<void>((resolve, reject) =>
      execFile(
        process.env.EDGE_TTS ?? 'edge-tts',
        ['--voice', h.hlas, `--pitch=${h.vyska ?? '+0Hz'}`, `--rate=${h.tempo ?? '+0%'}`, '--text', text, '--write-media', soubor],
        { timeout: 60_000 },
        (e, _out, err) => (e ? reject(new Error(`edge-tts: ${err || e.message}`)) : resolve()),
      ),
    );
    const data = readFileSync(soubor);
    if (data.length === 0) throw new Error('edge-tts vrátil prázdný soubor');
    return Uint8Array.from(data).buffer;
  } finally {
    rmSync(soubor, { force: true });
  }
}

const SLUZBY = { edge, azure, google, elevenlabs };

const postavy = values.postava ? [values.postava] : Object.keys(HLASKY);
const limit = values.limit ? Number(values.limit) : Infinity;
let celkem = 0;
const chyby: string[] = [];
let znaku = 0;

for (const postava of postavy) {
  const h: NastaveniHlasu | undefined = nastaveni[sluzba][postava];
  if (!h) {
    console.error(`V scripts/hlasy-tts.json chybí hlas pro ${sluzba}/${postava}.`);
    process.exit(1);
  }
  const slozka = join(koren, 'public', 'hlasy', postava);
  const existujici = new Set(existsSync(slozka) ? readdirSync(slozka).map((s) => s.split('.')[0]) : []);
  const fronta = vsechnyUseky(postava)
    .filter((u) => values.prepsat || !existujici.has(u.id))
    .slice(0, Math.max(0, limit - celkem));
  console.log(`${postava}: ${fronta.length} vět k namluvení (${h.hlas})`);
  if (values.zkouska) {
    for (const u of fronta) console.log(`  ${u.id}  ${textProTts(u)}`);
    celkem += fronta.length;
    znaku += fronta.reduce((a, u) => a + u.text.length, 0);
    continue;
  }

  mkdirSync(slozka, { recursive: true });
  // pár požadavků najednou, ať to netrvá věčnost, ale služba nezačne odmítat
  let dalsi = 0;
  const pracovnik = async () => {
    while (dalsi < fronta.length) {
      const u = fronta[dalsi++];
      for (let pokus = 1; ; pokus++) {
        try {
          const audio = await SLUZBY[sluzba as keyof typeof SLUZBY](textProTts(u), h);
          writeFileSync(join(slozka, `${u.id}.mp3`), Buffer.from(audio));
          celkem++;
          znaku += u.text.length;
          if (celkem % 25 === 0) console.log(`  … ${celkem}`);
          break;
        } catch (e) {
          if (pokus < 3) {
            await new Promise((r) => setTimeout(r, 1000 * 2 ** pokus));
            continue;
          }
          // jedna nepovedená věta nezastaví ostatní, tu řekne dál syntéza prohlížeče
          chyby.push(`${postava}/${u.id} „${textProTts(u)}“: ${(e as Error).message.split('\n').filter(Boolean).at(-1)}`);
          console.warn(`  ✗ ${chyby.at(-1)}`);
          if (chyby.length >= 20 && celkem === 0) throw new Error('Nic se nepovedlo namluvit, končím.');
          break;
        }
      }
    }
  };
  await Promise.all(Array.from({ length: 4 }, pracovnik));
}

console.log(`Hotovo: ${celkem} nahrávek, ${znaku} znaků.${values.zkouska ? ' (jen zkouška, nic se nenamluvilo)' : ''}`);
if (chyby.length) console.warn(`Nepovedlo se ${chyby.length} vět:\n${chyby.join('\n')}`);
if (!values.zkouska && existsSync(join(koren, 'scripts', 'index-hlasu.ts'))) await import('./index-hlasu');
