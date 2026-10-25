// Hádací logika. Nezávisí na Reactu ani na 3D, takže se dá testovat simulací.
//
// Princip: každé zvíře má pravděpodobnost, že je to právě ono (na začátku stejnou).
// Po každé odpovědi se pravděpodobnosti přepočítají Bayesovým pravidlem.
// Další otázka je ta, po které čekáme nejmenší zbývající nejistotu (entropii),
// tedy největší informační zisk. Jedna špatná odpověď proto zvíře nevyřadí,
// jen ho odsune dozadu.
//
// Dvě pojistky navíc, aby hádání působilo logicky:
// - Pravidla (pták má peří, pták není savec…) odvodí, co už z odpovědí plyne,
//   a na to se postavička znovu neptá.
// - Zvíře, které jasně odporuje některé odpovědi (řekl "není noční" a sova je
//   noční vždycky), se netipuje, dokud jsou ve hře zvířata bez rozporu.

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
  /** "a -> b", "a -> !b", "!a -> b"…: když platí levá strana, platí i pravá (a obráceně její opak) */
  pravidla?: string[];
  /** skupiny vlastností, ze kterých platí nejvýš jedna (savec, pták, ryba…) */
  vylucne?: string[][];
  /**
   * Otázky s jistou odpovědí (je to pták, má křídla, žije v moři…). Rozpor s nimi váží víc
   * než s nejistými (je hnědé, umí skákat), takže zvíře, které nesedí jen v barvě,
   * má přednost před zvířetem z úplně jiné skupiny.
   */
  jiste?: string[];
}

/** Vlastnost s hodnotou: [id, platí?] */
type Fakt = [string, boolean];

export interface Implikace {
  kdyz: Fakt;
  pak: Fakt;
}

function fakt(text: string): Fakt {
  const t = text.trim();
  return t.startsWith('!') ? [t.slice(1).trim(), false] : [t, true];
}

/** Rozloží pravidla databáze na implikace i s obměnami (z "a -> b" plyne i "!b -> !a"). */
export function implikace(db: Databaze): Implikace[] {
  const vysledek: Implikace[] = [];
  const pridej = (kdyz: Fakt, pak: Fakt) => {
    vysledek.push({ kdyz, pak }, { kdyz: [pak[0], !pak[1]], pak: [kdyz[0], !kdyz[1]] });
  };
  for (const pravidlo of db.pravidla ?? []) {
    const [l, p] = pravidlo.split('->');
    if (p === undefined) throw new Error(`špatné pravidlo: ${pravidlo}`);
    pridej(fakt(l), fakt(p));
  }
  for (const skupina of db.vylucne ?? []) {
    for (const a of skupina) for (const b of skupina) if (a < b) pridej([a, true], [b, false]);
  }
  return vysledek;
}

/** Odpovídá zvíře s pravděpodobností p jasně opačně, než hráč řekl? */
export function jeRozpor(p: number, odpoved: Odpoved): boolean {
  return (odpoved === 'ano' && p <= 0.1) || (odpoved === 'ne' && p >= 0.9);
}

export type Tah =
  | { typ: 'otazka'; id: string; text: string }
  | { typ: 'tip'; index: number; zvire: Zvire; jistota: number }
  | { typ: 'vzdavam' };

export interface Nastaveni {
  /** jak často se člověk splete i u jasné vlastnosti */
  chyba: number;
  /** jak často se splete u jisté otázky (pták, křídla…) */
  chybaJista: number;
  /** kolik nejistých rozporů (barva, skákání) váží jeden rozpor s jistou otázkou */
  vahaJisteho: number;
  /** od jaké jistoty postavička tipuje */
  jistotaTipu: number;
  /** po kolika otázkách tipuje i s menší jistotou */
  trpelivost: number;
  /** od jaké jistoty tipuje, když už žádná otázka nemůže tip změnit */
  jistotaBezOtazky: number;
  /** o kolik musí otázka zvednout šanci na správný tip, aby se vyplatilo se ptát */
  prinosOtazky: number;
  /** nejvýš otázek celkem */
  maxOtazek: number;
  /** po kolika špatných tipech se vzdá */
  maxTipu: number;
  /** náhodnost výběru otázky (0 = vždy ta nejlepší) */
  pestrost: number;
}

