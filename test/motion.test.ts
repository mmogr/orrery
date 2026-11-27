/* Motion toward a target, held to its promises. */
import test from "node:test";
import assert from "node:assert/strict";
import { type Damped, stepDamped, follow } from "../src/motion.ts";

const near = (a: number, b: number, tol = 1e-9) =>
  assert.ok(Math.abs(a - b) <= tol, `${a} !~ ${b} (tol ${tol})`);

test("stepDamped: settles to 2% on the classic schedule", () => {
  /* a spring released from 1: the true solution's envelope is
     A(t) = A(0)·e^(-ζωt) with A = √(x² + ((v + ζωx)/ω_d)²); measure by
     stepping when it reaches 2% and compare with the rule of thumb
     t_s ≈ 4/(ζω) — the classic 2% settling estimate */
  const zeta = 0.32, omega = 12;        /* an underdamped spring: it overshoots, then settles */
  const wd = omega * Math.sqrt(1 - zeta * zeta);
  const s: Damped = { x: 1, v: 0 };
  const dt = 1000 / 60;
  let t = 0;
  while (t < 5000) {
    stepDamped(s, 0, zeta, omega, dt);
    t += dt;
    const A = Math.hypot(s.x, (s.v + zeta * omega * s.x) / wd);
    if (A <= 0.02) break;
  }
  const closed = 4 / (zeta * omega);            /* seconds */
  near(t / 1000, closed, closed * 0.05);
});

test("stepDamped: 60fps and 240fps land within 1%", () => {
  const zeta = 0.32, omega = 12;        /* an underdamped spring: it overshoots, then settles */
  const a: Damped = { x: 1, v: 0 };
  const b: Damped = { x: 1, v: 0 };
  for (let i = 0; i < 30; i++) stepDamped(a, 0, zeta, omega, 1000 / 60);
  for (let i = 0; i < 120; i++) stepDamped(b, 0, zeta, omega, 1000 / 240);
  /* same half second of sway, framed at 60 and 240: within 1% of the
     released amplitude of each other */
  assert.ok(Math.abs(a.x - b.x) < 0.01, `x drifted: ${a.x} vs ${b.x}`);
  assert.ok(Math.abs(a.v - b.v) / omega < 0.01, `v drifted: ${a.v} vs ${b.v}`);
});

test("follow: after one τ the gap is exactly 1/e, however dt is split", () => {
  near(follow(1, 0, 67.1, 67.1), Math.exp(-1), 1e-9);
  near(follow(5, 2, 84, 84), 2 + 3 * Math.exp(-1), 1e-9);
  /* the exact exponential composes: two half steps equal one whole */
  const whole = follow(3, -1, 50, 40);
  const halves = follow(follow(3, -1, 50, 20), -1, 50, 20);
  near(halves, whole, 1e-12);
});
