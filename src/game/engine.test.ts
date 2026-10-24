import { describe, expect, it } from 'vitest';
import db from '../data/zvirata.json';
import { Hra, type Databaze, type Odpoved } from './engine';
import { mulberry32 } from './simulace';

const databaze = db as unknown as Databaze;
const index = (jmeno: string) => databaze.zvirata.findIndex((z) => z.jmeno === jmeno);

/** Hraje podle zadaných odpovědí, na ostatní odpovídá podle profilu zvířete. Vrací položené otázky a tipy. */
function hraj(profil: string, vynucene: Record<string, Odpoved>, seed = 1) {
  const hra = new Hra(databaze, {}, mulberry32(seed));
  const a = databaze.zvirata[index(profil)].a;
  const otazky: string[] = [];
  const tipy: string[] = [];
  for (let krok = 0; krok < 60; krok++) {
    const tah = hra.dalsiTah();
    if (tah.typ === 'vzdavam') break;
    if (tah.typ === 'tip') {
      tipy.push(tah.zvire.jmeno);
      if (tah.zvire.jmeno === profil) break;
      hra.vyhodnotTip(tah.index, false);
      continue;
    }
    otazky.push(tah.id);
    hra.odpovez(tah.id, vynucene[tah.id] ?? ((a[tah.id] ?? 0) >= 0.5 ? 'ano' : 'ne'));
  }
  return { otazky, tipy, hra };
}

describe('logika hádání', () => {
  it('po "je to pták" se už neptá na peří, křídla ani na to, jestli je to savec', () => {
    const hra = new Hra(databaze, {}, mulberry32(3));
    hra.odpovez('ptak', 'ano');
    for (const id of ['peri', 'kridla', 'dve', 'vejce', 'savec', 'ryba', 'srst', 'hmyz']) expect(hra.muzeSePtat(id), id).toBe(false);
    expect(hra.muzeSePtat('leta')).toBe(true);
  });

  it('po "není to pták" se neptá, jestli má peří', () => {
    const hra = new Hra(databaze, {}, mulberry32(3));
    hra.odpovez('ptak', 'ne');
    expect(hra.muzeSePtat('peri')).toBe(false);
    expect(hra.muzeSePtat('kridla')).toBe(true);
  });

  it('"může být" a "nevím" nic neodvozují', () => {
    const hra = new Hra(databaze, {}, mulberry32(3));
    hra.odpovez('ptak', 'mozna');
    hra.odpovez('savec', 'nevim');
    expect(hra.muzeSePtat('peri')).toBe(true);
    expect(hra.muzeSePtat('ptak')).toBe(false);
  });

  it('když hráč řekne, že není noční, netipuje sovu, dokud jsou jiní ptáci', () => {
    for (const ptak of ['Vrabec', 'Kos', 'Vrána', 'Sýkorka', 'Holub', 'Orel', 'Sova']) {
      for (let seed = 1; seed <= 5; seed++) {
        const { tipy, hra } = hraj(ptak, { noc: 'ne' }, seed);
        if (!hra.historie.some((h) => h.id === 'noc')) continue;
        expect(hra.rozpory[index('Sova')]).toBeGreaterThan(0);
        if (ptak === 'Sova') continue;
        expect(tipy).not.toContain('Sova');
        expect(tipy.at(-1)).toBe(ptak);
      }
    }
  });

  it('nikdy se nezeptá dvakrát na totéž', () => {
    for (let i = 0; i < databaze.zvirata.length; i++) {
      const { otazky } = hraj(databaze.zvirata[i].jmeno, {}, i);
      expect(new Set(otazky).size).toBe(otazky.length);
    }
  });
});
