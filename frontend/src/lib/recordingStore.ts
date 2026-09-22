/**
 * IndexedDB-based persistence layer for audio recordings.
 *
 * Stores audio Blobs and associated metadata (duration, topic, etc.) so that
 * recordings survive accidental page reloads or back-navigation.
 *
 * Uses a single database "speech-partner-recordings" with one object store
 * "recordings", keyed by a page identifier (e.g. "narrate-page" or
 * "drill-scenario-{drillId}").
 */

const DB_NAME = 'speech-partner-recordings';
const DB_VERSION = 1;
const STORE_NAME = 'recordings';

export interface RecordingMetadata {
  /** Cumulative recording duration in seconds. */
  duration: number;
  /** The topic text (NarratePage only). */
  topic?: string;
  /** Whether the topic was locked (NarratePage only). */
  topicLocked?: boolean;
  /** Timestamp when the recording was saved. */
  savedAt: number;
}

export interface SavedRecording extends RecordingMetadata {
  /** The audio Blob (null if only metadata like topic was saved). */
  blob: Blob | null;
}

/** Open (or create) the IndexedDB database. */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Save a recording to IndexedDB.
 *
 * @param key   Page identifier, e.g. "narrate-page" or "drill-scenario-abc123"
 * @param blob  The audio Blob to persist (null for metadata-only saves like topic)
 * @param meta  Duration and optional page-specific metadata
 */
export async function saveRecording(
  key: string,
  blob: Blob | null,
  meta: Omit<RecordingMetadata, 'savedAt'>,
): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    const entry: SavedRecording = {
      blob,
      ...meta,
      savedAt: Date.now(),
    };

    const request = store.put(entry, key);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
  });
}

/**
 * Load a previously saved recording from IndexedDB.
 *
 * @param key  Page identifier
 * @returns    The saved recording, or null if nothing was found
 */
export async function loadRecording(key: string): Promise<SavedRecording | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);

      const request = store.get(key);
      request.onsuccess = () => resolve(request.result ?? null);
      request.onerror = () => reject(request.error);
      tx.oncomplete = () => db.close();
    });
  } catch {
    // If IndexedDB is unavailable, silently return null
    console.warn('Failed to load recording from IndexedDB');
    return null;
  }
}

/**
 * Delete a saved recording from IndexedDB.
 *
 * @param key  Page identifier
 */
export async function deleteRecording(key: string): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);

      const request = store.delete(key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
      tx.oncomplete = () => db.close();
    });
  } catch {
    console.warn('Failed to delete recording from IndexedDB');
  }
}
