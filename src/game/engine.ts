// Guessing logic. Independent of React and 3D, so it can be tested by simulation.
//
// Principle: every animal has a probability of being the one (equal at the start).
// After each answer the probabilities are recomputed with Bayes' rule.
// The next question is the one after which we expect the least remaining uncertainty (entropy),
// i.e. the largest information gain. One wrong answer therefore does not eliminate an animal,
// it only pushes it back.
//
// Two extra safeguards so that the guessing feels logical:
// - Rules (a bird has feathers, a bird is not a mammal…) derive what already follows from the answers,
//   and the character does not ask about it again.
// - An animal that clearly contradicts some answer (the player said "not nocturnal" and an owl is
//   always nocturnal) is not guessed while animals without a contradiction are still in play.

export type Answer = 'yes' | 'no' | 'unknown' | 'maybe';

export interface Animal {
  name: string;
  emoji: string;
  /** trait id -> probability of the answer "yes"; missing = 0 */
  traits: Record<string, number>;
}

export interface Database {
  questions: Record<string, string>;
  animals: Animal[];
  /** "a -> b", "a -> !b", "!a -> b"…: when the left side holds, so does the right (and, conversely, the opposite of the left follows from the opposite of the right) */
  rules?: string[];
  /** groups of traits of which at most one holds (mammal, bird, fish…) */
  exclusive?: string[][];
  /**
   * Questions with a certain answer (it is a bird, has wings, lives in the sea…). A contradiction with them weighs more
   * than with uncertain ones (is brown, can jump), so an animal that only fails on color
   * is preferred over an animal from a completely different group.
   */
  certain?: string[];
}

/** A trait with a value: [id, holds?] */
type Fact = [string, boolean];

export interface Implication {
  when: Fact;
  then: Fact;
}

function fact(text: string): Fact {
  const t = text.trim();
  return t.startsWith('!') ? [t.slice(1).trim(), false] : [t, true];
}

/** Expands the database rules into implications including their contrapositives ("a -> b" also implies "!b -> !a"). */
export function implications(db: Database): Implication[] {
  const result: Implication[] = [];
  const add = (when: Fact, then: Fact) => {
    result.push({ when, then }, { when: [then[0], !then[1]], then: [when[0], !when[1]] });
  };
  for (const rule of db.rules ?? []) {
    const [l, p] = rule.split('->');
    if (p === undefined) throw new Error(`invalid rule: ${rule}`);
    add(fact(l), fact(p));
  }
  for (const group of db.exclusive ?? []) {
    for (const a of group) for (const b of group) if (a < b) add([a, true], [b, false]);
  }
  return result;
}

/** Does an animal with probability p clearly answer the opposite of what the player said? */
export function isContradiction(p: number, answer: Answer): boolean {
  return (answer === 'yes' && p <= 0.1) || (answer === 'no' && p >= 0.9);
}

export type Move =
  | { type: 'question'; id: string; text: string }
  | { type: 'guess'; index: number; animal: Animal; confidence: number }
  | { type: 'giveUp' };

export interface Settings {
  /** how often a person errs even on a clear trait */
  mistakeRate: number;
  /** how often they err on a certain question (bird, wings…) */
  certainMistakeRate: number;
  /** how many uncertain contradictions (color, jumping) one contradiction with a certain question weighs */
  certainWeight: number;
  /** from what confidence the character guesses */
  guessConfidence: number;
  /** after how many questions it guesses even with lower confidence */
  patience: number;
  /** from what confidence it guesses when no question can change the guess anymore */
  confidenceWithoutQuestion: number;
  /** by how much a question must raise the chance of a correct guess to be worth asking */
  questionGain: number;
  /** at most this many questions overall */
  maxQuestions: number;
  /** after how many wrong guesses it gives up */
  maxGuesses: number;
  /** randomness of question choice (0 = always the best one) */
  variety: number;
}

export const defaultSettings: Settings = {
  mistakeRate: 0.06,
  certainMistakeRate: 0.03,
  certainWeight: 3,
  guessConfidence: 0.9,
  patience: 18,
  confidenceWithoutQuestion: 0.8,
  questionGain: 0.02,
  maxQuestions: 30,
  maxGuesses: 4,
  variety: 0.03,
};

/** Probability of the given answer when the trait is true for the animal with probability p. */
export function likelihood(p: number, answer: Answer, mistakeRate: number): number {
  const yes = mistakeRate + (1 - 2 * mistakeRate) * p;
  switch (answer) {
    case 'yes':
      return yes;
    case 'no':
      return 1 - yes;
    // "maybe" is a weak yes: it shifts things but eliminates nobody
    case 'maybe':
      return 0.25 + 0.5 * yes;
    case 'unknown':
      return 1;
  }
}

function entropy(w: number[]): number {
  let sum = 0;
  for (const x of w) sum += x;
  if (sum <= 0) return 0;
  let h = 0;
  for (const x of w) if (x > 0) h -= (x / sum) * Math.log2(x / sum);
  return h;
}

