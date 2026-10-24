// Rozpoznávání české řeči (Web Speech API). Funguje hlavně v Chrome, Edge a Safari.
import type { Odpoved } from '../game/engine';

interface Vysledek {
  results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal?: boolean }>;
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

export interface Slyseni {
  /** přepisy toho, co hráč řekl (víc variant), prázdné pole = nic neslyšel */
  texty: string[];
  /** proč poslech skončil bez výsledku ("no-speech", "network", "aborted"…) */
  chyba?: string;
  /** jak dlouho poslech běžel (ms); velmi krátký poslech bez výsledku je porucha, ne ticho */
  trvani: number;
}

export interface Poslech {
  vysledek: Promise<Slyseni>;
  zrus(): void;
}

/** Pojistka pro prohlížeče, kde poslech občas neskončí sám. */
const MAX_DELKA = 20_000;

export function poslouchej(): Poslech {
  const Trida = tridaRozpoznavace();
  if (!Trida) return { vysledek: Promise.resolve({ texty: [], chyba: 'nedostupny', trvani: 0 }), zrus() {} };

  const r = new Trida();
  r.lang = 'cs-CZ';
  r.continuous = false;
  // průběžné přepisy jsou pojistka: krátké "ne" Chrome často zachytí jen průběžně a finální výsledek nepošle
  r.interimResults = true;
  r.maxAlternatives = 5;
  const zacatek = Date.now();
  let pojistka: ReturnType<typeof setTimeout> | undefined;

  const vysledek = new Promise<Slyseni>((resolve, reject) => {
    let texty: string[] = [];
    let prubezne: string[] = [];
    let chyba: string | undefined;
    r.onresult = (e) => {
      texty = [];
      prubezne = [];
      for (let i = 0; i < e.results.length; i++) {
        const alt = e.results[i];
        const cil = alt.isFinal === false ? prubezne : texty;
        for (let j = 0; j < alt.length; j++) cil.push(alt[j].transcript);
      }
    };
    r.onerror = (e) => {
      chyba = e.error;
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') reject(new Error('mikrofon-zakazan'));
      // některé telefony nedovolí poslouchat a zároveň měřit hlasitost
      if (e.error === 'audio-capture') reject(new Error('mikrofon-obsazen'));
    };
    r.onend = () => {
      clearTimeout(pojistka);
      const vse = (texty.some((t) => t.trim()) ? texty : prubezne).filter((t) => t.trim());
      resolve({ texty: vse, chyba: vse.length ? undefined : chyba, trvani: Date.now() - zacatek });
    };
  });

  try {
    r.start();
  } catch {
    // typicky "už běží" hned po předchozím poslechu; volající to zkusí znovu
    return { vysledek: Promise.resolve({ texty: [], chyba: 'start', trvani: 0 }), zrus() {} };
  }
  pojistka = setTimeout(() => r.abort(), MAX_DELKA);
  return {
    vysledek,
    zrus: () => {
      clearTimeout(pojistka);
      r.abort();
    },
  };
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
  // "ne" je krátké a rozpoznávání ho přepisuje všelijak: "Né.", "neee", "nene", "ne ne ne", "mně", "nein"…
  [
    'ne',
    /\b(spis ne|asi ne|myslim ze ne|ani nahodou|v zadnem pripade|n+e+h?|ne(ne)+|neni|nema|nemuze|nezije|neumi|nikdy|vubec|kdepak|nikoliv|nope|nein)\b|^(n+|mne)$/,
  ],
  ['mozna', /\b(mozna|muze byt|muze|nekdy|asi|spis ano|spis jo|trochu|obcas|castecne|jak kdy|mozna ano)\b/],
  ['ano', /\b(ano|jo|no jo|nojo|jasne ze jo|joo+|jasne|jasnacka|urcite|presne|samozrejme|je|ma|umi|zije|jop|jojo|ok|okej|spravne)\b/],
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
  /\b(zopakuj|zopakujes|zopakovat|opakuj|znovu|jeste jednou|coze|co prosim|cos rikal[a]?|co jsi rikal[a]?|nerozumim|nerozumel jsem|nerozumela jsem|neslysel jsem|neslysela jsem|prosim)\b|^co$/;

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

/** Kolik výpadků rozpoznávání za sebou se přečká, než poslech skončí. */
export const MAX_PORUCH = 8;
/** Poslech, který skončí rychleji než tohle a nic neslyšel, je výpadek, ne mlčení. */
const MIN_DELKA = 1500;

/** Je prázdný poslech výpadek (síť, chyba, okamžitý konec), a ne jen mlčící hráč? */
export function jePorucha(s: Slyseni): boolean {
  return s.trvani < MIN_DELKA || (!!s.chyba && s.chyba !== 'no-speech' && s.chyba !== 'no-match');
}

/** Hráč něco řekl, ale rozpoznávání z toho nedostalo žádná slova. */
export function jeNesrozumitelne(s: Slyseni): boolean {
  return s.texty.length === 0 && !jePorucha(s) && (s.chyba === 'no-match' || !s.chyba);
}

/** Jak dlouho počkat po n-tém výpadku za sebou, aby se poslech nezacyklil. */
export function pauzaPoPoruse(n: number): number {
  return Math.min(250 * 2 ** n, 5000);
}
