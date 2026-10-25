import { describe, expect, it } from 'vitest';
import db from '../data/animals.json';
import { implications, type Database } from './engine';

const database = db as unknown as Database;
/** By how much a rule in the data may be "loosened": a child confuses a dolphin with a fish, a spider with an insect. */
const TOLERANCE = 0.25;

describe('animal database', () => {
  const rules = implications(database);

  it('rules only mention existing questions', () => {
    for (const { when, then } of rules) {
      expect(database.questions).toHaveProperty(when[0]);
      expect(database.questions).toHaveProperty(then[0]);
    }
  });

  it('animals follow the rules (a bird has feathers, a fish fins, a mammal does not lay eggs…)', () => {
    const violations: string[] = [];
    for (const z of database.animals) {
      const value = ([id, holds]: [string, boolean]) => (holds ? (z.traits[id] ?? 0) : 1 - (z.traits[id] ?? 0));
      for (const { when, then } of rules) {
        if (value(then) < value(when) - TOLERANCE) {
          violations.push(`${z.name}: ${when[1] ? '' : '!'}${when[0]}=${z.traits[when[0]] ?? 0} -> ${then[1] ? '' : '!'}${then[0]}=${z.traits[then[0]] ?? 0}`);
        }
      }
    }
    expect(violations).toEqual([]);
  });

  it('values are probabilities from 0 to 1 and the questions exist', () => {
    for (const z of database.animals) {
      for (const [id, p] of Object.entries(z.traits)) {
        expect(database.questions, `${z.name}: ${id}`).toHaveProperty(id);
        expect(p).toBeGreaterThanOrEqual(0);
        expect(p).toBeLessThanOrEqual(1);
      }
    }
  });

  it('animal names are unique', () => {
    const names = database.animals.map((z) => z.name);
    expect(new Set(names).size).toBe(names.length);
  });

  // These pairs are so similar that only one clear trait reliably tells them apart
  // (a brown rat swims, a chimpanzee is smaller than a human, a mosquito sucks blood); the rest is done by less certain ones.
  const SIMILAR = ['Myš × Potkan', 'Šimpanz × Gorila', 'Moucha × Komár', 'Sova × Výr', 'Žába × Skokan', 'Včela × Čmelák'];

  it('any two animals differ in at least two clear traits, so that a single mistake does not confuse them', () => {
    // clear difference = for one the trait almost surely holds, for the other almost surely not
    const few: string[] = [];
    const animalList = database.animals;
    for (let i = 0; i < animalList.length; i++) {
      for (let j = i + 1; j < animalList.length; j++) {
        let differences = 0;
        for (const id of Object.keys(database.questions)) {
          const a = animalList[i].traits[id] ?? 0;
          const b = animalList[j].traits[id] ?? 0;
          if ((a >= 0.8 && b <= 0.2) || (a <= 0.2 && b >= 0.8)) differences++;
        }
        const pair = `${animalList[i].name} × ${animalList[j].name}`;
        if (differences < (SIMILAR.includes(pair) ? 1 : 2)) few.push(`${pair}: ${differences}`);
      }
    }
    expect(few).toEqual([]);
  });
});
