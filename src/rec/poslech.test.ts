import { describe, expect, it } from 'vitest';
import { jeHovorOkolo, jeStart, jeZopakuj, rozpoznejOdpoved } from './poslech';

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
    ['banán', null],
  ];
  for (const [text, cekam] of pripady) {
    it(`"${text}" → ${cekam}`, () => expect(rozpoznejOdpoved([text])).toBe(cekam));
  }

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

  for (const text of ['zopakuj to', 'Cože?', 'co prosím', 'můžeš to zopakovat', 'ještě jednou', 'co']) {
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
