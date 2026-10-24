// Česká řeč přes Web Speech API (speechSynthesis).

export interface Hlas {
  pitch: number;
  rate: number;
}

let hlasy: SpeechSynthesisVoice[] = [];

function nactiHlasy() {
  if (typeof speechSynthesis === 'undefined') return;
  hlasy = speechSynthesis.getVoices();
}

if (typeof speechSynthesis !== 'undefined') {
  nactiHlasy();
  speechSynthesis.addEventListener?.('voiceschanged', nactiHlasy);
}

export function ceskyHlas(): SpeechSynthesisVoice | undefined {
  return hlasy.find((v) => v.lang.toLowerCase().replace('_', '-').startsWith('cs'));
}

export const mluveniDostupne = typeof speechSynthesis !== 'undefined';

export function zmlkni() {
  if (mluveniDostupne) speechSynthesis.cancel();
}

/** Řekne text a počká, až domluví. Bez syntézy jen počká odhadnutou dobu. */
export function rekni(text: string, hlas: Hlas, ztlumeno = false): Promise<void> {
  const odhad = 600 + text.length * 70;
  if (!mluveniDostupne || ztlumeno) return new Promise((r) => setTimeout(r, Math.min(odhad, 2500)));

  return new Promise((resolve) => {
    zmlkni();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'cs-CZ';
    const cs = ceskyHlas();
    if (cs) u.voice = cs;
    u.pitch = hlas.pitch;
    u.rate = hlas.rate;
    let hotovo = false;
    const konec = () => {
      if (hotovo) return;
      hotovo = true;
      clearTimeout(pojistka);
      resolve();
    };
    // některé prohlížeče občas nezavolají onend
    const pojistka = setTimeout(konec, odhad * 2 + 3000);
    u.onend = konec;
    u.onerror = konec;
    speechSynthesis.speak(u);
  });
}
