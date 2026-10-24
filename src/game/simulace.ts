// Simulace hráčů: pro každé zvíře odehraje několik her, kde "hráč" odpovídá
// podle databáze, ale občas se splete, řekne "nevím" nebo "může být".
import { Hra, type Databaze, type Nastaveni, type Odpoved } from './engine';

export interface Hrac {
  nevim: number;
  omyl: number;
  /** jak často se splete u jisté otázky (je to pták, má křídla); bez udání stejně jako jinde */
  omylJiste?: number;
}

/** Jednoduchý deterministický generátor, aby simulace dávala vždy stejný výsledek. */
export function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function odpovedHrace(p: number, hrac: Hrac, rng: () => number, jista = false): Odpoved {
  if (rng() < hrac.nevim) return 'nevim';
  if (p > 0.25 && p < 0.75 && rng() < 0.4) return 'mozna';
  let ano = rng() < p;
  if (rng() < (jista ? (hrac.omylJiste ?? hrac.omyl) : hrac.omyl)) ano = !ano;
  return ano ? 'ano' : 'ne';
}

/** Jak hráč odpoví na otázku, když vlastnost platí s pravděpodobností p. */
export type Odpovidac = (p: number, rng: () => number, jista?: boolean) => Odpoved;

/** Hráč, který odpovídá přesně podle databáze (co platí aspoň napůl, je "ano"). */
export const presnyHrac: Odpovidac = (p) => (p >= 0.5 ? 'ano' : 'ne');

/** U jasných vlastností odpoví přesně, u nejasných (0,2 až 0,8) si hodí mincí podle p. */
export const vahavyHrac: Odpovidac = (p, rng) => (p >= 0.8 ? 'ano' : p <= 0.2 ? 'ne' : rng() < p ? 'ano' : 'ne');

export interface PrubehHry {
  uhodl: boolean;
  tipu: number;
  otazek: number;
  spatneTipy: number[];
  /** tipy zvířat, která odporovala odpovědi, ačkoli byla ve hře zvířata s menším rozporem */
  rozporneTipy: string[];
  /** otázky, na které už byla odpověď, nebo z odpovědí plynula */
  zbytecneOtazky: string[];
}

/**
 * Odehraje jednu hru. `profil` jsou vlastnosti myšleného zvířete; nemusí být v databázi
 * (hráč si myslí zvíře, které postavička nezná), pak je `cil` -1.
 */
export function odehraj(
  db: Databaze,
  cil: number,
  odpovidac: Odpovidac,
  nastaveni: Partial<Nastaveni>,
  rng: () => number,
  profil: Record<string, number> = db.zvirata[cil].a,
): PrubehHry {
  const hra = new Hra(db, nastaveni, rng);
  const rozporneTipy: string[] = [];
  const zbytecneOtazky: string[] = [];
  const konec = (uhodl: boolean): PrubehHry => ({
    uhodl,
    tipu: hra.spatneTipy.length + (uhodl ? 1 : 0),
    otazek: hra.pocetOtazek,
    spatneTipy: hra.spatneTipy,
    rozporneTipy,
    zbytecneOtazky,
  });
  for (let krok = 0; krok < 100; krok++) {
    const tah = hra.dalsiTah();
    if (tah.typ === 'vzdavam') return konec(false);
    if (tah.typ === 'tip') {
      const veHre = hra.poradi().map((x) => hra.rozpory[x.index]);
      if (hra.rozpory[tah.index] > Math.min(...veHre)) rozporneTipy.push(tah.zvire.jmeno);
      if (tah.index === cil) return konec(true);
      hra.vyhodnotTip(tah.index, false);
      continue;
    }
    if (!hra.muzeSePtat(tah.id)) zbytecneOtazky.push(tah.id);
    hra.odpovez(tah.id, odpovidac(profil[tah.id] ?? 0, rng, db.jiste?.includes(tah.id)));
  }
  throw new Error('hra se zacyklila');
}

export function simuluj(db: Databaze, hrac: Hrac, her: number, nastaveni: Partial<Nastaveni> = {}) {
  const rng = mulberry32(42);
  let uhodl = 0, naPrvni = 0, otazek = 0, tipu = 0, celkem = 0, rozporne = 0, zbytecne = 0;
  const neuspechy: Record<string, number> = {};
  db.zvirata.forEach((z, cil) => {
    for (let i = 0; i < her; i++) {
      const v = odehraj(db, cil, (p, r, jista) => odpovedHrace(p, hrac, r, jista), nastaveni, rng);
      celkem++;
      otazek += v.otazek;
      tipu += v.tipu;
      rozporne += v.rozporneTipy.length;
      zbytecne += v.zbytecneOtazky.length;
      if (v.uhodl) uhodl++;
      if (v.uhodl && v.tipu === 1) naPrvni++;
      if (!v.uhodl) neuspechy[z.jmeno] = (neuspechy[z.jmeno] ?? 0) + 1;
    }
  });
  const nejhorsi = Object.entries(neuspechy).sort((a, b) => b[1] - a[1]).slice(0, 8);
  return {
    uspesnost: uhodl / celkem,
    naPrvni: naPrvni / celkem,
    prumerOtazek: otazek / celkem,
    /** otázky + tipy, tedy kolikrát musí hráč odpovědět */
    prumerTahu: (otazek + tipu) / celkem,
    rozporneTipy: rozporne,
    zbytecneOtazky: zbytecne,
    nejhorsi,
  };
}

/** Zvířata, která hráč s danými odpověďmi neuhodne na první tip, i s tím, za co je postavička zaměnila. */
/** Hráč, který odpovídá přesně, jen u jedné jasné vlastnosti (vybrané náhodně) se splete. */
export function hracSJednimOmylem(): Odpovidac {
  let splet = true;
  return (p, rng) => {
    const jasne = p >= 0.9 || p <= 0.1;
    if (splet && jasne && rng() < 0.25) {
      splet = false;
      return p >= 0.5 ? 'ne' : 'ano';
    }
    return presnyHrac(p, rng);
  };
}

export function omylyNaPrvniTip(db: Databaze, odpovidac: Odpovidac, her: number, nastaveni: Partial<Nastaveni> = {}) {
  const omyly: string[] = [];
  db.zvirata.forEach((z, cil) => {
    for (let i = 0; i < her; i++) {
      const v = odehraj(db, cil, odpovidac, nastaveni, mulberry32(1000 * i + cil));
      if (!v.uhodl || v.tipu > 1) omyly.push(`${z.jmeno} ← ${v.spatneTipy.map((j) => db.zvirata[j].jmeno).join(', ') || 'vzdal se'}`);
    }
  });
  return omyly;
}
