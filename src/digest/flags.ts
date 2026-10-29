import type { DigestRow } from './types.js';

export const RETRY_WARN_AT = 3;

const NIGHT_RE = /^\d{4}-\d{2}-\d{2}$/;

// :night must be a real calendar date written YYYY-MM-DD; anything else never reaches the disk.
export function isNight(s: string): boolean {
  if (!NIGHT_RE.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

export const retriesWarn = (row: DigestRow): boolean => row.retries >= RETRY_WARN_AT;
export const statusWarn = (row: DigestRow): boolean => row.lastStatus === 'fail';
