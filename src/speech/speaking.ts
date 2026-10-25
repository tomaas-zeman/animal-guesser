// Czech speech: pre-recorded recordings (src/voices), and what is not recorded goes through the Web Speech API (speechSynthesis).
import { splitIntoSentences } from '../voices/keys';
import { unlock, playClips, prepareSentence, stop } from '../voices/player';

export { splitIntoSentences };

export interface Voice {
  pitch: number;
  rate: number;
  /** which voice suits the character; a voice of this gender takes precedence even over a more natural one */
  gender: 'female' | 'male';
  /** tuning when the browser has no voice of the required gender (otherwise derived from pitch) */
  fallback?: { pitch: number; rate: number };
}

let voices: SpeechSynthesisVoice[] = [];

function loadVoices() {
  if (typeof speechSynthesis === 'undefined') return;
  voices = speechSynthesis.getVoices();
}

if (typeof speechSynthesis !== 'undefined') {
  loadVoices();
  speechSynthesis.addEventListener?.('voiceschanged', loadVoices);
}

// Known Czech voices: Edge has Vlasta and Antonín, Windows Jakub, macOS Zuzana, Google and Android are female.
const FEMALE_VOICES = /vlasta|zuzana|iveta|jana|tereza|dana|google|female|žena|-jfs-/i;
const MALE_VOICES = /anton[ií]n|jakub|ji[rř][ií]|jirka|ond[rř]ej|petr|tom[aá][sš]|\bmale\b|muž/i;

function voiceGender(v: SpeechSynthesisVoice): Voice['gender'] | undefined {
  if (MALE_VOICES.test(v.name)) return 'male';
  if (FEMALE_VOICES.test(v.name)) return 'female';
  return undefined;
}

/** Ranks Czech voices from the most natural. Neural voices (Edge, Android) sound best. */
function score(v: SpeechSynthesisVoice, gender?: Voice['gender']): number {
  let s = 0;
  if (/natural|neural|online|enhanced|premium|siri/i.test(v.name)) s += 10;
  if (/google/i.test(v.name)) s += 5;
  if (!v.localService) s += 2;
  if (gender && voiceGender(v) === gender) s += 20;
  return s;
}

export function czechVoices(): SpeechSynthesisVoice[] {
  return voices.filter((v) => v.lang.toLowerCase().replace('_', '-').startsWith('cs'));
}

export function czechVoice(gender?: Voice['gender']): SpeechSynthesisVoice | undefined {
  return czechVoices().sort((a, b) => score(b, gender) - score(a, gender))[0];
}

/** Does the browser have a Czech voice of the given gender? */
export function hasVoice(gender: Voice['gender']) {
  return czechVoices().some((v) => voiceGender(v) === gender);
}

/** Does the voice sound natural? We barely change the pitch of such a voice so it does not sound robotic. */
export function isNatural(v: SpeechSynthesisVoice | undefined) {
  return !!v && score(v) >= 10;
}

export const speechAvailable = typeof speechSynthesis !== 'undefined';

/** incremented on every silencing, so that a sentence being spoken does not continue with the next segment */
let session = 0;

export function silence() {
  session++;
  stop();
  if (speechAvailable) speechSynthesis.cancel();
}

/** How an emotion changes the voice: multipliers of pitch and rate. */
export interface Tuning {
  pitch: number;
  rate: number;
}

const NO_TUNING: Tuning = { pitch: 1, rate: 1 };

/** Pause after a sentence: after an ellipsis the character ponders, after a question or exclamation it takes a breath. */
export function pauseAfter(sentence: string): number {
  if (sentence.endsWith('…')) return 380;
  if (sentence.endsWith('?') || sentence.endsWith('!')) return 200;
  return 140;
}

const clamp = (x: number, start: number, upper: number) => Math.min(upper, Math.max(start, x));

/** Pitch and rate for a character depending on which voice the browser has. */
function baseVoice(voice: Voice, cs: SpeechSynthesisVoice | undefined): Tuning & { degree: number } {
  const fits = !!cs && voiceGender(cs) === voice.gender;
  if (fits || !cs || voiceGender(cs) === undefined) {
    // a big pitch change distorts, with natural voices we only hint at it
    const degree = isNatural(cs) ? 0.4 : 1;
    return { pitch: 1 + (voice.pitch - 1) * degree, rate: voice.rate, degree };
  }
  // a voice of the other gender: we tell the character apart by a clearly different pitch and rate
  const n = voice.fallback ?? {
    pitch: voice.gender === 'male' ? Math.min(voice.pitch, 1) * 0.7 : Math.max(voice.pitch, 1) * 1.3,
    rate: voice.rate,
  };
  return { ...n, degree: 1 };
}

function saySentence(sentence: string, voice: SpeechSynthesisVoice | undefined, pitch: number, rate: number): Promise<void> {
  const estimate = 600 + sentence.length * 70;
  return new Promise((resolve) => {
    const u = new SpeechSynthesisUtterance(sentence);
    u.lang = 'cs-CZ';
    if (voice) u.voice = voice;
    u.pitch = clamp(pitch, 0.1, 2);
    u.rate = clamp(rate, 0.5, 2);
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      clearTimeout(safetyTimer);
      resolve();
    };
    // some browsers occasionally never call onend
    const safetyTimer = setTimeout(finish, estimate * 2 + 3000);
    u.onend = finish;
    u.onerror = finish;
    speechSynthesis.speak(u);
  });
}

/**
 * Says the text and waits until it finishes. Sentences the character (`characterId`) has recorded
 * are played from the recording, the rest is said by synthesis. Without synthesis it just waits an estimated time.
 * The emotion (`tuning`) slightly shifts the pitch and rate of the synthetic voice.
 */
export async function say(
  text: string,
  voice: Voice,
  muted = false,
  tuning: Tuning = NO_TUNING,
  characterId?: string,
): Promise<void> {
  const estimate = 600 + text.length * 70;
  if (muted) return new Promise((r) => setTimeout(r, Math.min(estimate, 2500)));

  unlock();
  silence();
  const mySession = session;
  const sentences = splitIntoSentences(text);
  // the recordings start loading all at once, so they are ready by the time they are needed
  const recordings = sentences.map((v) => (characterId ? prepareSentence(characterId, v) : Promise.resolve(null)));
  const cs = speechAvailable ? czechVoice(voice.gender) : undefined;
  const base = baseVoice(voice, cs);
  // with natural voices we only hint at the emotion in pitch, but change the rate fully
  const pitch = base.pitch * (1 + (tuning.pitch - 1) * Math.max(base.degree, 0.6));
  const rate = base.rate * tuning.rate;
  for (let i = 0; i < sentences.length; i++) {
    if (mySession !== session) return;
    const sentence = sentences[i];
    const recording = await recordings[i];
    if (mySession !== session) return;
    if (recording) await playClips(recording);
    else if (speechAvailable) {
      // each sentence a bit differently, a question goes up
      const variation = (Math.random() - 0.5) * 0.04;
      const question = sentence.endsWith('?') ? 1.03 : 1;
      await saySentence(sentence, cs, pitch * question * (1 + variation), rate * (1 + variation / 2));
    } else await new Promise((r) => setTimeout(r, Math.min(600 + sentence.length * 70, 2500)));
    if (i < sentences.length - 1 && mySession === session) await new Promise((r) => setTimeout(r, pauseAfter(sentence)));
  }
}
