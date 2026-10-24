import { describe, expect, it } from 'vitest';
import { rozpoznejOdpoved } from './poslech';

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