export class Game {
  readonly db: Database;
  readonly settings: Settings;
  private rng: () => number;
  /** probabilities of the animals (normalized, eliminated ones are 0) */
  prob: number[];
  /** for how many answers the animal clearly does not fit; a contradiction with a certain question weighs `certainWeight` */
  contradictions: number[];
  /** for how many certain answers the animal does not fit */
  certainContradictions: number[];
  asked = new Set<string>();
  /** what already follows from the answers (directly or by the rules) */
  known = new Map<string, boolean>();
  history: { id: string; answer: Answer }[] = [];
  wrongGuesses: number[] = [];
  private rules: Implication[];
  private certain: Set<string>;

  constructor(db: Database, settings: Partial<Settings> = {}, rng: () => number = Math.random) {
    this.db = db;
    this.settings = { ...defaultSettings, ...settings };
    this.rng = rng;
    this.prob = db.animals.map(() => 1 / db.animals.length);
    this.contradictions = db.animals.map(() => 0);
    this.certainContradictions = db.animals.map(() => 0);
    this.rules = implications(db);
    this.certain = new Set(db.certain ?? []);
  }

  private questionMistakeRate(id: string): number {
    return this.certain.has(id) ? this.settings.certainMistakeRate : this.settings.mistakeRate;
  }

  get questionCount(): number {
    return this.history.length;
  }

  /** Animals ranked from the most probable. */
  ranking(): { index: number; prob: number }[] {
    return this.prob
      .map((prob, index) => ({ index, prob }))
      .filter((x) => x.prob > 0)
      .sort((a, b) => b.prob - a.prob);
  }

  /** How much the character expects the answer to a question to be yes (0–1), given which animals are still in play. */
  expectedYes(id: string): number {
    let sum = 0;
    this.prob.forEach((p, i) => (sum += p * (this.db.animals[i].traits[id] ?? 0)));
    return sum;
  }

  answer(id: string, answer: Answer): void {
    this.asked.add(id);
    this.history.push({ id, answer });
    const mistakeRate = this.questionMistakeRate(id);
    const certain = this.certain.has(id);
    const weight = certain ? this.settings.certainWeight : 1;
    this.prob = this.prob.map((p, i) => p * likelihood(this.db.animals[i].traits[id] ?? 0, answer, mistakeRate));
    this.db.animals.forEach((z, i) => {
      if (!isContradiction(z.traits[id] ?? 0, answer)) return;
      this.contradictions[i] += weight;
      if (certain) this.certainContradictions[i]++;
    });
    this.normalize();
    if (answer === 'yes' || answer === 'no') this.derive(id, answer === 'yes');
  }

  /** Records a fact and everything that follows from it by the rules. The first finding wins. */
  private derive(id: string, holds: boolean): void {
    if (this.known.has(id)) return;
    this.known.set(id, holds);
    const queue: Fact[] = [[id, holds]];
    while (queue.length) {
      const [a, va] = queue.pop()!;
      for (const { when, then } of this.rules) {
        if (when[0] !== a || when[1] !== va || this.known.has(then[0])) continue;
        this.known.set(then[0], then[1]);
        queue.push(then);
      }
    }
  }

  /** Outcome of a guess. On a mistake the animal is eliminated and the game goes on. */
  resolveGuess(index: number, correct: boolean): void {
    if (correct) return;
    this.wrongGuesses.push(index);
    this.prob[index] = 0;
    this.normalize();
  }

  nextMove(): Move {
    const n = this.settings;
    const ranking = this.ranking();
    if (ranking.length === 0 || this.wrongGuesses.length >= n.maxGuesses) return { type: 'giveUp' };

    const makeGuess = (x: { index: number; prob: number }): Move => ({ type: 'guess', index: x.index, animal: this.db.animals[x.index], confidence: x.prob });
    const best = ranking[0];

    // The favorite contradicts some answer, but there are animals without a contradiction (or with a smaller one):
    // those must be ruled out before the character guesses it.
    const minContradictions = Math.min(...ranking.map((x) => this.contradictions[x.index]));
    const consistent = ranking.filter((x) => this.contradictions[x.index] === minContradictions);
    if (this.contradictions[best.index] > minContradictions) {
      const question = this.questionCount < n.maxQuestions ? this.pickQuestion(this.focus(best.index, consistent)) : null;
      if (question) return { type: 'question', id: question, text: this.db.questions[question] };
      return makeGuess(consistent[0]);
    }

    const guess = makeGuess(best);
    const second = ranking[1]?.prob ?? 0;

    if (best.prob >= n.guessConfidence) return guess;
    if (this.questionCount >= n.maxQuestions) return guess;
    // after longer questioning it is enough if the favorite clearly leads
    if (this.questionCount >= n.patience && best.prob >= 0.5 && best.prob >= 3 * second) return guess;

    // the favorite is almost certain and no question's answer would (hardly) change the guess:
    // another question would only confirm what is already clear
    if (best.prob >= n.confidenceWithoutQuestion && this.bestQuestionGain() < n.questionGain) return guess;

    const question = this.pickQuestion();
    if (!question) return guess;
    return { type: 'question', id: question, text: this.db.questions[question] };
  }

