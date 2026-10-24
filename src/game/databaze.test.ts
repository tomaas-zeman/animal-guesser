import { describe, expect, it } from 'vitest';
import db from '../data/zvirata.json';
import { implikace, type Databaze } from './engine';

const databaze = db as unknown as Databaze;
/** O kolik smí pravidlo v datech "povolit": dítě si delfína splete s rybou, pavouka s hmyzem. */
const TOLERANCE = 0.25;

describe('databáze zvířat', () => {
  const pravidla = implikace(databaze);

  it('pravidla mluví jen o existujících otázkách', () => {
    for (const { kdyz, pak } of pravidla) {
      expect(databaze.otazky).toHaveProperty(kdyz[0]);
      expect(databaze.otazky).toHaveProperty(pak[0]);
    }
  });

  it('zvířata dodržují pravidla (pták má peří, ryba ploutve, savec neklade vejce…)', () => {
    const poruseni: string[] = [];
    for (const z of databaze.zvirata) {
      const hodnota = ([id, plati]: [string, boolean]) => (plati ? (z.a[id] ?? 0) : 1 - (z.a[id] ?? 0));
      for (const { kdyz, pak } of pravidla) {
        if (hodnota(pak) < hodnota(kdyz) - TOLERANCE) {
          poruseni.push(`${z.jmeno}: ${kdyz[1] ? '' : '!'}${kdyz[0]}=${z.a[kdyz[0]] ?? 0} -> ${pak[1] ? '' : '!'}${pak[0]}=${z.a[pak[0]] ?? 0}`);
        }
      }
    }
    expect(poruseni).toEqual([]);
  });

  it('hodnoty jsou pravděpodobnosti 0 až 1 a otázky existují', () => {
    for (const z of databaze.zvirata) {
      for (const [id, p] of Object.entries(z.a)) {
        expect(databaze.otazky, `${z.jmeno}: ${id}`).toHaveProperty(id);
        expect(p).toBeGreaterThanOrEqual(0);
        expect(p).toBeLessThanOrEqual(1);
      }
    }
  });

  it('jména zvířat se neopakují', () => {
    const jmena = databaze.zvirata.map((z) => z.jmeno);
    expect(new Set(jmena).size).toBe(jmena.length);
  });

  // Tyhle dvojice si jsou tak podobné, že je spolehlivě rozliší jen jedna jasná vlastnost
  // (potkan plave, šimpanz je menší než člověk, komár saje krev); zbytek dělají méně jisté.
  const PODOBNE = ['Myš × Potkan', 'Šimpanz × Gorila', 'Moucha × Komár'];

  it('každá dvě zvířata se liší aspoň ve dvou jasných vlastnostech, aby je nespletl jeden omyl', () => {
    // jasný rozdíl = u jednoho vlastnost skoro jistě platí, u druhého skoro jistě ne
    const malo: string[] = [];
    const zv = databaze.zvirata;
    for (let i = 0; i < zv.length; i++) {
      for (let j = i + 1; j < zv.length; j++) {
        let rozdilu = 0;
        for (const id of Object.keys(databaze.otazky)) {
          const a = zv[i].a[id] ?? 0;
          const b = zv[j].a[id] ?? 0;
          if ((a >= 0.8 && b <= 0.2) || (a <= 0.2 && b >= 0.8)) rozdilu++;
        }
        const dvojice = `${zv[i].jmeno} × ${zv[j].jmeno}`;
        if (rozdilu < (PODOBNE.includes(dvojice) ? 1 : 2)) malo.push(`${dvojice}: ${rozdilu}`);
      }
    }
    expect(malo).toEqual([]);
  });
});
