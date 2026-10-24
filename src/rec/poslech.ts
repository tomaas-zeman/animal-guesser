// Rozpoznávání české řeči (Web Speech API). Funguje hlavně v Chrome, Edge a Safari.
import type { Odpoved } from '../game/engine';

interface Vysledek {
  results: ArrayLike<ArrayLike<{ transcript: string }>>;
}

interface Rozpoznavac {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((e: Vysledek) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  abort(): void;
}

type RozpoznavacTrida = new () => Rozpoznavac;

function tridaRozpoznavace(): RozpoznavacTrida | undefined {
  if (typeof window === 'undefined') return undefined;
  const w = window as unknown as { SpeechRecognition?: RozpoznavacTrida; webkitSpeechRecognition?: RozpoznavacTrida };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

export const poslechDostupny = !!tridaRozpoznavace();

export interface Poslech {
  /** přepisy toho, co hráč řekl (víc variant), prázdné pole = nic neslyšel */
  vysledek: Promise<string[]>;
  zrus(): void;
}

export function poslouchej(): Poslech {
  const Trida = tridaRozpoznavace();
  if (!Trida) return { vysledek: Promise.resolve([]), zrus() {} };

  const r = new Trida();
  r.lang = 'cs-CZ';
  r.continuous = false;
  r.interimResults = false;
  r.maxAlternatives = 5;

  const vysledek = new Promise<string[]>((resolve, reject) => {
    let texty: string[] = [];
    r.onresult = (e) => {
      texty = [];
      for (let i = 0; i < e.results.length; i++) {
        const alt = e.results[i];
        for (let j = 0; j < alt.length; j++) texty.push(alt[j].transcript);
      }
    };
    r.onerror = (e) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') reject(new Error('mikrofon-zakazan'));
      // některé telefony nedovolí poslouchat a zároveň měřit hlasitost
      if (e.error === 'audio-capture') reject(new Error('mikrofon-obsazen'));
    };
    r.onend = () => resolve(texty);
  });

  try {
    r.start();
  } catch {
    return { vysledek: Promise.resolve([]), zrus() {} };
  }
  return { vysledek, zrus: () => r.abort() };
}

function normalizuj(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Pořadí je důležité: "nevím" obsahuje "ne", "spíš ne" je ne a ne "možná".
const VZORY: [Odpoved, RegExp][] = [
  ['nevim', /\b(nevim|netusim|nemam tuseni|nevim jiste|nejsem si jist[aey]?|kdo vi|nevi)\b/],
  ['ne', /\b(spis ne|asi ne|myslim ze ne|ne|nene|ne ne|neni|nema|nemuze|nikdy|vubec|kdepak|nee+)\b/],
  ['mozna', /\b(mozna|muze byt|muze|nekdy|asi|spis ano|spis jo|trochu|obcas|castecne|jak kdy|mozna ano)\b/],
  ['ano', /\b(ano|jo|joo+|jasne|jasnacka|urcite|presne|samozrejme|je|ma|umi|zije|jop|jojo|ok|okej|spravne)\b/],
];

/** Odpověď má pár slov; delší věta je nejspíš hovor okolo, ne odpověď hráče. */
export const MAX_SLOV = 4;

function slov(t: string) {
  return t ? t.split(' ').length : 0;
}

/** Jsou všechny přepisy dlouhé věty? Takové se tiše ignorují. */
export function jeHovorOkolo(texty: string[]): boolean {
  return texty.length > 0 && texty.every((text) => slov(normalizuj(text)) > MAX_SLOV);
}

const ZOPAKUJ =
  /\b(zopakuj|zopakujes|zopakovat|opakuj|znovu|jeste jednou|coze|co prosim|cos rikal[a]?|co jsi rikal[a]?|nerozumel jsem|nerozumela jsem|neslysel jsem|neslysela jsem|prosim)\b|^co$/;

/** Chce hráč otázku zopakovat? ("zopakuj to", "cože", "co prosím"…) */
export function jeZopakuj(texty: string[]): boolean {
  return texty.some((text) => {
    const t = normalizuj(text);
    return slov(t) <= MAX_SLOV + 1 && ZOPAKUJ.test(t);
  });
}

const START = /\b(hra|hru|hrat|hrajem|hrajeme|hraju|zacni|zacneme|zaciname|jdeme|start|mam ho|mam)\b/;

/** Řekl hráč startovací slovo ("hra")? */
export function jeStart(texty: string[]): boolean {
  return texty.some((text) => {
    const t = normalizuj(text);
    return slov(t) <= MAX_SLOV && START.test(t);
  });
}

/** Převede, co hráč řekl, na odpověď. Vrací null, když nerozumí. */
export function rozpoznejOdpoved(texty: string[]): Odpoved | null {
  for (const text of texty) {
    const t = normalizuj(text);
    if (!t || slov(t) > MAX_SLOV) continue;
    for (const [odpoved, vzor] of VZORY) if (vzor.test(t)) return odpoved;
  }
  return null;
}