  /**
   * By how much a single question can at most raise the chance that the guess after it is correct.
   * Right now the character would guess the favorite (chance = its probability). After an answer it guesses
   * the most probable animal; if that is the favorite again for both answers, the question brings nothing.
   */
  bestQuestionGain(): number {
    const plausible = this.plausible();
    const best = Math.max(...this.prob);
    let max = 0;
    for (const id of Object.keys(this.db.questions)) {
      if (!this.canAsk(id, plausible)) continue;
      const mistakeRate = this.questionMistakeRate(id);
      let yes = 0;
      let no = 0;
      this.prob.forEach((p, i) => {
        if (p === 0) return;
        const v = this.db.animals[i].traits[id] ?? 0;
        yes = Math.max(yes, p * likelihood(v, 'yes', mistakeRate));
        no = Math.max(no, p * likelihood(v, 'no', mistakeRate));
      });
      max = Math.max(max, yes + no - best);
    }
    return max;
  }

  /**
   * Weights for a question that decides between the favorite and the animals without a contradiction:
   * the favorite gets half, the animals without a contradiction share the other half by their probabilities.
   */
  private focus(favorite: number, consistent: { index: number; prob: number }[]): number[] {
    const w = this.prob.map(() => 0);
    const sum = consistent.reduce((s, x) => s + x.prob, 0);
    for (const x of consistent) w[x.index] = sum > 0 ? (0.5 * x.prob) / sum : 0.5 / consistent.length;
    w[favorite] = 0.5;
    return w;
  }

  /**
   * Animals that fit the answers (with the fewest contradictions). Whatever all of them answer the same
   * clear way already follows from the answers. When only one fits, it is compared with the animals
   * the character still seriously considers (at least a tenth of the favorite's probability).
   */
  private plausible(): number[] {
    const inPlay = this.prob.map((p, i) => (p > 0 ? i : -1)).filter((i) => i >= 0);
    const min = Math.min(...inPlay.map((i) => this.contradictions[i]));
    const fits = inPlay.filter((i) => this.contradictions[i] === min);
    if (fits.length > 1) return fits;
    const max = Math.max(...this.prob);
    return inPlay.filter((i) => this.prob[i] >= 0.1 * max);
  }

  /** Do all animals have the same clear answer to the question? Then the question is needless. */
  private isClear(id: string, animals: number[]): boolean {
    if (animals.length === 0) return false;
    const v = animals.map((i) => this.db.animals[i].traits[id] ?? 0);
    return v.every((x) => x <= 0.1) || v.every((x) => x >= 0.9);
  }

  /**
   * Can the question still be asked? No, if it was already asked, if the answer follows from the rules
   * (bird → has feathers), or if all the animals that still fit have the same answer
   * (lives in the sea → does not live in the forest, amphibian → has no feathers).
   */
  canAsk(id: string, plausible = this.plausible()): boolean {
    return !this.asked.has(id) && !this.known.has(id) && !this.isClear(id, plausible);
  }

  /** The question with the smallest expected entropy after a yes/no answer. */
  pickQuestion(weights: number[] = this.prob): string | null {
    const { variety } = this.settings;
    const h0 = entropy(weights);
    const candidates: { id: string; gain: number }[] = [];
    const plausible = this.plausible();

    for (const id of Object.keys(this.db.questions)) {
      if (!this.canAsk(id, plausible)) continue;
      const mistakeRate = this.questionMistakeRate(id);
      const wYes: number[] = [];
      const wNo: number[] = [];
      let pYes = 0;
      let pNo = 0;
      weights.forEach((p, i) => {
        if (p === 0) return;
        const v = this.db.animals[i].traits[id] ?? 0;
        const a = p * likelihood(v, 'yes', mistakeRate);
        const no = p * likelihood(v, 'no', mistakeRate);
        wYes.push(a);
        wNo.push(no);
        pYes += a;
        pNo += no;
      });
      const h = pYes * entropy(wYes) + pNo * entropy(wNo);
      candidates.push({ id, gain: h0 - h });
    }

    if (candidates.length === 0) return null;
    candidates.sort((a, b) => b.gain - a.gain);
    const top = candidates[0].gain;
    if (top < 0.01) return null;
    // for variety, a random pick among questions that are almost as good as the best one
    const good = candidates.filter((k) => k.gain >= top * (1 - variety));
    return good[Math.floor(this.rng() * good.length)].id;
  }

  private normalize(): void {
    const sum = this.prob.reduce((s, x) => s + x, 0);
    if (sum > 0) this.prob = this.prob.map((x) => x / sum);
  }
}
