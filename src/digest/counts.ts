import { readNight } from './read.js';

export type NightCounts = { ok: number; retry: number; fail: number };

// Counts jobs by their LAST status (rows with lastStatus ok / retry / fail), not raw log lines.
// null when the night can't be read: the view renders that as `—`.
export function nightCounts(runsDir: string, night: string): NightCounts | null {
  const data = readNight(runsDir, night);
  if (!data) return null;
  const counts: NightCounts = { ok: 0, retry: 0, fail: 0 };
  for (const row of data.rows) counts[row.lastStatus]++;
  return counts;
}
