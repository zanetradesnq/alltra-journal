/**
 * MOCK trade data for the "Link to trade" command. This is a placeholder — at
 * transfer, replace `MOCK_TRADES` (or the extension's getTrades) with the user's
 * real trades from the Alltra dashboard. Shape is illustrative.
 */
export interface Trade {
  id: string;
  symbol: string;
  side: "long" | "short";
  pnl: number;
  date: string; // YYYY-MM-DD
  account: string;
}

export const MOCK_TRADES: Trade[] = [
  { id: "t1", symbol: "ES", side: "long", pnl: 154.52, date: "2026-06-24", account: "Topstep" },
  { id: "t2", symbol: "NQ", side: "short", pnl: -72.76, date: "2026-06-24", account: "MFFU" },
  { id: "t3", symbol: "ES", side: "long", pnl: 81.76, date: "2026-06-23", account: "TPT" },
  { id: "t4", symbol: "CL", side: "short", pnl: 210.0, date: "2026-06-22", account: "Apex" },
  { id: "t5", symbol: "GC", side: "long", pnl: -45.3, date: "2026-06-20", account: "Topstep" },
  { id: "t6", symbol: "NQ", side: "long", pnl: 320.5, date: "2026-06-19", account: "MFFU" },
  { id: "t7", symbol: "ES", side: "short", pnl: -120.0, date: "2026-06-18", account: "TPT" },
];
