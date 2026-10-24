import { describe, expect, it } from 'vitest';
import { POSTAVICKY } from '../postavicky';
import { DOPLNKY, HLASKY } from '../postavicky/hlasky';
import { Projev } from '../postavicky/projev';
import { rozdelNaVety } from '../rec/mluveni';
import { JMENA, idUseku, textyHlasek, rozlozVetu, vsechnyUseky } from './klice';
import { crc32 } from './zip';

describe('nahrávky hlasů', () => {
  it('HLASKY odpovídají postavičkám', () => {
    for (const p of POSTAVICKY) expect(HLASKY[p.id]).toBe(p.hlasky);
    expect(Object.keys(HLASKY).length).toBe(POSTAVICKY.length);
  });

  it('id nahrávek se u žádné postavičky nepotkají', () => {
    for (const p of POSTAVICKY) {
      const useky = vsechnyUseky(p.id);
      const texty = new Map<string, string>();
      for (const u of useky) {
        const klic = `${u.druh}|${u.text}`;
        expect(texty.get(u.id) ?? klic).toBe(klic);
        texty.set(u.id, klic);
      }
    }
  });

  it('id závisí jen na textu a druhu', () => {
    expect(idUseku('veta', ' Ahoj!  ')).toBe(idUseku('veta', 'Ahoj!'));
    expect(idUseku('veta', 'Je to')).not.toBe(idUseku('zacatek', 'Je to'));
    expect(idUseku('veta', 'Ahoj!')).toMatch(/^[0-9a-f]{8}$/);
  });

  it('tip se rozloží na začátek, jméno zvířete a konec', () => {
    expect(rozlozVetu('liska', 'Je to liška, že jo?').map((u) => [u.druh, u.text])).toEqual([
      ['zacatek', 'Je to'],
      ['jmeno', 'liška.'],
      ['konec', 'že jo?'],
    ]);
    expect(rozlozVetu('banan', 'Banánová intuice říká…')).toHaveLength(1);
    expect(rozlozVetu('banan', 'kůň?').map((u) => u.druh)).toEqual(['jmeno']);
    // neznámé zvíře zůstane celou větou (nahrané nebude, řekne ho syntéza)
    expect(rozlozVetu('liska', 'Je to drak?').map((u) => u.druh)).toEqual(['veta']);
  });

  it('každá věta, kterou postavička může říct, má v seznamu nahrávku', () => {
    for (const p of POSTAVICKY) {
      const ids = new Set(vsechnyUseky(p.id).map((u) => u.id));
      const projev = new Projev(p.hlasky);
      const texty = [
        ...Object.values(p.hlasky).flatMap(textyHlasek).filter((t) => !t.includes('{z}')),
        ...Object.values(DOPLNKY),
      ];
      for (let i = 0; i < 40; i++) for (const jistota of [0.3, 0.98]) texty.push(projev.tip(JMENA[(i * 37) % JMENA.length], jistota, 15).text);
      for (const t of texty)
        for (const veta of rozdelNaVety(t))
          for (const u of rozlozVetu(p.id, veta)) expect(ids.has(u.id), `${p.id}: ${u.druh} „${u.text}“`).toBe(true);
    }
  });

  it('CRC32 pro ZIP', () => {
    expect(crc32(new TextEncoder().encode('123456789'))).toBe(0xcbf43926);
  });
});
