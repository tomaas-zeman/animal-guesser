// Nahrávky z nahrávací stránky, uložené v prohlížeči (IndexedDB), aby šlo namlouvat na víckrát.
// Hra je na stejném zařízení použije hned, ještě než se nahrají na web.

export interface Nahravka {
  /** `${postava}/${id}` */
  klic: string;
  blob: Blob;
  pripona: string;
  text: string;
  kdy: number;
}

const DB = 'hadani-hlasy';
const STORE = 'nahravky';

let db: Promise<IDBDatabase> | null = null;

function otevri(): Promise<IDBDatabase> {
  return (db ??= new Promise((resolve, reject) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE, { keyPath: 'klic' });
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  }));
}

function pozadavek<T>(rezim: IDBTransactionMode, akce: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return otevri().then(
    (d) =>
      new Promise<T>((resolve, reject) => {
        const r = akce(d.transaction(STORE, rezim).objectStore(STORE));
        r.onsuccess = () => resolve(r.result);
        r.onerror = () => reject(r.error);
      }),
  );
}

export const klicNahravky = (postava: string, id: string) => `${postava}/${id}`;

export const ulozNahravku = (n: Nahravka) => pozadavek('readwrite', (s) => s.put(n)).then(() => undefined);

export const smazNahravku = (klic: string) => pozadavek('readwrite', (s) => s.delete(klic)).then(() => undefined);

export const nactiNahravku = (klic: string) => pozadavek<Nahravka | undefined>('readonly', (s) => s.get(klic));

export const vsechnyNahravky = () => pozadavek<Nahravka[]>('readonly', (s) => s.getAll());

/** Klíče všech uložených nahrávek. Bez IndexedDB (např. soukromé okno) prázdné. */
export async function kliceNahravek(): Promise<Set<string>> {
  if (typeof indexedDB === 'undefined') return new Set();
  try {
    return new Set((await pozadavek<IDBValidKey[]>('readonly', (s) => s.getAllKeys())) as string[]);
  } catch {
    return new Set();
  }
}
