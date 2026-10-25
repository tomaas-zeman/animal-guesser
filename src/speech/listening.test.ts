import { describe, expect, it } from 'vitest';
import {
  SHORT_VOICE,
  MAX_FAILURES,
  withoutInsults,
  selectTexts,
  isBackgroundTalk,
  isUnintelligible,
  isFailure,
  isStart,
  isRepeatRequest,
  pauseAfterFailure,
  detectInsult,
  recognizeAnswer,
} from './listening';

describe('recognizing an answer from speech', () => {
  const cases: [string, ReturnType<typeof recognizeAnswer>][] = [
    ['Ano', 'yes'],
    ['jo jo', 'yes'],
    ['určitě', 'yes'],
    ['Ne', 'no'],
    ['není', 'no'],
    ['spíš ne', 'no'],
    ['asi ne', 'no'],
    ['Nevím', 'unknown'],
    ['netuším', 'unknown'],
    ['může být', 'maybe'],
    ['možná', 'maybe'],
    ['asi', 'maybe'],
    ['spíš ano', 'maybe'],
    ['no jo', 'yes'],
    ['ani náhodou', 'no'],
    ['banán', null],
    // forms of "ne" as speech recognition actually transcribes it
    ['NE!', 'no'],
    ['Né.', 'no'],
    ['neee', 'no'],
    ['nene', 'no'],
    ['ne ne ne', 'no'],
    ['no ne', 'no'],
    ['to ne', 'no'],
    ['vůbec ne', 'no'],
    ['nemá', 'no'],
    ['neumí', 'no'],
    ['nikoliv', 'no'],
    ['N', 'no'],
    ['mně', 'no'],
    ['nelétá', 'no'],
    ['nejsou', 'no'],
    ['ne, není', 'no'],
    ['nemá křídla', 'no'],
    ['nežije v lese', 'no'],
    ['je', 'yes'],
    ['je to tak', 'yes'],
    ['ano je', 'yes'],
    ['někdy', 'maybe'],
    ['nejspíš', 'maybe'],
    ['nevím', 'unknown'],
    ['neh', 'no'],
    ['mně ano', 'yes'],
    ['no jo', 'yes'],
    ['no', null],
  ];
  for (const [text, expected] of cases) {
    it(`"${text}" → ${expected}`, () => expect(recognizeAnswer([text])).toBe(expected));
  }

  const negations: [string, string][] = [
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
  for (const [text, question] of negations) {
    it(`"${text}" to "${question}" → no`, () => expect(recognizeAnswer([text], question)).toBe('no'));
  }

  const positive: [string, string][] = [
    ['Umí', 'Umí létat?'],
    ['létá', 'Umí létat?'],
    ['plave', 'Umí plavat?'],
    ['Žije', 'Žije v lese?'],
    ['savec', 'Je to savec?'],
    ['bzučí', 'Bzučí?'],
  ];
  for (const [text, question] of positive) {
    it(`"${text}" to "${question}" → yes`, () => expect(recognizeAnswer([text], question)).toBe('yes'));
  }

  it('neither "někdy" nor "nejspíš" is a negation', () => {
    expect(recognizeAnswer(['někdy'], 'Je aktivní hlavně v noci?')).toBe('maybe');
    expect(recognizeAnswer(['nejspíš'], 'Je to savec?')).toBe('maybe');
    expect(recognizeAnswer(['nevím'], 'Umí létat?')).toBe('unknown');
  });

  it('tries the other transcript variants too', () => {
    expect(recognizeAnswer(['banán', 'ano'])).toBe('yes');
  });
  it('a clear "ne" in any variant outweighs a weak "je" in the first', () => {
    expect(recognizeAnswer(['je', 'ne', 'né'])).toBe('no');
    expect(recognizeAnswer(['mně', 'je'])).toBe('no');
    expect(recognizeAnswer(['banán', 'je'])).toBe('yes');
    // "je" from the question "Je to pták?" is not an echo that would outweigh "ne"
    expect(recognizeAnswer(['je', 'ne'], 'Je to pták?')).toBe('no');
    expect(recognizeAnswer(['některé'], 'Je to pták?')).toBe(null);
  });
  it('finds the answer at the end of a transcript that also contains the end of the question', () => {
    expect(recognizeAnswer(['je to noční zvíře ne'])).toBe('no');
    expect(recognizeAnswer(['umí to zvíře létat ano'])).toBe('yes');
    expect(recognizeAnswer(['dneska jsme byli venku na procházce v parku s pejskem a ne'])).toBe(null);
  });
});

describe('background talk, repeating and start', () => {
  it('does not take a long sentence of chatter as an answer', () => {
    const sentence = 'ne ne a pak jsme jeli do Brna';
    expect(recognizeAnswer([sentence])).toBe(null);
    expect(isBackgroundTalk([sentence])).toBe(true);
    expect(isBackgroundTalk(['ano'])).toBe(false);
  });

  for (const text of ['zopakuj to', 'Cože?', 'co prosím', 'můžeš to zopakovat', 'ještě jednou', 'co', 'nerozumím']) {
    it(`"${text}" → repeat`, () => expect(isRepeatRequest([text])).toBe(true));
  }
  for (const text of ['ano', 'ne', 'nevím', 'co to je za zvíře v té knížce u babičky']) {
    it(`"${text}" is not a repeat request`, () => expect(isRepeatRequest([text])).toBe(false));
  }

  for (const text of ['hra', 'Hra!', 'jdeme hrát', 'začni']) {
    it(`"${text}" starts the game`, () => expect(isStart([text])).toBe(true));
  }
  it('ordinary chatter does not start the game', () => expect(isStart(['dneska je hezky'])).toBe(false));
});

describe('listening failures', () => {
  it('silence is not a failure, listening continues', () => {
    expect(isFailure({ texts: [], error: 'no-speech', duration: 6000 })).toBe(false);
    expect(isFailure({ texts: [], duration: 8000 })).toBe(false);
  });
  it('network, an immediate end or a start error are a failure', () => {
    expect(isFailure({ texts: [], error: 'network', duration: 3000 })).toBe(true);
    expect(isFailure({ texts: [], error: 'aborted', duration: 4000 })).toBe(true);
    expect(isFailure({ texts: [], error: 'no-speech', duration: 50 })).toBe(true);
    expect(isFailure({ texts: [], error: 'start', duration: 0 })).toBe(true);
  });
  it('words without a transcript are an unintelligible answer, silence is not', () => {
    expect(isUnintelligible({ texts: [], error: 'no-match', duration: 4000 })).toBe(true);
    expect(isUnintelligible({ texts: [], duration: 4000 })).toBe(true);
    expect(isUnintelligible({ texts: [], error: 'no-speech', duration: 6000 })).toBe(false);
    expect(isUnintelligible({ texts: [], error: 'network', duration: 4000 })).toBe(false);
    expect(isUnintelligible({ texts: [], duration: 100 })).toBe(false);
  });
  it('the pause grows after failures, but is capped', () => {
    expect(pauseAfterFailure(1)).toBeLessThan(pauseAfterFailure(3));
    expect(pauseAfterFailure(MAX_FAILURES)).toBe(5000);
  });
});

describe('selecting transcripts', () => {
  it('takes the final ones, and the interim ones as a fallback', () => {
    expect(selectTexts([{ text: 'ne', confidence: 0, final: false }])).toEqual(['ne']);
    expect(
      selectTexts([
        { text: 'mne', confidence: 0.4, final: true },
        { text: 'ne', confidence: 0, final: false },
      ]),
    ).toEqual(['mne', 'ne']);
    expect(selectTexts([{ text: ' ', confidence: 0, final: true }])).toEqual([]);
  });
});

describe('short voice without a transcript', () => {
  it('is not a failure, but an unintelligible answer', () => {
    const s = { texts: [], error: SHORT_VOICE, duration: 900 };
    expect(isFailure(s)).toBe(false);
    expect(isUnintelligible(s)).toBe(true);
  });
});

describe('interim transcripts from earlier events', () => {
  const interim = (text: string) => ({ text, confidence: 0, final: false });
  const finalOnes = (text: string) => ({ text, confidence: 0.9, final: true });

  it('a "ne" that Chrome dropped in the final result is not lost', () => {
    // interim "ne", then the final event is empty or "corrected"
    expect(selectTexts([finalOnes('')], ['ne'])).toEqual(['ne']);
    expect(recognizeAnswer(selectTexts([finalOnes('mě je')], ['Ne']))).toBe('no');
    expect(recognizeAnswer(selectTexts([], ['ne']))).toBe('no');
  });
  it('an unfinished beginning of a longer transcript is not added', () => {
    expect(selectTexts([finalOnes('nejsi chytrá')], ['ne', 'nejsi', 'nejsi chy'])).toEqual(['nejsi chytrá']);
    expect(selectTexts([finalOnes('nevím')], ['ne'])).toEqual(['nevím']);
    expect(selectTexts([finalOnes('je to tak')], ['je'])).toEqual(['je to tak']);
  });
  it('does not duplicate what is already in the result', () => {
    expect(selectTexts([finalOnes('Ne.')], ['ne'])).toEqual(['Ne.']);
    expect(selectTexts([interim('ne')], ['ne'])).toEqual(['ne']);
  });
});

describe('insults to the character', () => {
  const insults: [string, ReturnType<typeof detectInsult>][] = [
    ['Ty jsi blbá', 'stupidity'],
    ['jsi hloupá', 'stupidity'],
    ['ty seš ale blbej', 'stupidity'],
    ['Hlupáku!', 'stupidity'],
    ['debile', 'stupidity'],
    ['ty idiote', 'stupidity'],
    ['nejsi moc chytrá', 'stupidity'],
    ['nic neumíš', 'stupidity'],
    ['to je blbost', 'stupidity'],
    ['to je hloupá otázka', 'stupidity'],
    ['Liško, ty jsi úplně pitomá', 'stupidity'],
    ['jsi hluchá?', 'deafness'],
    ['Ty jsi hluchej', 'deafness'],
    ['špatně slyšíš', 'deafness'],
    ['neslyšíš', 'deafness'],
    ['ty vole ty jsi hluchá', 'deafness'],
    ['máš v uších banány', 'deafness'],
    ['nerozumíš', 'deafness'],
    ['drž hubu', 'rudeness'],
    ['Drž zobák!', 'rudeness'],
    ['sklapni', 'rudeness'],
    ['ty vole', 'rudeness'],
    ['jsi otravná', 'rudeness'],
    ['nesnáším tě', 'rudeness'],
    ['BLBÁ', 'stupidity'],
    ['blba', 'stupidity'],
    ['hlucha', 'deafness'],
    ['Hluchá!', 'deafness'],
    ['neslyšíš?', 'deafness'],
    ['ty pitomče', 'stupidity'],
    ['ty magore', 'stupidity'],
    ['ty osle', 'stupidity'],
    ['to je k ničemu', 'stupidity'],
  ];
  for (const [text, kind] of insults) {
    it(`"${text}" → ${kind}`, () => expect(detectInsult([text])).toBe(kind));
  }

  it('an insult does not count as an answer', () => {
    // "nejsi" would otherwise count as "ne" and "je" as "ano"
    expect(recognizeAnswer(withoutInsults(['nejsi chytrá']))).toBe(null);
    expect(recognizeAnswer(withoutInsults(['to je blbost']))).toBe(null);
    expect(recognizeAnswer(withoutInsults(['ty jsi hloupá liško']), 'Je to sova?')).toBe(null);
    expect(recognizeAnswer(withoutInsults(['neslyšíš']))).toBe(null);
  });

  const notInterjections = [
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
  for (const text of notInterjections) {
    it(`"${text}" is not an insult`, () => expect(detectInsult([text])).toBe(null));
  }

  it('an answer next to an insult takes precedence', () => {
    expect(detectInsult(['ne, ty blbá'])).toBe(null);
    expect(recognizeAnswer(withoutInsults(['ne, ty blbá']))).toBe('no');
    expect(recognizeAnswer(withoutInsults(['ano ty hlupáku']))).toBe('yes');
    expect(recognizeAnswer(withoutInsults(['nevím, drž hubu']))).toBe('unknown');
    expect(recognizeAnswer(withoutInsults(['jasně že jo, ty vole']))).toBe('yes');
    // a clear answer in a different transcript variant
    expect(detectInsult(['ty blbá', 'ne'])).toBe(null);
  });

  it('transcripts without an insult stay unchanged', () => {
    for (const text of ['ne', 'nejsou', 'je to tak', 'nemá křídla', 'spíš ne', 'banán']) {
      expect(recognizeAnswer(withoutInsults([text]), 'Je to pták?')).toBe(recognizeAnswer([text], 'Je to pták?'));
    }
  });

  it('it does not look for an insult in long background talk', () => {
    expect(detectInsult(['a pak říkal že ten kluk ze třídy je úplně blbý a že už s ním nikdy nepůjde ven'])).toBe(null);
  });
});
