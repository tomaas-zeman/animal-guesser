import type { ComponentType } from 'react';
import type { Odpoved } from '../game/engine';
import type { Hlas } from '../rec/mluveni';
import { Liska } from './Liska';
import { Robot } from './Robot';
import { Sova } from './Sova';
import { Zabak } from './Zabak';
import type { PostavickaProps } from './spolecne';

export interface Hlasky {
  uvod: string;
  zacatek: string[];
  tip: string[];
  vyhra: string[];
  omyl: string[];
  vzdavam: string;
  nerozumim: string;
  /** krátká reakce na odpověď, řekne ji před další otázkou */
  reakce: Record<Odpoved, string[]>;
  /** když už má favorita */
  tuseni: string[];
}

export interface Postavicka {
  id: string;
  jmeno: string;
  popis: string;
  barva: string;
  pozadi: [string, string];
  hlas: Hlas;
  hlasky: Hlasky;
  Komponenta: ComponentType<PostavickaProps>;
}

export const POSTAVICKY: Postavicka[] = [
  {
    id: 'liska',
    jmeno: 'Liška Lili',
    popis: 'Mazaná liška, která zná každé zvíře z lesa.',
    barva: '#e8762b',
    pozadi: ['#ffe2c2', '#ffb27a'],
    hlas: { pitch: 1.15, rate: 0.97, pohlavi: 'zena' },
    Komponenta: Liska,
    hlasky: {
      uvod: 'Ahoj, já jsem liška Lili! Mysli si nějaké zvíře a já ho uhodnu.',
      zacatek: ['Tak jdeme na to!', 'Už si ho myslíš? Výborně!'],
      tip: ['Už to mám! Je to {z}?', 'Můj liščí nosánek říká… {z}?', 'Hádám, že je to {z}. Je to tak?'],
      vyhra: ['Hurá! Uhodla jsem to!', 'Liška je prostě mazaná! Hrajeme znovu?'],
      omyl: ['Hmm, tak to ne. Budu se ptát dál.', 'Aha, vedle. Ale nevzdávám se!'],
      vzdavam: 'Tohle je na mě moc těžké! Vzdávám se. Jaké zvíře to bylo?',
      nerozumim: 'Promiň, nerozuměla jsem. Můžeš to prosím zopakovat?',
      reakce: {
        ano: ['Ahaaa, chápu.', 'Aha!', 'Výborně.', 'To se hodí.', 'Jasně, jasně.'],
        ne: ['Hmm, dobře.', 'Aha, tak to ne.', 'Jasně.', 'Hmm.'],
        nevim: ['Nevadí.', 'To nic.', 'Dobře, zkusím to jinak.'],
        mozna: ['Hmm, zajímavé.', 'Aha, možná…', 'Hmm, dobře.'],
      },
      tuseni: ['Už mám takové tušení…', 'Můj nosánek už něco cítí…'],
    },
  },
  {
    id: 'robot',
    jmeno: 'Robot Robík',
    popis: 'Chytrý robot s velkou databází v hlavě.',
    barva: '#4f8fd9',
    pozadi: ['#d9ecff', '#8fb8ec'],
    hlas: { pitch: 0.8, rate: 0.94, pohlavi: 'muz' },
    Komponenta: Robot,
    hlasky: {
      uvod: 'Píp píp. Jsem robot Robík. Mysli si zvíře. Moje obvody ho uhodnou.',
      zacatek: ['Spouštím hádací program.', 'Načítám otázky. Píp.'],
      tip: ['Výpočet dokončen. Je to {z}?', 'Moje obvody hlásí: {z}?', 'Pravděpodobnost je vysoká. Je to {z}?'],
      vyhra: ['Píp píp! Správně! Mise splněna!', 'Úspěch! Robík vyhrál. Další hra?'],
      omyl: ['Chyba v obvodech. Pokračuji v hledání.', 'Nesprávně. Přepočítávám.'],
      vzdavam: 'Chyba. Neznámé zvíře. Vzdávám se. Jaké zvíře to bylo?',
      nerozumim: 'Nerozpoznal jsem odpověď. Můžeš to prosím zopakovat?',
      reakce: {
        ano: ['Ukládám. Ano.', 'Zaznamenáno.', 'Píp. Rozumím.', 'Výborně.'],
        ne: ['Zaznamenáno. Ne.', 'Rozumím.', 'Píp. Dobře.'],
        nevim: ['Nevadí. Přeskakuji.', 'V pořádku.'],
        mozna: ['Zpracovávám… Zajímavé.', 'Hmm. Rozumím.'],
      },
      tuseni: ['Pravděpodobnost roste…', 'Mé obvody něco tuší…'],
    },
  },
  {
    id: 'sova',
    jmeno: 'Sova Soňa',
    popis: 'Moudrá sova v brýlích. Přečetla všechny knížky o zvířatech.',
    barva: '#8a5a3c',
    pozadi: ['#e8dcff', '#a99ad6'],
    hlas: { pitch: 1.05, rate: 0.92, pohlavi: 'zena' },
    Komponenta: Sova,
    hlasky: {
      uvod: 'Hú hú, já jsem sova Soňa. Mysli si zvíře a já ho svou moudrostí uhodnu.',
      zacatek: ['Hú hú, začínáme.', 'Nasadím si brýle a jdeme na to.'],
      tip: ['Hú hú! Je to {z}?', 'Podle mých knížek je to {z}. Mám pravdu?', 'Myslím, že je to {z}?'],
      vyhra: ['Hú hú! Moudrost zvítězila!', 'Věděla jsem to! Zahrajeme si ještě?'],
      omyl: ['Hú, to mě překvapilo. Ptám se dál.', 'Ani sova neví všechno hned. Pokračujeme.'],
      vzdavam: 'Hú hú, tohle v mých knížkách není. Vzdávám se. Jaké zvíře to bylo?',
      nerozumim: 'Hú? Nerozuměla jsem. Můžeš to prosím zopakovat?',
      reakce: {
        ano: ['Ahaaa, hú hú.', 'Zajímavé.', 'Přesně jak jsem myslela.', 'Aha!'],
        ne: ['Hmm, dobře.', 'Tak to ne, rozumím.', 'Aha.'],
        nevim: ['To nevadí.', 'I sova občas neví.'],
        mozna: ['Hmm, to je zajímavé.', 'Aha, možná…'],
      },
      tuseni: ['Hú, už mi to začíná docházet…', 'Mám takové moudré tušení…'],
    },
  },
  {
    id: 'zabak',
    jmeno: 'Žabák Kvak',
    popis: 'Žabí princ s korunkou. Rád skáče a ještě radši hádá.',
    barva: '#5cb85c',
    pozadi: ['#dcf7d0', '#8fd18a'],
    hlas: { pitch: 0.92, rate: 1.0, pohlavi: 'muz' },
    Komponenta: Zabak,
    hlasky: {
      uvod: 'Kvák! Já jsem žabák Kvak, princ z rybníka. Mysli si zvíře a já ho uhodnu.',
      zacatek: ['Kvák, jdeme na to!', 'Skok do hry!'],
      tip: ['Kvák! Je to {z}?', 'Vsadím korunku, že je to {z}!', 'Je to {z}? Kvák?'],
      vyhra: ['Kvák kvák! Uhodl jsem!', 'Hurá, skáču radostí! Ještě jednou?'],
      omyl: ['Kvák, to ne? Tak hádám dál.', 'Žbluňk, vedle. Zkusím to znovu.'],
      vzdavam: 'Kvák, to nevím. Vzdávám se. Jaké zvíře to bylo?',
      nerozumim: 'Kvák? Nerozuměl jsem. Můžeš to prosím zopakovat?',
      reakce: {
        ano: ['Kvák, chápu!', 'Ahaaa!', 'Super!', 'Jasně!'],
        ne: ['Hmm, kvák.', 'Aha, tak ne.', 'Dobře.'],
        nevim: ['Nevadí, kvák.', 'To nic.'],
        mozna: ['Hmm, možná…', 'Kvák, zajímavé.'],
      },
      tuseni: ['Kvák, už něco tuším…', 'Už jsem blízko, kvák!'],
    },
  },
];

export function nahodne<T>(pole: T[]): T {
  return pole[Math.floor(Math.random() * pole.length)];
}
