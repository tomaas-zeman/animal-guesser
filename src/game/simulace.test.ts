import { describe, expect, it } from 'vitest';
import db from '../data/zvirata.json';
import type { Databaze } from './engine';
import { omylyNaPrvniTip, presnyHrac, simuluj, vahavyHrac } from './simulace';

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
    expect(r.prumerOtazek).toBeLessThan(11);
  });

  it('běžný hráč (5 % omylů, 10 % nevím)', () => {
    const r = simuluj(databaze, { nevim: 0.1, omyl: 0.05 }, 5);
    console.log('běžný hráč', r);
    expect(r.uspesnost).toBeGreaterThan(0.98);
    expect(r.naPrvni).toBeGreaterThan(0.9);
    expect(r.prumerOtazek).toBeLessThan(14);
  });

  it('nepozorný hráč (10 % omylů, 15 % nevím)', () => {
    const r = simuluj(databaze, { nevim: 0.15, omyl: 0.1 }, 5);
    console.log('nepozorný hráč', r);
    expect(r.uspesnost).toBeGreaterThan(0.93);
    expect(r.naPrvni).toBeGreaterThan(0.7);
  });
});
