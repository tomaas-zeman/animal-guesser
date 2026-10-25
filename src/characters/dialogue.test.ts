import { describe, expect, it } from 'vitest';
import { pauseAfter, splitIntoSentences } from '../speech/speaking';
import { EXPRESSIONS } from './emotions';
import { BANANA, FOX, VOJTACHU, type Lines } from './lines';
import { CONFIDENCE_CLOSE, CONFIDENCE_HUNCH, Dialogue, pickRandom, type AfterAnswer } from './dialogue';

const ALL: [string, Lines][] = [
  ['liška', FOX],
  ['banán', BANANA],
  ['Vojtaču', VOJTACHU],
];

const ordinary: AfterAnswer = { answer: 'yes', questionCount: 5, expectedYes: 0.5, confidenceBefore: 0.05, confidenceAfter: 0.06 };

describe('lines', () => {
  it.each(ALL)('%s has several sentences for every situation', (_, h) => {
    for (const [key, list] of Object.entries(h)) {
      const lists = Array.isArray(list) ? [list] : Object.values(list as Record<string, string[]>);
      for (const s of lists) expect(s.length, key).toBeGreaterThanOrEqual(2);
    }
  });

  it.each(ALL)('%s has guesses with an animal name, not at the start of a sentence', (_, h) => {
    for (const t of [...h.guess, ...h.confidentGuess, ...h.unsureGuess]) {
      expect(t).toContain('{z}');
      expect(t.startsWith('{z}')).toBe(false);
      expect(t).not.toMatch(/[.!?]\s+\{z\}/);
    }
  });
});

describe('picking without repeats', () => {
  it('never says the same sentence twice in a row and cycles through all of them', () => {
    const list = ['a', 'b', 'c', 'd'];
    let previous = '';
    const seen = new Set<string>();
    for (let i = 0; i < 400; i++) {
      const x = pickRandom(list);
      expect(x).not.toBe(previous);
      previous = x;
      if (i < 4) seen.add(x);
    }
    expect(seen.size).toBe(4);
  });
});

describe('dialogue by situation', () => {
  it('comments on an unexpected answer with surprise', () => {
    const p = new Dialogue(FOX);
    const [r] = p.afterAnswer({ ...ordinary, expectedYes: 0.05 });
    expect(r.mood).toBe('surprise');
    expect(FOX.surprise).toContain(r.text);
  });

  it('gives away a hunch only once per game', () => {
    const p = new Dialogue(VOJTACHU, () => 0.99);
    const k = { ...ordinary, confidenceBefore: CONFIDENCE_HUNCH, confidenceAfter: CONFIDENCE_HUNCH + 0.05 };
    expect(VOJTACHU.hunch).toContain(p.afterAnswer(k)[0].text);
    expect(p.afterAnswer(k).some((r) => VOJTACHU.hunch.includes(r.text))).toBe(false);
  });

  it('is tense when close to the goal and mentions it only occasionally', () => {
    const p = new Dialogue(BANANA, () => 0.99);
    p.afterAnswer({ ...ordinary, confidenceAfter: CONFIDENCE_HUNCH }); // hunch
    const k = { ...ordinary, confidenceBefore: CONFIDENCE_CLOSE, confidenceAfter: CONFIDENCE_CLOSE + 0.05 };
    expect(p.afterAnswer(k)[0].mood).toBe('tension');
    expect(p.afterAnswer(k).some((r) => r.mood === 'tension')).toBe(false);
    expect(p.questionMood(0.8)).toBe('tension');
  });

  it('the first mistake catches it off guard, the next one disappoints it', () => {
    const p = new Dialogue(FOX);
    expect(p.wrong().mood).toBe('surprise');
    const kinds = p.wrong();
    expect(kinds.mood).toBe('disappointment');
    expect(FOX.wrongAgain).toContain(kinds.text);
  });

  it('a win depends on how the game went', () => {
    expect(FOX.quickWin).toContain(new Dialogue(FOX).win(5).text);
    expect(FOX.win).toContain(new Dialogue(FOX).win(12).text);
    const afterWrong = new Dialogue(FOX);
    afterWrong.wrong();
    expect(FOX.hardWin).toContain(afterWrong.win(12).text);
    expect(new Dialogue(FOX).win(5).mood).toBe('celebration');
  });

  it('a guess fills in the animal name in lowercase', () => {
    const r = new Dialogue(VOJTACHU).guess('Lední medvěd', 0.99, 10);
    expect(r.text).toContain('lední medvěd');
    expect(r.mood).toBe('guessing');
  });

  it('losing is sad', () => {
    expect(new Dialogue(BANANA).giveUp().mood).toBe('sadness');
  });
});