export const vychoziNastaveni: Nastaveni = {
  chyba: 0.06,
  chybaJista: 0.03,
  vahaJisteho: 3,
  jistotaTipu: 0.9,
  trpelivost: 18,
  jistotaBezOtazky: 0.8,
  prinosOtazky: 0.02,
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
  /** u kolika odpovědí zvíře jasně nesedí; rozpor s jistou otázkou váží `vahaJisteho` */
  rozpory: number[];
  /** u kolika jistých odpovědí zvíře nesedí */
  jisteRozpory: number[];
  polozene = new Set<string>();
  /** co už z odpovědí plyne (přímo nebo podle pravidel) */
  zname = new Map<string, boolean>();
  historie: { id: string; odpoved: Odpoved }[] = [];
  spatneTipy: number[] = [];
  private pravidla: Implikace[];
  private jiste: Set<string>;

  constructor(db: Databaze, nastaveni: Partial<Nastaveni> = {}, rng: () => number = Math.random) {
    this.db = db;
    this.nastaveni = { ...vychoziNastaveni, ...nastaveni };
    this.rng = rng;
    this.pst = db.zvirata.map(() => 1 / db.zvirata.length);
    this.rozpory = db.zvirata.map(() => 0);
    this.jisteRozpory = db.zvirata.map(() => 0);
    this.pravidla = implikace(db);
    this.jiste = new Set(db.jiste ?? []);
  }

  private chybaOtazky(id: string): number {
    return this.jiste.has(id) ? this.nastaveni.chybaJista : this.nastaveni.chyba;
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
    const chyba = this.chybaOtazky(id);
    const jista = this.jiste.has(id);
    const vaha = jista ? this.nastaveni.vahaJisteho : 1;
    this.pst = this.pst.map((p, i) => p * verohodnost(this.db.zvirata[i].a[id] ?? 0, odpoved, chyba));
    this.db.zvirata.forEach((z, i) => {
      if (!jeRozpor(z.a[id] ?? 0, odpoved)) return;
      this.rozpory[i] += vaha;
      if (jista) this.jisteRozpory[i]++;
    });
    this.normalizuj();
    if (odpoved === 'ano' || odpoved === 'ne') this.odvod(id, odpoved === 'ano');
  }

  /** Zapíše fakt a všechno, co z něj podle pravidel plyne. První zjištění platí. */
  private odvod(id: string, plati: boolean): void {
    if (this.zname.has(id)) return;
    this.zname.set(id, plati);
    const fronta: Fakt[] = [[id, plati]];
    while (fronta.length) {
      const [a, va] = fronta.pop()!;
      for (const { kdyz, pak } of this.pravidla) {
        if (kdyz[0] !== a || kdyz[1] !== va || this.zname.has(pak[0])) continue;
        this.zname.set(pak[0], pak[1]);
        fronta.push(pak);
      }
    }
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

    const tipni = (x: { index: number; pst: number }): Tah => ({ typ: 'tip', index: x.index, zvire: this.db.zvirata[x.index], jistota: x.pst });
    const nej = poradi[0];

    // Favorit odporuje některé odpovědi, ale jsou tu zvířata bez rozporu (nebo s menším):
    // ta se musí vyloučit dřív, než ho postavička tipne.
    const minRozporu = Math.min(...poradi.map((x) => this.rozpory[x.index]));
    const souhlasi = poradi.filter((x) => this.rozpory[x.index] === minRozporu);
    if (this.rozpory[nej.index] > minRozporu) {
      const otazka = this.pocetOtazek < n.maxOtazek ? this.vyberOtazku(this.ohnisko(nej.index, souhlasi)) : null;
      if (otazka) return { typ: 'otazka', id: otazka, text: this.db.otazky[otazka] };
      return tipni(souhlasi[0]);
    }

    const tip = tipni(nej);
    const druhy = poradi[1]?.pst ?? 0;

    if (nej.pst >= n.jistotaTipu) return tip;
    if (this.pocetOtazek >= n.maxOtazek) return tip;
    // po delším ptaní stačí, když favorit jasně vede
    if (this.pocetOtazek >= n.trpelivost && nej.pst >= 0.5 && nej.pst >= 3 * druhy) return tip;

    // favorit je skoro jistý a odpověď na žádnou otázku by tip (skoro) nezměnila:
    // další otázka by jen potvrzovala to, co je jasné
    if (nej.pst >= n.jistotaBezOtazky && this.prinosNejlepsiOtazky() < n.prinosOtazky) return tip;

    const otazka = this.vyberOtazku();
    if (!otazka) return tip;
    return { typ: 'otazka', id: otazka, text: this.db.otazky[otazka] };
  }

  /**
   * O kolik nejvíc může jedna otázka zvednout šanci, že tip po ní bude správně.
   * Teď by postavička tipla favorita (šance = jeho pravděpodobnost). Po odpovědi tipne
   * nejpravděpodobnější zvíře; když je to u obou odpovědí zase favorit, otázka nic nepřinese.
   */
  prinosNejlepsiOtazky(): number {
    const mozna = this.mozna();
    const nej = Math.max(...this.pst);
    let max = 0;
    for (const id of Object.keys(this.db.otazky)) {
      if (!this.muzeSePtat(id, mozna)) continue;
      const chyba = this.chybaOtazky(id);
      let ano = 0;
      let ne = 0;
      this.pst.forEach((p, i) => {
        if (p === 0) return;
        const v = this.db.zvirata[i].a[id] ?? 0;
        ano = Math.max(ano, p * verohodnost(v, 'ano', chyba));
        ne = Math.max(ne, p * verohodnost(v, 'ne', chyba));
      });
      max = Math.max(max, ano + ne - nej);
    }
    return max;
  }

  /**
   * Váhy pro otázku, která rozsoudí favorita a zvířata bez rozporu:
   * favorit dostane polovinu, zvířata bez rozporu druhou polovinu podle svých pravděpodobností.
   */
  private ohnisko(favorit: number, souhlasi: { index: number; pst: number }[]): number[] {
    const w = this.pst.map(() => 0);
    const suma = souhlasi.reduce((s, x) => s + x.pst, 0);
    for (const x of souhlasi) w[x.index] = suma > 0 ? (0.5 * x.pst) / suma : 0.5 / souhlasi.length;
    w[favorit] = 0.5;
    return w;
  }

  /**
   * Zvířata, která sedí na odpovědi (mají nejméně rozporů). Na co mají všechna stejnou
   * jasnou odpověď, to už z odpovědí plyne. Když sedí jen jedno, porovnává se se zvířaty,
   * se kterými postavička ještě vážně počítá (aspoň desetina pravděpodobnosti favorita).
   */
  private mozna(): number[] {
    const veHre = this.pst.map((p, i) => (p > 0 ? i : -1)).filter((i) => i >= 0);
    const min = Math.min(...veHre.map((i) => this.rozpory[i]));
    const sedi = veHre.filter((i) => this.rozpory[i] === min);
    if (sedi.length > 1) return sedi;
    const max = Math.max(...this.pst);
    return veHre.filter((i) => this.pst[i] >= 0.1 * max);
  }

  /** Mají všechna zvířata na otázku stejnou jasnou odpověď? Pak je otázka zbytečná. */
  private jeJasna(id: string, zvirata: number[]): boolean {
    if (zvirata.length === 0) return false;
    const v = zvirata.map((i) => this.db.zvirata[i].a[id] ?? 0);
    return v.every((x) => x <= 0.1) || v.every((x) => x >= 0.9);
  }

  /**
   * Dá se na otázku ještě ptát? Ne, když už padla, když odpověď plyne z pravidel
   * (pták → má peří), nebo když ji mají stejnou všechna zvířata, která ještě sedí
   * (žije v moři → nežije v lese, obojživelník → nemá peří).
   */
  muzeSePtat(id: string, mozna = this.mozna()): boolean {
    return !this.polozene.has(id) && !this.zname.has(id) && !this.jeJasna(id, mozna);
  }

  /** Otázka s nejmenší očekávanou entropií po odpovědi ano/ne. */
  vyberOtazku(vahy: number[] = this.pst): string | null {
    const { pestrost } = this.nastaveni;
    const h0 = entropie(vahy);
    const kandidati: { id: string; zisk: number }[] = [];
    const mozna = this.mozna();

    for (const id of Object.keys(this.db.otazky)) {
      if (!this.muzeSePtat(id, mozna)) continue;
      const chyba = this.chybaOtazky(id);
      const wAno: number[] = [];
      const wNe: number[] = [];
      let pAno = 0;
      let pNe = 0;
      vahy.forEach((p, i) => {
        if (p === 0) return;
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
