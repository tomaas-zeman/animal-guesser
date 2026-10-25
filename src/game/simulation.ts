// Player simulation: for every animal it plays several games where the "player" answers
// according to the database, but sometimes errs, says "I don't know" or "maybe".
import { Game, type Database, type Settings, type Answer } from './engine';

export interface Player {
  unknown: number;
  mistake: number;
  /** how often they err on a certain question (it is a bird, has wings); unset means the same as elsewhere */
  certainMistake?: number;
}

/** A simple deterministic generator so that the simulation always gives the same result. */
export function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function playerAnswer(p: number, player: Player, rng: () => number, certain = false): Answer {
  if (rng() < player.unknown) return 'unknown';
  if (p > 0.25 && p < 0.75 && rng() < 0.4) return 'maybe';
  let yes = rng() < p;
  if (rng() < (certain ? (player.certainMistake ?? player.mistake) : player.mistake)) yes = !yes;
  return yes ? 'yes' : 'no';
}

/** How the player answers a question when the trait holds with probability p. */
export type Responder = (p: number, rng: () => number, certain?: boolean) => Answer;

/** A player who answers exactly by the database (whatever holds at least half the time is "yes"). */
export const exactPlayer: Responder = (p) => (p >= 0.5 ? 'yes' : 'no');

/** Answers exactly on clear traits, and on unclear ones (0.2 to 0.8) flips a coin weighted by p. */
export const hesitantPlayer: Responder = (p, rng) => (p >= 0.8 ? 'yes' : p <= 0.2 ? 'no' : rng() < p ? 'yes' : 'no');

export interface GameResult {
  guessedRight: boolean;
  guesses: number;
  questions: number;
  wrongGuesses: number[];
  /** guesses of animals that contradicted an answer although animals with a smaller contradiction were in play */
  contradictoryGuesses: string[];
  /** questions that were already answered or whose answer followed from the answers */
  needlessQuestions: string[];
}

/**
 * Plays one game. `profile` holds the traits of the animal being thought of; it need not be in the database
 * (the player thinks of an animal the character does not know), then `target` is -1.
 */
export function playGame(
  db: Database,
  target: number,
  responder: Responder,
  settings: Partial<Settings>,
  rng: () => number,
  profile: Record<string, number> = db.animals[target].traits,
): GameResult {
  const game = new Game(db, settings, rng);
  const contradictoryGuesses: string[] = [];
  const needlessQuestions: string[] = [];
  const end = (guessedRight: boolean): GameResult => ({
    guessedRight,
    guesses: game.wrongGuesses.length + (guessedRight ? 1 : 0),
    questions: game.questionCount,
    wrongGuesses: game.wrongGuesses,
    contradictoryGuesses,
    needlessQuestions,
  });
  for (let step = 0; step < 100; step++) {
    const move = game.nextMove();
    if (move.type === 'giveUp') return end(false);
    if (move.type === 'guess') {
      const inPlay = game.ranking().map((x) => game.contradictions[x.index]);
      if (game.contradictions[move.index] > Math.min(...inPlay)) contradictoryGuesses.push(move.animal.name);
      if (move.index === target) return end(true);
      game.resolveGuess(move.index, false);
      continue;
    }
    if (!game.canAsk(move.id)) needlessQuestions.push(move.id);
    game.answer(move.id, responder(profile[move.id] ?? 0, rng, db.certain?.includes(move.id)));
  }
  throw new Error('hra se zacyklila');
}

export function simulate(db: Database, player: Player, games: number, settings: Partial<Settings> = {}) {
  const rng = mulberry32(42);
  let guessedRight = 0, onFirst = 0, questions = 0, guesses = 0, total = 0, contradictory = 0, needless = 0;
  const failures: Record<string, number> = {};
  db.animals.forEach((z, target) => {
    for (let i = 0; i < games; i++) {
      const v = playGame(db, target, (p, r, certain) => playerAnswer(p, player, r, certain), settings, rng);
      total++;
      questions += v.questions;
      guesses += v.guesses;
      contradictory += v.contradictoryGuesses.length;
      needless += v.needlessQuestions.length;
      if (v.guessedRight) guessedRight++;
      if (v.guessedRight && v.guesses === 1) onFirst++;
      if (!v.guessedRight) failures[z.name] = (failures[z.name] ?? 0) + 1;
    }
  });
  const worst = Object.entries(failures).sort((a, b) => b[1] - a[1]).slice(0, 8);
  return {
    successRate: guessedRight / total,
    onFirst: onFirst / total,
    avgQuestions: questions / total,
    /** questions + guesses, i.e. how many times the player has to answer */
    avgMoves: (questions + guesses) / total,
    contradictoryGuesses: contradictory,
    needlessQuestions: needless,
    worst,
  };
}

/** Animals the player with the given answers fails to get on the first guess, along with what the character mistook them for. */
/** A player who answers exactly, but errs on one clear trait (picked at random). */
export function playerWithOneMistake(): Responder {
  let mistakePending = true;
  return (p, rng) => {
    const clear = p >= 0.9 || p <= 0.1;
    if (mistakePending && clear && rng() < 0.25) {
      mistakePending = false;
      return p >= 0.5 ? 'no' : 'yes';
    }
    return exactPlayer(p, rng);
  };
}

export function missesOnFirstGuess(db: Database, responder: Responder, games: number, settings: Partial<Settings> = {}) {
  const misses: string[] = [];
  db.animals.forEach((z, target) => {
    for (let i = 0; i < games; i++) {
      const v = playGame(db, target, responder, settings, mulberry32(1000 * i + target));
      if (!v.guessedRight || v.guesses > 1) misses.push(`${z.name} ← ${v.wrongGuesses.map((j) => db.animals[j].name).join(', ') || 'vzdal se'}`);
    }
  });
  return misses;
}
