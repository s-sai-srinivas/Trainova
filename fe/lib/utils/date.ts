/** Local calendar day as UTC midnight (stable key for @@unique on date). */
export function localDayStart(now = new Date()): Date {
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0));
}

export function localDayBounds(now = new Date()): { start: Date; end: Date } {
  const start = localDayStart(now);
  const end = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999));
  return { start, end };
}

export function daysDiff(d1: Date, d2: Date): number {
  const t1 = new Date(d1.getFullYear(), d1.getMonth(), d1.getDate()).getTime();
  const t2 = new Date(d2.getFullYear(), d2.getMonth(), d2.getDate()).getTime();
  return Math.max(0, Math.floor((t1 - t2) / (1000 * 60 * 60 * 24)));
}
