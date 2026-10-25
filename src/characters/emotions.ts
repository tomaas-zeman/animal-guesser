// Character emotions: what the face and body look like for each one and how the voice sounds.

export type Mood =
  | 'calm'
  | 'thinking'
  | 'curiosity'
  | 'surprise'
  | 'tension'
  | 'guessing'
  | 'joy'
  | 'celebration'
  | 'disappointment'
  | 'sadness'
  /** feigning offense: nose up, gaze aside, narrowed eyes */
  | 'offended';

/** [lift, rotation of the inner end upward] for the left and right eyebrow */
type Eyebrows = [[number, number], [number, number]];

export interface Expression {
  /** eye openness, 1 = normal, less = squinting with joy */
  eyes: number;
  /** where the pupils look, null = looking around freely */
  gaze: [number, number] | null;
  /** null = eyebrows at rest, bobbing only while speaking */
  eyebrows: Eyebrows | null;
  /** head rotation [nod down, tilt sideways], null = swaying freely */
  head: [number, number] | null;
  /** forward lean of the body */
  lean: number;
  /** slightly open mouth when not speaking */
  mouth: number;
  /** shape of the closed mouth: 1 smile, 0 flat, negative sad */
  smile: number;
  /** bouncing height */
  jump: number;
  /** slight head trembling (nervousness, tension) */
  tremble: number;
  /** how the voice changes: multipliers of pitch and rate */
  voice: { pitch: number; rate: number };
}

export const EXPRESSIONS: Record<Mood, Expression> = {
  calm: { eyes: 1, gaze: null, eyebrows: null, head: null, lean: 0, mouth: 0, smile: 1, jump: 0, tremble: 0, voice: { pitch: 1, rate: 1 } },
  thinking: {
    eyes: 1,
    gaze: [0.35, 0.4],
    eyebrows: [[0.06, -0.1], [-0.01, 0.15]],
    head: [-0.25, 0.22],
    lean: 0,
    mouth: 0,
    smile: 0.25,
    jump: 0,
    tremble: 0,
    voice: { pitch: 0.97, rate: 0.92 },
  },
  curiosity: {
    eyes: 1.1,
    gaze: [0, 0.05],
    eyebrows: [[0.08, 0], [0.01, 0.05]],
    head: [-0.06, 0.28],
    lean: 0.05,
    mouth: 0,
    smile: 0.8,
    jump: 0,
    tremble: 0,
    voice: { pitch: 1.06, rate: 1 },
  },
  surprise: {
    eyes: 1.3,
    gaze: [0, 0],
    eyebrows: [[0.11, 0.05], [0.11, 0.05]],
    head: [-0.18, 0],
    lean: -0.08,
    mouth: 0.6,
    smile: 0,
    jump: 0,
    tremble: 0,
    voice: { pitch: 1.12, rate: 1.06 },
  },
  tension: {
    eyes: 1.15,
    gaze: [0, 0],
    eyebrows: [[0.04, 0.18], [0.04, 0.18]],
    head: [0.06, 0],
    lean: 0.15,
    mouth: 0,
    smile: 0.3,
    jump: 0,
    tremble: 0.03,
    voice: { pitch: 1.03, rate: 0.93 },
  },
  guessing: {
    eyes: 1.12,
    gaze: [0, 0],
    eyebrows: [[0.05, 0], [0.05, 0]],
    head: [0.1, 0],
    lean: 0.12,
    mouth: 0,
    smile: 1,
    jump: 0,
    tremble: 0.06,
    voice: { pitch: 1.05, rate: 0.97 },
  },
  joy: {
    eyes: 0.55,
    gaze: null,
    eyebrows: [[0.06, -0.15], [0.06, -0.15]],
    head: null,
    lean: 0,
    mouth: 0.9,
    smile: 1,
    jump: 0.45,
    tremble: 0,
    voice: { pitch: 1.1, rate: 1.06 },
  },
  celebration: {
    eyes: 0.5,
    gaze: null,
    eyebrows: [[0.09, -0.2], [0.09, -0.2]],
    head: null,
    lean: -0.05,
    mouth: 1,
    smile: 1,
    jump: 0.6,
    tremble: 0,
    voice: { pitch: 1.15, rate: 1.1 },
  },
  disappointment: {
    eyes: 0.9,
    gaze: [-0.2, -0.25],
    eyebrows: [[0.01, 0.25], [0.01, 0.25]],
    head: [0.25, -0.06],
    lean: 0.06,
    mouth: 0,
    smile: -0.35,
    jump: 0,
    tremble: 0,
    voice: { pitch: 0.94, rate: 0.93 },
  },
  sadness: {
    eyes: 0.85,
    gaze: [0, -0.35],
    eyebrows: [[0.02, 0.4], [0.02, 0.4]],
    head: [0.4, -0.1],
    lean: 0.1,
    mouth: 0,
    smile: -0.7,
    jump: 0,
    tremble: 0,
    voice: { pitch: 0.9, rate: 0.86 },
  },
  offended: {
    eyes: 0.72,
    gaze: [0.4, 0.18],
    eyebrows: [[0.1, -0.06], [0.1, -0.06]],
    head: [-0.22, -0.2],
    lean: -0.06,
    mouth: 0,
    smile: -0.2,
    jump: 0,
    tremble: 0,
    voice: { pitch: 1.08, rate: 0.95 },
  },
};

export const isCheerful = (n: Mood) => n === 'joy' || n === 'celebration';
export const isSad = (n: Mood) => n === 'sadness' || n === 'disappointment';
export const isTense = (n: Mood) => n === 'tension' || n === 'guessing';
