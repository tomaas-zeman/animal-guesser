import { describe, expect, it } from 'vitest';
import db from '../data/zvirata.json';
import type { Databaze } from './engine';
import { mulberry32, odehraj, presnyHrac } from './simulace';

const databaze = db as unknown as Databaze;

// Skupiny, kde má hra dojít až ke konkrétnímu druhu, ne jen k "hadovi" nebo "sově".
const SKUPINY: Record<string, string[]> = {
  hadi: ['Užovka', 'Zmije', 'Kobra', 'Chřestýš', 'Krajta', 'Hroznýš', 'Anakonda'],
  ještěři: ['Ještěrka', 'Gekon', 'Leguán', 'Varan komodský', 'Chameleon'],
  želvy: ['Želva', 'Vodní želva', 'Mořská želva'],
  kočkovité: ['Lev', 'Tygr', 'Gepard', 'Leopard', 'Jaguár', 'Puma', 'Sněžný levhart', 'Černý panter', 'Rys'],
  psovité: ['Vlk', 'Liška', 'Fenek', 'Polární liška', 'Hyena'],
  medvědi: ['Medvěd hnědý', 'Lední medvěd', 'Baribal', 'Panda'],
  žraloci: ['Žralok', 'Kladivoun', 'Žralok velrybí'],
  kytovci: ['Velryba', 'Keporkak', 'Kosatka', 'Delfín'],
  papoušci: ['Papoušek', 'Andulka', 'Kakadu', 'Žako'],
  sovy: ['Sova', 'Výr', 'Sněžná sova', 'Sova pálená'],
  dravci: ['Orel', 'Sokol', 'Sup', 'Harpyje'],
  jeleni: ['Jelen', 'Srnka', 'Los', 'Sob', 'Daněk'],
  opice: ['Šimpanz', 'Gorila', 'Orangutan', 'Pavián', 'Lemur'],
  hlodavci: ['Myš', 'Potkan', 'Křeček', 'Morče', 'Činčila', 'Kapybara', 'Svišť', 'Dikobraz'],
  žáby: ['Žába', 'Rosnička', 'Ropucha', 'Pralesnička', 'Kuňka'],
  ocasatí: ['Mlok', 'Čolek', 'Velemlok', 'Axolotl'],
  'naše ryby': ['Kapr', 'Sumec', 'Štika', 'Pstruh', 'Candát', 'Okoun', 'Úhoř', 'Lín', 'Amur', 'Jeseter', 'Plotice', 'Karas'],
  'mořské ryby': ['Tuňák', 'Treska', 'Sleď', 'Platýs', 'Rejnok', 'Mečoun', 'Klaun očkatý', 'Čtverzubec', 'Murena', 'Mořský koník'],
  'naši ptáci': ['Vrabec', 'Kos', 'Sýkorka', 'Straka', 'Sojka', 'Kukačka', 'Vlaštovka', 'Ledňáček', 'Dudek', 'Červenka',
    'Špaček', 'Stehlík', 'Hýl', 'Slavík', 'Volavka', 'Racek', 'Lyska', 'Bažant'],
  lasicovití: ['Kuna', 'Lasice', 'Tchoř', 'Jezevec', 'Vydra'],
  hmyz: ['Včela', 'Čmelák', 'Vosa', 'Šváb', 'Cvrček', 'Kudlanka', 'Vážka', 'Bělásek', 'Můra', 'Roháč', 'Mandelinka',
    'Světluška', 'Ruměnice', 'Blecha'],
  'další drobní': ['Klíště', 'Štír', 'Tarantule', 'Stonožka', 'Mnohonožka', 'Svinka', 'Slimák', 'Pijavice', 'Šnek', 'Pavouk'],
};

describe('konkrétní druhy', () => {
  for (const [skupina, druhy] of Object.entries(SKUPINY)) {
    it(`${skupina}: při přesných odpovědích uhodne každý druh napoprvé`, () => {
      for (const jmeno of druhy) {
        const cil = databaze.zvirata.findIndex((z) => z.jmeno === jmeno);
        expect(cil, jmeno).toBeGreaterThanOrEqual(0);
        for (let seed = 1; seed <= 3; seed++) {
          const v = odehraj(databaze, cil, presnyHrac, {}, mulberry32(seed * 100 + cil));
          expect({ jmeno, uhodl: v.uhodl, tipu: v.tipu }).toEqual({ jmeno, uhodl: true, tipu: 1 });
          expect(v.otazek, jmeno).toBeLessThanOrEqual(18);
        }
      }
    });
  }
});
