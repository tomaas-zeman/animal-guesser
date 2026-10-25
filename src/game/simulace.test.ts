import { describe, expect, it } from 'vitest';
import db from '../data/zvirata.json';
import type { Databaze } from './engine';
import { hracSJednimOmylem, mulberry32, odehraj, omylyNaPrvniTip, presnyHrac, simuluj, vahavyHrac } from './simulace';

const databaze = db as unknown as Databaze;

describe('simulace hádání', () => {
  it('při přesných odpovědích uhodne každé zvíře na první tip', () => {
    expect(omylyNaPrvniTip(databaze, presnyHrac, 3)).toEqual([]);
  });

  it('i při váhání u nejasných vlastností skoro vždy trefí na první tip', () => {
    const omyly = omylyNaPrvniTip(databaze, vahavyHrac, 5);
    console.log('váhavý hráč, omyly:', omyly);
    expect(omyly.length).toBeLessThanOrEqual(databaze.zvirata.length * 5 * 0.02);
  });

  it('pečlivý hráč (bez omylů, občas nevím)', () => {
    const r = simuluj(databaze, { nevim: 0.05, omyl: 0 }, 5);
    console.log('pečlivý hráč', r);
    expect(r.uspesnost).toBeGreaterThan(0.97);
    expect(r.naPrvni).toBeGreaterThan(0.97);
    // když je zvíře jasné, nezdržuje se potvrzujícími otázkami
    expect(r.prumerOtazek).toBeLessThan(12);
    expect(r.rozporneTipy).toBe(0);
    expect(r.zbytecneOtazky).toBe(0);
  });

  // U jistých otázek (je to pták, má křídla, žije v moři) se děti pletou zhruba třikrát méně.
  it('běžný hráč (5 % omylů, u jistých otázek 1,7 %, 10 % nevím)', () => {
    const r = simuluj(databaze, { nevim: 0.1, omyl: 0.05, omylJiste: 0.017 }, 5);
    console.log('běžný hráč', r);
    expect(r.uspesnost).toBeGreaterThan(0.98);
    expect(r.naPrvni).toBeGreaterThan(0.88);
    expect(r.prumerOtazek).toBeLessThan(14.5);
    expect(r.rozporneTipy).toBe(0);
    expect(r.zbytecneOtazky).toBe(0);
  });

  it('nepozorný hráč (10 % omylů, u jistých otázek 3,3 %, 15 % nevím)', () => {
    const r = simuluj(databaze, { nevim: 0.15, omyl: 0.1, omylJiste: 0.033 }, 5);
    console.log('nepozorný hráč', r);
    // u ~250 zvířat častější omyly víc narážejí na limit otázek a tipů
    expect(r.uspesnost).toBeGreaterThan(0.91);
    expect(r.naPrvni).toBeGreaterThan(0.7);
    expect(r.rozporneTipy).toBe(0);
    expect(r.zbytecneOtazky).toBe(0);
  });

  it('hráč, který se plete stejně často i u jistých otázek (5 %): pořád skoro vždy uhodne', () => {
    // jistá odpověď váží víc, takže omyl v ní se napravuje pomaleji; to je cena za to,
    // že hra po "je to obojživelník" neodběhne k ještěrkám
    const r = simuluj(databaze, { nevim: 0.1, omyl: 0.05 }, 3);
    console.log('omyly i u jistých otázek', r);
    expect(r.uspesnost).toBeGreaterThan(0.95);
    expect(r.naPrvni).toBeGreaterThan(0.8);
    expect(r.rozporneTipy).toBe(0);
    expect(r.zbytecneOtazky).toBe(0);
  });

  it('jeden omyl u jasné vlastnosti: zvíře stejně uhodne a mezitím netipuje nesmysly', () => {
    let uhodl = 0, naPrvni = 0, her = 0;
    const rozporne: string[] = [];
    databaze.zvirata.forEach((z, cil) => {
      for (let i = 0; i < 4; i++) {
        const v = odehraj(databaze, cil, hracSJednimOmylem(), {}, mulberry32(77 * cil + i));
        her++;
        if (v.uhodl) uhodl++;
        if (v.uhodl && v.tipu === 1) naPrvni++;
        rozporne.push(...v.rozporneTipy.map((t) => `${z.jmeno} ← ${t}`));
      }
    });
    console.log('jeden omyl', { uspesnost: uhodl / her, naPrvni: naPrvni / her });
    expect(rozporne).toEqual([]);
    expect(uhodl / her).toBeGreaterThan(0.99);
    // potvrzující otázky by omyl častěji odhalily (0,93), ale hra by byla o otázku delší
    expect(naPrvni / her).toBeGreaterThan(0.86);
  });

  it('zvíře, které postavička nezná: tipuje jen zvířata, která sedí na odpovědi', () => {
    // každé zvíře zkusíme "schovat" a hrát, jako by ho databáze neměla
    const rozporne: string[] = [];
    const zbytecne: string[] = [];
    databaze.zvirata.forEach((z, i) => {
      const bez = { ...databaze, zvirata: databaze.zvirata.filter((_, j) => j !== i) };
      const v = odehraj(bez, -1, presnyHrac, {}, mulberry32(i), z.a);
      rozporne.push(...v.rozporneTipy.map((t) => `${z.jmeno} ← ${t}`));
      zbytecne.push(...v.zbytecneOtazky.map((q) => `${z.jmeno}: ${q}`));
    });
    expect(rozporne).toEqual([]);
    expect(zbytecne).toEqual([]);
  });
});
