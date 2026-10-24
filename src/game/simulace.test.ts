import { describe, expect, it } from 'vitest';
import db from '../data/zvirata.json';
import type { Databaze } from './engine';
import { simuluj } from './simulace';

const databaze = db as unknown as Databaze;

describe('simulace hádání', () => {
  it('pečlivý hráč (bez omylů, občas nevím)', () => {
    const r = simuluj(databaze, { nevim: 0.05, omyl: 0 }, 5);
    console.log('pečlivý hráč', r);
    expect(r.uspesnost).toBeGreaterThan(0.97);
    expect(r.naPrvni).toBeGreaterThan(0.85);
    expect(r.prumerOtazek).toBeLessThan(9);
  });

  it('běžný hráč (5 % omylů, 10 % nevím)', () => {
    const r = simuluj(databaze, { nevim: 0.1, omyl: 0.05 }, 5);
    console.log('běžný hráč', r);
    expect(r.uspesnost).toBeGreaterThan(0.95);
    expect(r.prumerOtazek).toBeLessThan(11);
  });

  it('nepozorný hráč (10 % omylů, 15 % nevím)', () => {
    const r = simuluj(databaze, { nevim: 0.15, omyl: 0.1 }, 5);
    console.log('nepozorný hráč', r);
    expect(r.uspesnost).toBeGreaterThan(0.85);
  });
});
