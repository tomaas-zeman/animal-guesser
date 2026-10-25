// Recordings from the recording page, stored in the browser (IndexedDB), so recording can be spread over several sessions.
// The game uses them right away on the same device, even before they are uploaded to the web.

export interface StoredRecording {
  /** `${characterId}/${id}` */
  key: string;
  blob: Blob;
  extension: string;
  text: string;
  when: number;
}

// The database name is kept from the Czech version so that existing recordings stay reachable.
const DB = 'hadani-hlasy';
const STORE = 'recordings';
const LEGACY_STORE = 'nahravky';

let db: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  return (db ??= new Promise((resolve, reject) => {
    const r = indexedDB.open(DB, 2);
    r.onupgradeneeded = () => {
      const database = r.result;
      const store = database.createObjectStore(STORE, { keyPath: 'key' });
      // move recordings stored by the earlier version (Czech store and field names) into the new store
      if (database.objectStoreNames.contains(LEGACY_STORE)) {
        r.transaction!.objectStore(LEGACY_STORE).openCursor().onsuccess = (e) => {
          const cursor = (e.target as IDBRequest<IDBCursorWithValue | null>).result;
          if (!cursor) {
            database.deleteObjectStore(LEGACY_STORE);
            return;
          }
          const old = cursor.value;
          store.put({ key: old.klic, blob: old.blob, extension: old.pripona, text: old.text, when: old.kdy });
          cursor.continue();
        };
      }
    };
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  }));
}

function request<T>(mode: IDBTransactionMode, action: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (d) =>
      new Promise<T>((resolve, reject) => {
        const r = action(d.transaction(STORE, mode).objectStore(STORE));
        r.onsuccess = () => resolve(r.result);
        r.onerror = () => reject(r.error);
      }),
  );
}

export const recordingKey = (characterId: string, id: string) => `${characterId}/${id}`;

export const saveRecording = (n: StoredRecording) => request('readwrite', (s) => s.put(n)).then(() => undefined);

export const deleteRecording = (key: string) => request('readwrite', (s) => s.delete(key)).then(() => undefined);

export const loadRecording = (key: string) => request<StoredRecording | undefined>('readonly', (s) => s.get(key));

export const allRecordings = () => request<StoredRecording[]>('readonly', (s) => s.getAll());

/** Keys of all stored recordings. Empty without IndexedDB (e.g. a private window). */
export async function recordingKeys(): Promise<Set<string>> {
  if (typeof indexedDB === 'undefined') return new Set();
  try {
    return new Set((await request<IDBValidKey[]>('readonly', (s) => s.getAllKeys())) as string[]);
  } catch {
    return new Set();
  }
}
