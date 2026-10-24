import { describe, expect, it } from 'vitest';
import {
  KRATKY_HLAS,
  MAX_PORUCH,
  bezNadavek,
  vyberTexty,
  jeHovorOkolo,
  jeNesrozumitelne,
  jePorucha,
  jeStart,
  jeZopakuj,
  pauzaPoPoruse,
  rozpoznejNadavku,
  rozpoznejOdpoved,
} from './poslech';

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
  it('jasné "ne" v kterékoli variantě přebije slabé "je" v první', () => {
    expect(rozpoznejOdpoved(['je', 'ne', 'né'])).toBe('ne');
    expect(rozpoznejOdpoved(['mně', 'je'])).toBe('ne');
    expect(rozpoznejOdpoved(['banán', 'je'])).toBe('ano');
    // "je" z otázky "Je to pták?" není ozvěna, která by "ne" přebila
    expect(rozpoznejOdpoved(['je', 'ne'], 'Je to pták?')).toBe('ne');
    expect(rozpoznejOdpoved(['některé'], 'Je to pták?')).toBe(null);
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

describe('krátký hlas bez přepisu', () => {
  it('není výpadek, ale nesrozumitelná odpověď', () => {
    const s = { texty: [], chyba: KRATKY_HLAS, trvani: 900 };
    expect(jePorucha(s)).toBe(false);
    expect(jeNesrozumitelne(s)).toBe(true);
  });
});

describe('průběžné přepisy z dřívějších událostí', () => {
  const prubezny = (text: string) => ({ text, jistota: 0, final: false });
  const finalni = (text: string) => ({ text, jistota: 0.9, final: true });

  it('"ne", které Chrome ve finálním výsledku zahodil, se neztratí', () => {
    // průběžně "ne", finální událost pak prázdná nebo "opravená"
    expect(vyberTexty([finalni('')], ['ne'])).toEqual(['ne']);
    expect(rozpoznejOdpoved(vyberTexty([finalni('mě je')], ['Ne']))).toBe('ne');
    expect(rozpoznejOdpoved(vyberTexty([], ['ne']))).toBe('ne');
  });
  it('rozpracovaný začátek delšího přepisu se nepřidá', () => {
    expect(vyberTexty([finalni('nejsi chytrá')], ['ne', 'nejsi', 'nejsi chy'])).toEqual(['nejsi chytrá']);
    expect(vyberTexty([finalni('nevím')], ['ne'])).toEqual(['nevím']);
    expect(vyberTexty([finalni('je to tak')], ['je'])).toEqual(['je to tak']);
  });
  it('nezdvojí, co už je ve výsledku', () => {
    expect(vyberTexty([finalni('Ne.')], ['ne'])).toEqual(['Ne.']);
    expect(vyberTexty([prubezny('ne')], ['ne'])).toEqual(['ne']);
  });
});

describe('nadávky postavičce', () => {
  const nadavky: [string, ReturnType<typeof rozpoznejNadavku>][] = [
    ['Ty jsi blbá', 'hloupost'],
    ['jsi hloupá', 'hloupost'],
    ['ty seš ale blbej', 'hloupost'],
    ['Hlupáku!', 'hloupost'],
    ['debile', 'hloupost'],
    ['ty idiote', 'hloupost'],
    ['nejsi moc chytrá', 'hloupost'],
    ['nic neumíš', 'hloupost'],
    ['to je blbost', 'hloupost'],
    ['to je hloupá otázka', 'hloupost'],
    ['Liško, ty jsi úplně pitomá', 'hloupost'],
    ['jsi hluchá?', 'hluchota'],
    ['Ty jsi hluchej', 'hluchota'],
    ['špatně slyšíš', 'hluchota'],
    ['neslyšíš', 'hluchota'],
    ['ty vole ty jsi hluchá', 'hluchota'],
    ['máš v uších banány', 'hluchota'],
    ['nerozumíš', 'hluchota'],
    ['drž hubu', 'hrubost'],
    ['Drž zobák!', 'hrubost'],
    ['sklapni', 'hrubost'],
    ['ty vole', 'hrubost'],
    ['jsi otravná', 'hrubost'],
    ['nesnáším tě', 'hrubost'],
    ['BLBÁ', 'hloupost'],
    ['blba', 'hloupost'],
    ['hlucha', 'hluchota'],
    ['Hluchá!', 'hluchota'],
    ['neslyšíš?', 'hluchota'],
    ['ty pitomče', 'hloupost'],
    ['ty magore', 'hloupost'],
    ['ty osle', 'hloupost'],
    ['to je k ničemu', 'hloupost'],
  ];
  for (const [text, druh] of nadavky) {
    it(`"${text}" → ${druh}`, () => expect(rozpoznejNadavku([text])).toBe(druh));
  }

  it('nadávka se nepočítá jako odpověď', () => {
    // "nejsi" by jinak bylo "ne", "je" by bylo "ano"
    expect(rozpoznejOdpoved(bezNadavek(['nejsi chytrá']))).toBe(null);
    expect(rozpoznejOdpoved(bezNadavek(['to je blbost']))).toBe(null);
    expect(rozpoznejOdpoved(bezNadavek(['ty jsi hloupá sova']), 'Je to sova?')).toBe(null);
    expect(rozpoznejOdpoved(bezNadavek(['neslyšíš']))).toBe(null);
  });

  const neniNadavka = [
    'ne',
    'ano',
    'nevím',
    'není',
    'neumí',
    'nejsou',
    'není to blbá odpověď',
    'nejsi hloupá',
    'nejsi blbá, jsi chytrá',
    'osel',
    'je to osel',
    'slepice',
    'tele',
    'kráva',
    'husa',
    'koza',
    'prase',
    'lín',
    'tuňák',
    'opice',
    'hlučná',
    'nerozumím',
    'neslyšela jsem',
    'zopakuj to',
    'nejsi chytrá ne',
  ];
  for (const text of neniNadavka) {
    it(`"${text}" není nadávka`, () => expect(rozpoznejNadavku([text])).toBe(null));
  }

  it('odpověď vedle nadávky má přednost', () => {
    expect(rozpoznejNadavku(['ne, ty blbá'])).toBe(null);
    expect(rozpoznejOdpoved(bezNadavek(['ne, ty blbá']))).toBe('ne');
    expect(rozpoznejOdpoved(bezNadavek(['ano ty hlupáku']))).toBe('ano');
    expect(rozpoznejOdpoved(bezNadavek(['nevím, drž hubu']))).toBe('nevim');
    expect(rozpoznejOdpoved(bezNadavek(['jasně že jo, ty vole']))).toBe('ano');
    // jasná odpověď v jiné variantě přepisu
    expect(rozpoznejNadavku(['ty blbá', 'ne'])).toBe(null);
  });

  it('přepisy bez nadávky se nemění', () => {
    for (const text of ['ne', 'nejsou', 'je to tak', 'nemá křídla', 'spíš ne', 'banán']) {
      expect(rozpoznejOdpoved(bezNadavek([text]), 'Je to pták?')).toBe(rozpoznejOdpoved([text], 'Je to pták?'));
    }
  });

  it('v dlouhém hovoru okolo nadávku nehledá', () => {
    expect(rozpoznejNadavku(['a pak říkal že ten kluk ze třídy je úplně blbý a že už s ním nikdy nepůjde ven'])).toBe(null);
  });
});
