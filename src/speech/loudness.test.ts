import { describe, expect, it } from 'vitest';
import { isMobile, calibrateFromStart, forgetPlayer, referenceLoudness, START_FACTOR } from './loudness';

describe('mobile devices without loudness measuring', () => {
  it('recognizes phones and tablets', () => {
    expect(isMobile('Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/130.0 Mobile Safari/537.36')).toBe(true);
    expect(isMobile('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1')).toBe(true);
    // iPadOS reports itself as a Mac
    expect(isMobile('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/18.0 Safari/605.1.15', 5)).toBe(true);
  });

  it('a computer is not mobile', () => {
    expect(isMobile('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/18.0 Safari/605.1.15', 0)).toBe(false);
    expect(isMobile('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130.0 Safari/537.36 Edg/130.0')).toBe(false);
  });
});

describe('calibration from the start word', () => {
  it('uses only a share of the start word peak as the reference', () => {
    forgetPlayer();
    calibrateFromStart(0.04);
    expect(referenceLoudness()).toBeCloseTo(0.04 * START_FACTOR);
    forgetPlayer();
  });
});
