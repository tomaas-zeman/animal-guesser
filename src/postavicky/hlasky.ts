// Co postavičky říkají. Každá má svou povahu a pro každou situaci víc vět,
// ze kterých se vybírá tak, aby se stejná věta neopakovala hned po sobě.
// {z} se nahradí jménem zvířete. Věty s {z} nezačínají, protože jméno je malými písmeny.
import type { Odpoved } from '../game/engine';

export interface Hlasky {
  uvod: string[];
  zacatek: string[];
  /** krátká reakce na odpověď, řekne ji před další otázkou */
  reakce: Record<Odpoved, string[]>;
  /** odpověď, kterou vůbec nečekala */
  prekvapeni: string[];
  /** odpověď hodně zúžila výběr */
  pokrok: string[];
  /** jednou za hru, když už má favorita */
  tuseni: string[];
  /** favorit jasně vede, už je skoro u cíle */
  blizko: string[];
  /** hra se protahuje */
  dlouho: string[];
  /** občas uvede další otázku */
  prechod: string[];
  tip: string[];
  /** tip, když si je skoro jistá */
  tipJisty: string[];
  /** tip naslepo, když už se ptala dlouho */
  tipNejisty: string[];
  vyhra: string[];
  /** uhodla na pár otázek */
  vyhraRychla: string[];
  /** uhodla až po omylech nebo dlouhém ptaní */
  vyhraTezka: string[];
  /** po výhře nabídne další hru */
  znovu: string[];
  /** první špatný tip */
  omyl: string[];
  /** další špatný tip */
  omylZnovu: string[];
  vzdavam: string[];
  nerozumim: string[];
}

export const LISKA: Hlasky = {
  uvod: [
    'Ahoj, já jsem liška Lili! Mysli si nějaké zvíře a já ho uhodnu.',
    'Ahoj! Tady liška Lili. Vymysli si zvíře, ale nic mi neprozrazuj!',
    'Čau, já jsem Lili. Zahrajeme si na hádání? Mysli si nějaké zvíře.',
  ],
  zacatek: ['Tak jdeme na to!', 'Výborně. Nastražím uši a začneme.', 'Dobře, dobře… tak schválně.', 'Jupí, hádání mám nejradši!'],
  reakce: {
    ano: ['Ahaaa, chápu.', 'Aha!', 'Výborně.', 'To se hodí.', 'Jasně, jasně.', 'Ha, to jsem si myslela.', 'Mhm, dobře.', 'Super, to mi pomůže.'],
    ne: ['Hmm, dobře.', 'Aha, tak to ne.', 'Jasně.', 'Hmm.', 'Tak to škrtám.', 'Dobře, tudy cesta nevede.', 'Aha, škoda.'],
    nevim: ['Nevadí.', 'To nic.', 'Dobře.', 'Klidně.', 'V pohodě.'],
    mozna: ['Hmm, zajímavé.', 'Aha, možná…', 'Hmm, dobře.', 'Tak napůl, jo? Chápu.', 'Aha, něco mezi.'],
  },
  prekvapeni: ['Cože? Tak to jsem nečekala!', 'Ty jo! Tak to mě překvapilo.', 'Opravdu? No teda!', 'Ha! To mi zamíchalo kartami.'],
  pokrok: ['Ooo, to mi hodně pomohlo!', 'Ha, teď se to zužuje!', 'Můj nosánek začíná větřit stopu.', 'Výborně, už jsem na stopě.'],
  tuseni: ['Už mám takové tušení…', 'Můj nosánek už něco cítí…', 'Hmm, už vím, kudy vede stopa…'],
  blizko: ['Už jsem skoro u cíle…', 'Ještě kousek a mám to!', 'Ocásek se mi chvěje, už jsem blízko!', 'Hmm, už to skoro vím…'],
  dlouho: ['Tohle je ale záludné zvíře!', 'No teda, to je napínavé.', 'Hmm, ty mi to dáváš. Ale já se nevzdám!'],
  prechod: ['A teď…', 'Tak schválně.', 'Další otázka.', 'A co tohle?', 'Řekni mi…'],
  tip: ['Už to mám! Je to {z}?', 'Můj liščí nosánek říká… {z}?', 'Hádám, že je to {z}. Je to tak?'],
  tipJisty: ['Ha! Vsadím ocásek, že je to {z}!', 'Tohle je jasné. Je to {z}, že jo?', 'Už to mám. Určitě je to {z}!'],
  tipNejisty: ['Hmm, zkusím to… Není to {z}?', 'Trošku tápu, ale… je to {z}?', 'Risknu to. Je to {z}?'],
  vyhra: ['Hurá! Uhodla jsem to!', 'Jupí! Liška je prostě mazaná!', 'Věděla jsem to! Můj nosánek se nemýlí.'],
  vyhraRychla: ['Ha, to bylo rychlé! Na mě si musíš vymyslet něco těžšího.', 'Hotovo raz dva! Liščí rekord!'],
  vyhraTezka: ['Uf, to dalo práci! Ale nakonec jsem to uhodla!', 'Hurá! Bylo to těžké, ale liška to dokázala!'],
  znovu: ['Zahrajeme si ještě?', 'Dáme další kolo?', 'Hrajeme znovu?'],
  omyl: ['Hmm, tak to ne. Budu se ptát dál.', 'Aha, vedle. Ale nevzdávám se!', 'Ajaj, to nebylo ono. Nevadí, hledám dál.'],
  omylZnovu: ['Zase vedle? To je ale záhada!', 'Ach jo. Ale liška se jen tak nevzdává!', 'Hmm, ty mě dneska zkoušíš. Ptám se dál.'],
  vzdavam: [
    'Tohle je na mě moc těžké! Vzdávám se. Jaké zvíře to bylo?',
    'Ach jo, tentokrát jsem prohrála. Vzdávám se. Prozradíš mi, co to bylo?',
  ],
  nerozumim: [
    'Cože?',
    'Promiň?',
    'Ještě jednou?',
    'Hm? Uteklo mi to.',
    'Nerozuměla jsem.',
  ],
};

