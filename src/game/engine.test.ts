import { describe, expect, it } from 'vitest';
import db from '../data/animals.json';
import { Game, type Database, type Answer } from './engine';
import { mulberry32 } from './simulation';

const database = db as unknown as Database;
const index = (name: string) => database.animals.findIndex((z) => z.name === name);

/** Plays by the given answers, answers the rest by the animal's profile. Returns the questions asked and the guesses. */
function playScripted(profile: string, forced: Record<string, Answer>, seed = 1) {
  const game = new Game(database, {}, mulberry32(seed));
  const a = database.animals[index(profile)].traits;
  const questions: string[] = [];
  const guesses: string[] = [];
  for (let step = 0; step < 60; step++) {
    const move = game.nextMove();
    if (move.type === 'giveUp') break;
    if (move.type === 'guess') {
      guesses.push(move.animal.name);
      if (move.animal.name === profile) break;
      game.resolveGuess(move.index, false);
      continue;
    }
    questions.push(move.id);
    game.answer(move.id, forced[move.id] ?? ((a[move.id] ?? 0) >= 0.5 ? 'yes' : 'no'));
  }
  return { questions, guesses, game };
}

describe('guessing logic', () => {
  it('after "it is a bird" it no longer asks about feathers, wings or whether it is a mammal', () => {
    const game = new Game(database, {}, mulberry32(3));
    game.answer('bird', 'yes');
    for (const id of ['feathers', 'wings', 'two_legs', 'lays_eggs', 'mammal', 'fish', 'fur', 'insect']) expect(game.canAsk(id), id).toBe(false);
    expect(game.canAsk('flies')).toBe(true);
  });

  it('after "it is not a bird" it does not ask whether it has feathers', () => {
    const game = new Game(database, {}, mulberry32(3));
    game.answer('bird', 'no');
    expect(game.canAsk('feathers')).toBe(false);
    expect(game.canAsk('wings')).toBe(true);
  });

  it('"maybe" and "I don\'t know" derive nothing', () => {
    const game = new Game(database, {}, mulberry32(3));
    game.answer('bird', 'maybe');
    game.answer('mammal', 'unknown');
    expect(game.canAsk('feathers')).toBe(true);
    expect(game.canAsk('bird')).toBe(false);
  });

  it('when the player says it is not nocturnal, it does not guess an owl while there are other birds', () => {
    for (const bird of ['Vrabec', 'Kos', 'Vrána', 'Sýkorka', 'Holub', 'Orel', 'Sova']) {
      for (let seed = 1; seed <= 5; seed++) {
        const { guesses, game } = playScripted(bird, { nocturnal: 'no' }, seed);
        if (!game.history.some((h) => h.id === 'nocturnal')) continue;
        expect(game.contradictions[index('Sova')]).toBeGreaterThan(0);
        if (bird === 'Sova') continue;
        expect(guesses).not.toContain('Sova');
        expect(guesses.at(-1)).toBe(bird);
      }
    }
  });

  it('never asks the same thing twice', () => {
    for (let i = 0; i < database.animals.length; i++) {
      const { questions } = playScripted(database.animals[i].name, {}, i);
      expect(new Set(questions).size).toBe(questions.length);
    }
  });
});

describe('what it no longer asks about', () => {
  it('after "lives in the sea" it does not ask whether it lives in the forest, the desert or Czech nature', () => {
    const game = new Game(database, {}, mulberry32(5));
    game.answer('sea', 'yes');
    for (const id of ['forest', 'desert', 'czechia', 'burrow', 'climbs']) expect(game.canAsk(id), id).toBe(false);
  });

  it('after "it is an amphibian" it does not ask about feathers, fur or scales', () => {
    const game = new Game(database, {}, mulberry32(5));
    game.answer('amphibian', 'yes');
    for (const id of ['feathers', 'fur', 'scales', 'wings', 'fins', 'hooves']) expect(game.canAsk(id), id).toBe(false);
  });

  it('for no animal does it ask about anything that already follows from the answers', () => {
    // independent check: animals that fit all answers so far must not all have
    // the same clear answer to the question asked
    const needless: string[] = [];
    database.animals.forEach((z, target) => {
      for (const seed of [1, 2]) {
        const game = new Game(database, {}, mulberry32(seed * 1000 + target));
        for (let step = 0; step < 60; step++) {
          const move = game.nextMove();
          if (move.type !== 'question') break;
          const fits = database.animals.filter((x, i) => game.prob[i] > 0 && game.contradictions[i] === 0);
          const v = fits.map((x) => x.traits[move.id] ?? 0);
          if (fits.length > 1 && (v.every((x) => x <= 0.1) || v.every((x) => x >= 0.9))) needless.push(`${z.name}: ${move.id} [${fits.map((x) => x.name + "=" + (x.traits[move.id] ?? 0)).join(",")}] top: ${game.ranking().slice(0, 4).map((x) => database.animals[x.index].name + ":" + x.prob.toFixed(3) + "=" + (database.animals[x.index].traits[move.id] ?? 0)).join(",")}`);
          game.answer(move.id, (z.traits[move.id] ?? 0) >= 0.5 ? 'yes' : 'no');
        }
      }
    });
    expect(needless).toEqual([]);
  });
});

describe('amphibians and snakes (the game must not run off to another group)', () => {
  const group = (name: string) => database.animals[index(name)].traits;

  // the child answers by the animal, only for the forced questions differently from the database (e.g. "has no spots")
  const cases: [string, Record<string, Answer>, string][] = [
    ['Mlok', { water: 'yes', jumps: 'no', spots: 'no', patterned: 'no', colorful: 'no' }, 'amphibian'],
    ['Mlok', { water: 'yes', jumps: 'no' }, 'amphibian'],
    ['Velemlok', { water: 'yes', jumps: 'no' }, 'amphibian'],
    ['Čolek', { jumps: 'no', forest: 'no' }, 'amphibian'],
    ['Skokan', { green: 'no' }, 'amphibian'],
    ['Kuňka', { quacks: 'no' }, 'amphibian'],
    ['Užovka', { forest: 'no', patterned: 'no' }, 'reptile'],
  ];
  for (const [name, forced, animalClass] of cases) {
    it(`${name} (${Object.keys(forced).join(', ')}): guesses only from ${animalClass} and finally hits`, () => {
      for (let seed = 1; seed <= 4; seed++) {
        const { guesses, game } = playScripted(name, forced, seed);
        expect(guesses.at(-1), guesses.join(', ')).toBe(name);
        // once the player has confirmed the group, guesses from another group make no sense
        if (game.known.get(animalClass) === true) for (const t of guesses) expect(group(t)[animalClass] ?? 0, t).toBeGreaterThan(0.5);
        expect(guesses.length).toBeLessThanOrEqual(3);
      }
    });
  }
});
