// Rozpoznávání české řeči (Web Speech API). Funguje hlavně v Chrome, Edge a Safari.
import type { Odpoved } from '../game/engine';

interface Vysledek {
  results: ArrayLike<ArrayLike<{ transcript: string; confidence?: number }> & { isFinal?: boolean }>;
}

interface Rozpoznavac {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((e: Vysledek) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  onaudiostart: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

type RozpoznavacTrida = new () => Rozpoznavac;

function tridaRozpoznavace(): RozpoznavacTrida | undefined {
  if (typeof window === 'undefined') return undefined;
  const w = window as unknown as { SpeechRecognition?: RozpoznavacTrida; webkitSpeechRecognition?: RozpoznavacTrida };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

export const poslechDostupny = !!tridaRozpoznavace();

/** Jedna varianta přepisu, jak ji vrátil prohlížeč (pro ladění). */
export interface Prepis {
  text: string;
  /** jistota 0–1; Chrome ji u průběžných výsledků často nevyplní (0) */
  jistota: number;
  final: boolean;
}

export interface Slyseni {
  /** přepisy toho, co hráč řekl (víc variant), prázdné pole = nic neslyšel */
  texty: string[];
  /** všechno, co prohlížeč vrátil, včetně průběžných výsledků */
  prepisy?: Prepis[];
  /** proč poslech skončil bez výsledku ("no-speech", "network", "aborted"…) */
  chyba?: string;
  /** jak dlouho poslech běžel (ms); velmi krátký poslech bez výsledku je porucha, ne ticho */
  trvani: number;
  /** poslech ukončila jasná průběžná odpověď, nečekalo se na finální výsledek */
  zkraceno?: boolean;
}

export interface Poslech {
  vysledek: Promise<Slyseni>;
  zrus(): void;
}

/** Pojistka pro prohlížeče, kde poslech občas neskončí sám. */
const MAX_DELKA = 20_000;
/**
 * Když průběžný přepis obsahuje jasnou odpověď a dál se nic neděje, poslech se
 * po téhle době ukončí. Chrome u krátkého "ne" jinak někdy čeká na konec řeči
 * několik sekund, nebo finální výsledek nepošle vůbec.
 */
export const CEKANI_PO_ODPOVEDI = 700;

export function poslouchej(naStart?: () => void): Poslech {
  const Trida = tridaRozpoznavace();
  if (!Trida) return { vysledek: Promise.resolve({ texty: [], prepisy: [], chyba: 'nedostupny', trvani: 0 }), zrus() {} };

  const r = new Trida();
  r.lang = 'cs-CZ';
  r.continuous = false;
  r.interimResults = true;
  r.maxAlternatives = 5;
  const zacatek = Date.now();
  let pojistka: ReturnType<typeof setTimeout> | undefined;
  let dokonci: ReturnType<typeof setTimeout> | undefined;
  // mikrofon se rozbíhá chvíli; hráč má poznat, kdy už může mluvit
  let odstartovano = false;
  const ohlasStart = () => {
    if (odstartovano) return;
    odstartovano = true;
    naStart?.();
  };
  const zalozniStart = setTimeout(ohlasStart, 1000);
  r.onaudiostart = ohlasStart;

  const vysledek = new Promise<Slyseni>((resolve, reject) => {
    let prepisy: Prepis[] = [];
    let chyba: string | undefined;
    let zkraceno = false;
    r.onresult = (e) => {
      prepisy = [];
      for (let i = 0; i < e.results.length; i++) {
        const alt = e.results[i];
        for (let j = 0; j < alt.length; j++) {
          prepisy.push({ text: alt[j].transcript, jistota: alt[j].confidence ?? 0, final: alt.isFinal !== false });
        }
      }
      clearTimeout(dokonci);
      const prubezne = prepisy.filter((p) => !p.final).map((p) => p.text);
      if (prubezne.length && !prepisy.some((p) => p.final) && rozpoznejOdpoved(prubezne)) {
        dokonci = setTimeout(() => {
          zkraceno = true;
          r.stop(); // stop, ne abort: prohlížeč ještě pošle, co má rozpracované
        }, CEKANI_PO_ODPOVEDI);
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
      clearTimeout(dokonci);
      clearTimeout(zalozniStart);
      const texty = vyberTexty(prepisy);
      resolve({ texty, prepisy, chyba: texty.length ? undefined : chyba, trvani: Date.now() - zacatek, zkraceno });
    };
  });

  try {
    r.start();
  } catch {
    clearTimeout(zalozniStart);
    // typicky "už běží" hned po předchozím poslechu; volající to zkusí znovu
    return { vysledek: Promise.resolve({ texty: [], prepisy: [], chyba: 'start', trvani: 0 }), zrus() {} };
  }
  pojistka = setTimeout(() => r.abort(), MAX_DELKA);
  return {
    vysledek,
    zrus: () => {
      clearTimeout(pojistka);
      clearTimeout(dokonci);
      clearTimeout(zalozniStart);
      r.abort();
    },
  };
}

/**
 * Z přepisů vybere ty, se kterými se pracuje: finální, a když žádné nejsou,
 * průběžné. Průběžné se přidají i za finální, protože Chrome finální "ne"
 * občas "opraví" na nesmysl, zatímco průběžně ho slyšel správně.
 */
export function vyberTexty(prepisy: Prepis[]): string[] {
  const finalni = prepisy.filter((p) => p.final && p.text.trim()).map((p) => p.text);
  const prubezne = prepisy.filter((p) => !p.final && p.text.trim()).map((p) => p.text);
  return [...finalni, ...prubezne.filter((t) => !finalni.includes(t))];
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
  // "ne" je krátké a rozpoznávání ho přepisuje všelijak: "Né.", "neee", "nene", "ne ne ne", "nein"…
  // a hráč často odpoví zápornou větou: "nelétá", "nejsou", "nemá křídla"
  [
    'ne',
    /\b(spis ne|asi ne|nejspis ne|myslim ze ne|ani nahodou|v zadnem pripade|n+e+h?|ne(ne)+|nikdy|vubec|kdepak|nikoliv|nope|nein|nie|ne(?!(kdy|kde|kdo|co|jak|kter|kol|jsp|jvi|jl|jen|bo|vim|vi\b|tusim|rozum|slys|boj|chap))[a-z]{2,})\b/,
  ],
  ['mozna', /\b(mozna|muze byt|muze|nekdy|asi|nejspis|spis ano|spis jo|trochu|obcas|castecne|jak kdy|mozna ano)\b/],
  ['ano', /\b(ano|jo|no jo|nojo|jasne ze jo|joo+|jasne|jasnacka|urcite|presne|samozrejme|jop|jojo|ok|okej|spravne)\b/],
];

/**
 * Slabé odpovědi: krátká slova, se kterými si rozpoznávání plete "ne"
 * ("je" ↔ "ne", "mně"). Platí jen tehdy, když žádná jiná varianta přepisu
 * nedává jasnou odpověď.
 */
const SLABE: [Odpoved, RegExp][] = [
  ['ne', /^(n+|mne|mne ne|nn)$/],
  ['ano', /\b(je|ma|umi|zije|jsou|maji)\b/],
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

/** Jak dlouhou větu ještě prohledá, jestli nekončí odpovědí ("…je to noční zvíře? ne"). */
const MAX_SLOV_S_ODPOVEDI_NA_KONCI = 8;

/** Je slovo z odpovědi totéž slovo jako v otázce? Stačí stejný začátek: "létá" ~ "létat", "plave" ~ "plavat". */
function stejneSlovo(a: string, b: string): boolean {
  const n = Math.min(4, a.length, b.length);
  return a.slice(0, n) === b.slice(0, n) && Math.abs(a.length - b.length) <= 2;
}

/**
 * Odpověď slovem z otázky: "Umí létat?" "Létá." Vrací null, když to není jedno slovo z otázky.
 * Krátká slova ("je", "má") sem nepatří: rozpoznávání si je plete s "ne", řeší je SLABE.
 */
function ozvena(t: string, otazka: string): Odpoved | null {
  if (slov(t) !== 1 || t.length < 3 || t.startsWith('ne')) return null;
  // slova se záporem ("není hmyz") a "nebo" nejsou ozvěna kladné odpovědi
  const slova = normalizuj(otazka).split(' ').filter((s) => s.length >= 3 && !s.startsWith('ne'));
  return slova.some((s) => stejneSlovo(t, s)) ? 'ano' : null;
}

function rozeber(t: string, otazka: string): { odpoved: Odpoved; silna: boolean } | null {
  if (!t) return null;
  const n = slov(t);
  if (n <= MAX_SLOV) {
    // zápor a "nevím" mají přednost: "neumí" je ne, i když "umí" je v otázce
    for (const [odpoved, vzor] of VZORY) if (odpoved !== 'ano' && odpoved !== 'mozna' && vzor.test(t)) return { odpoved, silna: true };
    const o = ozvena(t, otazka);
    if (o) return { odpoved: o, silna: true };
    for (const [odpoved, vzor] of VZORY) if (vzor.test(t)) return { odpoved, silna: true };
    for (const [odpoved, vzor] of SLABE) if (vzor.test(t)) return { odpoved, silna: false };
    return null;
  }
  // delší přepis: konec otázky z reproduktoru nebo hovor, za kterým hráč odpověděl
  if (n > MAX_SLOV_S_ODPOVEDI_NA_KONCI) return null;
  const posledni = t.slice(t.lastIndexOf(' ') + 1);
  for (const [odpoved, vzor] of VZORY) if (vzor.test(posledni)) return { odpoved, silna: false };
  return null;
}

/**
 * Převede, co hráč řekl, na odpověď. `otazka` pomůže pochopit odpověď slovem z otázky.
 * Vrací null, když nerozumí.
 * Projde všechny varianty přepisu: jasná odpověď v kterékoli z nich má přednost
 * před slabou ("je") v té nejpravděpodobnější.
 */
export function rozpoznejOdpoved(texty: string[], otazka = ''): Odpoved | null {
  let slaba: Odpoved | null = null;
  for (const text of texty) {
    const r = rozeber(normalizuj(text), otazka);
    if (!r) continue;
    if (r.silna) return r.odpoved;
    slaba ??= r.odpoved;
  }
  return slaba;
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