export const ROBOT: Hlasky = {
  uvod: [
    'Píp píp. Jsem robot Robík. Mysli si zvíře. Moje obvody ho uhodnou.',
    'Systém zapnut. Ahoj, já jsem Robík! Mysli si zvíře a já ho vypočítám.',
    'Bzzz, píp. Robík připraven. Vymysli si zvíře.',
  ],
  zacatek: ['Spouštím hádací program.', 'Načítám otázky. Píp.', 'Procesor zahřátý. Jdeme na to!', 'Režim hádání aktivován.'],
  reakce: {
    ano: ['Ukládám. Ano.', 'Zaznamenáno.', 'Píp. Rozumím.', 'Výborně.', 'Potvrzeno.', 'Píp píp, data přijata.', 'Kladná odpověď uložena.'],
    ne: ['Zaznamenáno. Ne.', 'Rozumím.', 'Píp. Dobře.', 'Vyřazuji možnosti.', 'Negativní. Pokračuji.', 'Bzzz. Škrtám.'],
    nevim: ['Přeskakuji.', 'V pořádku.', 'Neznámá hodnota.', 'Nevadí.'],
    mozna: ['Zpracovávám… Zajímavé.', 'Hmm. Rozumím.', 'Ukládám jako možná.', 'Padesát procent. Píp.'],
  },
  prekvapeni: ['Píp?! To moje data nečekala!', 'Chyba… ne, počkat. Zajímavé!', 'Bzzz! Překvapení v obvodech!', 'Tuto odpověď jsem nepředpověděl. Fascinující.'],
  pokrok: ['Pravděpodobnost výrazně stoupla!', 'Výborně, výpočet se zpřesňuje.', 'Píp píp! Velký pokrok.'],
  tuseni: ['Pravděpodobnost roste…', 'Mé obvody něco tuší…', 'Detekuji stopu. Píp.'],
  blizko: ['Výpočet je téměř hotov…', 'Devadesát procent… skoro…', 'Moje kontrolka bliká. Už jsem blízko!', 'Ještě jeden údaj a mám to.'],
  dlouho: ['Tohle zvíře je složitější, než jsem počítal.', 'Moje ventilátory se roztočily. Napínavé!', 'Přidávám výkon. Nevzdávám se.'],
  prechod: ['Další dotaz.', 'Pozor, otázka.', 'Zpracovávám další otázku.', 'Píp. Další.'],
  tip: ['Výpočet dokončen. Je to {z}?', 'Moje obvody hlásí: {z}?', 'Pravděpodobnost je vysoká. Je to {z}?'],
  tipJisty: ['Jistota devadesát devět procent. Je to {z}!', 'Analýza hotova. Je to {z}, že?', 'Píp píp! Výsledek: {z}!'],
  tipNejisty: ['Data jsou nejistá. Zkusím… {z}?', 'Odhaduji. Je to {z}?', 'Riskantní výpočet… {z}?'],
  vyhra: ['Píp píp! Správně! Mise splněna!', 'Úspěch! Robík vyhrál!', 'Hurá! Moje obvody jásají!'],
  vyhraRychla: ['Rekordní čas! Můj procesor je rychlík.', 'Hotovo za pár otázek. Píp, píp, píp!'],
  vyhraTezka: ['Uf. Přehřátí zažehnáno. Ale vyhrál jsem!', 'Těžký úkol, ale úspěšně vyřešen!'],
  znovu: ['Další hra?', 'Spustit novou hru?', 'Zahrajeme si znovu?'],
  omyl: ['Chyba v obvodech. Pokračuji v hledání.', 'Nesprávně. Přepočítávám.', 'Bzzz. Vedle. Aktualizuji data.'],
  omylZnovu: ['Opět chyba?! Restartuji přemýšlení.', 'Píp… to je záhadné zvíře. Hledám dál.', 'Moje databáze je zmatená. Ale nevzdávám se.'],
  vzdavam: [
    'Chyba. Neznámé zvíře. Vzdávám se. Jaké zvíře to bylo?',
    'Píííp… Baterka myšlenek je vybitá. Vzdávám se. Co to bylo?',
  ],
  nerozumim: [
    'Píp? Znovu.',
    'Nerozpoznáno.',
    'Signál nečitelný.',
    'Opakuj, prosím.',
  ],
};

