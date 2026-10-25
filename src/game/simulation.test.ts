import { describe, expect, it } from 'vitest';
import db from '../data/animals.json';
import type { Database } from './engine';
import { playerWithOneMistake, mulberry32, playGame, missesOnFirstGuess, exactPlayer, simulate, hesitantPlayer } from './simulation';

const database = db as unknown as Database;

describe('guessing simulation', () => {
  it('with exact answers every animal is guessed on the first guess', () => {
    expect(missesOnFirstGuess(database, exactPlayer, 3)).toEqual([]);
  });

  it('even with hesitation on unclear traits it almost always hits on the first guess', () => {
    const misses = missesOnFirstGuess(database, hesitantPlayer, 5);
    console.log('hesitant player, misses:', misses);
    expect(misses.length).toBeLessThanOrEqual(database.animals.length * 5 * 0.02);
  });

  it('careful player (no mistakes, occasional "I don\'t know")', () => {
    const r = simulate(database, { unknown: 0.05, mistake: 0 }, 5);
    console.log('careful player', r);
    expect(r.successRate).toBeGreaterThan(0.97);
    expect(r.onFirst).toBeGreaterThan(0.97);
    // when the animal is clear, it does not linger on confirming questions
    expect(r.avgQuestions).toBeLessThan(12);
    expect(r.contradictoryGuesses).toBe(0);
    expect(r.needlessQuestions).toBe(0);
  });

  // On certain questions (it is a bird, has wings, lives in the sea) children err roughly three times less.
  it('ordinary player (5% mistakes, 1.7% on certain questions, 10% "I don\'t know")', () => {
    const r = simulate(database, { unknown: 0.1, mistake: 0.05, certainMistake: 0.017 }, 5);
    console.log('ordinary player', r);
    expect(r.successRate).toBeGreaterThan(0.98);
    expect(r.onFirst).toBeGreaterThan(0.88);
    expect(r.avgQuestions).toBeLessThan(14.5);
    expect(r.contradictoryGuesses).toBe(0);
    expect(r.needlessQuestions).toBe(0);
  });

  it('inattentive player (10% mistakes, 3.3% on certain questions, 15% "I don\'t know")', () => {
    const r = simulate(database, { unknown: 0.15, mistake: 0.1, certainMistake: 0.033 }, 5);
    console.log('inattentive player', r);
    // with ~250 animals more frequent mistakes hit the limit of questions and guesses more
    expect(r.successRate).toBeGreaterThan(0.91);
    expect(r.onFirst).toBeGreaterThan(0.7);
    expect(r.contradictoryGuesses).toBe(0);
    expect(r.needlessQuestions).toBe(0);
  });

  it('player who errs equally often on certain questions too (5%): still almost always guesses right', () => {
    // a certain answer weighs more, so a mistake in it is corrected more slowly; that is the price for
    // the game not running off to lizards after "it is an amphibian"
    const r = simulate(database, { unknown: 0.1, mistake: 0.05 }, 3);
    console.log('mistakes on certain questions too', r);
    expect(r.successRate).toBeGreaterThan(0.95);
    expect(r.onFirst).toBeGreaterThan(0.8);
    expect(r.contradictoryGuesses).toBe(0);
    expect(r.needlessQuestions).toBe(0);
  });

  it('one mistake on a clear trait: the animal is still guessed and meanwhile no nonsense is guessed', () => {
    let guessedRight = 0, onFirst = 0, games = 0;
    const contradictory: string[] = [];
    database.animals.forEach((z, target) => {
      for (let i = 0; i < 4; i++) {
        const v = playGame(database, target, playerWithOneMistake(), {}, mulberry32(77 * target + i));
        games++;
        if (v.guessedRight) guessedRight++;
        if (v.guessedRight && v.guesses === 1) onFirst++;
        contradictory.push(...v.contradictoryGuesses.map((t) => `${z.name} ← ${t}`));
      }
    });
    console.log('one mistake', { successRate: guessedRight / games, onFirst: onFirst / games });
    expect(contradictory).toEqual([]);
    expect(guessedRight / games).toBeGreaterThan(0.99);
    // confirming questions would reveal the mistake more often (0.93), but the game would be a question longer
    expect(onFirst / games).toBeGreaterThan(0.86);
  });

  it('an animal the character does not know: it guesses only animals that fit the answers', () => {
    // we try to "hide" each animal and play as if the database did not have it
    const contradictory: string[] = [];
    const needless: string[] = [];
    database.animals.forEach((z, i) => {
      const bez = { ...database, animals: database.animals.filter((_, j) => j !== i) };
      const v = playGame(bez, -1, exactPlayer, {}, mulberry32(i), z.traits);
      contradictory.push(...v.contradictoryGuesses.map((t) => `${z.name} ← ${t}`));
      needless.push(...v.needlessQuestions.map((q) => `${z.name}: ${q}`));
    });
    expect(contradictory).toEqual([]);
    expect(needless).toEqual([]);
  });
});
