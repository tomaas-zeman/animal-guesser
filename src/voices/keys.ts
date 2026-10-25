// List of everything the characters say, split into segments that can be recorded in advance.
// A recording belongs to one sentence. Guesses with an animal name are composed of three segments:
// the start of the sentence ("Je to"), the animal name ("liška?") and a possible ending ("že jo?"),
// so that every animal does not have to be recorded with every sentence separately.
import db from '../data/animals.json';
import type { Database } from '../game/engine';
import { EXTRAS, LINES, type Lines } from '../characters/lines';

const database = db as unknown as Database;

export type Kind = 'sentence' | 'start' | 'name' | 'end';

export interface Segment {
  /** file name without extension, derived from the text */
  id: string;
  kind: Kind;
  /** what gets recorded */
  text: string;
  /** for the recording page: where the sentence comes from */
  group: string;
}

/**
 * Splits text into sentences so that a natural pause can be made between them and each one
 * can be intoned a bit differently. Short segments also avoid Chrome's known bug with long sentences.
 */
export function splitIntoSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?…])\s+/)
    .map((v) => v.trim())
    .filter(Boolean);
}

export const normalize = (text: string) => text.normalize('NFC').replace(/\s+/g, ' ').trim();

/** FNV-1a, 32 bits in hexadecimal. Enough for a few thousand sentences and computed in the browser instantly. */
function fingerprint(text: string): string {
  let h = 0x811c9dc5;
  for (const c of new TextEncoder().encode(text)) {
    h ^= c;
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

/**
 * The recording ids are hashes of the text prefixed with the segment kind. The prefixes are the original
 * Czech kind names and must stay as they are: changing them would change every id and force re-recording.
 */
const LEGACY_HASH_PREFIX: Record<Exclude<Kind, 'sentence'>, string> = { start: 'zacatek', name: 'jmeno', end: 'konec' };

export function segmentId(kind: Kind, text: string): string {
  const t = normalize(text);
  return fingerprint(kind === 'sentence' ? t : `${LEGACY_HASH_PREFIX[kind]}|${t}`);
}

const segment = (kind: Kind, text: string, group: string): Segment => ({ id: segmentId(kind, text), kind, text: normalize(text), group });

/** Template of a sentence with an animal name, e.g. "Hádám, že je to {z}." */
interface Template {
  /** text before the name, may be empty */
  before: string;
  /** text after the name including punctuation, e.g. ", že jo?" */
  after: string;
  /** the name is recorded as a question or as a statement */
  mark: '?' | '.';
  /** the end of the sentence after the name without the leading comma, e.g. "že jo?" */
  ending: string;
}

function parseTemplate(sentence: string): Template {
  const i = sentence.indexOf('{z}');
  const before = normalize(sentence.slice(0, i));
  const after = sentence.slice(i + 3).trimEnd();
  return { before, after, mark: after.startsWith('?') ? '?' : '.', ending: normalize(after.replace(/^[\s,.!?…:;]+/, '')) };
}

const GUESS_KEYS: (keyof Lines)[] = ['guess', 'confidentGuess', 'unsureGuess'];

const templatesCache = new Map<string, Template[]>();
function templates(characterId: string): Template[] {
  let s = templatesCache.get(characterId);
  if (!s) {
    const h = LINES[characterId];
    const sentences = h ? GUESS_KEYS.flatMap((k) => (h[k] as string[]).flatMap(splitIntoSentences)) : [];
    s = sentences.filter((v) => v.includes('{z}')).map(parseTemplate);
    templatesCache.set(characterId, s);
  }
  return s;
}

/** Animal names as the character pronounces them in a guess. */
export const NAMES = [...new Set(database.animals.map((z) => z.name.toLowerCase()))];
const nameSet = new Set(NAMES);

/**
 * Which recording (or recordings) a sentence is composed of. A sentence with a guess is split
 * into the start, the animal name and the ending. An unknown sentence is a single segment that simply may not be recorded.
 */
export function splitSentence(characterId: string, sentence: string): Segment[] {
  const v = normalize(sentence);
  for (const s of templates(characterId)) {
    if (!v.startsWith(s.before) || !v.endsWith(s.after)) continue;
    const name = v.slice(s.before.length, v.length - s.after.length).trim();
    if (!nameSet.has(name)) continue;
    const segments = [segment('name', name + s.mark, 'Jména zvířat')];
    if (s.before) segments.unshift(segment('start', s.before, 'Tipy'));
    if (s.ending) segments.push(segment('end', s.ending, 'Tipy'));
    return segments;
  }
  return [segment('sentence', v, '')];
}

const GROUPS: Record<keyof Lines, string> = {
  intro: 'Představení a začátek',
  start: 'Představení a začátek',
  reaction: 'Reakce na odpovědi',
  surprise: 'Reakce na odpovědi',
  progress: 'Reakce na odpovědi',
  hunch: 'Reakce na odpovědi',
  close: 'Reakce na odpovědi',
  dragsOn: 'Reakce na odpovědi',
  transition: 'Reakce na odpovědi',
  guess: 'Tipy',
  confidentGuess: 'Tipy',
  unsureGuess: 'Tipy',
  win: 'Výhra a prohra',
  quickWin: 'Výhra a prohra',
  hardWin: 'Výhra a prohra',
  again: 'Výhra a prohra',
  wrong: 'Výhra a prohra',
  wrongAgain: 'Výhra a prohra',
  giveUp: 'Výhra a prohra',
  dontUnderstand: 'Nerozumím',
  insult: 'Reakce na nadávky',
  insultAgain: 'Reakce na nadávky',
};

/** All texts of one lines entry: a list of sentences, or sentences by kind (with the mood). */
export function lineTexts(value: Lines[keyof Lines]): string[] {
  const items: unknown[] = Array.isArray(value) ? value : Object.values(value).flat();
  return items.map((p) => (typeof p === 'string' ? p : (p as { text: string }).text));
}

/** All segments a character can say, in an order suitable for recording. */
export function allSegments(characterId: string): Segment[] {
  const h = LINES[characterId];
  if (!h) return [];
  const result = new Map<string, Segment>();
  const add = (u: Segment) => {
    if (!result.has(u.id)) result.set(u.id, u);
  };
  const addText = (text: string, group: string) => {
    for (const sentence of splitIntoSentences(text)) {
      if (!sentence.includes('{z}')) {
        add(segment('sentence', sentence, group));
        continue;
      }
      const s = parseTemplate(sentence);
      if (s.before) add(segment('start', s.before, group));
      if (s.ending) add(segment('end', s.ending, group));
    }
  };

  for (const k of Object.keys(GROUPS) as (keyof Lines)[]) {
    for (const t of lineTexts(h[k])) addText(t, GROUPS[k]);
  }
  for (const t of Object.values(EXTRAS)) addText(t, 'Výzvy a nápovědy');
  for (const t of Object.values(database.questions)) addText(t, 'Otázky');

  const marks = new Set(templates(characterId).map((s) => s.mark));
  for (const z of ['?', '.'] as const) {
    if (!marks.has(z)) continue;
    for (const name of NAMES) add(segment('name', name + z, 'Jména zvířat'));
  }
  return [...result.values()];
}