describe('reactions to insults', () => {
  const KINDS = ['stupidity', 'deafness', 'rudeness'] as const;
  // rude words the character must not say even when pushing back
  const VULGAR = /\b(vole|vůl|debil|idiot|kurv|hovn|prdel|hajzl|hub[auo]|držk|kreten)/i;

  it.each(ALL)('%s has several kind reactions with an emotion for every insult', (_, h) => {
    for (const kind of KINDS) {
      expect(h.insult[kind].length).toBeGreaterThanOrEqual(3);
      for (const r of h.insult[kind]) {
        expect(EXPRESSIONS[r.mood], r.text).toBeDefined();
        expect(r.text).not.toMatch(VULGAR);
      }
    }
    for (const t of h.insultAgain) expect(t).not.toMatch(VULGAR);
  });

  it.each(ALL)('%s looks different ways: feigning offense and with humor', (_, h) => {
    const moods = new Set(KINDS.flatMap((d) => h.insult[d].map((r) => r.mood)));
    expect(moods.has('offended')).toBe(true);
    expect(moods.size).toBeGreaterThanOrEqual(3);
  });

  it('never gives the same reaction twice in a row', () => {
    const p = new Dialogue(BANANA);
    let previous = '';
    for (let i = 0; i < 40; i++) {
      const r = p.insult('stupidity');
      expect(r.text).not.toBe(previous);
      previous = r.text;
    }
  });

  it('reacts to what the player calls it and then takes it with perspective', () => {
    const p = new Dialogue(VOJTACHU);
    expect(VOJTACHU.insult.deafness.map((r) => r.text)).toContain(p.insult('deafness').text);
    expect(VOJTACHU.insult.rudeness.map((r) => r.text)).toContain(p.insult('rudeness').text);
    expect(VOJTACHU.insultAgain).toContain(p.insult('stupidity').text);
    expect(VOJTACHU.insult.stupidity.map((r) => r.text)).toContain(p.insult('stupidity').text);
  });
});

describe('voice and speech rhythm', () => {
  it('splits text into sentences', () => {
    expect(splitIntoSentences('Hú hú! Je to sova? Asi… možná.')).toEqual(['Hú hú!', 'Je to sova?', 'Asi…', 'možná.']);
    expect(pauseAfter('Asi…')).toBeGreaterThan(pauseAfter('Dobře.'));
  });

  it('sadness sounds lower and slower, joy higher and faster', () => {
    expect(EXPRESSIONS.sadness.voice.pitch).toBeLessThan(1);
    expect(EXPRESSIONS.sadness.voice.rate).toBeLessThan(1);
    expect(EXPRESSIONS.celebration.voice.pitch).toBeGreaterThan(1);
    expect(EXPRESSIONS.celebration.voice.rate).toBeGreaterThan(1);
    for (const v of Object.values(EXPRESSIONS)) {
      expect(Math.abs(v.voice.pitch - 1)).toBeLessThanOrEqual(0.15);
      expect(Math.abs(v.voice.rate - 1)).toBeLessThanOrEqual(0.15);
    }
  });
});
