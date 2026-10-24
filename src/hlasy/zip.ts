// Minimální ZIP bez komprese (audio už komprimované je), aby šly nahrávky stáhnout jedním souborem.

const TABULKA = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

export function crc32(data: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i++) c = TABULKA[(c ^ data[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

export interface SouborZipu {
  cesta: string;
  data: Uint8Array;
}

export function vytvorZip(soubory: SouborZipu[]): Blob {
  const kodovac = new TextEncoder();
  const casti: Uint8Array<ArrayBuffer>[] = [];
  const adresar: Uint8Array<ArrayBuffer>[] = [];
  let posun = 0;

  for (const s of soubory) {
    const jmeno = kodovac.encode(s.cesta);
    const crc = crc32(s.data);
    const hlavicka = new Uint8Array(30 + jmeno.length);
    const h = new DataView(hlavicka.buffer);
    h.setUint32(0, 0x04034b50, true);
    h.setUint16(4, 20, true);
    h.setUint16(6, 0x0800, true); // jména v UTF-8
    h.setUint32(14, crc, true);
    h.setUint32(18, s.data.length, true);
    h.setUint32(22, s.data.length, true);
    h.setUint16(26, jmeno.length, true);
    hlavicka.set(jmeno, 30);
    casti.push(hlavicka, new Uint8Array(s.data));

    const zaznam = new Uint8Array(46 + jmeno.length);
    const z = new DataView(zaznam.buffer);
    z.setUint32(0, 0x02014b50, true);
    z.setUint16(4, 20, true);
    z.setUint16(6, 20, true);
    z.setUint16(8, 0x0800, true);
    z.setUint32(16, crc, true);
    z.setUint32(20, s.data.length, true);
    z.setUint32(24, s.data.length, true);
    z.setUint16(28, jmeno.length, true);
    z.setUint32(42, posun, true);
    zaznam.set(jmeno, 46);
    adresar.push(zaznam);

    posun += hlavicka.length + s.data.length;
  }

  const velikost = adresar.reduce((a, b) => a + b.length, 0);
  const konec = new Uint8Array(22);
  const k = new DataView(konec.buffer);
  k.setUint32(0, 0x06054b50, true);
  k.setUint16(8, soubory.length, true);
  k.setUint16(10, soubory.length, true);
  k.setUint32(12, velikost, true);
  k.setUint32(16, posun, true);
  return new Blob([...casti, ...adresar, konec], { type: 'application/zip' });
}
