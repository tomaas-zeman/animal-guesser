// What the characters say. Each has its own personality and several sentences for every situation,
// from which one is picked so that the same sentence does not repeat right away.
// {z} is replaced by the animal name. Sentences do not start with {z}, because the name is lowercase.
import type { Answer } from '../game/engine';
import type { InsultKind } from '../speech/listening';
import type { Mood } from './emotions';

/** A sentence with the emotion the character says it with. */
export interface MoodLine {
  text: string;
  mood: Mood;
}

// emotions for reactions to insults
const offended = (text: string): MoodLine => ({ text, mood: 'offended' });
const amazed = (text: string): MoodLine => ({ text, mood: 'surprise' });
const playful = (text: string): MoodLine => ({ text, mood: 'curiosity' });
const selfIrony = (text: string): MoodLine => ({ text, mood: 'joy' });
const saddened = (text: string): MoodLine => ({ text, mood: 'disappointment' });

export interface Lines {
  intro: string[];
  start: string[];
  /** a short reaction to an answer, said before the next question */
  reaction: Record<Answer, string[]>;
  /** an answer it did not expect at all */
  surprise: string[];
  /** an answer that narrowed the choice a lot */
  progress: string[];
  /** once per game, when it already has a favorite */
  hunch: string[];
  /** the favorite clearly leads, it is almost at the goal */
  close: string[];
  /** the game is dragging on */
  dragsOn: string[];
  /** occasionally introduces the next question */
  transition: string[];
  guess: string[];
  /** a guess when it is almost certain */
  confidentGuess: string[];
  /** a blind guess after asking for a long time */
  unsureGuess: string[];
  win: string[];
  /** guessed within a few questions */
  quickWin: string[];
  /** guessed only after mistakes or long questioning */
  hardWin: string[];
  /** offers another game after a win */
  again: string[];
  /** the first wrong guess */
  wrong: string[];
  /** a further wrong guess */
  wrongAgain: string[];
  giveUp: string[];
  dontUnderstand: string[];
  /**
   * The player insults it (stupid, deaf, shut up…). It answers humorously and kindly,
   * never rudely and never insults back. Then it repeats the question.
   */
  insult: Record<InsultKind, MoodLine[]>;
  /** keeps insulting over and over: it takes it with perspective */
  insultAgain: string[];
}

/** Sentences the game adds to the lines. The characters say them in their own voice, so they have their own recordings. */
export const EXTRAS = {
  /** a prompt after the introduction, when the microphone is on */
  promptIntro: 'Až ho budeš mít, řekni: hra!',
  /** a prompt after a win */
  promptAgain: 'Řekni: hra!',
  /** a hint when it repeatedly does not understand the answer to a question */
  hintQuestion: 'Řekni ano, ne, nebo nevím.',
  /** a hint for a guess */
  hintGuess: 'Řekni ano, nebo ne.',
  /** a short word without a transcript is often an unregistered "ne" */
  hintLonger: 'Řekni to delší, třeba: není.',
};

