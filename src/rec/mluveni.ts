// Česká řeč přes Web Speech API (speechSynthesis).

export interface Hlas {
  pitch: number;
  rate: number;
  /** jaký hlas postavičce sedí; hlas tohoto pohlaví má přednost i před přirozenějším */
  pohlavi: 'zena' | 'muz';
  /** robotický hlas: výšku měníme naplno i u přirozených hlasů */
  robot?: boolean;
  /** ladění, když prohlížeč hlas požadovaného pohlaví nemá (jinak se odvodí z pitch) */
  nahrada?: { pitch: number; rate: number };
}

let hlasy: SpeechSynthesisVoice[] = [];

function nactiHlasy() {
  if (typeof speechSynthesis === 'undefined') return;
  hlasy = speechSynthesis.getVoices();
}

if (typeof speechSynthesis !== 'undefined') {
  nactiHlasy();
  speechSynthesis.addEventListener?.('voiceschanged', nactiHlasy);
}

// Známé české hlasy: Edge má Vlastu i Antonína, Windows Jakuba, macOS Zuzanu, Google a Android jsou ženské.
const ZENSKE = /vlasta|zuzana|iveta|jana|tereza|dana|google|female|žena|-jfs-/i;
const MUZSKE = /anton[ií]n|jakub|ji[rř][ií]|jirka|ond[rř]ej|petr|tom[aá][sš]|\bmale\b|muž/i;

function pohlaviHlasu(v: SpeechSynthesisVoice): Hlas['pohlavi'] | undefined {
  if (MUZSKE.test(v.name)) return 'muz';
  if (ZENSKE.test(v.name)) return 'zena';
  return undefined;
}

/** Seřadí české hlasy od nejpřirozenějšího. Neurální hlasy (Edge, Android) zní nejlíp. */
function skore(v: SpeechSynthesisVoice, pohlavi?: Hlas['pohlavi']): number {
  let s = 0;
  if (/natural|neural|online|enhanced|premium|siri/i.test(v.name)) s += 10;
  if (/google/i.test(v.name)) s += 5;
  if (!v.localService) s += 2;
  if (pohlavi && pohlaviHlasu(v) === pohlavi) s += 20;
  return s;
}

export function ceskeHlasy(): SpeechSynthesisVoice[] {
  return hlasy.filter((v) => v.lang.toLowerCase().replace('_', '-').startsWith('cs'));
}

export function ceskyHlas(pohlavi?: Hlas['pohlavi']): SpeechSynthesisVoice | undefined {
  return ceskeHlasy().sort((a, b) => skore(b, pohlavi) - skore(a, pohlavi))[0];
}

/** Má prohlížeč český hlas daného pohlaví? */
export function maHlas(pohlavi: Hlas['pohlavi']) {
  return ceskeHlasy().some((v) => pohlaviHlasu(v) === pohlavi);
}

/** Zní hlas přirozeně? Takovému hlasu výšku skoro neměníme, aby nezněl roboticky. */
export function jePrirozeny(v: SpeechSynthesisVoice | undefined) {
  return !!v && skore(v) >= 10;
}

export const mluveniDostupne = typeof speechSynthesis !== 'undefined';

/** zvyšuje se při každém umlčení, aby rozmluvená věta nepokračovala dalším úsekem */
let relace = 0;

export function zmlkni() {
  relace++;
  if (mluveniDostupne) speechSynthesis.cancel();
}

/** Jak emoce mění hlas: násobky výšky a tempa. */
export interface Ladeni {
  pitch: number;
  rate: number;
}

const BEZ_LADENI: Ladeni = { pitch: 1, rate: 1 };

/**
 * Rozdělí text na věty, aby šlo mezi nimi udělat přirozenou pauzu a každou
 * trochu jinak intonovat. Krátké úseky navíc v Chromu nepřeruší známá chyba dlouhých vět.
 */
export function rozdelNaVety(text: string): string[] {
  return text
    .split(/(?<=[.!?…])\s+/)
    .map((v) => v.trim())
    .filter(Boolean);
}

