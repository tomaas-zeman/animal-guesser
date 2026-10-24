// Hádací logika. Nezávisí na Reactu ani na 3D, takže se dá testovat simulací.
//
// Princip: každé zvíře má pravděpodobnost, že je to právě ono (na začátku stejnou).
// Po každé odpovědi se pravděpodobnosti přepočítají Bayesovým pravidlem.
// Další otázka je ta, po které čekáme nejmenší zbývající nejistotu (entropii),
// tedy největší informační zisk. Jedna špatná odpověď proto zvíře nevyřadí,
// jen ho odsune dozadu.

export type Odpoved = 'ano' | 'ne' | 'nevim' | 'mozna';

export interface Zvire {
  jmeno: string;
  emoji: string;
  /** id vlastnosti -> pravděpodobnost odpovědi "ano"; chybějící = 0 */
  a: Record<string, number>;
}

export interface Databaze {
  otazky: Record<string, string>;
  zvirata: Zvire[];
}

export type Tah =
  | { typ: 'otazka'; id: string; text: string }
  | { typ: 'tip'; index: number; zvire: Zvire; jistota: number }
  | { typ: 'vzdavam' };

export interface Nastaveni {
  /** jak často se člověk splete i u jasné vlastnosti */
  chyba: number;
  /** od jaké jistoty postavička tipuje */
  jistotaTipu: number;
  /** po kolika otázkách tipuje i s menší jistotou */
  trpelivost: number;
  /** nejvýš otázek celkem */
  maxOtazek: number;
  /** po kolika špatných tipech se vzdá */
  maxTipu: number;
  /** náhodnost výběru otázky (0 = vždy ta nejlepší) */
  pestrost: number;
}

export const vychoziNastaveni: Nastaveni = {
  chyba: 0.06,
  jistotaTipu: 0.9,
  trpelivost: 18,
  maxOtazek: 30,
  maxTipu: 4,
  pestrost: 0.03,
};

/** Pravděpodobnost dané odpovědi, když je vlastnost u zvířete pravdivá s pravděpodobností p. */
export function verohodnost(p: number, odpoved: Odpoved, chyba: number): number {
  const ano = chyba + (1 - 2 * chyba) * p;
  switch (odpoved) {
    case 'ano':
      return ano;
    case 'ne':
      return 1 - ano;
    // "může být" je slabé ano: posune, ale nikoho nevyřadí
    case 'mozna':
      return 0.25 + 0.5 * ano;
    case 'nevim':
      return 1;
  }
}

function entropie(w: number[]): number {
  let suma = 0;
  for (const x of w) suma += x;
  if (suma <= 0) return 0;
  let h = 0;
  for (const x of w) if (x > 0) h -= (x / suma) * Math.log2(x / suma);
  return h;
}

export class Hra {
  readonly db: Databaze;
  readonly nastaveni: Nastaveni;
  private rng: () => number;
  /** pravděpodobnosti zvířat (normalizované, vyloučená mají 0) */
  pst: number[];
  polozene = new Set<string>();
  historie: { id: string; odpoved: Odpoved }[] = [];
  spatneTipy: number[] = [];

  constructor(db: Databaze, nastaveni: Partial<Nastaveni> = {}, rng: () => number = Math.random) {
    this.db = db;
    this.nastaveni = { ...vychoziNastaveni, ...nastaveni };
    this.rng = rng;
    this.pst = db.zvirata.map(() => 1 / db.zvirata.length);
  }

  get pocetOtazek(): number {
    return this.historie.length;
  }

  /** Zvířata seřazená od nejpravděpodobnějšího. */
  poradi(): { index: number; pst: number }[] {
    return this.pst
      .map((pst, index) => ({ index, pst }))
      .filter((x) => x.pst > 0)
      .sort((a, b) => b.pst - a.pst);
  }

  /** Jak moc postavička čeká na otázku odpověď ano (0–1), podle toho, která zvířata jsou ve hře. */
  ocekavaneAno(id: string): number {
    let suma = 0;
    this.pst.forEach((p, i) => (suma += p * (this.db.zvirata[i].a[id] ?? 0)));
    return suma;
  }

  odpovez(id: string, odpoved: Odpoved): void {
    this.polozene.add(id);
    this.historie.push({ id, odpoved });
    const { chyba } = this.nastaveni;
    this.pst = this.pst.map((p, i) => p * verohodnost(this.db.zvirata[i].a[id] ?? 0, odpoved, chyba));
    this.normalizuj();
  }

  /** Výsledek tipu. Při omylu zvíře vyřadí a hraje se dál. */
  vyhodnotTip(index: number, spravne: boolean): void {
    if (spravne) return;
    this.spatneTipy.push(index);
    this.pst[index] = 0;
    this.normalizuj();
  }

  dalsiTah(): Tah {
    const n = this.nastaveni;
    const poradi = this.poradi();
    if (poradi.length === 0 || this.spatneTipy.length >= n.maxTipu) return { typ: 'vzdavam' };

    const nej = poradi[0];
    const tip: Tah = { typ: 'tip', index: nej.index, zvire: this.db.zvirata[nej.index], jistota: nej.pst };
    const druhy = poradi[1]?.pst ?? 0;

    if (nej.pst >= n.jistotaTipu) return tip;
    if (this.pocetOtazek >= n.maxOtazek) return tip;
    // po delším ptaní stačí, když favorit jasně vede
    if (this.pocetOtazek >= n.trpelivost && nej.pst >= 0.5 && nej.pst >= 3 * druhy) return tip;

    const otazka = this.vyberOtazku();
    if (!otazka) return tip;
    return { typ: 'otazka', id: otazka, text: this.db.otazky[otazka] };
  }

  /** Otázka s nejmenší očekávanou entropií po odpovědi ano/ne. */
  vyberOtazku(): string | null {
    const { chyba, pestrost } = this.nastaveni;
    const h0 = entropie(this.pst);
    const kandidati: { id: string; zisk: number }[] = [];

    for (const id of Object.keys(this.db.otazky)) {
      if (this.polozene.has(id)) continue;
      const wAno: number[] = [];
      const wNe: number[] = [];
      let pAno = 0;
      let pNe = 0;
      this.pst.forEach((p, i) => {
        const v = this.db.zvirata[i].a[id] ?? 0;
        const a = p * verohodnost(v, 'ano', chyba);
        const ne = p * verohodnost(v, 'ne', chyba);
        wAno.push(a);
        wNe.push(ne);
        pAno += a;
        pNe += ne;
      });
      const h = pAno * entropie(wAno) + pNe * entropie(wNe);
      kandidati.push({ id, zisk: h0 - h });
    }

    if (kandidati.length === 0) return null;
    kandidati.sort((a, b) => b.zisk - a.zisk);
    const nejlepsi = kandidati[0].zisk;
    if (nejlepsi < 0.01) return null;
    // pro pestrost náhodně z otázek, které jsou skoro stejně dobré jako nejlepší
    const dobre = kandidati.filter((k) => k.zisk >= nejlepsi * (1 - pestrost));
    return dobre[Math.floor(this.rng() * dobre.length)].id;
  }

  private normalizuj(): void {
    const suma = this.pst.reduce((s, x) => s + x, 0);
    if (suma > 0) this.pst = this.pst.map((x) => x / suma);
  }
}