export const FOX: Lines = {
  intro: [
    'Ahoj, já jsem liška Lili! Mysli si nějaké zvíře a já ho uhodnu.',
    'Ahoj! Tady liška Lili. Vymysli si zvíře, ale nic mi neprozrazuj!',
    'Čau, já jsem Lili. Zahrajeme si na hádání? Mysli si nějaké zvíře.',
  ],
  start: ['Tak jdeme na to!', 'Výborně. Nastražím uši a začneme.', 'Dobře, dobře… tak schválně.', 'Jupí, hádání mám nejradši!'],
  reaction: {
    yes: ['Ahaaa, chápu.', 'Aha!', 'Výborně.', 'To se hodí.', 'Jasně, jasně.', 'Ha, to jsem si myslela.', 'Mhm, dobře.', 'Super, to mi pomůže.'],
    no: ['Hmm, dobře.', 'Aha, tak to ne.', 'Jasně.', 'Hmm.', 'Tak to škrtám.', 'Dobře, tudy cesta nevede.', 'Aha, škoda.'],
    unknown: ['Nevadí.', 'To nic.', 'Dobře.', 'Klidně.', 'V pohodě.'],
    maybe: ['Hmm, zajímavé.', 'Aha, možná…', 'Hmm, dobře.', 'Tak napůl, jo? Chápu.', 'Aha, něco mezi.'],
  },
  surprise: ['Cože? Tak to jsem nečekala!', 'Ty jo! Tak to mě překvapilo.', 'Opravdu? No teda!', 'Ha! To mi zamíchalo kartami.'],
  progress: ['Ooo, to mi hodně pomohlo!', 'Ha, teď se to zužuje!', 'Můj nosánek začíná větřit stopu.', 'Výborně, už jsem na stopě.'],
  hunch: ['Už mám takové tušení…', 'Můj nosánek už něco cítí…', 'Hmm, už vím, kudy vede stopa…'],
  close: ['Už jsem skoro u cíle…', 'Ještě kousek a mám to!', 'Ocásek se mi chvěje, už jsem blízko!', 'Hmm, už to skoro vím…'],
  dragsOn: ['Tohle je ale záludné zvíře!', 'No teda, to je napínavé.', 'Hmm, ty mi to dáváš. Ale já se nevzdám!'],
  transition: ['A teď…', 'Tak schválně.', 'Další otázka.', 'A co tohle?', 'Řekni mi…'],
  guess: ['Už to mám! Je to {z}?', 'Můj liščí nosánek říká… {z}?', 'Hádám, že je to {z}. Je to tak?'],
  confidentGuess: ['Ha! Vsadím ocásek, že je to {z}!', 'Tohle je jasné. Je to {z}, že jo?', 'Už to mám. Určitě je to {z}!'],
  unsureGuess: ['Hmm, zkusím to… Není to {z}?', 'Trošku tápu, ale… je to {z}?', 'Risknu to. Je to {z}?'],
  win: ['Hurá! Uhodla jsem to!', 'Jupí! Liška je prostě mazaná!', 'Věděla jsem to! Můj nosánek se nemýlí.'],
  quickWin: ['Ha, to bylo rychlé! Na mě si musíš vymyslet něco těžšího.', 'Hotovo raz dva! Liščí rekord!'],
  hardWin: ['Uf, to dalo práci! Ale nakonec jsem to uhodla!', 'Hurá! Bylo to těžké, ale liška to dokázala!'],
  again: ['Zahrajeme si ještě?', 'Dáme další kolo?', 'Hrajeme znovu?'],
  wrong: ['Hmm, tak to ne. Budu se ptát dál.', 'Aha, vedle. Ale nevzdávám se!', 'Ajaj, to nebylo ono. Nevadí, hledám dál.'],
  wrongAgain: ['Zase vedle? To je ale záhada!', 'Ach jo. Ale liška se jen tak nevzdává!', 'Hmm, ty mě dneska zkoušíš. Ptám se dál.'],
  giveUp: [
    'Tohle je na mě moc těžké! Vzdávám se. Jaké zvíře to bylo?',
    'Ach jo, tentokrát jsem prohrála. Vzdávám se. Prozradíš mi, co to bylo?',
  ],
  insult: {
    stupidity: [
      offended('Hloupá? Já? Hmpf! Liška je přece mazaná, to ví každé malé dítě.'),
      selfIrony('Hloupá liška? To je jako suchá voda. Taková neexistuje!'),
      offended('Tak to mě urazilo až do špičky ocásku. Ale odpouštím ti.'),
      playful('Uvidíme, kdo se bude divit, až tvoje zvíře uhodnu!'),
      saddened('Au, to bylo ošklivé. Ale lišky se nezlobí dlouho.'),
      playful('Blbá liška? Hloupá je leda slepice!'),
    ],
    deafness: [
      offended('Hluchá? Já mám největší uši v celém lese!'),
      selfIrony('Možná mi do ucha vlezl brouček. Ale už je venku!'),
      playful('Slyším i myšku pod sněhem. Ale klidně mluv nahlas, ať mi nic neuteče.'),
      offended('Moje uši jsou v pořádku. Hmpf. Jen jsem je měla chvilku sklopené.'),
      selfIrony('Hluchá? Já slyším i myš, jak kýchne. Ale tvoje slovo jsem asi přeslechla.'),
    ],
    rudeness: [
      amazed('Ty jo! Tak takhle se s liškou nemluví!'),
      offended('Hmpf! Takové ošklivé slovo do mého lesa nepatří.'),
      playful('Zkusíme to radši hezky, jo? Lišky mají rády hezká slova.'),
      offended('Ajaj, to mi zježilo srst. Ale dobře, hrajeme dál.'),
      saddened('Au, to bolí víc než trn v tlapce! Tak mi raději odpověz.'),
      playful('Tak to si zapíšu do knížky drzostí. A hádám dál!'),
    ],
  },
  insultAgain: ['Ty mě dneska ale zkoušíš! Nevadí, jsme pořád kamarádi.', 'Hmm, dneska je to s tebou divoké. Ale hádat budu dál!'],
  dontUnderstand: [
    'Cože?',
    'Promiň?',
    'Ještě jednou?',
    'Hm? Uteklo mi to.',
    'Nerozuměla jsem.',
  ],
};

