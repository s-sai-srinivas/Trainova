/**
 * Minimal self-check for date + password helpers.
 * Run: npx tsx lib/utils/date.selfcheck.ts
 */
import assert from "assert";
import { localDayStart, localDayBounds, daysDiff } from "./date";
import { hashPassword, verifyPassword } from "../password";

const start = localDayStart(new Date("2026-07-22T15:30:00+05:30"));
assert.strictEqual(start.toISOString(), "2026-07-22T00:00:00.000Z");

const { start: s, end: e } = localDayBounds(new Date("2026-07-22T01:00:00+05:30"));
assert.ok(s.getTime() <= e.getTime());
assert.strictEqual(daysDiff(new Date("2026-07-25"), new Date("2026-07-22")), 3);

const hash = hashPassword("password123");
assert.ok(verifyPassword("password123", hash));
assert.ok(!verifyPassword("wrong", hash));
assert.ok(!verifyPassword("x", "bad"));
assert.ok(!verifyPassword("x", "aa:zz")); // odd/invalid hex → false, no throw

console.log("date.selfcheck: ok");
