// Patch notes are published by editing /public/patchnotes.json — no server, no
// build step. Newest entry first. Each note: { date: "YYYY-MM-DD", title, items[] }.

export const NEW_WINDOW_DAYS = 7;

export async function fetchPatchNotes() {
  try {
    const res = await fetch('/patchnotes.json', { cache: 'no-store' });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data?.notes) ? data.notes : [];
  } catch {
    return [];
  }
}

/** Days elapsed since a YYYY-MM-DD date (>= 0), or Infinity if unparseable. */
export function daysSince(date) {
  const t = new Date(date + 'T00:00:00').getTime();
  if (Number.isNaN(t)) return Infinity;
  return (Date.now() - t) / 86400000;
}

/**
 * Should the "New!" badge show? True when the most recent note was published
 * within the last NEW_WINDOW_DAYS — so it disappears automatically a week after
 * each new note goes up.
 */
export function hasFreshNote(notes) {
  if (!notes || notes.length === 0) return false;
  const newest = notes.reduce((best, n) => (daysSince(n.date) < daysSince(best.date) ? n : best));
  const d = daysSince(newest.date);
  return d >= 0 && d < NEW_WINDOW_DAYS;
}

export function isFresh(date) {
  const d = daysSince(date);
  return d >= 0 && d < NEW_WINDOW_DAYS;
}
