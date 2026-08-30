/**
 * tradeStore — the prototype's stand-in for a real trade feed. Trade-table blocks
 * publish their (mapped) rows here keyed by the table's own id; the "Link to trade"
 * picker reads the union, so trades you actually LOG in a table flow into where you
 * reference them (instead of the old MOCK_TRADES). Backed by localStorage; replace
 * with the real Alltra trade API at transfer.
 */
import type { Trade } from "./trades";

const KEY = "alltra-journal-trade-store";
type Store = Record<string, Trade[]>;

function read(): Store {
  try {
    const s: unknown = JSON.parse(localStorage.getItem(KEY) || "{}");
    return s && typeof s === "object" ? (s as Store) : {};
  } catch {
    return {};
  }
}

const listeners = new Set<() => void>();
function write(s: Store): void {
  localStorage.setItem(KEY, JSON.stringify(s));
  listeners.forEach((l) => l());
}

/** Subscribe to store changes (returns an unsubscribe fn). */
export function subscribeTrades(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/** A trade-table publishes its rows under its own id; an empty list removes them. */
export function setTableTrades(tableId: string, trades: Trade[]): void {
  const s = read();
  const prev = JSON.stringify(s[tableId] ?? null);
  if (trades.length === 0) delete s[tableId];
  else s[tableId] = trades;
  if (JSON.stringify(s[tableId] ?? null) !== prev) write(s); // only persist on a real change
}

/** Every trade logged across all trade tables. */
export function allTrades(): Trade[] {
  return Object.values(read()).flat();
}

/**
 * Drop store entries whose table no longer exists anywhere in the document
 * (deleting a trade-table block otherwise leaves its trades counted forever).
 * Called on persist with the ids of every table still present in pages + trash.
 */
export function pruneTrades(keepIds: Set<string>): void {
  const s = read();
  const stale = Object.keys(s).filter((id) => !keepIds.has(id));
  if (stale.length === 0) return;
  stale.forEach((id) => delete s[id]);
  write(s);
}
