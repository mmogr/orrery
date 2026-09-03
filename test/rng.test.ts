/* the dice: seeded means repeatable, and the stream is the page's own */
import test from "node:test";
import assert from "node:assert/strict";
import { rng, strHash } from "@mmogr/orrery";

test("a seed fixes the stream", () => {
  const a = rng(7), b = rng(7);
  for (let i = 0; i < 100; i++) assert.equal(a(), b());
});

test("the stream is the page's LCG", () => {
  const r = rng(20260831);
  const first = r();
  assert.ok(first > 0 && first < 1);
  /* the exact first draw of the star field's seed, pinned */
  assert.equal(Math.round(first * 1e9), Math.round(0.3702976522035897 * 1e9));
});

test("strHash is stable and 32-bit", () => {
  assert.equal(strHash("gglib"), strHash("gglib"));
  assert.notEqual(strHash("gglib"), strHash("uninotes"));
  assert.ok(strHash("a".repeat(300)) >= 0);
});
