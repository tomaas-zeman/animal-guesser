// Czech speech recognition (Web Speech API). Works mainly in Chrome, Edge and Safari.
import type { Answer } from '../game/engine';

interface RecognitionEvent {
  results: ArrayLike<ArrayLike<{ transcript: string; confidence?: number }> & { isFinal?: boolean }>;
}

interface Recognizer {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((e: RecognitionEvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  onaudiostart: (() => void) | null;
  onsoundstart: (() => void) | null;
  onspeechstart: (() => void) | null;
  onspeechend: (() => void) | null;
  onsoundend: (() => void) | null;
  onnomatch: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

type RecognizerClass = new () => Recognizer;

function recognizerClass(): RecognizerClass | undefined {
  if (typeof window === 'undefined') return undefined;
  const w = window as unknown as { SpeechRecognition?: RecognizerClass; webkitSpeechRecognition?: RecognizerClass };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

export const listeningAvailable = !!recognizerClass();

/** One transcript variant as returned by the browser (for debugging). */
export interface Transcript {
  text: string;
  /** confidence 0–1; Chrome often leaves it unset (0) for interim results */
  confidence: number;
  final: boolean;
}

export interface Heard {
  /** transcripts of what the player said (several variants), an empty array = heard nothing */
  texts: string[];
  /** everything the browser returned, including interim results */
  transcripts?: Transcript[];
  /** why listening ended without a result ("no-speech", "network", "aborted"…) */
  error?: string;
  /** how long listening ran (ms); a very short listening without a result is a failure, not silence */
  duration: number;
  /** listening was ended by a clear interim answer, the final result was not awaited */
  shortened?: boolean;
  /** recognition got no audio from the microphone at all (the audiostart event never came) */
  noAudio?: boolean;
  /** what happened during listening, with the time in ms since the start (for debugging) */
  events?: string[];
}

/** By the loudness measurement the player said something short, but recognition returned nothing. */
export const SHORT_VOICE = 'short-voice';

export interface Listening {
  result: Promise<Heard>;
  cancel(): void;
}

/** Safety net for browsers where listening sometimes does not end on its own. */
const MAX_DURATION = 20_000;
/**
 * When an interim transcript contains a clear answer and nothing else happens, listening is
 * ended after this time. For a short "ne" Chrome otherwise sometimes waits several seconds
 * for the end of speech, or never sends the final result.
 */
export const WAIT_AFTER_ANSWER = 700;

/**
 * @param onStart called once the microphone is really listening
 * @param playerFinished returns true when the loudness measurement caught the player's voice followed by silence
 */
export function listen(onStart?: () => void, playerFinished?: () => boolean): Listening {
  const RecognizerCtor = recognizerClass();
  if (!RecognizerCtor) return { result: Promise.resolve({ texts: [], transcripts: [], error: 'unavailable', duration: 0 }), cancel() {} };

  const r = new RecognizerCtor();
  r.lang = 'cs-CZ';
  r.continuous = false;
  r.interimResults = true;
  r.maxAlternatives = 5;
  const start = Date.now();
  let safetyTimer: ReturnType<typeof setTimeout> | undefined;
  let finishTimer: ReturnType<typeof setTimeout> | undefined;
  let watchdog: ReturnType<typeof setInterval> | undefined;
  // the microphone takes a moment to start up; the player should know when they can speak
  let started = false;
  const reportStart = () => {
    if (started) return;
    started = true;
    onStart?.();
  };
  const fallbackStart = setTimeout(reportStart, 1000);
  const events: string[] = [];
  let sound = false;
  const log = (what: string) => events.push(`${what}@${Date.now() - start}`);
  r.onaudiostart = () => {
    log('audio');
    sound = true;
    reportStart();
  };
  r.onsoundstart = () => log('sound');
  r.onspeechstart = () => log('speech');
  r.onspeechend = () => log('/speech');
  r.onsoundend = () => log('/sound');
  r.onnomatch = () => log('nomatch');

  const result = new Promise<Heard>((resolve, reject) => {
    let transcripts: Transcript[] = [];
    // interim transcripts from all events: Chrome replaces them in the final event, even when it drops the final "ne"
    const earlierInterim: string[] = [];
    let error: string | undefined;
    let shortened = false;
    let shortVoice = false;
    // recognition sometimes does not register a short "ne" at all, even though the microphone heard it
    watchdog = setInterval(() => {
      if (transcripts.length === 0 && playerFinished?.()) {
        shortVoice = true;
        log('short voice');
        clearInterval(watchdog);
        r.stop();
      }
    }, 200);
    r.onresult = (e) => {
      transcripts = [];
      for (let i = 0; i < e.results.length; i++) {
        const alt = e.results[i];
        for (let j = 0; j < alt.length; j++) {
          transcripts.push({ text: alt[j].transcript, confidence: alt[j].confidence ?? 0, final: alt.isFinal !== false });
        }
      }
      log(transcripts.some((p) => p.final) ? 'result' : 'interim');
      clearTimeout(finishTimer);
      const interim = transcripts.filter((p) => !p.final).map((p) => p.text);
      for (const t of interim) if (!earlierInterim.includes(t)) earlierInterim.push(t);
      if (interim.length && !transcripts.some((p) => p.final) && recognizeAnswer(interim)) {
        finishTimer = setTimeout(() => {
          shortened = true;
          r.stop(); // stop, not abort: the browser still sends what it has in progress
        }, WAIT_AFTER_ANSWER);
      }
    };
    r.onerror = (e) => {
      log(`chyba:${e.error}`);
      error = e.error;
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') reject(new Error('microphone-denied'));
      // some phones do not allow listening and measuring loudness at the same time
      if (e.error === 'audio-capture') reject(new Error('microphone-busy'));
    };
    r.onend = () => {
      clearTimeout(safetyTimer);
      clearTimeout(finishTimer);
      clearTimeout(fallbackStart);
      clearInterval(watchdog);
      log('end');
      const texts = selectTexts(transcripts, earlierInterim);
      const reason = texts.length ? undefined : shortVoice ? SHORT_VOICE : error;
      resolve({ texts, transcripts, error: reason, duration: Date.now() - start, shortened, noAudio: !sound, events });
    };
  });

  try {
    r.start();
  } catch {
    clearTimeout(fallbackStart);
    clearInterval(watchdog);
    // typically "already running" right after the previous listening; the caller retries
    return { result: Promise.resolve({ texts: [], transcripts: [], error: 'start', duration: 0 }), cancel() {} };
  }
  safetyTimer = setTimeout(() => r.abort(), MAX_DURATION);
  return {
    result,
    cancel: () => {
      clearTimeout(safetyTimer);
      clearTimeout(finishTimer);
      clearInterval(watchdog);
      clearTimeout(fallbackStart);
      r.abort();
    },
  };
}

/**
 * Picks the transcripts to work with: the final ones, and when there are none,
 * the interim ones. Interim ones are added after the final ones too, because Chrome sometimes
 * "corrects" a final "ne" to nonsense or empty text, while it heard it correctly in the interim.
 * `earlier` are interim transcripts from earlier events: only those that a later
 * transcript does not continue are added ("nejsi" from "nejsi chytrá" is not, a standalone "ne" is).
 */
export function selectTexts(transcripts: Transcript[], earlier: string[] = []): string[] {
  const finalOnes = transcripts.filter((p) => p.final && p.text.trim()).map((p) => p.text);
  const interim = transcripts.filter((p) => !p.final && p.text.trim()).map((p) => p.text);
  const texts = [...finalOnes, ...interim.filter((t) => !finalOnes.includes(t))];
  const all = [...texts, ...earlier].map(normalize);
  for (const t of earlier) {
    const n = normalize(t);
    if (!n || texts.includes(t)) continue;
    if (all.some((other) => other !== n && other.startsWith(n))) continue;
    if (texts.some((x) => normalize(x) === n)) continue;
    texts.push(t);
  }
  return texts;
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Order matters: "nevím" contains "ne", "spíš ne" is no and not "možná".
const PATTERNS: [Answer, RegExp][] = [
  ['unknown', /\b(nevim|netusim|nemam tuseni|nevim jiste|nejsem si jist[aey]?|kdo vi|nevi)\b/],
  // "ne" is short and recognition transcribes it in all sorts of ways: "Né.", "neee", "nene", "ne ne ne", "nein"…
  // and the player often answers with a negative sentence: "nelétá", "nejsou", "nemá křídla"
  [
    'no',
    /\b(spis ne|asi ne|nejspis ne|myslim ze ne|ani nahodou|v zadnem pripade|n+e+h?|ne(ne)+|nikdy|vubec|kdepak|nikoliv|nope|nein|nie|ne(?!(kdy|kde|kdo|co|jak|kter|kol|jsp|jvi|jl|jen|bo|vim|vi\b|tusim|rozum|slys|boj|chap))[a-z]{2,})\b/,
  ],
  ['maybe', /\b(mozna|muze byt|muze|nekdy|asi|nejspis|spis ano|spis jo|trochu|obcas|castecne|jak kdy|mozna ano)\b/],
  ['yes', /\b(ano|jo|no jo|nojo|jasne ze jo|joo+|jasne|jasnacka|urcite|presne|samozrejme|jop|jojo|ok|okej|spravne)\b/],
];

/**
 * Weak answers: short words that recognition confuses with "ne"
 * ("je" ↔ "ne", "mně"). They apply only when no other transcript variant
 * gives a clear answer.
 */
const WEAK: [Answer, RegExp][] = [
  ['no', /^(n+|mne|mne ne|nn)$/],
  ['yes', /\b(je|ma|umi|zije|jsou|maji)\b/],
];

/** An answer is a few words; a longer sentence is most likely background talk, not the player's answer. */
export const MAX_WORDS = 4;

function wordCount(t: string) {
  return t ? t.split(' ').length : 0;
}

/** Are all transcripts long sentences? Those are silently ignored. */
export function isBackgroundTalk(texts: string[]): boolean {
  return texts.length > 0 && texts.every((text) => wordCount(normalize(text)) > MAX_WORDS);
}

const REPEAT =
  /\b(zopakuj|zopakujes|zopakovat|opakuj|znovu|jeste jednou|coze|co prosim|cos rikal[a]?|co jsi rikal[a]?|nerozumim|nerozumel jsem|nerozumela jsem|neslysel jsem|neslysela jsem|prosim)\b|^co$/;

/** Does the player want the question repeated? ("zopakuj to", "cože", "co prosím"…) */
export function isRepeatRequest(texts: string[]): boolean {
  return texts.some((text) => {
    const t = normalize(text);
    return wordCount(t) <= MAX_WORDS + 1 && REPEAT.test(t);
  });
}

const START_WORDS = /\b(hra|hru|hrat|hrajem|hrajeme|hraju|zacni|zacneme|zaciname|jdeme|start|mam ho|mam)\b/;

/** Did the player say the start word ("hra")? */
export function isStart(texts: string[]): boolean {
  return texts.some((text) => {
    const t = normalize(text);
    return wordCount(t) <= MAX_WORDS && START_WORDS.test(t);
  });
}

/** What the player complains about: that the character is stupid, that it hears badly, or is simply rude. */
export type InsultKind = 'stupidity' | 'deafness' | 'rudeness';

// Order matters: "ty vole, ty jsi hluchá" is mainly about the ears.
// Animals from the database (osel, kráva, husa, koza, prase…) are not here, those are an answer or a guess.
const INSULTS: [InsultKind, RegExp][] = [
  [
    'deafness',
    /\b(hluch[a-z]*|nahluchl[a-z]*|neslysis|neslysite|nic neslysis|spatne slysis|blbe slysis|neposlouchas|nerozumis|mas (ucpane|zalehle|zavrene) usi|mas v usich [a-z]+)\b/g,
  ],
  [
    'stupidity',
    /\b(blb[a-z]*|hloup[a-z]*|hlupa[a-z]*|pitom[a-z]*|debil[a-z]*|idiot[a-z]*|kreten[a-z]*|tup(a|y|ej|ec|ce|ci|ko|oun|ounka)|natvrdl[a-z]*|nemehl[a-z]*|trubk[oa]|osle|dement[a-z]*|jelit[a-z]*|magor[a-z]*|cvok[a-z]*|nanic|nic neumis|neumis nic|nic nevis|nevis nic|nechapes|k nicemu|nejsi (moc |vubec )?chytr[a-z]*|nemas (zadny )?(mozek|rozum)|jsi spatn[a-z]*|jsi hrozn[a-z]*)\b/g,
  ],
  [
    'rudeness',
    /\b((drz|zavri|sklapni) (hubu|zobak|pusu|klapacku|tlamu|chlebarnu)|sklapni|zmlkni|bud zticha|ty vole|vole|kravo|kurv[a-z]*|hovn[a-z]*|prdel[a-z]*|hajzl[a-z]*|jdi do haje|vypadni|zmiz|otrav[a-z]*|nesnasim te|smrdis|smrad[a-z]*|hnusn[a-z]*|hnusak[a-z]*|oskliv[a-z]*|kecas|kecy)\b/g,
  ],
];

/** A negation right before an insult reverses it: "nejsi blbá", "není to hloupá otázka". A bare "ne" is an answer ("ne, ty blbá"). */
const NEGATION_BEFORE = /\b(nejsi|nejses|neses|neni|nebyl[a-z]*|nebudes)( [a-z]+)?\s*$/;

/** Words that say nothing around an insult; after removing it they must not turn into "je" = yes. */
const FILLER =
  /\b(ty|ti|te|tebe|jsi|si|ses|jses|sis|je|jsou|to|ta|ten|ale|fakt|vazne|uplne|totalne|strasne|hrozne|moc|tak|takova|takovy|takovej|jako|proste|normalne|zase|porad|uz|dneska|nejaka|nejakej|nejaky|tvoje|tvuj|otazka|otazku|otazky|odpoved|no|hele|lisko|liska|lili|banane|banan|bohousi|bohous|vojtacu|vojto|pokemone|pokemon|a|i)\b/g;

/** The longest sentence in which an insult is still searched for. */
const MAX_INSULT_WORDS = 10;

function findInsult(t: string): { kind: InsultKind | null; rest: string } {
  if (wordCount(t) > MAX_INSULT_WORDS) return { kind: null, rest: t };
  let kind: InsultKind | null = null;
  let rest = t;
  for (const [d, pattern] of INSULTS) {
    rest = rest.replace(pattern, (match: string, ...args: unknown[]) => {
      const where = args.find((a) => typeof a === 'number') as number;
      if (NEGATION_BEFORE.test(rest.slice(0, where))) return match;
      kind ??= d;
      return ' ';
    });
  }
  if (!kind) return { kind: null, rest: t };
  return { kind, rest: rest.replace(FILLER, ' ').replace(/\s+/g, ' ').trim() };
}

/** Transcripts without insults, so that "nejsi chytrá" is not "ne" and "to je blbost" is not "je" = yes. */
export function withoutInsults(texts: string[]): string[] {
  return texts.map((text) => findInsult(normalize(text)).rest);
}

/**
 * Is the player insulting the character? Returns null when the transcript has no insult, or when
 * the player answered next to it ("ne, ty blbá"): the answer always takes precedence.
 */
export function detectInsult(texts: string[], question = ''): InsultKind | null {
  let kind: InsultKind | null = null;
  for (const text of texts) kind ??= findInsult(normalize(text)).kind;
  if (!kind) return null;
  return recognizeAnswer(withoutInsults(texts), question) ? null : kind;
}

/** How long a sentence is still searched for whether it ends with an answer ("…je to noční zvíře? ne"). */
const MAX_WORDS_ANSWER_AT_END = 8;

/** Is the answer word the same word as in the question? The same beginning is enough: "létá" ~ "létat", "plave" ~ "plavat". */
function sameWord(a: string, b: string): boolean {
  const n = Math.min(4, a.length, b.length);
  return a.slice(0, n) === b.slice(0, n) && Math.abs(a.length - b.length) <= 2;
}

/**
 * An answer using a word from the question: "Umí létat?" "Létá." Returns null when it is not a single word from the question.
 * Short words ("je", "má") do not belong here: recognition confuses them with "ne", WEAK handles them.
 */
function echo(t: string, question: string): Answer | null {
  if (wordCount(t) !== 1 || t.length < 3 || t.startsWith('ne')) return null;
  // words with a negation ("není hmyz") and "nebo" are not an echo of a positive answer
  const words = normalize(question).split(' ').filter((s) => s.length >= 3 && !s.startsWith('ne'));
  return words.some((s) => sameWord(t, s)) ? 'yes' : null;
}

function parse(t: string, question: string): { answer: Answer; strong: boolean } | null {
  if (!t) return null;
  const n = wordCount(t);
  if (n <= MAX_WORDS) {
    // a negation and "nevím" take precedence: "neumí" is no, even though "umí" is in the question
    for (const [answer, pattern] of PATTERNS) if (answer !== 'yes' && answer !== 'maybe' && pattern.test(t)) return { answer, strong: true };
    const o = echo(t, question);
    if (o) return { answer: o, strong: true };
    for (const [answer, pattern] of PATTERNS) if (pattern.test(t)) return { answer, strong: true };
    for (const [answer, pattern] of WEAK) if (pattern.test(t)) return { answer, strong: false };
    return null;
  }
  // a longer transcript: the end of the question from the speaker, or chatter after which the player answered
  if (n > MAX_WORDS_ANSWER_AT_END) return null;
  const last = t.slice(t.lastIndexOf(' ') + 1);
  for (const [answer, pattern] of PATTERNS) if (pattern.test(last)) return { answer, strong: false };
  return null;
}

/**
 * Converts what the player said into an answer. `question` helps to understand an answer using a word from the question.
 * Returns null when it does not understand.
 * Goes through all transcript variants: a clear answer in any of them takes precedence
 * over a weak one ("je") in the most probable one.
 */
export function recognizeAnswer(texts: string[], question = ''): Answer | null {
  let weak: Answer | null = null;
  for (const text of texts) {
    const r = parse(normalize(text), question);
    if (!r) continue;
    if (r.strong) return r.answer;
    weak ??= r.answer;
  }
  return weak;
}

/** How many recognition failures in a row are tolerated before listening ends. */
export const MAX_FAILURES = 8;
/** A listening that ends faster than this and heard nothing is a failure, not silence. */
const MIN_DURATION = 1500;

/** Is an empty listening a failure (network, error, immediate end), and not just a silent player? */
export function isFailure(s: Heard): boolean {
  if (s.error === SHORT_VOICE) return false;
  return s.duration < MIN_DURATION || (!!s.error && s.error !== 'no-speech' && s.error !== 'no-match');
}

/** The player said something, but recognition got no words out of it. */
export function isUnintelligible(s: Heard): boolean {
  return s.texts.length === 0 && !isFailure(s) && (s.error === 'no-match' || s.error === SHORT_VOICE || !s.error);
}

/** How long to wait after the n-th failure in a row so that listening does not loop. */
export function pauseAfterFailure(n: number): number {
  return Math.min(250 * 2 ** n, 5000);
}
