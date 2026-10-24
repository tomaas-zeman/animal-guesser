import { describe, expect, it } from 'vitest';
import { MAX_PORUCH, jeHovorOkolo, jeNesrozumitelne, jePorucha, jeStart, jeZopakuj, pauzaPoPoruse, rozpoznejOdpoved } from './poslech';

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
    ['neh', 'ne'],
    ['mně ano', 'ano'],
    ['no jo', 'ano'],
    ['no', null],
  ];
  for (const [text, cekam] of pripady) {
    it(`"${text}" → ${cekam}`, () => expect(rozpoznejOdpoved([text])).toBe(cekam));
  }

  const zapory: [string, string][] = [
    ['Neumí', 'Umí létat?'],
    ['nežije', 'Žije v lese?'],
    ['Nejí', 'Jí maso nebo jiná zvířata?'],
    ['nemá', 'Má peří?'],
    ['No ne', 'Je to pták?'],
    ['Né', 'Je to pták?'],
    ['ne ne ne', 'Je to pták?'],
    ['Není.', 'Je to drobný bezobratlý živočich, který není hmyz, třeba pavouk nebo šnek?'],
    ['nemyslím', 'Je to savec?'],
    ['nejspíš ne', 'Je to savec?'],
    ['nie', 'Je to savec?'],
  ];
  for (const [text, otazka] of zapory) {
    it(`"${text}" na „${otazka}“ → ne`, () => expect(rozpoznejOdpoved([text], otazka)).toBe('ne'));
  }

  const kladne: [string, string][] = [
    ['Umí', 'Umí létat?'],
    ['létá', 'Umí létat?'],
    ['plave', 'Umí plavat?'],
    ['Žije', 'Žije v lese?'],
    ['savec', 'Je to savec?'],
    ['bzučí', 'Bzučí?'],
  ];
  for (const [text, otazka] of kladne) {
    it(`"${text}" na „${otazka}“ → ano`, () => expect(rozpoznejOdpoved([text], otazka)).toBe('ano'));
  }

  it('"někdy" ani "nejspíš" nejsou zápor', () => {
    expect(rozpoznejOdpoved(['někdy'], 'Je aktivní hlavně v noci?')).toBe('mozna');
    expect(rozpoznejOdpoved(['nejspíš'], 'Je to savec?')).toBe('mozna');
    expect(rozpoznejOdpoved(['nevím'], 'Umí létat?')).toBe('nevim');
  });

  it('zkusí i další varianty přepisu', () => {
    expect(rozpoznejOdpoved(['banán', 'ano'])).toBe('ano');
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
