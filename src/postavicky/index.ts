import type { ComponentType } from 'react';
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
    hlas: { pitch: 1.35, rate: 1.05 },
    Komponenta: Liska,
    hlasky: {
      uvod: 'Ahoj, já jsem liška Lili! Mysli si nějaké zvíře a já ho uhodnu.',
      zacatek: ['Tak jdeme na to!', 'Už si ho myslíš? Výborně!'],
      tip: ['Už to mám! Je to {z}?', 'Můj liščí nosánek říká… {z}?', 'Hádám, že je to {z}. Je to tak?'],
      vyhra: ['Hurá! Uhodla jsem to!', 'Liška je prostě mazaná! Hrajeme znovu?'],
      omyl: ['Hmm, tak to ne. Budu se ptát dál.', 'Aha, vedle. Ale nevzdávám se!'],
      vzdavam: 'Tohle je na mě moc těžké! Vzdávám se. Jaké zvíře to bylo?',
      nerozumim: 'Promiň, nerozuměla jsem. Řekni ano, ne, nevím, nebo může být.',
    },
  },
  {
    id: 'robot',
    jmeno: 'Robot Robík',
    popis: 'Chytrý robot s velkou databází v hlavě.',
    barva: '#4f8fd9',
    pozadi: ['#d9ecff', '#8fb8ec'],
    hlas: { pitch: 0.6, rate: 0.95 },
    Komponenta: Robot,
    hlasky: {
      uvod: 'Píp píp. Jsem robot Robík. Mysli si zvíře. Moje obvody ho uhodnou.',
      zacatek: ['Spouštím hádací program.', 'Načítám otázky. Píp.'],
      tip: ['Výpočet dokončen. Je to {z}?', 'Moje obvody hlásí: {z}?', 'Pravděpodobnost je vysoká. Je to {z}?'],
      vyhra: ['Píp píp! Správně! Mise splněna!', 'Úspěch! Robík vyhrál. Další hra?'],
      omyl: ['Chyba v obvodech. Pokračuji v hledání.', 'Nesprávně. Přepočítávám.'],
      vzdavam: 'Chyba. Neznámé zvíře. Vzdávám se. Jaké zvíře to bylo?',
      nerozumim: 'Nerozpoznal jsem odpověď. Řekni ano, ne, nevím, nebo může být.',
    },
  },
  {
    id: 'sova',
    jmeno: 'Sova Soňa',
    popis: 'Moudrá sova v brýlích. Přečetla všechny knížky o zvířatech.',
    barva: '#8a5a3c',
    pozadi: ['#e8dcff', '#a99ad6'],
    hlas: { pitch: 1.1, rate: 0.92 },
    Komponenta: Sova,
    hlasky: {
      uvod: 'Hú hú, já jsem sova Soňa. Mysli si zvíře a já ho svou moudrostí uhodnu.',
      zacatek: ['Hú hú, začínáme.', 'Nasadím si brýle a jdeme na to.'],
      tip: ['Hú hú! Je to {z}?', 'Podle mých knížek je to {z}. Mám pravdu?', 'Myslím, že je to {z}?'],
      vyhra: ['Hú hú! Moudrost zvítězila!', 'Věděla jsem to! Zahrajeme si ještě?'],
      omyl: ['Hú, to mě překvapilo. Ptám se dál.', 'Ani sova neví všechno hned. Pokračujeme.'],
      vzdavam: 'Hú hú, tohle v mých knížkách není. Vzdávám se. Jaké zvíře to bylo?',
      nerozumim: 'Hú? Nerozuměla jsem. Řekni ano, ne, nevím, nebo může být.',
    },
  },
  {
    id: 'zabak',
    jmeno: 'Žabák Kvak',
    popis: 'Žabí princ s korunkou. Rád skáče a ještě radši hádá.',
    barva: '#5cb85c',
    pozadi: ['#dcf7d0', '#8fd18a'],
    hlas: { pitch: 0.85, rate: 1.1 },
    Komponenta: Zabak,
    hlasky: {
      uvod: 'Kvák! Já jsem žabák Kvak, princ z rybníka. Mysli si zvíře a já ho uhodnu.',
      zacatek: ['Kvák, jdeme na to!', 'Skok do hry!'],
      tip: ['Kvák! Je to {z}?', 'Vsadím korunku, že je to {z}!', 'Je to {z}? Kvák?'],
      vyhra: ['Kvák kvák! Uhodl jsem!', 'Hurá, skáču radostí! Ještě jednou?'],
      omyl: ['Kvák, to ne? Tak hádám dál.', 'Žbluňk, vedle. Zkusím to znovu.'],
      vzdavam: 'Kvák, to nevím. Vzdávám se. Jaké zvíře to bylo?',
      nerozumim: 'Kvák? Nerozuměl jsem. Řekni ano, ne, nevím, nebo může být.',
    },
  },
];

export function nahodne<T>(pole: T[]): T {
  return pole[Math.floor(Math.random() * pole.length)];
}
