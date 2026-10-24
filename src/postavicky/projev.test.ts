import { describe, expect, it } from 'vitest';
import { pauzaZa, rozdelNaVety } from '../rec/mluveni';
import { VYRAZY } from './emoce';
import { BANAN, LISKA, ROBOT, SOVA, VOJTACA, ZABAK, type Hlasky } from './hlasky';
import { JISTOTA_BLIZKO, JISTOTA_TUSENI, Projev, nahodne, type PoOdpovedi } from './projev';

const VSECHNY: [string, Hlasky][] = [
  ['liška', LISKA],
  ['robot', ROBOT],
  ['sova', SOVA],
  ['žabák', ZABAK],
  ['banán', BANAN],
  ['Vojtača', VOJTACA],
];

const obycejna: PoOdpovedi = { odpoved: 'ano', pocetOtazek: 5, ocekavaneAno: 0.5, jistotaPred: 0.05, jistotaPo: 0.06 };

describe('hlášky', () => {
  it.each(VSECHNY)('%s má pro každou situaci víc vět', (_, h) => {
    for (const [klic, seznam] of Object.entries(h)) {
      const seznamy = Array.isArray(seznam) ? [seznam] : Object.values(seznam as Record<string, string[]>);
      for (const s of seznamy) expect(s.length, klic).toBeGreaterThanOrEqual(2);
    }
  });

  it.each(VSECHNY)('%s má tipy se jménem zvířete, ne na začátku věty', (_, h) => {
    for (const t of [...h.tip, ...h.tipJisty, ...h.tipNejisty]) {
      expect(t).toContain('{z}');
      expect(t.startsWith('{z}')).toBe(false);
      expect(t).not.toMatch(/[.!?]\s+\{z\}/);
    }
  });
});

describe('výběr bez opakování', () => {
  it('nikdy neřekne stejnou větu dvakrát po sobě a vystřídá všechny', () => {
    const seznam = ['a', 'b', 'c', 'd'];
    let predchozi = '';
    const videno = new Set<string>();
    for (let i = 0; i < 400; i++) {
      const x = nahodne(seznam);
      expect(x).not.toBe(predchozi);
      predchozi = x;
      if (i < 4) videno.add(x);
    }
    expect(videno.size).toBe(4);
  });
});

describe('projev podle situace', () => {
  it('nečekanou odpověď komentuje překvapeně', () => {
    const p = new Projev(LISKA);
    const [r] = p.poOdpovedi({ ...obycejna, ocekavaneAno: 0.05 });
    expect(r.nalada).toBe('prekvapeni');
    expect(LISKA.prekvapeni).toContain(r.text);
  });

  it('tušení prozradí jen jednou za hru', () => {
    const p = new Projev(SOVA, () => 0.99);
    const k = { ...obycejna, jistotaPred: JISTOTA_TUSENI, jistotaPo: JISTOTA_TUSENI + 0.05 };
    expect(SOVA.tuseni).toContain(p.poOdpovedi(k)[0].text);
    expect(p.poOdpovedi(k).some((r) => SOVA.tuseni.includes(r.text))).toBe(false);
  });

  it('blízko cíle je napjatá a připomene to jen občas', () => {
    const p = new Projev(ZABAK, () => 0.99);
    p.poOdpovedi({ ...obycejna, jistotaPo: JISTOTA_TUSENI }); // tušení
    const k = { ...obycejna, jistotaPred: JISTOTA_BLIZKO, jistotaPo: JISTOTA_BLIZKO + 0.05 };
    expect(p.poOdpovedi(k)[0].nalada).toBe('napeti');
    expect(p.poOdpovedi(k).some((r) => r.nalada === 'napeti')).toBe(false);
    expect(p.naladaOtazky(0.8)).toBe('napeti');
  });

  it('první omyl ji zaskočí, další zklame', () => {
    const p = new Projev(ROBOT);
    expect(p.omyl().nalada).toBe('prekvapeni');
    const druhy = p.omyl();
    expect(druhy.nalada).toBe('zklamani');
    expect(ROBOT.omylZnovu).toContain(druhy.text);
  });

  it('výhra podle průběhu hry', () => {
    expect(LISKA.vyhraRychla).toContain(new Projev(LISKA).vyhra(5).text);
    expect(LISKA.vyhra).toContain(new Projev(LISKA).vyhra(12).text);
    const poOmylu = new Projev(LISKA);
    poOmylu.omyl();
    expect(LISKA.vyhraTezka).toContain(poOmylu.vyhra(12).text);
    expect(new Projev(LISKA).vyhra(5).nalada).toBe('oslava');
  });

  it('tip doplní jméno zvířete malými písmeny', () => {
    const r = new Projev(SOVA).tip('Lední medvěd', 0.99, 10);
    expect(r.text).toContain('lední medvěd');
    expect(r.nalada).toBe('tipuje');
  });

  it('prohra je smutná', () => {
    expect(new Projev(ZABAK).vzdavam().nalada).toBe('smutek');
  });
});

