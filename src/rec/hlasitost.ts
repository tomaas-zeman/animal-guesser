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
/** kolik měření (po 40 ms) v úseku mělo hlasitost hráče, a kdy naposledy */
let hlasitychVzorku = 0;
let posledniHlas = 0;

/**
 * Telefon nebo tablet? Android i iOS dávají mikrofon jen jednomu odběrateli: když
 * ho drží měření hlasitosti (getUserMedia), rozpoznávání řeči dostává ticho nebo
 * hned skončí, často bez jakékoli chyby. Na mobilu se proto hlasitost neměří.
 */
export function jeMobil(ua = typeof navigator !== 'undefined' ? navigator.userAgent : '', dotykovychBodu = typeof navigator !== 'undefined' ? navigator.maxTouchPoints ?? 0 : 0): boolean {
  if (/Android|iPhone|iPad|iPod|Mobile/i.test(ua)) return true;
  // iPadOS se hlásí jako Mac, prozradí ho dotyková obrazovka
  return /Macintosh/.test(ua) && dotykovychBodu > 1;
}

export const mereniDostupne =
  typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && typeof AudioContext !== 'undefined' && !jeMobil();

/** Zařízení se ukázalo, že neumí zároveň měřit a poslouchat; měření už se nezapne. */
let zakazano = false;

export function meriSe(): boolean {
  return !!ctx;
}

/** Spustí měření. Vrací false, když mikrofon nejde otevřít. */
export async function zapniMereni(): Promise<boolean> {
  if (ctx) return true;
  if (!mereniDostupne || zakazano) return false;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      // Stejné zpracování zvuku, jaké používá rozpoznávání řeči. Chrome má pro jeden
      // mikrofon jedno nastavení: vypnuté automatické zesílení tady by ztlumilo i
      // rozpoznávání a krátké tiché "ne" by pak vůbec nezaznamenalo jako řeč.
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
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
      if (reference !== null && rms >= reference * PRAH) {
        hlasitychVzorku++;
        posledniHlas = Date.now();
      }
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

/** Vypne měření natrvalo (do obnovení stránky), protože blokuje rozpoznávání řeči. */
export function zakazMereni() {
  zakazano = true;
  vypniMereni();
}

/** Začne nový úsek poslechu. */
export function zacniUsek() {
  spicka = 0;
  hlasitychVzorku = 0;
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

/** Aspoň ~120 ms hlasu, aby to nebylo jen ťuknutí nebo rána. */
const MIN_VZORKU_HLASU = 3;
/** Jak dlouhé ticho po hlasu znamená, že hráč domluvil. */
const TICHO_PO_HLASU = 1200;

/**
 * Řekl hráč v tomhle úseku něco a pak ztichl? Slouží jako záloha, když
 * rozpoznávání krátké slovo ("ne") vůbec nezaznamená jako řeč.
 */
export function hracDomluvil(ted = Date.now()): boolean {
  return !!ctx && hlasitychVzorku >= MIN_VZORKU_HLASU && ted - posledniHlas >= TICHO_PO_HLASU;
}
