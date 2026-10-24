// Seznam všeho, co postavičky říkají, rozdělený na úseky, které jde předem namluvit.
// Nahrávka patří k jedné větě. Tipy se jménem zvířete se skládají ze tří úseků:
// začátek věty („Je to“), jméno zvířete („liška?“) a případný konec („že jo?“),
// aby nebylo potřeba namlouvat každé zvíře s každou větou zvlášť.
import db from '../data/zvirata.json';
import type { Databaze } from '../game/engine';
import { DOPLNKY, HLASKY, type Hlasky } from '../postavicky/hlasky';

const databaze = db as unknown as Databaze;

export type Druh = 'veta' | 'zacatek' | 'jmeno' | 'konec';

export interface Usek {
  /** název souboru bez přípony, odvozený z textu */
  id: string;
  druh: Druh;
  /** co se namlouvá */
  text: string;
  /** pro nahrávací stránku: odkud věta pochází */
  skupina: string;
}

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

export const normalizuj = (text: string) => text.normalize('NFC').replace(/\s+/g, ' ').trim();

/** FNV-1a, 32 bitů hexadecimálně. Stačí na pár tisíc vět a spočítá se i v prohlížeči hned. */
function otisk(text: string): string {
  let h = 0x811c9dc5;
  for (const c of new TextEncoder().encode(text)) {
    h ^= c;
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

export function idUseku(druh: Druh, text: string): string {
  const t = normalizuj(text);
  return otisk(druh === 'veta' ? t : `${druh}|${t}`);
}

const usek = (druh: Druh, text: string, skupina: string): Usek => ({ id: idUseku(druh, text), druh, text: normalizuj(text), skupina });

/** Šablona věty se jménem zvířete, např. „Hádám, že je to {z}.“ */
interface Sablona {
  /** text před jménem, může být prázdný */
  pred: string;
  /** text za jménem včetně interpunkce, např. „, že jo?“ */
  po: string;
  /** jméno se namlouvá jako otázka, nebo jako oznámení */
  znamenko: '?' | '.';
  /** konec věty za jménem bez úvodní čárky, např. „že jo?“ */
  konec: string;
}

function rozeberSablonu(veta: string): Sablona {
  const i = veta.indexOf('{z}');
  const pred = normalizuj(veta.slice(0, i));
  const po = veta.slice(i + 3).trimEnd();
  return { pred, po, znamenko: po.startsWith('?') ? '?' : '.', konec: normalizuj(po.replace(/^[\s,.!?…:;]+/, '')) };
}

const TIPY: (keyof Hlasky)[] = ['tip', 'tipJisty', 'tipNejisty'];

const sablonyCache = new Map<string, Sablona[]>();
function sablony(postava: string): Sablona[] {
  let s = sablonyCache.get(postava);
  if (!s) {
    const h = HLASKY[postava];
    const vety = h ? TIPY.flatMap((k) => (h[k] as string[]).flatMap(rozdelNaVety)) : [];
    s = vety.filter((v) => v.includes('{z}')).map(rozeberSablonu);
    sablonyCache.set(postava, s);
  }
  return s;
}

/** Jména zvířat tak, jak je postavička vysloví v tipu. */
export const JMENA = [...new Set(databaze.zvirata.map((z) => z.jmeno.toLowerCase()))];
const jmenaSet = new Set(JMENA);

/**
 * Z jaké nahrávky (nebo nahrávek) se věta skládá. Věta s tipem se rozloží
 * na začátek, jméno zvířete a konec. Neznámá věta je jeden úsek, který prostě nemusí být nahraný.
 */
export function rozlozVetu(postava: string, veta: string): Usek[] {
  const v = normalizuj(veta);
  for (const s of sablony(postava)) {
    if (!v.startsWith(s.pred) || !v.endsWith(s.po)) continue;
    const jmeno = v.slice(s.pred.length, v.length - s.po.length).trim();
    if (!jmenaSet.has(jmeno)) continue;
    const useky = [usek('jmeno', jmeno + s.znamenko, 'Jména zvířat')];
    if (s.pred) useky.unshift(usek('zacatek', s.pred, 'Tipy'));
    if (s.konec) useky.push(usek('konec', s.konec, 'Tipy'));
    return useky;
  }
  return [usek('veta', v, '')];
}

const SKUPINY: Record<keyof Hlasky, string> = {
  uvod: 'Představení a začátek',
  zacatek: 'Představení a začátek',
  reakce: 'Reakce na odpovědi',
  prekvapeni: 'Reakce na odpovědi',
  pokrok: 'Reakce na odpovědi',
  tuseni: 'Reakce na odpovědi',
  blizko: 'Reakce na odpovědi',
  dlouho: 'Reakce na odpovědi',
  prechod: 'Reakce na odpovědi',
  tip: 'Tipy',
  tipJisty: 'Tipy',
  tipNejisty: 'Tipy',
  vyhra: 'Výhra a prohra',
  vyhraRychla: 'Výhra a prohra',
  vyhraTezka: 'Výhra a prohra',
  znovu: 'Výhra a prohra',
  omyl: 'Výhra a prohra',
  omylZnovu: 'Výhra a prohra',
  vzdavam: 'Výhra a prohra',
  nerozumim: 'Nerozumím',
  nadavka: 'Reakce na nadávky',
  nadavkaZnovu: 'Reakce na nadávky',
};

/** Všechny texty jedné položky hlášek: seznam vět, nebo vět podle druhu (i s emocí). */
export function textyHlasek(hodnota: Hlasky[keyof Hlasky]): string[] {
  const polozky: unknown[] = Array.isArray(hodnota) ? hodnota : Object.values(hodnota).flat();
  return polozky.map((p) => (typeof p === 'string' ? p : (p as { text: string }).text));
}

/** Všechny úseky, které postavička může říct, v pořadí vhodném pro namlouvání. */
export function vsechnyUseky(postava: string): Usek[] {
  const h = HLASKY[postava];
  if (!h) return [];
  const vysledek = new Map<string, Usek>();
  const pridej = (u: Usek) => {
    if (!vysledek.has(u.id)) vysledek.set(u.id, u);
  };
  const pridejText = (text: string, skupina: string) => {
    for (const veta of rozdelNaVety(text)) {
      if (!veta.includes('{z}')) {
        pridej(usek('veta', veta, skupina));
        continue;
      }
      const s = rozeberSablonu(veta);
      if (s.pred) pridej(usek('zacatek', s.pred, skupina));
      if (s.konec) pridej(usek('konec', s.konec, skupina));
    }
  };

  for (const k of Object.keys(SKUPINY) as (keyof Hlasky)[]) {
    for (const t of textyHlasek(h[k])) pridejText(t, SKUPINY[k]);
  }
  for (const t of Object.values(DOPLNKY)) pridejText(t, 'Výzvy a nápovědy');
  for (const t of Object.values(databaze.otazky)) pridejText(t, 'Otázky');

  const znamenka = new Set(sablony(postava).map((s) => s.znamenko));
  for (const z of ['?', '.'] as const) {
    if (!znamenka.has(z)) continue;
    for (const jmeno of JMENA) pridej(usek('jmeno', jmeno + z, 'Jména zvířat'));
  }
  return [...vysledek.values()];
}