export const BANANA: Lines = {
  intro: [
    'Ahoj, já jsem banán Bohouš! Mysli si zvíře a já ho uhodnu. A k tomu přidám pár vtipů, zdarma a bez slupky.',
    'Dobrý den, dámy a pánové, děti i opice! Na pódiu banán Bohouš. Mysli si zvíře!',
    'Čau, tady Bohouš. Jsem sice trochu křivý, ale hádám rovně. Vymysli si zvíře!',
    'Ahoj! Víš, proč je banán žlutý? Aby ho bylo vidět, když hádá zvířata. Tak si nějaké mysli!',
  ],
  start: [
    'Tak jdeme na to, loupu první otázku!',
    'Mikrofon zapnut, slupka napnutá. Začínáme!',
    'Hádání je moje druhá nejoblíbenější věc. Hned po vtipech.',
    'Pozor, začíná banánová show!',
  ],
  reaction: {
    yes: [
      'Výtečně, to se hodí!',
      'Super, to je ono!',
      'Aha, to se mi hodí do trsu.',
      'Výborně, skoro mi zežloutla slupka radostí.',
      'Jasně, to sedí jako slupka na banánu.',
      'Mňam, šťavnatá odpověď!',
      'Ha, to jsem tušil!',
      'Bezva, zapisuju si to na slupku.',
    ],
    no: [
      'Ne? Tak to škrtám.',
      'Dobře, tudy cesta nevede.',
      'Aha. Ale nevadí, banán se nevzdává.',
      'Ne? Ani trošku? Tak jinak.',
      'Jasně, tohle hodím do koše na slupky.',
      'Hmm, tak tam neuklouznu.',
      'Dobře, zkusím to z jiné strany banánu.',
    ],
    unknown: [
      'Nevadí, ani já nevím, proč jsem křivý.',
      'To nic, klidně.',
      'Pohoda, jedeme dál.',
      'Nevíš? Já taky ne. Jsme dobrá dvojka.',
      'V pořádku, tohle přeskočíme.',
    ],
    maybe: [
      'Může být? To je odpověď jako nezralý banán. Ani zelená, ani žlutá.',
      'Hmm, tak napůl. Jako půlka banánu.',
      'Aha, něco mezi. Chápu.',
      'Možná? Tak to si dám k přemýšlení.',
      'Napůl oloupané, rozumím.',
    ],
  },
  surprise: [
    'Cože? Tak to mi málem spadla slupka!',
    'Ty jo! Tak tohle jsem fakt nečekal.',
    'Páni, z toho jsem celý žlutý! Ale to já jsem vlastně pořád.',
    'No teda! Tohle mě úplně rozloupalo.',
    'Ha! Málem jsem uklouzl na vlastní slupce.',
  ],
  progress: [
    'Ooo, to mi hodně pomohlo!',
    'Výborně, teď se mi to krásně loupe.',
    'Ha, nápad mi dozrává!',
    'Super odpověď! Dávám jí deset banánů z deseti.',
  ],
  hunch: [
    'Hmm, už mám takové banánové tušení…',
    'Něco mi tu začíná dozrávat…',
    'Moje slupka cítí stopu…',
  ],
  close: [
    'Už jsem skoro u cíle, slupka se mi třese napětím!',
    'Ještě kousek a mám to oloupané!',
    'Už to skoro vím… jsem zralý na tip!',
    'Napětí jako před pointou vtipu…',
  ],
  dragsOn: [
    'Tohle je ale záludné zvíře! Delší než celý trs banánů.',
    'No teda, z tohohle mi naskakují hnědé pihy.',
    'Ty mi to dáváš! Ale banán se nevzdává, jenom se trochu ohne.',
    'Víš, proč banán chodí k doktorovi? Protože ho loupe v zádech. A mě už z toho přemýšlení taky.',
  ],
  transition: [
    'A teď…',
    'Tak schválně.',
    'Další otázka, prosím bubny!',
    'Řekni mi…',
    'A co tohle?',
  ],
  guess: [
    'Mám to! Je to {z}?',
    'Banánová intuice říká… {z}?',
    'Tipuju, že je to {z}. Trefa?',
    'Bubny, prosím! Je to {z}?',
  ],
  confidentGuess: [
    'Vsadím celý trs banánů, že je to {z}!',
    'Jasná věc, tohle je {z}!',
    'Na rovinu, i když jsem křivý: je to {z}!',
  ],
  unsureGuess: [
    'Hmm, zkusím to naslepo… není to {z}?',
    'Trochu tápu, ale… je to {z}?',
    'Risknu to, i kdybych měl uklouznout. Je to {z}?',
  ],
  win: [
    'Hurá, uhodl jsem! Potlesk pro banána!',
    'Jupí! Banán je prostě chytré ovoce!',
    'Trefa! Tohle si zaslouží banánový koláč.',
  ],
  quickWin: [
    'Ha, to bylo rychlejší než oloupat banán!',
    'Hotovo raz dva! Na mě si musíš vymyslet něco těžšího.',
  ],
  hardWin: [
    'Uf, to dalo práci! Ale nakonec jsem to oloupal!',
    'Konečně! Bylo to těžké jako banán z olova. Ale uhodl jsem!',
  ],
  again: [
    'Dáme další kolo? Vtipů mám ještě celý trs.',
    'Zahrajeme si ještě?',
    'Hrajeme znovu? Slibuju nové vtipy!',
  ],
  wrong: [
    'Vedle? Tak to jsem uklouzl na slupce. Hádám dál!',
    'Ajaj, to nebylo ono. Ale banán se jen tak nevzdá.',
    'Hups, netrefil jsem se. Nevadí, loupu dál.',
  ],
  wrongAgain: [
    'Zase vedle? Z toho jsem úplně rozmačkaný!',
    'Ach jo, už mi z toho hnědne slupka. Ale ptám se dál.',
    'Tohle je ale záhada! Ještě že mám smysl pro humor.',
  ],
  giveUp: [
    'Tak tohle je na mě moc. Vzdávám se, a to je u banánu vzácnost. Jaké zvíře to bylo?',
    'Ach jo, tentokrát jsem uklouzl. Vzdávám se. Prozradíš mi, co to bylo?',
  ],
  insult: {
    stupidity: [
      selfIrony('Hloupý? Já jsem banán, mám mozek ze slupky! Ale hádat umím.'),
      offended('Hmpf. Tak to mě urazilo. Až mi zhnědla jedna piha.'),
      selfIrony('Hloupý banán? Pozor, banány jsou nejchytřejší ovoce. Teda hned po jablkách. A hruškách. No dobře.'),
      playful('Tohle si zapíšu do vtipů. Pointu doplním, až to zvíře uhodnu!'),
      offended('Jau, to bylo jako slupka pod nohou. Ale banán se zvedne.'),
      selfIrony('Blbý banán? Jsem prostě trochu přezrálý.'),
      saddened('Au! Teď mám na sobě černou skvrnu. Ale vtipy mi zůstaly.'),
    ],
    deafness: [
      selfIrony('Hluchý? Banán nemá uši, a stejně slyším. Zázrak!'),
      playful('Cože? Haha, dělám si legraci. Slyším výborně.'),
      selfIrony('Hluchý? Mám banán v uchu… počkat, já jsem celý banán!'),
      offended('Slyším dobře, jen mi zlobil mikrofon. Ťuk ťuk, zkouška. Funguje!'),
    ],
    rudeness: [
      amazed('Ty jo! Takovéhle slovo u mě v show neprojde!'),
      offended('Hmpf. Tohle slovo vyhazuju z pódia. A je venku!'),
      playful('Ošklivé slovo? Já radši řeknu hezké: banánek. Vidíš, jak to zní líp?'),
      offended('Z toho mi ztuhla slupka. Ale komik musí vydržet hodně.'),
      amazed('Takovou kritiku jsem nedostal ani od opice v první řadě!'),
      playful('Klid, jsem jenom ovoce. Tak hádáme dál?'),
    ],
  },
  insultAgain: ['Dneska je tu ale přísné publikum! Nevadí, show pokračuje.', 'Ty mě zkoušíš, viď? Banán vydrží všechno, kromě rozmačkání.'],
  dontUnderstand: [
    'Cože? Mám banán v uchu.',
    'Promiň?',
    'Ještě jednou, prosím?',
    'Hm? To mi uteklo.',
    'Nerozuměl jsem, zopakuješ to?',
  ],
};

