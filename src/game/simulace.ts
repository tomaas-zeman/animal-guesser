// Simulace hráčů: pro každé zvíře odehraje několik her, kde "hráč" odpovídá
// podle databáze, ale občas se splete, řekne "nevím" nebo "může být".
import { Hra, type Databaze, type Nastaveni, type Odpoved } from './engine';

export interface Hrac {
  nevim: number;
  omyl: number;
}

/** Jednoduchý deterministický generátor, aby simulace dávala vždy stejný výsledek. */
export function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function odpovedHrace(p: number, hrac: Hrac, rng: () => number): Odpoved {
  if (rng() < hrac.nevim) return 'nevim';
  if (p > 0.25 && p < 0.75 && rng() < 0.4) return 'mozna';
  let ano = rng() < p;
  if (rng() < hrac.omyl) ano = !ano;
  return ano ? 'ano' : 'ne';
}

/** Jak hráč odpoví na otázku, když vlastnost platí s pravděpodobností p. */
export type Odpovidac = (p: number, rng: () => number) => Odpoved;

/** Hráč, který odpovídá přesně podle databáze (co platí aspoň napůl, je "ano"). */
export const presnyHrac: Odpovidac = (p) => (p >= 0.5 ? 'ano' : 'ne');

/** U jasných vlastností odpoví přesně, u nejasných (0,2 až 0,8) si hodí mincí podle p. */
export const vahavyHrac: Odpovidac = (p, rng) => (p >= 0.8 ? 'ano' : p <= 0.2 ? 'ne' : rng() < p ? 'ano' : 'ne');

export function odehraj(db: Databaze, cil: number, odpovidac: Odpovidac, nastaveni: Partial<Nastaveni>, rng: () => number) {
  const hra = new Hra(db, nastaveni, rng);
  for (let krok = 0; krok < 100; krok++) {
    const tah = hra.dalsiTah();
    if (tah.typ === 'vzdavam') return { uhodl: false, tipu: hra.spatneTipy.length, otazek: hra.pocetOtazek, spatneTipy: hra.spatneTipy };
    if (tah.typ === 'tip') {
      if (tah.index === cil) return { uhodl: true, tipu: hra.spatneTipy.length + 1, otazek: hra.pocetOtazek, spatneTipy: hra.spatneTipy };
      hra.vyhodnotTip(tah.index, false);
      continue;
    }
    hra.odpovez(tah.id, odpovidac(db.zvirata[cil].a[tah.id] ?? 0, rng));
  }
  throw new Error('hra se zacyklila');
}

export function simuluj(db: Databaze, hrac: Hrac, her: number, nastaveni: Partial<Nastaveni> = {}) {
  const rng = mulberry32(42);
  let uhodl = 0, naPrvni = 0, otazek = 0, tipu = 0, celkem = 0;
  const neuspechy: Record<string, number> = {};
  db.zvirata.forEach((z, cil) => {
    for (let i = 0; i < her; i++) {
      const v = odehraj(db, cil, (p, r) => odpovedHrace(p, hrac, r), nastaveni, rng);
      celkem++;
      otazek += v.otazek;
      tipu += v.tipu;
      if (v.uhodl) uhodl++;
      if (v.uhodl && v.tipu === 1) naPrvni++;
      if (!v.uhodl) neuspechy[z.jmeno] = (neuspechy[z.jmeno] ?? 0) + 1;
    }
  });
  const nejhorsi = Object.entries(neuspechy).sort((a, b) => b[1] - a[1]).slice(0, 8);
  return {
    uspesnost: uhodl / celkem,
    naPrvni: naPrvni / celkem,
    prumerOtazek: otazek / celkem,
    /** otázky + tipy, tedy kolikrát musí hráč odpovědět */
    prumerTahu: (otazek + tipu) / celkem,
    nejhorsi,
  };
}

/** Zvířata, která hráč s danými odpověďmi neuhodne na první tip, i s tím, za co je postavička zaměnila. */
export function omylyNaPrvniTip(db: Databaze, odpovidac: Odpovidac, her: number, nastaveni: Partial<Nastaveni> = {}) {
  const omyly: string[] = [];
  db.zvirata.forEach((z, cil) => {
    for (let i = 0; i < her; i++) {
      const v = odehraj(db, cil, odpovidac, nastaveni, mulberry32(1000 * i + cil));
      if (!v.uhodl || v.tipu > 1) omyly.push(`${z.jmeno} ← ${v.spatneTipy.map((j) => db.zvirata[j].jmeno).join(', ') || 'vzdal se'}`);
    }
  });
  return omyly;
}
