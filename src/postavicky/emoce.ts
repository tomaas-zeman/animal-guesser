// Emoce postaviček: jak u které vypadá obličej, tělo a jak zní hlas.

export type Nalada =
  | 'klid'
  | 'premysli'
  | 'zvedavost'
  | 'prekvapeni'
  | 'napeti'
  | 'tipuje'
  | 'radost'
  | 'oslava'
  | 'zklamani'
  | 'smutek';

/** [zvednutí, natočení vnitřního konce nahoru] pro levé a pravé obočí */
type Oboci = [[number, number], [number, number]];

export interface Vyraz {
  /** otevření očí, 1 = normálně, méně = přimhouřené radostí */
  oci: number;
  /** kam koukají zorničky, null = volně se rozhlíží */
  pohled: [number, number] | null;
  /** null = obočí v klidu, při mluvení se jen pohupuje */
  oboci: Oboci | null;
  /** natočení hlavy [kývnutí dolů, naklonění do strany], null = volně se kolébá */
  hlava: [number, number] | null;
  /** předklon těla */
  sklon: number;
  /** pootevřená pusa, když nemluví */
  pusa: number;
  /** tvar zavřené pusy: 1 úsměv, 0 rovně, záporně smutně */
  usmev: number;
  /** výška poskakování */
  skok: number;
  /** jemné chvění hlavy (nervozita, napětí) */
  chveni: number;
  /** jak se mění hlas: násobky výšky a tempa */
  hlas: { pitch: number; rate: number };
}

export const VYRAZY: Record<Nalada, Vyraz> = {
  klid: { oci: 1, pohled: null, oboci: null, hlava: null, sklon: 0, pusa: 0, usmev: 1, skok: 0, chveni: 0, hlas: { pitch: 1, rate: 1 } },
  premysli: {
    oci: 1,
    pohled: [0.35, 0.4],
    oboci: [[0.06, -0.1], [-0.01, 0.15]],
    hlava: [-0.25, 0.22],
    sklon: 0,
    pusa: 0,
    usmev: 0.25,
    skok: 0,
    chveni: 0,
    hlas: { pitch: 0.97, rate: 0.92 },
  },
  zvedavost: {
    oci: 1.1,
    pohled: [0, 0.05],
    oboci: [[0.08, 0], [0.01, 0.05]],
    hlava: [-0.06, 0.28],
    sklon: 0.05,
    pusa: 0,
    usmev: 0.8,
    skok: 0,
    chveni: 0,
    hlas: { pitch: 1.06, rate: 1 },
  },
  prekvapeni: {
    oci: 1.3,
    pohled: [0, 0],
    oboci: [[0.11, 0.05], [0.11, 0.05]],
    hlava: [-0.18, 0],
    sklon: -0.08,
    pusa: 0.6,
    usmev: 0,
    skok: 0,
    chveni: 0,
    hlas: { pitch: 1.12, rate: 1.06 },
  },
  napeti: {
    oci: 1.15,
    pohled: [0, 0],
    oboci: [[0.04, 0.18], [0.04, 0.18]],
    hlava: [0.06, 0],
    sklon: 0.15,
    pusa: 0,
    usmev: 0.3,
    skok: 0,
    chveni: 0.03,
    hlas: { pitch: 1.03, rate: 0.93 },
  },
  tipuje: {
    oci: 1.12,
    pohled: [0, 0],
    oboci: [[0.05, 0], [0.05, 0]],
    hlava: [0.1, 0],
    sklon: 0.12,
    pusa: 0,
    usmev: 1,
    skok: 0,
    chveni: 0.06,
    hlas: { pitch: 1.05, rate: 0.97 },
  },
  radost: {
    oci: 0.55,
    pohled: null,
    oboci: [[0.06, -0.15], [0.06, -0.15]],
    hlava: null,
    sklon: 0,
    pusa: 0.9,
    usmev: 1,
    skok: 0.45,
    chveni: 0,
    hlas: { pitch: 1.1, rate: 1.06 },
  },
  oslava: {
    oci: 0.5,
    pohled: null,
    oboci: [[0.09, -0.2], [0.09, -0.2]],
    hlava: null,
    sklon: -0.05,
    pusa: 1,
    usmev: 1,
    skok: 0.6,
    chveni: 0,
    hlas: { pitch: 1.15, rate: 1.1 },
  },
  zklamani: {
    oci: 0.9,
    pohled: [-0.2, -0.25],
    oboci: [[0.01, 0.25], [0.01, 0.25]],
    hlava: [0.25, -0.06],
    sklon: 0.06,
    pusa: 0,
    usmev: -0.35,
    skok: 0,
    chveni: 0,
    hlas: { pitch: 0.94, rate: 0.93 },
  },
  smutek: {
    oci: 0.85,
    pohled: [0, -0.35],
    oboci: [[0.02, 0.4], [0.02, 0.4]],
    hlava: [0.4, -0.1],
    sklon: 0.1,
    pusa: 0,
    usmev: -0.7,
    skok: 0,
    chveni: 0,
    hlas: { pitch: 0.9, rate: 0.86 },
  },
};

export const jeVesela = (n: Nalada) => n === 'radost' || n === 'oslava';
export const jeSmutna = (n: Nalada) => n === 'smutek' || n === 'zklamani';
export const jeNapjata = (n: Nalada) => n === 'napeti' || n === 'tipuje';