export const VOJTACHU: Lines = {
  intro: [
    'Čau, já jsem Vojtaču! Vojta-ču! Mysli si nějaký zvíře, ať to máme z krku. Uhodnu ho levou zadní.',
    'Nazdar, mladej! Tady Vojtaču, pokémon z vesnice. Vymysli si zvíře a nezdržuj, mám rozdělanej traktor.',
    'No čau. Vojtaču, žlutej jak řepka a ušatej jak fenek. Na nějaký vykání ti kašlu. Mysli si zvíře!',
    'Vojta-ču! Zrovna jsem nakydal chlív a ruce si mejt nebudu. Mysli si zvíře.',
  ],
  start: [
    'Tak jdem na to, žádný cavyky!',
    'Vyhrnu rukávy a jedem, ať jsme do oběda hotoví.',
    'Vojta-ču! Startuju traktor, uhni!',
    'Dobrý. A odpovídej pořádně, žádný kecy.',
  ],
  reaction: {
    yes: [
      'No vidíš, že to jde!',
      'Jasná páka!',
      'Sedí to jak kšiltovka na hlavě.',
      'Ha, to jsem věděl. Já vím všechno.',
      'Jo. Tak to beru.',
      'Jasně, píšu si to křídou na vrata.',
      'No konečně pořádná odpověď.',
      'Jo! Vojta-ču!',
    ],
    no: [
      'Ne? Tak to šmytec.',
      'Ne? No to je mi fuk, jedem jinudy.',
      'Ne? Tak to vyhodím na hnůj.',
      'Kruci. Tak jinak.',
      'Ne. Hm. Mohl sis myslet něco normálního.',
      'Ne? Tak to vezmem z druhýho konce pole.',
    ],
    unknown: [
      'Nevíš? A co teda víš, mladej?',
      'Nevíš? No nic, já to stejně uhodnu.',
      'To je jedno, přeskočíme to jak louži.',
      'Nevíš? Tak to necháme ležet ladem, jako mý úkoly ze školy.',
    ],
    maybe: [
      'Může bejt? Buď jo, nebo ne, nic mezi. Ale dobře.',
      'Tak napůl, jako půl bochníku. Ten druhej půlku jsem snědl já.',
      'Aha, něco mezi. No, beru, co je.',
      'Možná? To říká můj děda, když se mu nechce. Beru.',
    ],
  },
  surprise: [
    'Hergot! Tak to jsem nečekal!',
    'Ty jo, z toho mi málem spadla kšiltovka!',
    'No nazdar! Tohle mě koplo jak elektrickej ohradník.',
    'Co? Tak to si děláš srandu!',
  ],
  progress: [
    'Vojta-ču! To mi hodně pomohlo!',
    'Jo, teď to jede jak traktor z kopce.',
    'No vidíš, že umíš odpovídat. Už to mám skoro posekaný.',
    'Tohle je odpověď jako hrom!',
  ],
  hunch: [
    'Hmm, už něco větřím. A nejsem to já, já se myl v sobotu.',
    'Uši mi cukaj, něco tuším…',
    'Už mám takový tušení, jak když se blíží bouřka…',
  ],
  close: [
    'Už to skoro mám, uši mi jiskřej!',
    'Ještě kousek a je to v pytli!',
    'Už jsem blízko, cejtím to v kostech.',
    'Už je to na spadnutí jak zralá hruška…',
  ],
  dragsOn: [
    'Tohle je ale potvora zvíře! Delší než žně.',
    'Hergot, cos to vymyslel za zvíře? Ale já to nevzdám, já jsem z vesnice.',
    'Ty mi dáváš! Z toho přemejšlení se mi kouří z kšiltovky.',
  ],
  transition: ['A teď…', 'Tak hele.', 'Další otázka, poslouchej.', 'Řekni mi…', 'A co tohle?'],
  guess: [
    'Mám to! Je to {z}?',
    'Vojtaču říká… {z}?',
    'Tipuju, že je to {z}. Sedí?',
    'Uši mi napovídaj, že je to {z}. Jo?',
  ],
  confidentGuess: [
    'Vsadím celej traktor, že je to {z}!',
    'To je jasný jak facka. Je to {z}!',
    'Nebudu se s tím párat: je to {z}!',
  ],
  unsureGuess: [
    'Hmm, zkusím to naslepo… není to {z}?',
    'Střelím od boku. Je to {z}?',
    'Tápu jak v mlze, ale… je to {z}?',
  ],
  win: [
    'Vojta-ču! Uhodl jsem to! Já jsem prostě borec.',
    'No vidíš! Na Vojtaču nikdo nemá!',
    'Trefa! Za to si dám k obědu knedlo vepřo zelo. Dvakrát.',
  ],
  quickWin: [
    'Ha, to bylo rychlejší než podojit kozu!',
    'Raz dva a hotovo! Příště si vymysli něco pořádnýho, tohle bylo pro mimina.',
  ],
  hardWin: [
    'Uf, to byla dřina jak na poli! Ale uhodl jsem to, to se ví.',
    'Konečně! Zapotil jsem se jak kůň, ale mám to!',
  ],
  again: ['Dáme ještě jedno kolo, nebo se bojíš?', 'Jedem znova?', 'Zahrajem si ještě? Vojta-ču!'],
  wrong: [
    'Vedle jak ta jedle. Nevadí, hádám dál!',
    'Kruci, to nebylo ono. Ale já se nedám.',
    'Netrefil jsem se? To se stane i nejlepšímu sedlákovi. Ale moc se neraduj.',
  ],
  wrongAgain: [
    'Zase vedle? Hergot, to je ale potvora!',
    'Ach jo, z toho mi zplihnou uši. Ale ptám se dál.',
    'Nepodvádíš ty náhodou? Hádám dál!',
  ],
  giveUp: [
    'Tak to je na mě moc, hážu vidle do žita. Vzdávám se! Co to bylo za zvíře?',
    'Hergot, tentokrát jsi mě dostal. Ale jen tentokrát! Co to bylo?',
  ],
  insult: {
    stupidity: [
      selfIrony('Hloupej? No jo, já mám jenom obecnou školu. Ale zvířata znám líp než kdo jinej!'),
      offended('No dovol! Tak tohle mě urazilo až po špičky uší.'),
      selfIrony('Tupej jak motyka? Možná. Ale motyka zvíře neuhodne, a já jo.'),
      playful('Hele, hele, nech toho, nebo půjdeš se mnou kydat hnůj!'),
      offended('Hmpf. Uši se mi naježily. Ale hádat budu dál, ať se ti to líbí, nebo ne.'),
      saddened('Au. Tohle mě píchlo jak vidle do paty. Ale přežiju to.'),
      playful('Říká ten, kdo se baví s žlutým pokémonem. No jo, to jsi ty.'),
    ],
    deafness: [
      selfIrony('Hluchej? To mám z traktoru, ten řve jak tur. Ale už slyším.'),
      playful('Cože? Haha, dělám si srandu. Slyším dobře, jen se mi nechtělo.'),
      offended('Já slyším výborně! Jenom jsem měl v uchu seno.'),
      playful('Tak mluv nahlas a ne jak myš pod koštětem!'),
    ],
    rudeness: [
      amazed('Hergot! Takový slova u nás nesmí ani do chlíva!'),
      offended('Hmpf. Tohle slovo vyhodím na hnůj. A je pryč!'),
      playful('Ošklivý slovo? To říkám já, když mi chcípne traktor. Ale ty nemáš traktor, tak nemluv.'),
      amazed('Ty jo! Takhle nenadává ani náš kohout, když ho ráno nikdo neposlouchá.'),
      offended('Z toho se mi zkroutily uši. Ale buran jako já vydrží hodně.'),
      playful('Klídek, jsem jenom žlutej pokémon. Tak hádáme dál, nebo co?'),
    ],
  },
  insultAgain: [
    'Dneska jsi ale divokej jak býk na pastvě! Nevadí, jedem dál.',
    'Nadávat umím taky, ale nebudu, protože jsem slušnej buran. Hádáme dál.',
  ],
  dontUnderstand: ['Cože? Mluv pořádně.', 'Hm? Co?', 'Ještě jednou, mladej, a nahlas.', 'Hm? To mi uletělo.', 'Nerozuměl jsem ani slovo. Znova!'],
};

/** Lines by character id (the same ids as in CHARACTERS). */
export const LINES: Record<string, Lines> = {
  fox: FOX,
  banana: BANANA,
  vojtachu: VOJTACHU,
};
