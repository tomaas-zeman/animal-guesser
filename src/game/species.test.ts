import { describe, expect, it } from 'vitest';
import db from '../data/animals.json';
import type { Database } from './engine';
import { mulberry32, playGame, exactPlayer } from './simulation';

const database = db as unknown as Database;

// Groups where the game must reach a specific species, not just "a snake" or "an owl".
const GROUPS: Record<string, string[]> = {
  snakes: ['Užovka', 'Zmije', 'Kobra', 'Chřestýš', 'Krajta', 'Hroznýš', 'Anakonda'],
  lizards: ['Ještěrka', 'Gekon', 'Leguán', 'Varan komodský', 'Chameleon'],
  turtles: ['Želva', 'Vodní želva', 'Mořská želva'],
  felines: ['Lev', 'Tygr', 'Gepard', 'Leopard', 'Jaguár', 'Puma', 'Sněžný levhart', 'Černý panter', 'Rys'],
  canids: ['Vlk', 'Liška', 'Fenek', 'Polární liška', 'Hyena'],
  bears: ['Medvěd hnědý', 'Lední medvěd', 'Baribal', 'Panda'],
  sharks: ['Žralok', 'Kladivoun', 'Žralok velrybí'],
  cetaceans: ['Velryba', 'Keporkak', 'Kosatka', 'Delfín'],
  parrots: ['Papoušek', 'Andulka', 'Kakadu', 'Žako'],
  owls: ['Sova', 'Výr', 'Sněžná sova', 'Sova pálená'],
  raptors: ['Orel', 'Sokol', 'Sup', 'Harpyje'],
  deer: ['Jelen', 'Srnka', 'Los', 'Sob', 'Daněk'],
  primates: ['Šimpanz', 'Gorila', 'Orangutan', 'Pavián', 'Lemur'],
  rodents: ['Myš', 'Potkan', 'Křeček', 'Morče', 'Činčila', 'Kapybara', 'Svišť', 'Dikobraz'],
  frogs: ['Žába', 'Rosnička', 'Ropucha', 'Pralesnička', 'Kuňka'],
  salamanders: ['Mlok', 'Čolek', 'Velemlok', 'Axolotl'],
  'native fish': ['Kapr', 'Sumec', 'Štika', 'Pstruh', 'Candát', 'Okoun', 'Úhoř', 'Lín', 'Amur', 'Jeseter', 'Plotice', 'Karas'],
  'sea fish': ['Tuňák', 'Treska', 'Sleď', 'Platýs', 'Rejnok', 'Mečoun', 'Klaun očkatý', 'Čtverzubec', 'Murena', 'Mořský koník'],
  'native birds': ['Vrabec', 'Kos', 'Sýkorka', 'Straka', 'Sojka', 'Kukačka', 'Vlaštovka', 'Ledňáček', 'Dudek', 'Červenka',
    'Špaček', 'Stehlík', 'Hýl', 'Slavík', 'Volavka', 'Racek', 'Lyska', 'Bažant'],
  mustelids: ['Kuna', 'Lasice', 'Tchoř', 'Jezevec', 'Vydra'],
  insects: ['Včela', 'Čmelák', 'Vosa', 'Šváb', 'Cvrček', 'Kudlanka', 'Vážka', 'Bělásek', 'Můra', 'Roháč', 'Mandelinka',
    'Světluška', 'Ruměnice', 'Blecha'],
  'tricky ones': ['Kiwi', 'Ptakopysk', 'Ježura', 'Luskoun', 'Okapi', 'Ksukol', 'Nártoun', 'Kasuár', 'Vačice', 'Želvuška', 'Ďas',
    'Sépie', 'Fosa', 'Dodo'],
  'other small ones': ['Klíště', 'Štír', 'Tarantule', 'Stonožka', 'Mnohonožka', 'Svinka', 'Slimák', 'Pijavice', 'Šnek', 'Pavouk'],
};

describe('specific species', () => {
  for (const [group, kinds] of Object.entries(GROUPS)) {
    it(`${group}: with exact answers every species is guessed on the first try`, () => {
      for (const name of kinds) {
        const target = database.animals.findIndex((z) => z.name === name);
        expect(target, name).toBeGreaterThanOrEqual(0);
        for (let seed = 1; seed <= 3; seed++) {
          const v = playGame(database, target, exactPlayer, {}, mulberry32(seed * 100 + target));
          expect({ name, guessedRight: v.guessedRight, guesses: v.guesses }).toEqual({ name, guessedRight: true, guesses: 1 });
          expect(v.questions, name).toBeLessThanOrEqual(18);
        }
      }
    });
  }
});
