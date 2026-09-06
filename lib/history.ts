import type { Doc } from "./tokens";

/* Pure undo/redo history, kept out of React state so the sequencing is
 * unit-testable and the refs never mutate inside setState updaters. */

export interface HistoryBook {
  past: Doc[];
  future: Doc[];
}

export const HISTORY_CAP = 100;

/** snapshot the current doc as one history entry (book length stays ≤ cap) */
export function pushEntry(past: Doc[], doc: Doc): Doc[] {
  return [...past.slice(-(HISTORY_CAP - 1)), doc];
}

/** returns the new book and the restored doc, or null when undo is empty */
export function stepUndo(book: HistoryBook, current: Doc): { book: HistoryBook; doc: Doc } | null {
  const past = book.past.slice();
  const prev = past.pop();
  if (!prev) return null;
  return {
    book: { past, future: [current, ...book.future.slice(0, HISTORY_CAP)] },
    doc: prev,
  };
}

/** returns the new book and the redone doc, or null when redo is empty */
export function stepRedo(book: HistoryBook, current: Doc): { book: HistoryBook; doc: Doc } | null {
  const future = book.future.slice();
  const next = future.shift();
  if (!next) return null;
  return {
    book: { past: pushEntry(book.past, current), future },
    doc: next,
  };
}
