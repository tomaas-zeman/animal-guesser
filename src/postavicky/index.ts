import type { ComponentType } from 'react';
import type { Hlas } from '../rec/mluveni';
import { LISKA, ROBOT, SOVA, ZABAK, type Hlasky } from './hlasky';
import { Liska } from './Liska';
import { Robot } from './Robot';
import { Sova } from './Sova';
import { Zabak } from './Zabak';
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
    id: 'robot',
    jmeno: 'Robot Robík',
    popis: 'Chytrý robot s velkou databází v hlavě.',
    barva: '#4f8fd9',
    pozadi: ['#d9ecff', '#8fb8ec'],
    hlas: { pitch: 0.7, rate: 0.9, pohlavi: 'muz', robot: true, nahrada: { pitch: 0.4, rate: 0.85 } },
    Komponenta: Robot,
    hlasky: ROBOT,
  },
  {
    id: 'sova',
    jmeno: 'Sova Soňa',
    popis: 'Moudrá sova v brýlích. Přečetla všechny knížky o zvířatech.',
    barva: '#8a5a3c',
    pozadi: ['#e8dcff', '#a99ad6'],
    hlas: { pitch: 0.95, rate: 0.9, pohlavi: 'zena' },
    Komponenta: Sova,
    hlasky: SOVA,
  },
  {
    id: 'zabak',
    jmeno: 'Žabák Kvak',
    popis: 'Žabí princ s korunkou. Rád skáče a ještě radši hádá.',
    barva: '#5cb85c',
    pozadi: ['#dcf7d0', '#8fd18a'],
    hlas: { pitch: 0.92, rate: 1.0, pohlavi: 'muz', nahrada: { pitch: 0.6, rate: 1.05 } },
    Komponenta: Zabak,
    hlasky: ZABAK,
  },
];

export { nahodne } from './projev';
export type { Hlasky } from './hlasky';
