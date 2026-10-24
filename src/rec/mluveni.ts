// Česká řeč přes Web Speech API (speechSynthesis).

export interface Hlas {
  pitch: number;
  rate: number;
  /** jaký hlas postavičce sedí víc, když je na výběr */
  pohlavi: 'zena' | 'muz';
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

const ZENSKE = /vlasta|zuzana|iveta|jana|tereza|dana|female|žena/i;
const MUZSKE = /anton[ií]n|jakub|ji[rř][ií]|jirka|male|muž/i;

/** Seřadí české hlasy od nejpřirozenějšího. Neurální hlasy (Edge, Android) zní nejlíp. */
function skore(v: SpeechSynthesisVoice, pohlavi?: Hlas['pohlavi']): number {
  let s = 0;
  if (/natural|neural|online|enhanced|premium|siri/i.test(v.name)) s += 10;
  if (/google/i.test(v.name)) s += 5;
  if (!v.localService) s += 2;
  if (pohlavi === 'zena' && ZENSKE.test(v.name)) s += 3;
  if (pohlavi === 'muz' && MUZSKE.test(v.name)) s += 3;
  return s;
}

export function ceskeHlasy(): SpeechSynthesisVoice[] {
  return hlasy.filter((v) => v.lang.toLowerCase().replace('_', '-').startsWith('cs'));
}

export function ceskyHlas(pohlavi?: Hlas['pohlavi']): SpeechSynthesisVoice | undefined {
  return ceskeHlasy().sort((a, b) => skore(b, pohlavi) - skore(a, pohlavi))[0];
}

/** Zní hlas přirozeně? Takovému hlasu výšku skoro neměníme, aby nezněl roboticky. */
export function jePrirozeny(v: SpeechSynthesisVoice | undefined) {
  return !!v && skore(v) >= 10;
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
    const cs = ceskyHlas(hlas.pohlavi);
    if (cs) u.voice = cs;
    // velká změna výšky zkresluje, u přirozených hlasů ji jen naznačíme
    const mira = jePrirozeny(cs) ? 0.4 : 1;
    u.pitch = 1 + (hlas.pitch - 1) * mira;
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