export const SOVA: Hlasky = {
  uvod: [
    'Hú hú, já jsem sova Soňa. Mysli si zvíře a já ho svou moudrostí uhodnu.',
    'Dobrý den, hú hú. Jsem sova Soňa. Vymysli si zvíře a nech to na mně.',
    'Hú hú! Sova Soňa tě vítá. Mysli si nějaké zvíře.',
  ],
  zacatek: ['Hú hú, začínáme.', 'Nasadím si brýle a jdeme na to.', 'Nalistuju svou velkou knihu zvířat…', 'Výborně. Tak se zamysleme.'],
  reakce: {
    ano: ['Ahaaa, hú hú.', 'Zajímavé.', 'Přesně jak jsem myslela.', 'Aha!', 'Inu, dobře.', 'Výborně, to si zapíšu.', 'Mhm, to sedí.'],
    ne: ['Hmm, dobře.', 'Tak to ne, rozumím.', 'Aha.', 'Inu, to vylučuje pár zvířat.', 'Dobrá, škrtám.', 'Hú, tak jinak.'],
    nevim: ['Nevadí.', 'To nic.', 'I sova občas neví.', 'Dobře.'],
    mozna: ['Hmm, to je zajímavé.', 'Aha, možná…', 'Inu, někdy ano, někdy ne.', 'Napůl, rozumím.'],
  },
  prekvapeni: ['Hú! Tak to mě vyvedlo z míry!', 'Ale ne! To bych nečekala.', 'No podívejme! Tohle v knížkách nebylo.', 'Hú hú, opravdu? Pozoruhodné!'],
  pokrok: ['Výborně, kruh se uzavírá.', 'Hú, teď se mi to rýsuje.', 'Tohle byla moc užitečná odpověď.'],
  tuseni: ['Hú, už mi to začíná docházet…', 'Mám takové moudré tušení…', 'Hmm, už vím, kterou stránku nalistovat…'],
  blizko: ['Už jsem velmi blízko…', 'Hú… brýle se mi zamlžují napětím.', 'Ještě maličko a budu to vědět.', 'Moudrost mi napovídá, že už to bude.'],
  dlouho: ['Hmm, tohle je opravdu záhadné zvíře.', 'I moudrá sova se musí pořádně zamyslet.', 'Inu, trpělivost přináší moudrost.'],
  prechod: ['A nyní…', 'Pověz mi…', 'Další otázka.', 'Zamysli se…'],
  tip: ['Hú hú! Je to {z}?', 'Podle mých knížek je to {z}. Mám pravdu?', 'Myslím, že je to {z}?'],
  tipJisty: ['Není pochyb. Je to {z}!', 'Hú hú, moudrost praví: {z}!', 'Jsem si skoro jistá. Je to {z}?'],
  tipNejisty: ['Hmm, nejsem si jistá… je to {z}?', 'Zkusím odhad. Je to {z}?', 'Možná se pletu, ale… {z}?'],
  vyhra: ['Hú hú! Moudrost zvítězila!', 'Věděla jsem to!', 'Výborně! Sova se nemýlila.'],
  vyhraRychla: ['To bylo snadné jako abeceda!', 'Hú, ani jsem nemusela listovat!'],
  vyhraTezka: ['Uf, to byla pořádná hádanka. Ale zvládla jsem ji!', 'Hú hú, těžké, ale moudrost nakonec zvítězila!'],
  znovu: ['Zahrajeme si ještě?', 'Dáme další hádanku?', 'Ještě jednu?'],
  omyl: ['Hú, to mě překvapilo. Ptám se dál.', 'Ani sova neví všechno hned. Pokračujeme.', 'Inu, z chyb se učíme. I sovy.'],
  omylZnovu: ['Zase ne? Tohle je opravdu záhada.', 'Hú hú, musím si přečíst další kapitolu.', 'Ach jo. Ale sovy jsou trpělivé.'],
  vzdavam: [
    'Hú hú, tohle v mých knížkách není. Vzdávám se. Jaké zvíře to bylo?',
    'Tentokrát moudrost nestačila. Vzdávám se. Co to bylo za zvíře?',
  ],
  nerozumim: [
    'Hú?',
    'Prosím?',
    'Ještě jednou?',
    'Uniklo mi to.',
  ],
};

