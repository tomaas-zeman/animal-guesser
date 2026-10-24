import type { ComponentType } from 'react';
import type { Hlas } from '../rec/mluveni';
import { Banan } from './Banan';
import { BANAN, LISKA, VOJTACU, type Hlasky } from './hlasky';
import { Liska } from './Liska';
import { Vojtacu } from './Vojtacu';
import type { PostavickaProps } from './spolecne';

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
    hlasky: LISKA,
  },
  {
    id: 'banan',
    jmeno: 'Banán Bohouš',
    popis: 'Mluvící banán a komik. Hádá zvířata a sype vtipy jak z rukávu.',
    barva: '#d99a00',
    pozadi: ['#fff6c4', '#ffd45a'],
    // bystrý vypravěč vtipů: o chlup vyšší a rychlejší hlas
    hlas: { pitch: 1.05, rate: 1.08, pohlavi: 'muz', nahrada: { pitch: 0.7, rate: 1.1 } },
    Komponenta: Banan,
    hlasky: BANAN,
  },
  {
    id: 'vojtacu',
    jmeno: 'Pokémon Vojtaču',
    popis: 'Žlutý ušatý pokémon z vesnice. Drsňák od rány, ale srdce má zlaté.',
    barva: '#c99a00',
    pozadi: ['#f4f7c8', '#c5e07a'],
    // drsný vidlák, ale ještě kluk: o kus vyšší a svižnější hlas
    hlas: { pitch: 1.25, rate: 1.05, pohlavi: 'muz', nahrada: { pitch: 0.85, rate: 1.05 } },
    Komponenta: Vojtacu,
    hlasky: VOJTACU,
  },
];

export { nahodne } from './projev';
export type { Hlasky } from './hlasky';
