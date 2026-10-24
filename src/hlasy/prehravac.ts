// Přehrávání předem namluvených vět. Soubory leží v public/hlasy/<postava>/<id>.<přípona>,
// seznam toho, co existuje, je v public/hlasy/index.json (vytváří ho `npm run hlasy:index`
// při každém buildu). Nahrávky z nahrávací stránky uložené v prohlížeči mají přednost.
// Co nahrané není, řekne dál syntéza řeči.
import { rozlozVetu, type Usek } from './klice';
import { klicNahravky, kliceNahravek, nactiNahravku } from './uloziste';

/** postava → id úseku → přípona souboru */
export type IndexHlasu = Record<string, Record<string, string>>;

const ZAKLAD = `${import.meta.env?.BASE_URL ?? './'}hlasy/`;
/** jak dlouho nejvýš čekat na stažení nahrávky, než věta zazní syntézou */
const MAX_NACITANI = 3000;

let index: Promise<IndexHlasu> | null = null;
let mistni: Promise<Set<string>> | null = null;

export function nactiIndex(): Promise<IndexHlasu> {
  return (index ??= fetch(`${ZAKLAD}index.json`, { cache: 'no-cache' })
    .then((r) => (r.ok ? r.json() : {}))
    .catch(() => ({})));
}

/** Po nahrání nové věty na nahrávací stránce, aby ji hra hned znala. */
export function obnovMistni() {
  mistni = kliceNahravek();
  buffery.clear();
}

/** Má postavička aspoň nějaké nahrávky? */
export async function maNahravky(postava?: string): Promise<boolean> {
  const [idx, m] = await Promise.all([nactiIndex(), (mistni ??= kliceNahravek())]);
  if (postava) return Object.keys(idx[postava] ?? {}).length > 0 || [...m].some((k) => k.startsWith(`${postava}/`));
  return Object.values(idx).some((p) => Object.keys(p).length > 0) || m.size > 0;
}

let kontext: AudioContext | null = null;

function dejKontext(): AudioContext | null {
  if (kontext) return kontext;
  const AC = typeof window !== 'undefined' ? window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext : undefined;
  if (!AC) return null;
  kontext = new AC();
  return kontext;
}

/** Prohlížeče pustí zvuk až po kliknutí. Volá se synchronně z obsluhy kliknutí. */
export function odemkni() {
  const k = dejKontext();
  if (k && k.state === 'suspended') k.resume().catch(() => {});
}

if (typeof window !== 'undefined') {
  for (const udalost of ['pointerdown', 'keydown', 'touchend']) window.addEventListener(udalost, odemkni, { capture: true });
}

/** Úsek nahrávky bez ticha na začátku a na konci a se srovnanou hlasitostí. */
export interface Zvuk {
  buffer: AudioBuffer;
  od: number;
  do: number;
  zesileni: number;
}

/** Najde, kde se v nahrávce mluví, a jak ji zesílit, aby všechny věty byly stejně hlasité. */
export function orizni(buffer: AudioBuffer): Zvuk {
  const data = buffer.getChannelData(0);
  const okno = Math.max(1, Math.round(buffer.sampleRate * 0.01));
  const energie: number[] = [];
  let spicka = 0;
  for (let i = 0; i < data.length; i += okno) {
    let s = 0;
    const konec = Math.min(data.length, i + okno);
    for (let j = i; j < konec; j++) {
      s += data[j] * data[j];
      spicka = Math.max(spicka, Math.abs(data[j]));
    }
    energie.push(Math.sqrt(s / (konec - i)));
  }
  const maxEnergie = Math.max(...energie, 1e-6);
  const prah = Math.max(maxEnergie * 0.08, 0.004);
  const prvni = energie.findIndex((e) => e > prah);
  let posledni = energie.length - 1;
  while (posledni > 0 && energie[posledni] <= prah) posledni--;
  if (prvni < 0) return { buffer, od: 0, do: buffer.duration, zesileni: 1 };
  const od = Math.max(0, (prvni * okno) / buffer.sampleRate - 0.06);
  const do_ = Math.min(buffer.duration, ((posledni + 1) * okno) / buffer.sampleRate + 0.12);
  return { buffer, od, do: do_, zesileni: Math.min(0.9 / Math.max(spicka, 1e-4), 6) };
}

