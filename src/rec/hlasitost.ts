// Měření hlasitosti mikrofonu (Web Audio), aby postavička poslouchala hlavně hráče.
//
// Rozpoznávání řeči v prohlížeči neprozradí, KDO mluví. Hráč ale obvykle sedí
// nejblíž k mikrofonu, takže je nejhlasitější. Při startu ("hra") si změříme,
// jak nahlas mluví, a odpovědi výrazně tišší než on bereme jako hovor okolo.

/** Odpověď musí mít aspoň takový podíl hlasitosti hráče (0,4 ≈ o 8 dB tišší). */
export const PRAH = 0.4;
/** Mírnější práh pro jasnou krátkou odpověď ("ne", "jo"): krátké slovo má menší špičku než "hra". */
export const PRAH_KRATKA = 0.2;

let stream: MediaStream | null = null;
let ctx: AudioContext | null = null;
let casovac: ReturnType<typeof setInterval> | undefined;
let spicka = 0;
let reference: number | null = null;

export const mereniDostupne =
  typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && typeof AudioContext !== 'undefined';

export function meriSe(): boolean {
  return !!ctx;
}

/** Spustí měření. Vrací false, když mikrofon nejde otevřít. */
export async function zapniMereni(): Promise<boolean> {
  if (ctx) return true;
  if (!mereniDostupne) return false;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      // automatické zesílení by hlasitosti srovnalo, a filtr by nefungoval
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: false },
    });
    ctx = new AudioContext();
    const analyzator = ctx.createAnalyser();
    analyzator.fftSize = 1024;
    ctx.createMediaStreamSource(stream).connect(analyzator);
    const vzorky = new Float32Array(analyzator.fftSize);
    casovac = setInterval(() => {
      analyzator.getFloatTimeDomainData(vzorky);
      let suma = 0;
      for (const x of vzorky) suma += x * x;
      const rms = Math.sqrt(suma / vzorky.length);
      if (rms > spicka) spicka = rms;
    }, 40);
    return true;
  } catch {
    vypniMereni();
    return false;
  }
}

export function vypniMereni() {
  clearInterval(casovac);
  stream?.getTracks().forEach((t) => t.stop());
  ctx?.close().catch(() => {});
  stream = null;
  ctx = null;
}

/** Začne nový úsek poslechu. */
export function zacniUsek() {
  spicka = 0;
}

/** Nejhlasitější místo od začátku úseku. */
export function spickaUseku(): number {
  return spicka;
}

export function referencniHlasitost(): number | null {
  return reference;
}

export function zapomenHrace() {
  reference = null;
}

/** Zapamatuje si hlasitost hráče; další odpovědi ji pomalu dolaďují. */
export function kalibruj(hodnota: number) {
  if (hodnota <= 0) return;
  reference = reference === null ? hodnota : 0.7 * reference + 0.3 * hodnota;
}

/** Je hlas dost hlasitý na to, aby to byl hráč? Bez měření nebo kalibrace bere všechno. */
export function jeHrac(hodnota: number, jasnaOdpoved = false): boolean {
  if (!ctx || reference === null) return true;
  return hodnota >= reference * (jasnaOdpoved ? PRAH_KRATKA : PRAH);
}