export const ZABAK: Hlasky = {
  uvod: [
    'Kvák! Já jsem žabák Kvak, princ z rybníka. Mysli si zvíře a já ho uhodnu.',
    'Kvák kvák! Princ Kvak tě vítá. Vymysli si zvíře!',
    'Žbluňk! To jsem já, žabák Kvak. Zahrajeme si? Mysli si zvíře.',
  ],
  zacatek: ['Kvák, jdeme na to!', 'Skok do hry!', 'Připravit, pozor, kvák!', 'Hop! Začínáme.'],
  reakce: {
    ano: ['Kvák, chápu!', 'Ahaaa!', 'Super!', 'Jasně!', 'Hop, to se hodí!', 'Kvák kvák, výborně!', 'To je ono!'],
    ne: ['Hmm, kvák.', 'Aha, tak ne.', 'Dobře.', 'Žbluňk, škrtám.', 'Tak tam neskočím.', 'Kvák, jasně.'],
    nevim: ['Nevadí, kvák.', 'To nic.', 'Klídek.', 'Dobře.'],
    mozna: ['Hmm, možná…', 'Kvák, zajímavé.', 'Napůl? Dobře.', 'Hmm, tak trochu, jo?'],
  },
  prekvapeni: ['Kvák?! To jsem nečekal!', 'Žbluňk! Málem jsem spadl z leknínu!', 'Cože? Korunka mi málem spadla!', 'Ty jo, kvák! Překvapení!'],
  pokrok: ['Kvák! Teď se to zužuje!', 'Hop, hop, jsem na stopě!', 'To byla super odpověď!'],
  tuseni: ['Kvák, už něco tuším…', 'Už jsem blízko, kvák!', 'Moje žabí intuice něco cítí…'],
  blizko: ['Už to skoro mám, kvák!', 'Nožičky mi cukají, jsem blízko!', 'Ještě jeden skok a mám to!', 'Kvák… napětí jako před velkým skokem!'],
  dlouho: ['Kvák, to je ale záludné zvíře!', 'Tohle je delší než cesta přes celý rybník!', 'Nevzdávám se, princ se nikdy nevzdává!'],
  prechod: ['A teď…', 'Hop, další otázka!', 'Kvák, tak schválně.', 'Řekni mi…'],
  tip: ['Kvák! Je to {z}?', 'Vsadím korunku, že je to {z}!', 'Je to {z}? Kvák?'],
  tipJisty: ['Jasná věc! Je to {z}!', 'Kvák kvák, určitě je to {z}!', 'Dám za to korunku, že je to {z}!'],
  tipNejisty: ['Hmm, zkusím skok naslepo… {z}?', 'Kvák, risknu to. Je to {z}?', 'Možná… je to {z}?'],
  vyhra: ['Kvák kvák! Uhodl jsem!', 'Hurá, skáču radostí!', 'Jupí! Princ Kvak vítězí!'],
  vyhraRychla: ['Hop a hotovo! To bylo rychlé!', 'Kvák! Rychlejší než moucha!'],
  vyhraTezka: ['Uf, kvák! To byla dřina, ale uhodl jsem!', 'Konečně! Skáču do rybníka radostí!'],
  znovu: ['Ještě jednou?', 'Dáme další kolo, kvák?', 'Hrajeme znovu?'],
  omyl: ['Kvák, to ne? Tak hádám dál.', 'Žbluňk, vedle. Zkusím to znovu.', 'Hups, to nebylo ono. Skáču dál.'],
  omylZnovu: ['Zase vedle? Kvák, to je ale hádanka!', 'Ach jo, korunka mi padá. Ale hádám dál!', 'Žbluňk… nevadí, princ se nevzdává!'],
  vzdavam: [
    'Kvák, to nevím. Vzdávám se. Jaké zvíře to bylo?',
    'Žbluňk… tohle neznám ani z rybníka. Vzdávám se. Co to bylo?',
  ],
  nerozumim: [
    'Kvák?',
    'Cože?',
    'Ještě jednou?',
    'Voda v uších. Znovu?',
  ],
};