async function dekoduj(data: ArrayBuffer): Promise<Zvuk | null> {
  const k = dejKontext();
  if (!k) return null;
  try {
    return orizni(await k.decodeAudioData(data));
  } catch {
    return null;
  }
}

/** Načte a připraví nahrávku z Blobu (nahrávací stránka). */
export async function zvukZBlobu(blob: Blob): Promise<Zvuk | null> {
  return dekoduj(await blob.arrayBuffer());
}

const buffery = new Map<string, Promise<Zvuk | null>>();

function nactiUsek(postava: string, u: Usek, idx: IndexHlasu, m: Set<string>): Promise<Zvuk | null> | null {
  const klic = klicNahravky(postava, u.id);
  const pripona = idx[postava]?.[u.id];
  if (!m.has(klic) && !pripona) return null;
  let p = buffery.get(klic);
  if (!p) {
    p = (async () => {
      const n = m.has(klic) ? await nactiNahravku(klic).catch(() => undefined) : undefined;
      if (n) return dekoduj(await n.blob.arrayBuffer());
      if (!pripona) return null;
      const r = await fetch(`${ZAKLAD}${postava}/${u.id}.${pripona}`);
      return r.ok ? dekoduj(await r.arrayBuffer()) : null;
    })().catch(() => null);
    buffery.set(klic, p);
    // nepovedené stažení zkusí příště znovu
    p.then((z) => z === null && buffery.delete(klic));
  }
  return p;
}

/**
 * Připraví nahrávky pro jednu větu. Vrátí null, když některý úsek věty
 * nahraný není nebo se nestihne načíst; pak ji řekne syntéza.
 */
export async function pripravVetu(postava: string, veta: string): Promise<Zvuk[] | null> {
  if (!dejKontext()) return null;
  const [idx, m] = await Promise.all([nactiIndex(), (mistni ??= kliceNahravek())]);
  const nacitani = rozlozVetu(postava, veta).map((u) => nactiUsek(postava, u, idx, m));
  if (nacitani.some((n) => n === null)) return null;
  const limit = new Promise<null>((r) => setTimeout(() => r(null), MAX_NACITANI));
  const zvuky = await Promise.race([Promise.all(nacitani), limit]);
  if (!zvuky || zvuky.some((z) => z === null)) return null;
  return zvuky as Zvuk[];
}

let hraje: AudioBufferSourceNode[] = [];

export function zastav() {
  for (const s of hraje) {
    try {
      s.stop();
    } catch {
      // už dohrál
    }
  }
  hraje = [];
}

/** Přehraje úseky těsně za sebou (začátek věty, jméno zvířete, konec) a počká, až dozní. */
export function prehraj(zvuky: Zvuk[]): Promise<void> {
  const k = dejKontext();
  if (!k || zvuky.length === 0) return Promise.resolve();
  zastav();
  let cas = k.currentTime + 0.03;
  const zdroje = zvuky.map((z) => {
    const zdroj = k.createBufferSource();
    zdroj.buffer = z.buffer;
    const zisk = k.createGain();
    zisk.gain.value = z.zesileni;
    zdroj.connect(zisk).connect(k.destination);
    zdroj.start(cas, z.od, z.do - z.od);
    cas += z.do - z.od;
    return zdroj;
  });
  hraje = zdroje;
  const delka = cas - k.currentTime;
  return new Promise((resolve) => {
    let hotovo = false;
    const konec = () => {
      if (hotovo) return;
      hotovo = true;
      clearTimeout(pojistka);
      resolve();
    };
    // pozastavený kontext (např. iOS bez kliknutí) by jinak čekal navždy
    const pojistka = setTimeout(konec, delka * 1000 + 1500);
    zdroje[zdroje.length - 1].onended = konec;
  });
}
