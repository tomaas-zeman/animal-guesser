// Minimal ZIP without compression (the audio is already compressed) so the recordings can be downloaded as a single file.

const CRC_TABLE = (() => {
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
  for (let i = 0; i < data.length; i++) c = CRC_TABLE[(c ^ data[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

export interface ZipFile {
  path: string;
  data: Uint8Array;
}

export function createZip(files: ZipFile[]): Blob {
  const encoder = new TextEncoder();
  const parts: Uint8Array<ArrayBuffer>[] = [];
  const centralDirectory: Uint8Array<ArrayBuffer>[] = [];
  let step = 0;

  for (const s of files) {
    const name = encoder.encode(s.path);
    const crc = crc32(s.data);
    const header = new Uint8Array(30 + name.length);
    const h = new DataView(header.buffer);
    h.setUint32(0, 0x04034b50, true);
    h.setUint16(4, 20, true);
    h.setUint16(6, 0x0800, true); // names in UTF-8
    h.setUint32(14, crc, true);
    h.setUint32(18, s.data.length, true);
    h.setUint32(22, s.data.length, true);
    h.setUint16(26, name.length, true);
    header.set(name, 30);
    parts.push(header, new Uint8Array(s.data));

    const entry = new Uint8Array(46 + name.length);
    const z = new DataView(entry.buffer);
    z.setUint32(0, 0x02014b50, true);
    z.setUint16(4, 20, true);
    z.setUint16(6, 20, true);
    z.setUint16(8, 0x0800, true);
    z.setUint32(16, crc, true);
    z.setUint32(20, s.data.length, true);
    z.setUint32(24, s.data.length, true);
    z.setUint16(28, name.length, true);
    z.setUint32(42, step, true);
    entry.set(name, 46);
    centralDirectory.push(entry);

    step += header.length + s.data.length;
  }

  const size = centralDirectory.reduce((a, b) => a + b.length, 0);
  const end = new Uint8Array(22);
  const k = new DataView(end.buffer);
  k.setUint32(0, 0x06054b50, true);
  k.setUint16(8, files.length, true);
  k.setUint16(10, files.length, true);
  k.setUint32(12, size, true);
  k.setUint32(16, step, true);
  return new Blob([...parts, ...centralDirectory, end], { type: 'application/zip' });
}
