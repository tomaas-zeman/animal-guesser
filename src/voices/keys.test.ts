import { describe, expect, it } from 'vitest';
import { CHARACTERS } from '../characters';
import { EXTRAS, LINES } from '../characters/lines';
import { Dialogue } from '../characters/dialogue';
import { splitIntoSentences } from '../speech/speaking';
import { NAMES, segmentId, lineTexts, splitSentence, allSegments } from './keys';
import { crc32 } from './zip';

describe('voice recordings', () => {
  it('LINES match the characters', () => {
    for (const p of CHARACTERS) expect(LINES[p.id]).toBe(p.lines);
    expect(Object.keys(LINES).length).toBe(CHARACTERS.length);
  });

  it('recording ids never collide for any character', () => {
    for (const p of CHARACTERS) {
      const segments = allSegments(p.id);
      const texts = new Map<string, string>();
      for (const u of segments) {
        const key = `${u.kind}|${u.text}`;
        expect(texts.get(u.id) ?? key).toBe(key);
        texts.set(u.id, key);
      }
    }
  });

  it('the id depends only on the text and kind', () => {
    expect(segmentId('sentence', ' Ahoj!  ')).toBe(segmentId('sentence', 'Ahoj!'));
    expect(segmentId('sentence', 'Je to')).not.toBe(segmentId('start', 'Je to'));
    expect(segmentId('sentence', 'Ahoj!')).toMatch(/^[0-9a-f]{8}$/);
  });

  it('a guess is split into the start, the animal name and the ending', () => {
    expect(splitSentence('fox', 'Je to liška, že jo?').map((u) => [u.kind, u.text])).toEqual([
      ['start', 'Je to'],
      ['name', 'liška.'],
      ['end', 'že jo?'],
    ]);
    expect(splitSentence('banana', 'Banánová intuice říká…')).toHaveLength(1);
    expect(splitSentence('banana', 'kůň?').map((u) => u.kind)).toEqual(['name']);
    // an unknown animal stays a whole sentence (it will not be recorded, speech synthesis says it)
    expect(splitSentence('fox', 'Je to drak?').map((u) => u.kind)).toEqual(['sentence']);
  });

  it('every sentence a character can say has a recording in the list', () => {
    for (const p of CHARACTERS) {
      const ids = new Set(allSegments(p.id).map((u) => u.id));
      const dialogue = new Dialogue(p.lines);
      const texts = [
        ...Object.values(p.lines).flatMap(lineTexts).filter((t) => !t.includes('{z}')),
        ...Object.values(EXTRAS),
      ];
      for (let i = 0; i < 40; i++) for (const confidence of [0.3, 0.98]) texts.push(dialogue.guess(NAMES[(i * 37) % NAMES.length], confidence, 15).text);
      for (const t of texts)
        for (const sentence of splitIntoSentences(t))
          for (const u of splitSentence(p.id, sentence)) expect(ids.has(u.id), `${p.id}: ${u.kind} „${u.text}“`).toBe(true);
    }
  });

  it('CRC32 for ZIP', () => {
    expect(crc32(new TextEncoder().encode('123456789'))).toBe(0xcbf43926);
  });
});
