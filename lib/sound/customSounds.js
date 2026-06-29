// ─────────────────────────────────────────────────────────────────────────
// Custom alarm sounds — fully client-side, no server / no DB backend.
//
// Audio blobs are too large for cookies (4 KB) and awkward in localStorage
// (string-only, ~5 MB), so we use IndexedDB, the standard browser store for
// binary data. Files persist across visits on the same browser/device.
//
// Limits (chosen for short alarm clips):
//   • per file : 2 MB        • total : 20 MB        • count : 30
//   • formats  : .wav / .mp3
// ─────────────────────────────────────────────────────────────────────────

export const MAX_FILE_BYTES = 2 * 1024 * 1024;
export const MAX_TOTAL_BYTES = 20 * 1024 * 1024;
export const MAX_FILES = 30;
export const ACCEPT_ATTR = '.wav,.mp3,audio/wav,audio/x-wav,audio/mpeg';

const ALLOWED_EXT = ['wav', 'mp3'];
const ALLOWED_MIME = ['audio/wav', 'audio/x-wav', 'audio/wave', 'audio/mpeg', 'audio/mp3'];

const DB_NAME = 'mbc-custom-sounds';
const STORE = 'sounds';

function extOf(name) {
  const m = /\.([a-z0-9]+)$/i.exec(name || '');
  return m ? m[1].toLowerCase() : '';
}

export function formatBytes(n) {
  if (n < 1024) return n + ' B';
  if (n < 1024 * 1024) return (n / 1024).toFixed(0) + ' KB';
  return (n / (1024 * 1024)).toFixed(1) + ' MB';
}

class CustomSoundStore {
  constructor() {
    this.items = [];          // [{ id, name, type, size, blob, addedAt }]
    this.urls = new Map();    // id -> object URL (created lazily)
    this._ready = null;
  }

  _open() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains(STORE)) {
          req.result.createObjectStore(STORE, { keyPath: 'id' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  /** Load all stored sounds once; subsequent calls return the cached list. */
  load() {
    if (this._ready) return this._ready;
    this._ready = (async () => {
      if (typeof indexedDB === 'undefined') return [];
      const db = await this._open();
      const items = await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, 'readonly');
        const rq = tx.objectStore(STORE).getAll();
        rq.onsuccess = () => resolve(rq.result || []);
        rq.onerror = () => reject(rq.error);
      });
      items.sort((a, b) => a.addedAt - b.addedAt);
      this.items = items;
      return items;
    })();
    return this._ready;
  }

  totalBytes() {
    return this.items.reduce((s, i) => s + i.size, 0);
  }

  /** Validate + persist a File. Throws an Error (Korean message) on rejection. */
  async add(file) {
    if (!file) throw new Error('파일이 없습니다.');
    const ext = extOf(file.name);
    const okType = ALLOWED_EXT.includes(ext) || ALLOWED_MIME.includes((file.type || '').toLowerCase());
    if (!okType) throw new Error('wav 또는 mp3 파일만 추가할 수 있습니다.');
    if (file.size > MAX_FILE_BYTES) throw new Error(`파일이 너무 큽니다. (최대 ${formatBytes(MAX_FILE_BYTES)})`);
    if (this.items.length >= MAX_FILES) throw new Error(`알림음은 최대 ${MAX_FILES}개까지 추가할 수 있습니다.`);
    if (this.totalBytes() + file.size > MAX_TOTAL_BYTES) {
      throw new Error(`전체 용량 한도를 초과합니다. (최대 ${formatBytes(MAX_TOTAL_BYTES)})`);
    }

    const entry = {
      id: 'cs_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
      name: file.name.replace(/\.[^.]+$/, ''),
      type: file.type || (ext === 'mp3' ? 'audio/mpeg' : 'audio/wav'),
      size: file.size,
      blob: file,
      addedAt: Date.now(),
    };

    const db = await this._open();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(entry);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    this.items = [...this.items, entry];
    return entry;
  }

  async remove(id) {
    const db = await this._open();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    const url = this.urls.get(id);
    if (url) { URL.revokeObjectURL(url); this.urls.delete(id); }
    this.items = this.items.filter((i) => i.id !== id);
  }

  /** Playable object URL for a stored sound (cached). */
  urlFor(id) {
    if (this.urls.has(id)) return this.urls.get(id);
    const entry = this.items.find((i) => i.id === id);
    if (!entry) return null;
    const url = URL.createObjectURL(entry.blob);
    this.urls.set(id, url);
    return url;
  }
}

// Singleton shared by the manager UI (useCustomSounds) and the detector, so a
// sound added in one place is immediately resolvable in the other.
export const customSounds = new CustomSoundStore();

// Selection helpers — a custom choice is encoded as "custom:<id>" in the
// per-skill sound dropdown so it can't collide with built-in voice labels.
export const CUSTOM_PREFIX = 'custom:';
export const isCustomChoice = (v) => typeof v === 'string' && v.startsWith(CUSTOM_PREFIX);
export const customIdOf = (v) => v.slice(CUSTOM_PREFIX.length);
