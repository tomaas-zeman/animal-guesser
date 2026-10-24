// Projev postavičky během hry: co řekne a s jakou emocí, podle toho, jak se hra vyvíjí.
// Nezávisí na Reactu, takže se dá testovat.
import type { Odpoved } from '../game/engine';
import type { Nalada } from './emoce';
import type { Hlasky } from './hlasky';

export interface Replika {
  text: string;
  nalada: Nalada;
}

/** Zamíchané zbytky každého seznamu vět. Bere se z nich, dokud nedojdou, pak se zamíchá znovu. */
const balicky = new WeakMap<readonly unknown[], unknown[]>();
const posledni = new WeakMap<readonly unknown[], unknown>();

/**
 * Náhodná položka bez opakování: vystřídá všechny, než některou zopakuje,
 * a nikdy nevezme stejnou dvakrát po sobě.
 */
export function nahodne<T>(pole: readonly T[], rng: () => number = Math.random): T {
  if (pole.length <= 1) return pole[0];
  let zbyva = balicky.get(pole) as T[] | undefined;
  if (!zbyva || zbyva.length === 0) {
    zbyva = [...pole];
    for (let i = zbyva.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [zbyva[i], zbyva[j]] = [zbyva[j], zbyva[i]];
    }
    // nový balíček nesmí začít tím, čím skončil starý
    if (zbyva[zbyva.length - 1] === posledni.get(pole)) [zbyva[0], zbyva[zbyva.length - 1]] = [zbyva[zbyva.length - 1], zbyva[0]];
    balicky.set(pole, zbyva);
  }
  const x = zbyva.pop() as T;
  posledni.set(pole, x);
  return x;
}

/** Jak se tváří při obyčejné reakci na odpověď. */
const NALADA_ODPOVEDI: Record<Odpoved, Nalada> = {
  ano: 'zvedavost',
  ne: 'klid',
  nevim: 'klid',
  mozna: 'premysli',
};

/** Od jaké jistoty má favorita a prozradí to. */
export const JISTOTA_TUSENI = 0.3;
/** Od jaké jistoty je napjatá, že už je blízko. */
export const JISTOTA_BLIZKO = 0.65;
/** Po kolika otázkách okomentuje, že se hra protahuje. */
const DLOUHA_HRA = [12, 20, 26];
/** Tip s menší jistotou je tip naslepo. */
const JISTOTA_NASLEPO = 0.5;

export interface PoOdpovedi {
  odpoved: Odpoved;
  /** počet otázek včetně té zodpovězené */
  pocetOtazek: number;
  /** jak moc čekala odpověď ano (0–1) */
  ocekavaneAno: number;
  /** jistota favorita před odpovědí a po ní */
  jistotaPred: number;
  jistotaPo: number;
}

export class Projev {
  private tuseni = false;
  /** kolik otázek od poslední zmínky, že je blízko */
  private odBlizko = Infinity;
  private omylu = 0;

  constructor(
    readonly hlasky: Hlasky,
    private rng: () => number = Math.random,
  ) {}

  private vyber(seznam: string[], nalada: Nalada): Replika {
    return { text: nahodne(seznam, this.rng), nalada };
  }

  uvod(): Replika {
    return this.vyber(this.hlasky.uvod, 'radost');
  }

  zacatek(): Replika {
    return this.vyber(this.hlasky.zacatek, 'zvedavost');
  }

  /** Co řekne po odpovědi, než položí další otázku. Může být i nic. */
  poOdpovedi(k: PoOdpovedi): Replika[] {
    const h = this.hlasky;
    this.odBlizko++;

    // nečekaná odpověď (ano u něčeho, co skoro žádné zbývající zvíře nemá, a naopak)
    const necekane =
      k.pocetOtazek > 2 && ((k.odpoved === 'ano' && k.ocekavaneAno < 0.15) || (k.odpoved === 'ne' && k.ocekavaneAno > 0.85));
    if (necekane) return [this.vyber(h.prekvapeni, 'prekvapeni')];

    if (!this.tuseni && k.jistotaPo >= JISTOTA_TUSENI) {
      this.tuseni = true;
      return [this.vyber(h.tuseni, 'zvedavost')];
    }

    if (k.jistotaPo >= JISTOTA_BLIZKO && this.odBlizko >= 3) {
      this.odBlizko = 0;
      return [this.vyber(h.blizko, 'napeti')];
    }

    if (k.jistotaPo - k.jistotaPred >= 0.25 && k.jistotaPo >= 0.2) return [this.vyber(h.pokrok, 'radost')];

    if (DLOUHA_HRA.includes(k.pocetOtazek)) return [this.vyber(h.dlouho, 'premysli')];

    // obyčejně krátce zareaguje, ale ne pokaždé, aby to neznělo naučeně
    const repliky: Replika[] = [];
    const nahoda = this.rng();
    if (nahoda < 0.75) repliky.push(this.vyber(h.reakce[k.odpoved], NALADA_ODPOVEDI[k.odpoved]));
    if (nahoda > 0.6 && nahoda < 0.85) repliky.push(this.vyber(h.prechod, 'klid'));
    return repliky;
  }

  /** Jak se tváří, když pokládá otázku. */
  naladaOtazky(jistota: number): Nalada {
    return jistota >= JISTOTA_BLIZKO ? 'napeti' : 'klid';
  }

  tip(zvire: string, jistota: number, pocetOtazek: number): Replika {
    const h = this.hlasky;
    const seznam = jistota >= 0.97 && this.omylu === 0 ? h.tipJisty : jistota < JISTOTA_NASLEPO && pocetOtazek > 10 ? h.tipNejisty : h.tip;
    const { text } = this.vyber(seznam, 'tipuje');
    return { text: text.replace('{z}', zvire.toLowerCase()), nalada: 'tipuje' };
  }

  vyhra(pocetOtazek: number): Replika {
    const h = this.hlasky;
    const seznam = this.omylu === 0 && pocetOtazek <= 8 ? h.vyhraRychla : this.omylu > 0 || pocetOtazek >= 20 ? h.vyhraTezka : h.vyhra;
    return this.vyber(seznam, 'oslava');
  }

  znovu(): Replika {
    return this.vyber(this.hlasky.znovu, 'radost');
  }

  /** Špatný tip: poprvé ji to zaskočí, pak už je zklamaná. */
  omyl(): Replika {
    this.omylu++;
    return this.omylu === 1 ? this.vyber(this.hlasky.omyl, 'prekvapeni') : this.vyber(this.hlasky.omylZnovu, 'zklamani');
  }

  vzdavam(): Replika {
    return this.vyber(this.hlasky.vzdavam, 'smutek');
  }

  /** Hráč jí nadává: nenechá se vyvést z míry a vtipně to otočí. */
  urazka(): Replika {
    return this.vyber(this.hlasky.urazka, 'prekvapeni');
  }

  nerozumim(): Replika {
    return this.vyber(this.hlasky.nerozumim, 'zvedavost');
  }
}