export const BANAN: Hlasky = {
  uvod: [
    'Ahoj, já jsem banán Bohouš! Mysli si zvíře a já ho uhodnu. A k tomu přidám pár vtipů, zdarma a bez slupky.',
    'Dobrý den, dámy a pánové, děti i opice! Na pódiu banán Bohouš. Mysli si zvíře!',
    'Čau, tady Bohouš. Jsem sice trochu křivý, ale hádám rovně. Vymysli si zvíře!',
    'Ahoj! Víš, proč je banán žlutý? Aby ho bylo vidět, když hádá zvířata. Tak si nějaké mysli!',
  ],
  zacatek: [
    'Tak jdeme na to, loupu první otázku!',
    'Mikrofon zapnut, slupka napnutá. Začínáme!',
    'Hádání je moje druhá nejoblíbenější věc. Hned po vtipech.',
    'Pozor, začíná banánová show!',
  ],
  reakce: {
    ano: [
      'Výtečně, to se hodí!',
      'Super, to je ono!',
      'Aha, to se mi hodí do trsu.',
      'Výborně, skoro mi zežloutla slupka radostí.',
      'Jasně, to sedí jako slupka na banánu.',
      'Mňam, šťavnatá odpověď!',
      'Ha, to jsem tušil!',
      'Bezva, zapisuju si to na slupku.',
    ],
    ne: [
      'Ne? Tak to škrtám.',
      'Dobře, tudy cesta nevede.',
      'Aha. Ale nevadí, banán se nevzdává.',
      'Ne? Ani trošku? Tak jinak.',
      'Jasně, tohle hodím do koše na slupky.',
      'Hmm, tak tam neuklouznu.',
      'Dobře, zkusím to z jiné strany banánu.',
    ],
    nevim: [
      'Nevadí, ani já nevím, proč jsem křivý.',
      'To nic, klidně.',
      'Pohoda, jedeme dál.',
      'Nevíš? Já taky ne. Jsme dobrá dvojka.',
      'V pořádku, tohle přeskočíme.',
    ],
    mozna: [
      'Může být? To je odpověď jako nezralý banán. Ani zelená, ani žlutá.',
      'Hmm, tak napůl. Jako půlka banánu.',
      'Aha, něco mezi. Chápu.',
      'Možná? Tak to si dám k přemýšlení.',
      'Napůl oloupané, rozumím.',
    ],
  },
  prekvapeni: [
    'Cože? Tak to mi málem spadla slupka!',
    'Ty jo! Tak tohle jsem fakt nečekal.',
    'Páni, z toho jsem celý žlutý! Ale to já jsem vlastně pořád.',
    'No teda! Tohle mě úplně rozloupalo.',
    'Ha! Málem jsem uklouzl na vlastní slupce.',
  ],
  pokrok: [
    'Ooo, to mi hodně pomohlo!',
    'Výborně, teď se mi to krásně loupe.',
    'Ha, nápad mi dozrává!',
    'Super odpověď! Dávám jí deset banánů z deseti.',
  ],
  tuseni: [
    'Hmm, už mám takové banánové tušení…',
    'Něco mi tu začíná dozrávat…',
    'Moje slupka cítí stopu…',
  ],
  blizko: [
    'Už jsem skoro u cíle, slupka se mi třese napětím!',
    'Ještě kousek a mám to oloupané!',
    'Už to skoro vím… jsem zralý na tip!',
    'Napětí jako před pointou vtipu…',
  ],
  dlouho: [
    'Tohle je ale záludné zvíře! Delší než celý trs banánů.',
    'No teda, z tohohle mi naskakují hnědé pihy.',
    'Ty mi to dáváš! Ale banán se nevzdává, jenom se trochu ohne.',
    'Víš, proč banán chodí k doktorovi? Protože ho loupe v zádech. A mě už z toho přemýšlení taky.',
  ],
  prechod: [
    'A teď…',
    'Tak schválně.',
    'Další otázka, prosím bubny!',
    'Řekni mi…',
    'A co tohle?',
  ],
  tip: [
    'Mám to! Je to {z}?',
    'Banánová intuice říká… {z}?',
    'Tipuju, že je to {z}. Trefa?',
    'Bubny, prosím! Je to {z}?',
  ],
  tipJisty: [
    'Vsadím celý trs banánů, že je to {z}!',
    'Jasná věc, tohle je {z}!',
    'Na rovinu, i když jsem křivý: je to {z}!',
  ],
  tipNejisty: [
    'Hmm, zkusím to naslepo… není to {z}?',
    'Trochu tápu, ale… je to {z}?',
    'Risknu to, i kdybych měl uklouznout. Je to {z}?',
  ],
  vyhra: [
    'Hurá, uhodl jsem! Potlesk pro banána!',
    'Jupí! Banán je prostě chytré ovoce!',
    'Trefa! Tohle si zaslouží banánový koláč.',
  ],
  vyhraRychla: [
    'Ha, to bylo rychlejší než oloupat banán!',
    'Hotovo raz dva! Na mě si musíš vymyslet něco těžšího.',
  ],
  vyhraTezka: [
    'Uf, to dalo práci! Ale nakonec jsem to oloupal!',
    'Konečně! Bylo to těžké jako banán z olova. Ale uhodl jsem!',
  ],
  znovu: [
    'Dáme další kolo? Vtipů mám ještě celý trs.',
    'Zahrajeme si ještě?',
    'Hrajeme znovu? Slibuju nové vtipy!',
  ],
  omyl: [
    'Vedle? Tak to jsem uklouzl na slupce. Hádám dál!',
    'Ajaj, to nebylo ono. Ale banán se jen tak nevzdá.',
    'Hups, netrefil jsem se. Nevadí, loupu dál.',
  ],
  omylZnovu: [
    'Zase vedle? Z toho jsem úplně rozmačkaný!',
    'Ach jo, už mi z toho hnědne slupka. Ale ptám se dál.',
    'Tohle je ale záhada! Ještě že mám smysl pro humor.',
  ],
  vzdavam: [
    'Tak tohle je na mě moc. Vzdávám se, a to je u banánu vzácnost. Jaké zvíře to bylo?',
    'Ach jo, tentokrát jsem uklouzl. Vzdávám se. Prozradíš mi, co to bylo?',
  ],
  nerozumim: [
    'Cože? Mám banán v uchu.',
    'Promiň?',
    'Ještě jednou, prosím?',
    'Hm? To mi uteklo.',
    'Nerozuměl jsem, zopakuješ to?',
  ],
};
