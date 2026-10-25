// A character's performance during the game: what it says and with what emotion, depending on how the game develops.
// Independent of React, so it can be tested.
import type { Answer } from '../game/engine';
import type { InsultKind } from '../speech/listening';
import type { Mood } from './emotions';
import type { Lines } from './lines';

export interface Utterance {
  text: string;
  mood: Mood;
}

/** Shuffled remainders of each list of sentences. Items are taken until they run out, then it is reshuffled. */
const decks = new WeakMap<readonly unknown[], unknown[]>();
const last = new WeakMap<readonly unknown[], unknown>();

/**
 * A random item without repeats: goes through all of them before repeating one,
 * and never takes the same one twice in a row.
 */
export function pickRandom<T>(array: readonly T[], rng: () => number = Math.random): T {
  if (array.length <= 1) return array[0];
  let remaining = decks.get(array) as T[] | undefined;
  if (!remaining || remaining.length === 0) {
    remaining = [...array];
    for (let i = remaining.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [remaining[i], remaining[j]] = [remaining[j], remaining[i]];
    }
    // a new deck must not start with what the old one ended with
    if (remaining[remaining.length - 1] === last.get(array)) [remaining[0], remaining[remaining.length - 1]] = [remaining[remaining.length - 1], remaining[0]];
    decks.set(array, remaining);
  }
  const x = remaining.pop() as T;
  last.set(array, x);
  return x;
}

/** How it looks during an ordinary reaction to an answer. */
const MOOD_FOR_ANSWER: Record<Answer, Mood> = {
  yes: 'curiosity',
  no: 'calm',
  unknown: 'calm',
  maybe: 'thinking',
};

/** From what confidence it has a favorite and gives it away. */
export const CONFIDENCE_HUNCH = 0.3;
/** From what confidence it is tense that it is already close. */
export const CONFIDENCE_CLOSE = 0.65;
/** After how many questions it comments that the game is dragging on. */
const LONG_GAME_QUESTIONS = [12, 20, 26];
/** A guess with lower confidence is a blind guess. */
const CONFIDENCE_BLIND = 0.5;

export interface AfterAnswer {
  answer: Answer;
  /** number of questions including the one just answered */
  questionCount: number;
  /** how strongly it expected the answer yes (0–1) */
  expectedYes: number;
  /** the favorite's confidence before and after the answer */
  confidenceBefore: number;
  confidenceAfter: number;
}

export class Dialogue {
  private hunch = false;
  /** how many questions since the last mention that it is close */
  private sinceClose = Infinity;
  private wrongCount = 0;
  private insultCount = 0;

  constructor(
    readonly lines: Lines,
    private rng: () => number = Math.random,
  ) {}

  private pick(list: string[], mood: Mood): Utterance {
    return { text: pickRandom(list, this.rng), mood };
  }

  intro(): Utterance {
    return this.pick(this.lines.intro, 'joy');
  }

  start(): Utterance {
    return this.pick(this.lines.start, 'curiosity');
  }

  /** What it says after an answer, before asking the next question. Can be nothing. */
  afterAnswer(k: AfterAnswer): Utterance[] {
    const h = this.lines;
    this.sinceClose++;

    // an unexpected answer (yes to something almost no remaining animal has, and vice versa)
    const unexpected =
      k.questionCount > 2 && ((k.answer === 'yes' && k.expectedYes < 0.15) || (k.answer === 'no' && k.expectedYes > 0.85));
    if (unexpected) return [this.pick(h.surprise, 'surprise')];

    if (!this.hunch && k.confidenceAfter >= CONFIDENCE_HUNCH) {
      this.hunch = true;
      return [this.pick(h.hunch, 'curiosity')];
    }

    if (k.confidenceAfter >= CONFIDENCE_CLOSE && this.sinceClose >= 3) {
      this.sinceClose = 0;
      return [this.pick(h.close, 'tension')];
    }

    if (k.confidenceAfter - k.confidenceBefore >= 0.25 && k.confidenceAfter >= 0.2) return [this.pick(h.progress, 'joy')];

    if (LONG_GAME_QUESTIONS.includes(k.questionCount)) return [this.pick(h.dragsOn, 'thinking')];

    // usually it reacts briefly, but not every time, so it does not sound rehearsed
    const utterances: Utterance[] = [];
    const roll = this.rng();
    if (roll < 0.75) utterances.push(this.pick(h.reaction[k.answer], MOOD_FOR_ANSWER[k.answer]));
    if (roll > 0.6 && roll < 0.85) utterances.push(this.pick(h.transition, 'calm'));
    return utterances;
  }

  /** How it looks when asking a question. */
  questionMood(confidence: number): Mood {
    return confidence >= CONFIDENCE_CLOSE ? 'tension' : 'calm';
  }

  guess(animal: string, confidence: number, questionCount: number): Utterance {
    const h = this.lines;
    const list = confidence >= 0.97 && this.wrongCount === 0 ? h.confidentGuess : confidence < CONFIDENCE_BLIND && questionCount > 10 ? h.unsureGuess : h.guess;
    const { text } = this.pick(list, 'guessing');
    return { text: text.replace('{z}', animal.toLowerCase()), mood: 'guessing' };
  }

  win(questionCount: number): Utterance {
    const h = this.lines;
    const list = this.wrongCount === 0 && questionCount <= 8 ? h.quickWin : this.wrongCount > 0 || questionCount >= 20 ? h.hardWin : h.win;
    return this.pick(list, 'celebration');
  }

  again(): Utterance {
    return this.pick(this.lines.again, 'joy');
  }

  /** A wrong guess: the first one catches it off guard, after that it is disappointed. */
  wrong(): Utterance {
    this.wrongCount++;
    return this.wrongCount === 1 ? this.pick(this.lines.wrong, 'surprise') : this.pick(this.lines.wrongAgain, 'disappointment');
  }

  giveUp(): Utterance {
    return this.pick(this.lines.giveUp, 'sadness');
  }

  /**
   * The player insults the character. It reacts humorously and without insulting back, every sentence
   * has its own emotion. From the third insult in a game it takes it with perspective.
   */
  insult(kind: InsultKind): Utterance {
    this.insultCount++;
    if (this.insultCount >= 3 && this.insultCount % 2 === 1) return this.pick(this.lines.insultAgain, 'curiosity');
    return pickRandom(this.lines.insult[kind], this.rng);
  }

  dontUnderstand(): Utterance {
    return this.pick(this.lines.dontUnderstand, 'curiosity');
  }
}
