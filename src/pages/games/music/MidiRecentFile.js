import { MAX_MIDI_BYTES } from "./MidiValidation.js";

const DATABASE = "fracto-midi";
const STORE = "recent-file";
const KEY = "last-opened";
let writes = Promise.resolve();

// Optional browser-local persistence: failures never prevent opening a MIDI.
async function access(mode, operation, indexed_db) {
  let database;
  try {
    indexed_db ??= globalThis.indexedDB;
    if (!indexed_db) return null;
    database = await new Promise((resolve, reject) => {
      let blocked = false;
      const request = indexed_db.open(DATABASE, 1);
      request.onupgradeneeded = () => request.result.createObjectStore(STORE);
      request.onsuccess = () => {
        if (blocked) request.result.close();
        else resolve(request.result);
      };
      request.onerror = () => reject(request.error);
      request.onblocked = () => {
        blocked = true;
        reject(new Error("MIDI storage blocked"));
      };
    });
    return await new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE, mode);
      const request = operation(transaction.objectStore(STORE));
      transaction.oncomplete = () => resolve(request.result ?? true);
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  } catch {
    return null;
  } finally {
    database?.close();
  }
}

export async function read_recent_midi(indexed_db) {
  const saved = await access("readonly", (store) => store.get(KEY), indexed_db);
  if (
    !saved ||
    typeof saved.name !== "string" ||
    !(saved.bytes instanceof ArrayBuffer) ||
    !saved.bytes.byteLength ||
    saved.bytes.byteLength > MAX_MIDI_BYTES
  )
    return null;
  return {
    name: saved.name,
    size: saved.bytes.byteLength,
    arrayBuffer: async () => saved.bytes.slice(0),
  };
}

export function remember_midi(name, bytes, indexed_db) {
  if (
    typeof name !== "string" ||
    !(bytes instanceof ArrayBuffer) ||
    !bytes.byteLength ||
    bytes.byteLength > MAX_MIDI_BYTES
  )
    return Promise.resolve(false);
  const record = { name, bytes: bytes.slice(0) };
  // Serialize commits so an older selection cannot overwrite a newer one.
  const write = writes.then(() =>
    access("readwrite", (store) => store.put(record, KEY), indexed_db),
  );
  writes = write.catch(() => null);
  return write.then((result) => result !== null);
}