describe('reakce na nadávky', () => {
  const DRUHY = ['hloupost', 'hluchota', 'hrubost'] as const;
  // hrubá slova, která postavička nesmí říct ani při ohrazení
  const VULGARNI = /\b(vole|vůl|debil|idiot|kurv|hovn|prdel|hajzl|hub[auo]|držk|kreten)/i;

  it.each(VSECHNY)('%s má na každou nadávku víc laskavých reakcí s emocí', (_, h) => {
    for (const druh of DRUHY) {
      expect(h.nadavka[druh].length).toBeGreaterThanOrEqual(3);
      for (const r of h.nadavka[druh]) {
        expect(VYRAZY[r.nalada], r.text).toBeDefined();
        expect(r.text).not.toMatch(VULGARNI);
      }
    }
    for (const t of h.nadavkaZnovu) expect(t).not.toMatch(VULGARNI);
  });

  it.each(VSECHNY)('%s se tváří různě: naoko dotčeně i s humorem', (_, h) => {
    const nalady = new Set(DRUHY.flatMap((d) => h.nadavka[d].map((r) => r.nalada)));
    expect(nalady.has('dotcena')).toBe(true);
    expect(nalady.size).toBeGreaterThanOrEqual(3);
  });

  it('neřekne stejnou reakci dvakrát po sobě', () => {
    const p = new Projev(BANAN);
    let predchozi = '';
    for (let i = 0; i < 40; i++) {
      const r = p.nadavka('hloupost');
      expect(r.text).not.toBe(predchozi);
      predchozi = r.text;
    }
  });

  it('reaguje podle toho, čím jí hráč nadává, a pak to vezme s nadhledem', () => {
    const p = new Projev(SOVA);
    expect(SOVA.nadavka.hluchota.map((r) => r.text)).toContain(p.nadavka('hluchota').text);
    expect(SOVA.nadavka.hrubost.map((r) => r.text)).toContain(p.nadavka('hrubost').text);
    expect(SOVA.nadavkaZnovu).toContain(p.nadavka('hloupost').text);
    expect(SOVA.nadavka.hloupost.map((r) => r.text)).toContain(p.nadavka('hloupost').text);
  });
});

describe('hlas a rytmus řeči', () => {
  it('rozdělí text na věty', () => {
    expect(rozdelNaVety('Hú hú! Je to sova? Asi… možná.')).toEqual(['Hú hú!', 'Je to sova?', 'Asi…', 'možná.']);
    expect(pauzaZa('Asi…')).toBeGreaterThan(pauzaZa('Dobře.'));
  });

  it('smutek zní níž a pomaleji, radost výš a rychleji', () => {
    expect(VYRAZY.smutek.hlas.pitch).toBeLessThan(1);
    expect(VYRAZY.smutek.hlas.rate).toBeLessThan(1);
    expect(VYRAZY.oslava.hlas.pitch).toBeGreaterThan(1);
    expect(VYRAZY.oslava.hlas.rate).toBeGreaterThan(1);
    for (const v of Object.values(VYRAZY)) {
      expect(Math.abs(v.hlas.pitch - 1)).toBeLessThanOrEqual(0.15);
      expect(Math.abs(v.hlas.rate - 1)).toBeLessThanOrEqual(0.15);
    }
  });
});
