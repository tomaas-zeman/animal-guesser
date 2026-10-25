import type { ComponentType } from 'react';
import type { Voice } from '../speech/speaking';
import { Banana } from './Banana';
import { BANANA, FOX, VOJTACHU, type Lines } from './lines';
import { Fox } from './Fox';
import { Vojtachu } from './Vojtachu';
import type { CharacterProps } from './shared';

export interface Character {
  id: string;
  name: string;
  description: string;
  color: string;
  background: [string, string];
  voice: Voice;
  lines: Lines;
  Component: ComponentType<CharacterProps>;
}

export const CHARACTERS: Character[] = [
  {
    id: 'fox',
    name: 'Liška Lili',
    description: 'Mazaná liška, která zná každé zvíře z lesa.',
    color: '#e8762b',
    background: ['#ffe2c2', '#ffb27a'],
    voice: { pitch: 1.15, rate: 0.97, gender: 'female' },
    Component: Fox,
    lines: FOX,
  },
  {
    id: 'banana',
    name: 'Banán Bohouš',
    description: 'Mluvící banán a komik. Hádá zvířata a sype vtipy jak z rukávu.',
    color: '#d99a00',
    background: ['#fff6c4', '#ffd45a'],
    // a sharp joke teller: a hair higher and faster voice
    voice: { pitch: 1.05, rate: 1.08, gender: 'male', fallback: { pitch: 0.7, rate: 1.1 } },
    Component: Banana,
    lines: BANANA,
  },
  {
    id: 'vojtachu',
    name: 'Pokémon Vojtaču',
    description: 'Žlutý ušatý pokémon z vesnice. Drsňák od rány, ale srdce má zlaté.',
    color: '#c99a00',
    background: ['#f4f7c8', '#c5e07a'],
    // a rough farmhand, but still a boy: a bit higher and brisker voice
    voice: { pitch: 1.25, rate: 1.05, gender: 'male', fallback: { pitch: 0.85, rate: 1.05 } },
    Component: Vojtachu,
    lines: VOJTACHU,
  },
];

export { pickRandom } from './dialogue';
export type { Lines } from './lines';
