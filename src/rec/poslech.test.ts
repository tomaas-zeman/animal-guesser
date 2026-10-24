import { describe, expect, it } from 'vitest';
import { MAX_PORUCH, vyberTexty, jeHovorOkolo, jeNesrozumitelne, jePorucha, jeStart, jeZopakuj, pauzaPoPoruse, rozpoznejOdpoved } from './poslech';

describe('rozpoznání odpovědi z řeči', () => {
  const pripady: [string, ReturnType<typeof rozpoznejOdpoved>][] = [
    ['Ano', 'ano'],
    ['jo jo', 'ano'],
    ['určitě', 'ano'],
    ['Ne', 'ne'],
    ['není', 'ne'],
    ['spíš ne', 'ne'],
    ['asi ne', 'ne'],
    ['Nevím', 'nevim'],
    ['netuším', 'nevim'],
    ['může být', 'mozna'],
    ['možná', 'mozna'],
    ['asi', 'mozna'],
    ['spíš ano', 'mozna'],
    ['no jo', 'ano'],
    ['ani náhodou', 'ne'],
    ['banán', null],
    // "ne" v podobách, jak ho rozpoznávání opravdu přepisuje
    ['NE!', 'ne'],
    ['Né.', 'ne'],
    ['neee', 'ne'],
    ['nene', 'ne'],
    ['ne ne ne', 'ne'],
    ['no ne', 'ne'],
    ['to ne', 'ne'],
    ['vůbec ne', 'ne'],
    ['nemá', 'ne'],
    ['neumí', 'ne'],
    ['nikoliv', 'ne'],
    ['N', 'ne'],
    ['mně', 'ne'],
    ['nelétá', 'ne'],
    ['nejsou', 'ne'],
    ['ne, není', 'ne'],
    ['nemá křídla', 'ne'],
    ['nežije v lese', 'ne'],
    ['je', 'ano'],
    ['je to tak', 'ano'],
    ['ano je', 'ano'],
    ['někdy', 'mozna'],
    ['nejspíš', 'mozna'],
    ['nevím', 'nevim'],
    ['neh', 'ne'],
    ['mně ano', 'ano'],
    ['no jo', 'ano'],
    ['no', null],
  ];
  for (const [text, cekam] of pripady) {
    it(`"${text}" → ${cekam}`, () => expect(rozpoznejOdpoved([text])).toBe(cekam));
  }

  it('zkusí i další varianty přepisu', () => {
    expect(rozpoznejOdpoved(['banán', 'ano'])).toBe('ano');
  });
  it('jasné "ne" v kterékoli variantě přebije slabé "je" v první', () => {
    expect(rozpoznejOdpoved(['je', 'ne', 'né'])).toBe('ne');
    expect(rozpoznejOdpoved(['mně', 'je'])).toBe('ne');
    expect(rozpoznejOdpoved(['banán', 'je'])).toBe('ano');
  });
  it('najde odpověď na konci přepisu, kde je i konec otázky', () => {
    expect(rozpoznejOdpoved(['je to noční zvíře ne'])).toBe('ne');
    expect(rozpoznejOdpoved(['umí to zvíře létat ano'])).toBe('ano');
    expect(rozpoznejOdpoved(['dneska jsme byli venku na procházce v parku s pejskem a ne'])).toBe(null);
  });
});

describe('hovor okolo, opakování a start', () => {
  it('dlouhou větu z hovoru nebere jako odpověď', () => {
    const veta = 'ne ne a pak jsme jeli do Brna';
    expect(rozpoznejOdpoved([veta])).toBe(null);
    expect(jeHovorOkolo([veta])).toBe(true);
    expect(jeHovorOkolo(['ano'])).toBe(false);
  });

  for (const text of ['zopakuj to', 'Cože?', 'co prosím', 'můžeš to zopakovat', 'ještě jednou', 'co', 'nerozumím']) {
    it(`"${text}" → zopakovat`, () => expect(jeZopakuj([text])).toBe(true));
  }
  for (const text of ['ano', 'ne', 'nevím', 'co to je za zvíře v té knížce u babičky']) {
    it(`"${text}" není žádost o zopakování`, () => expect(jeZopakuj([text])).toBe(false));
  }

  for (const text of ['hra', 'Hra!', 'jdeme hrát', 'začni']) {
    it(`"${text}" spustí hru`, () => expect(jeStart([text])).toBe(true));
  }
  it('obyčejný hovor hru nespustí', () => expect(jeStart(['dneska je hezky'])).toBe(false));
});

describe('výpadky poslechu', () => {
  it('mlčení není výpadek, poslouchá se dál', () => {
    expect(jePorucha({ texty: [], chyba: 'no-speech', trvani: 6000 })).toBe(false);
    expect(jePorucha({ texty: [], trvani: 8000 })).toBe(false);
  });
  it('síť, okamžitý konec nebo chyba startu jsou výpadek', () => {
    expect(jePorucha({ texty: [], chyba: 'network', trvani: 3000 })).toBe(true);
    expect(jePorucha({ texty: [], chyba: 'aborted', trvani: 4000 })).toBe(true);
    expect(jePorucha({ texty: [], chyba: 'no-speech', trvani: 50 })).toBe(true);
    expect(jePorucha({ texty: [], chyba: 'start', trvani: 0 })).toBe(true);
  });
  it('slova bez přepisu jsou nesrozumitelná odpověď, mlčení ne', () => {
    expect(jeNesrozumitelne({ texty: [], chyba: 'no-match', trvani: 4000 })).toBe(true);
    expect(jeNesrozumitelne({ texty: [], trvani: 4000 })).toBe(true);
    expect(jeNesrozumitelne({ texty: [], chyba: 'no-speech', trvani: 6000 })).toBe(false);
    expect(jeNesrozumitelne({ texty: [], chyba: 'network', trvani: 4000 })).toBe(false);
    expect(jeNesrozumitelne({ texty: [], trvani: 100 })).toBe(false);
  });
  it('pauza po výpadcích roste, ale má strop', () => {
    expect(pauzaPoPoruse(1)).toBeLessThan(pauzaPoPoruse(3));
    expect(pauzaPoPoruse(MAX_PORUCH)).toBe(5000);
  });
});

describe('výběr přepisů', () => {
  it('bere finální, a průběžné jako zálohu', () => {
    expect(vyberTexty([{ text: 'ne', jistota: 0, final: false }])).toEqual(['ne']);
    expect(
      vyberTexty([
        { text: 'mne', jistota: 0.4, final: true },
        { text: 'ne', jistota: 0, final: false },
      ]),
    ).toEqual(['mne', 'ne']);
    expect(vyberTexty([{ text: ' ', jistota: 0, final: true }])).toEqual([]);
  });
});
