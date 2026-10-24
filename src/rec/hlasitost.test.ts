import { describe, expect, it } from 'vitest';
import { jeMobil } from './hlasitost';

describe('mobilní zařízení bez měření hlasitosti', () => {
  it('pozná telefony a tablety', () => {
    expect(jeMobil('Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/130.0 Mobile Safari/537.36')).toBe(true);
    expect(jeMobil('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1')).toBe(true);
    // iPadOS se hlásí jako Mac
    expect(jeMobil('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/18.0 Safari/605.1.15', 5)).toBe(true);
  });

  it('počítač není mobil', () => {
    expect(jeMobil('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/18.0 Safari/605.1.15', 0)).toBe(false);
    expect(jeMobil('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130.0 Safari/537.36 Edg/130.0')).toBe(false);
  });
});
