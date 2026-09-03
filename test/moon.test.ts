/* The moon, checked against the sky it claims to model. The reference
   instants are eclipse-anchored: an eclipse pins a syzygy to the minute
   in the public record, so the almanac can't drift unnoticed. */
import test from "node:test";
import assert from "node:assert/strict";
import { SYNODIC, meanAge, phaseAge, phaseName, illumination } from "../src/moon.ts";

const DAY = 86400000;
const near = (a: number, b: number, tol = 1e-9) =>
  assert.ok(Math.abs(a - b) <= tol, `${a} !~ ${b} (tol ${tol})`);
/* the new moon nearest an instant known to be one: fifteen days later is
   safely mid-lunation, and its preceding new moon is the one we mean —
   age = (ms − newMoonMs)/day makes the recovery exact */
const newMoonNear = (ms: number) => {
  const t = ms + 15 * DAY;
  return t - phaseAge(t) * DAY;
};

test("meanAge is the page's old modulo, wrapped positive", () => {
  near(meanAge(947182440000), 0, 1e-9);
  near(meanAge(947182440000 + 3 * DAY), 3, 1e-9);
  const before = meanAge(947182440000 - 2 * DAY);
  near(before, SYNODIC - 2, 1e-9);
  assert.ok(before >= 0);
});

test("true age stays within ±0.75 day of the mean age, 2024–2028 weekly", () => {
  let worst = 0;
  for (let ms = Date.parse("2024-01-01T00:00Z");
       ms <= Date.parse("2028-12-31T00:00Z"); ms += 7 * DAY) {
    const a = phaseAge(ms);
    assert.ok(a >= 0 && a < 29.84, `age ${a} out of a lunation's range`);
    /* circular difference: both ages live on the ~29.5-day circle */
    let d = (a - meanAge(ms)) % SYNODIC;
    if (d > SYNODIC / 2) d -= SYNODIC;
    if (d < -SYNODIC / 2) d += SYNODIC;
    worst = Math.max(worst, Math.abs(d));
  }
  assert.ok(worst <= 0.75, `worst |true − mean| = ${worst}`);
});

test("consecutive new moons are 29.27–29.83 days apart", () => {
  const seen: number[] = [];
  for (let ms = Date.parse("2024-01-01T00:00Z");
       ms <= Date.parse("2026-12-31T00:00Z"); ms += 7 * DAY) {
    const nm = ms - phaseAge(ms) * DAY;
    if (!seen.length || nm - seen[seen.length - 1] > DAY) seen.push(nm);
  }
  assert.ok(seen.length > 30, "three years should hold three dozen lunations");
  for (let i = 1; i < seen.length; i++) {
    const gap = (seen[i] - seen[i - 1]) / DAY;
    assert.ok(gap >= 29.27 && gap <= 29.83, `lunation ${gap} days`);
  }
});

test("eclipse-anchored instants land where the record says", () => {
  /* the page's own epoch: the new moon of 2000-01-06 18:14 UTC */
  const epoch = Date.parse("2000-01-06T18:14Z");
  assert.ok(Math.abs(newMoonNear(epoch) - epoch) / DAY < 0.02, "epoch new moon");
  /* the total-eclipse new moon of 1999-08-11 11:08 UTC */
  const eclipse = Date.parse("1999-08-11T11:08Z");
  assert.ok(Math.abs(newMoonNear(eclipse) - eclipse) / DAY < 0.05, "1999 eclipse");
  /* the eclipsed supermoon of 2015-09-28 02:47 UTC: full, so the age is
     near half a lunation — near, not at: that particular new-to-full leg
     genuinely ran 14.837 days (the preceding new moon was 09-13 06:41),
     0.07 beyond half the mean synodic month. The ephemeris is right to
     ~0.002 d; the half-SYNODIC yardstick is the approximation. */
  const full = phaseAge(Date.parse("2015-09-28T02:47Z"));
  near(full, 14.8375, 0.01);
  assert.ok(Math.abs(full - SYNODIC / 2) < 0.08, "within reach of half a lunation");
  assert.equal(phaseName(full), "full moon");
});

test("phaseName buckets the legend's eight strings", () => {
  assert.equal(phaseName(0), "new moon");
  assert.equal(phaseName(SYNODIC / 8), "waxing crescent");
  assert.equal(phaseName(SYNODIC / 4), "first quarter");
  assert.equal(phaseName(SYNODIC / 2), "full moon");
  assert.equal(phaseName(SYNODIC * 3 / 4), "last quarter");
  assert.equal(phaseName(SYNODIC * 0.99), "new moon");   /* rounds home */
});

test("illumination carries the page's k and its wash-out window", () => {
  near(illumination(0).k, 1, 1e-12);
  near(illumination(SYNODIC / 2).k, -1, 1e-12);
  near(illumination(SYNODIC / 4).k, 0, 1e-12);
  assert.equal(illumination(0).full, 0);
  assert.equal(illumination(SYNODIC / 4).full, 0);
  near(illumination(SYNODIC / 2).full, 1, 1e-12);
  /* the smoothstep lives strictly inside its 7% window */
  const half = illumination(SYNODIC * 0.436).full;
  assert.ok(half > 0 && half < 1);
});
