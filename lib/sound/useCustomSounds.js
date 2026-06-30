'use client';

import { useCallback, useEffect, useState } from 'react';
import { customSounds, MAX_FILE_BYTES, MAX_TOTAL_BYTES, MAX_FILES } from './customSounds';

/**
 * React wrapper around the IndexedDB-backed custom sound store. Returns the
 * current list plus add/remove actions; the underlying store is a singleton so
 * the detector resolves the same sounds without any prop drilling.
 */
export function useCustomSounds() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    customSounds.load()
      .then((list) => { if (alive) { setItems([...list]); setLoading(false); } })
      .catch(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  const add = useCallback(async (file) => {
    setError(null);
    try {
      await customSounds.add(file);
      setItems([...customSounds.items]);
      return true;
    } catch (e) {
      setError(e?.message || '추가에 실패했습니다.');
      return false;
    }
  }, []);

  const remove = useCallback(async (id) => {
    await customSounds.remove(id);
    setItems([...customSounds.items]);
  }, []);

  const clearAll = useCallback(async () => {
    setError(null);
    await customSounds.clearAll();
    setItems([]);
  }, []);

  return {
    items,
    add,
    remove,
    clearAll,
    error,
    loading,
    totalBytes: items.reduce((s, i) => s + i.size, 0),
    limits: { file: MAX_FILE_BYTES, total: MAX_TOTAL_BYTES, count: MAX_FILES },
  };
}
