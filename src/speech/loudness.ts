// Microphone loudness measurement (Web Audio), so that the character listens mainly to the player.
//
// Speech recognition in the browser does not reveal WHO is speaking. The player, however, usually sits
// closest to the microphone, so they are the loudest. At the start ("hra") we measure
// how loudly they speak, and answers considerably quieter than that are treated as background talk.

/** An answer must have at least this share of the player's loudness (0.25 ≈ 12 dB quieter). */
export const THRESHOLD = 0.25;
/** A milder threshold for a clear short answer ("ne", "jo"): a short word has a lower peak than "hra". */
export const THRESHOLD_SHORT = 0.15;
/**
 * The start word "hra" is short and emphasized, its peak is well above normal speech (measured:
 * a normal sentence peaks at ~25 % of it). So only this share of it becomes the reference.
 */
export const START_FACTOR = 0.6;

let stream: MediaStream | null = null;
let ctx: AudioContext | null = null;
let timer: ReturnType<typeof setInterval> | undefined;
let peak = 0;
let reference: number | null = null;
/** how many measurements (every 40 ms) in the segment had the player's loudness, and when last */
let loudSamples = 0;
let lastVoice = 0;

/**
 * Phone or tablet? Both Android and iOS give the microphone to only one consumer: when
 * the loudness measurement (getUserMedia) holds it, speech recognition gets silence or
 * ends immediately, often without any error. So loudness is not measured on mobile.
 */
export function isMobile(ua = typeof navigator !== 'undefined' ? navigator.userAgent : '', touchPoints = typeof navigator !== 'undefined' ? navigator.maxTouchPoints ?? 0 : 0): boolean {
  if (/Android|iPhone|iPad|iPod|Mobile/i.test(ua)) return true;
  // iPadOS reports itself as a Mac, the touch screen gives it away
  return /Macintosh/.test(ua) && touchPoints > 1;
}

export const measuringAvailable =
  typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && typeof AudioContext !== 'undefined' && !isMobile();

/** The device turned out unable to measure and listen at the same time; measuring will not be enabled again. */
let disabled = false;

export function isMeasuring(): boolean {
  return !!ctx;
}

/** Starts measuring. Returns false when the microphone cannot be opened. */
export async function enableMeasuring(): Promise<boolean> {
  if (ctx) return true;
  if (!measuringAvailable || disabled) return false;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      // The same audio processing that speech recognition uses. Chrome has one setting
      // per microphone: turning automatic gain off here would also quiet
      // recognition, and a short quiet "ne" would then not be registered as speech at all.
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });
    ctx = new AudioContext();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    ctx.createMediaStreamSource(stream).connect(analyser);
    const samples = new Float32Array(analyser.fftSize);
    timer = setInterval(() => {
      analyser.getFloatTimeDomainData(samples);
      let sum = 0;
      for (const x of samples) sum += x * x;
      const rms = Math.sqrt(sum / samples.length);
      if (rms > peak) peak = rms;
      if (reference !== null && rms >= reference * THRESHOLD) {
        loudSamples++;
        lastVoice = Date.now();
      }
    }, 40);
    return true;
  } catch {
    stopMeasuring();
    return false;
  }
}

export function stopMeasuring() {
  clearInterval(timer);
  stream?.getTracks().forEach((t) => t.stop());
  ctx?.close().catch(() => {});
  stream = null;
  ctx = null;
}

/** Turns measuring off permanently (until the page reloads), because it blocks speech recognition. */
export function disableMeasuring() {
  disabled = true;
  stopMeasuring();
}

/** Starts a new listening segment. */
export function startSegment() {
  peak = 0;
  loudSamples = 0;
}

/** The loudest point since the start of the segment. */
export function segmentPeak(): number {
  return peak;
}

export function referenceLoudness(): number | null {
  return reference;
}

export function forgetPlayer() {
  reference = null;
}

/** Remembers the loudness of the start word as the reference, scaled down to the level of normal speech. */
export function calibrateFromStart(value: number) {
  if (value <= 0) return;
  reference = value * START_FACTOR;
}

/** Remembers the player's loudness; further answers slowly fine-tune it. */
export function calibrate(value: number) {
  if (value <= 0) return;
  reference = reference === null ? value : 0.7 * reference + 0.3 * value;
}

/** Is the voice loud enough to be the player? Without measuring or calibration it accepts everything. */
export function isPlayer(value: number, clearAnswer = false): boolean {
  if (!ctx || reference === null) return true;
  return value >= reference * (clearAnswer ? THRESHOLD_SHORT : THRESHOLD);
}

/** At least ~120 ms of voice, so that it is not just a tap or a bang. */
const MIN_VOICE_SAMPLES = 3;
/** How long a silence after a voice means the player has finished speaking. */
const SILENCE_AFTER_VOICE = 1200;

/**
 * Did the player say something in this segment and then fall silent? Serves as a fallback when
 * recognition does not register a short word ("ne") as speech at all.
 */
export function playerFinished(now = Date.now()): boolean {
  return !!ctx && loudSamples >= MIN_VOICE_SAMPLES && now - lastVoice >= SILENCE_AFTER_VOICE;
}
