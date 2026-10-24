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

describe('na co se už neptá', () => {
  it('po "žije v moři" se neptá, jestli žije v lese, na poušti nebo v české přírodě', () => {
    const hra = new Hra(databaze, {}, mulberry32(5));
    hra.odpovez('more', 'ano');
    for (const id of ['les', 'poust', 'cesko', 'nora', 'leze']) expect(hra.muzeSePtat(id), id).toBe(false);
  });

  it('po "je to obojživelník" se neptá na peří, srst ani šupiny', () => {
    const hra = new Hra(databaze, {}, mulberry32(5));
    hra.odpovez('obojzivelnik', 'ano');
    for (const id of ['peri', 'srst', 'supiny', 'kridla', 'ploutve', 'kopyta']) expect(hra.muzeSePtat(id), id).toBe(false);
  });

  it('u žádného zvířete se neptá na nic, co už z odpovědí plyne', () => {
    // nezávislá kontrola: zvířata, která sedí na všechny dosavadní odpovědi, nesmí mít
    // na položenou otázku všechna stejnou jasnou odpověď
    const zbytecne: string[] = [];
    databaze.zvirata.forEach((z, cil) => {
      for (const seed of [1, 2]) {
        const hra = new Hra(databaze, {}, mulberry32(seed * 1000 + cil));
        for (let krok = 0; krok < 60; krok++) {
          const tah = hra.dalsiTah();
          if (tah.typ !== 'otazka') break;
          const sedi = databaze.zvirata.filter((x, i) => hra.pst[i] > 0 && hra.rozpory[i] === 0);
          const v = sedi.map((x) => x.a[tah.id] ?? 0);
          if (sedi.length > 1 && (v.every((x) => x <= 0.1) || v.every((x) => x >= 0.9))) zbytecne.push(`${z.jmeno}: ${tah.id} [${sedi.map((x) => x.jmeno + "=" + (x.a[tah.id] ?? 0)).join(",")}] top: ${hra.poradi().slice(0, 4).map((x) => databaze.zvirata[x.index].jmeno + ":" + x.pst.toFixed(3) + "=" + (databaze.zvirata[x.index].a[tah.id] ?? 0)).join(",")}`);
          hra.odpovez(tah.id, (z.a[tah.id] ?? 0) >= 0.5 ? 'ano' : 'ne');
        }
      }
    });
    expect(zbytecne).toEqual([]);
  });
});

describe('obojživelníci a hadi (hra nesmí odběhnout do jiné skupiny)', () => {
  const skupina = (jmeno: string) => databaze.zvirata[index(jmeno)].a;

  // dítě odpovídá podle zvířete, jen u vynucených otázek jinak než databáze (třeba "skvrny nemá")
  const pripady: [string, Record<string, Odpoved>, string][] = [
    ['Mlok', { voda: 'ano', skace: 'ne', skvrny: 'ne', vzor: 'ne', pestre: 'ne' }, 'obojzivelnik'],
    ['Mlok', { voda: 'ano', skace: 'ne' }, 'obojzivelnik'],
    ['Velemlok', { voda: 'ano', skace: 'ne' }, 'obojzivelnik'],
    ['Čolek', { skace: 'ne', les: 'ne' }, 'obojzivelnik'],
    ['Skokan', { zelene: 'ne' }, 'obojzivelnik'],
    ['Kuňka', { kvaka: 'ne' }, 'obojzivelnik'],
    ['Užovka', { les: 'ne', vzor: 'ne' }, 'plaz'],
  ];
  for (const [jmeno, vynucene, trida] of pripady) {
    it(`${jmeno} (${Object.keys(vynucene).join(', ')}): tipuje jen z ${trida} a nakonec trefí`, () => {
      for (let seed = 1; seed <= 4; seed++) {
        const { tipy, hra } = hraj(jmeno, vynucene, seed);
        expect(tipy.at(-1), tipy.join(', ')).toBe(jmeno);
        // když už hráč potvrdil skupinu, tipy z jiné skupiny nedávají smysl
        if (hra.zname.get(trida) === true) for (const t of tipy) expect(skupina(t)[trida] ?? 0, t).toBeGreaterThan(0.5);
        expect(tipy.length).toBeLessThanOrEqual(3);
      }
    });
  }
});