/** Pauza za větou: po trojtečce se postavička zamyslí, po otázce a zvolání nadechne. */
export function pauzaZa(veta: string): number {
  if (veta.endsWith('…')) return 380;
  if (veta.endsWith('?') || veta.endsWith('!')) return 200;
  return 140;
}

const omez = (x: number, od: number, do_: number) => Math.min(do_, Math.max(od, x));

/** Výška a tempo pro postavičku podle toho, jaký hlas prohlížeč má. */
function zakladniHlas(hlas: Hlas, cs: SpeechSynthesisVoice | undefined): Ladeni & { mira: number } {
  const sedi = !!cs && pohlaviHlasu(cs) === hlas.pohlavi;
  if (sedi || !cs || pohlaviHlasu(cs) === undefined) {
    // velká změna výšky zkresluje, u přirozených hlasů ji jen naznačíme
    const mira = jePrirozeny(cs) && !hlas.robot ? 0.4 : 1;
    return { pitch: 1 + (hlas.pitch - 1) * mira, rate: hlas.rate, mira };
  }
  // hlas jiného pohlaví: postavičku odlišíme výrazně jinou výškou a tempem
  const n = hlas.nahrada ?? {
    pitch: hlas.pohlavi === 'muz' ? Math.min(hlas.pitch, 1) * 0.7 : Math.max(hlas.pitch, 1) * 1.3,
    rate: hlas.rate,
  };
  return { ...n, mira: 1 };
}

function rekniVetu(veta: string, voice: SpeechSynthesisVoice | undefined, pitch: number, rate: number): Promise<void> {
  const odhad = 600 + veta.length * 70;
  return new Promise((resolve) => {
    const u = new SpeechSynthesisUtterance(veta);
    u.lang = 'cs-CZ';
    if (voice) u.voice = voice;
    u.pitch = omez(pitch, 0.1, 2);
    u.rate = omez(rate, 0.5, 2);
    let hotovo = false;
    const konec = () => {
      if (hotovo) return;
      hotovo = true;
      clearTimeout(pojistka);
      resolve();
    };
    // některé prohlížeče občas nezavolají onend
    const pojistka = setTimeout(konec, odhad * 2 + 3000);
    u.onend = konec;
    u.onerror = konec;
    speechSynthesis.speak(u);
  });
}

/**
 * Řekne text a počká, až domluví. Bez syntézy jen počká odhadnutou dobu.
 * Emoce (`ladeni`) mírně posune výšku a tempo hlasu.
 */
export async function rekni(text: string, hlas: Hlas, ztlumeno = false, ladeni: Ladeni = BEZ_LADENI): Promise<void> {
  const odhad = 600 + text.length * 70;
  if (!mluveniDostupne || ztlumeno) return new Promise((r) => setTimeout(r, Math.min(odhad, 2500)));

  zmlkni();
  const moje = relace;
  const cs = ceskyHlas(hlas.pohlavi);
  const zaklad = zakladniHlas(hlas, cs);
  // u přirozených hlasů emoci ve výšce jen naznačíme, tempo ale měníme naplno
  const pitch = zaklad.pitch * (1 + (ladeni.pitch - 1) * Math.max(zaklad.mira, 0.6));
  const rate = zaklad.rate * ladeni.rate;
  const vety = rozdelNaVety(text);
  for (let i = 0; i < vety.length; i++) {
    if (moje !== relace) return;
    const veta = vety[i];
    // každá věta trochu jinak, otázka jde nahoru, robot zní pořád stejně
    const kolisani = hlas.robot ? 0 : (Math.random() - 0.5) * 0.04;
    const otazka = veta.endsWith('?') ? 1.03 : 1;
    await rekniVetu(veta, cs, pitch * otazka * (1 + kolisani), rate * (1 + kolisani / 2));
    if (i < vety.length - 1 && moje === relace) await new Promise((r) => setTimeout(r, pauzaZa(veta)));
  }
}
