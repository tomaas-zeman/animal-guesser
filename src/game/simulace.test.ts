// Simulace hráčů: pro každé zvíře odehraje několik her, kde "hráč" odpovídá
// podle databáze, ale občas se splete, řekne "nevím" nebo "může být".
import { describe, expect, it } from 'vitest';
import db from '../data/zvirata.json';
import { Hra, type Databaze, type Odpoved } from './engine';

const databaze = db as unknown as Databaze;

/** Jednoduchý deterministický generátor, aby simulace dávala vždy stejný výsledek. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Hrac {
  nevim: number;
  omyl: number;
}

function odpovedHrace(p: number, hrac: Hrac, rng: () => number): Odpoved {
  if (rng() < hrac.nevim) return 'nevim';
  if (p > 0.25 && p < 0.75 && rng() < 0.4) return 'mozna';
  let ano = rng() < p;
  if (rng() < hrac.omyl) ano = !ano;
  return ano ? 'ano' : 'ne';
}

function odehraj(cil: number, hrac: Hrac, rng: () => number) {
  const hra = new Hra(databaze, {}, rng);
  for (let krok = 0; krok < 100; krok++) {
    const tah = hra.dalsiTah();
    if (tah.typ === 'vzdavam') return { uhodl: false, tipu: hra.spatneTipy.length, otazek: hra.pocetOtazek };
    if (tah.typ === 'tip') {
      if (tah.index === cil) return { uhodl: true, tipu: hra.spatneTipy.length + 1, otazek: hra.pocetOtazek };
      hra.vyhodnotTip(tah.index, false);
      continue;
    }
    hra.odpovez(tah.id, odpovedHrace(databaze.zvirata[cil].a[tah.id] ?? 0, hrac, rng));
  }
  throw new Error('hra se zacyklila');
}

function simuluj(hrac: Hrac, her: number) {
  const rng = mulberry32(42);
  let uhodl = 0, naPrvni = 0, otazek = 0, celkem = 0;
  const neuspechy: Record<string, number> = {};
  databaze.zvirata.forEach((z, cil) => {
    for (let i = 0; i < her; i++) {
      const v = odehraj(cil, hrac, rng);
      celkem++;
      otazek += v.otazek;
      if (v.uhodl) uhodl++;
      if (v.uhodl && v.tipu === 1) naPrvni++;
      if (!v.uhodl) neuspechy[z.jmeno] = (neuspechy[z.jmeno] ?? 0) + 1;
    }
  });
  const nejhorsi = Object.entries(neuspechy).sort((a, b) => b[1] - a[1]).slice(0, 8);
  return { uspesnost: uhodl / celkem, naPrvni: naPrvni / celkem, prumerOtazek: otazek / celkem, nejhorsi };
}

describe('simulace hádání', () => {
  it('pečlivý hráč (bez omylů, občas nevím)', () => {
    const r = simuluj({ nevim: 0.05, omyl: 0 }, 5);
    console.log('pečlivý hráč', r);
    expect(r.uspesnost).toBeGreaterThan(0.97);
    expect(r.naPrvni).toBeGreaterThan(0.85);
  });

  it('běžný hráč (5 % omylů, 10 % nevím)', () => {
    const r = simuluj({ nevim: 0.1, omyl: 0.05 }, 5);
    console.log('běžný hráč', r);
    expect(r.uspesnost).toBeGreaterThan(0.9);
  });

  it('nepozorný hráč (10 % omylů, 15 % nevím)', () => {
    const r = simuluj({ nevim: 0.15, omyl: 0.1 }, 5);
    console.log('nepozorný hráč', r);
    expect(r.uspesnost).toBeGreaterThan(0.75);
  });
});
