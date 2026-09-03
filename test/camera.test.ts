/* The camera physics, held to its promises. */
import test from "node:test";
import assert from "node:assert/strict";
import { type Damped, stepDamped, follow, CAMERA, fence } from "../src/camera.ts";

const near = (a: number, b: number, tol = 1e-9) =>
  assert.ok(Math.abs(a - b) <= tol, `${a} !~ ${b} (tol ${tol})`);

test("CAMERA: the time constants reproduce the page's per-frame eases", () => {
  /* x += (g - x)·k at 60Hz is exp decay: 1 - exp(-16.667/τ) should hand
     back the old k for each fitted τ */
  const F = 1000 / 60;
  near(1 - Math.exp(-F / CAMERA.followTau), 0.22, 1e-3);
  near(1 - Math.exp(-F / CAMERA.zoomTau), 0.45, 1e-3);
  near(1 - Math.exp(-F / CAMERA.homingTau), 0.18, 1e-3);
  near(Math.exp(-F / CAMERA.flingTau), 0.94, 1e-4);   /* ×0.94 per frame */
});

test("stepDamped: settles to 2% on the classic schedule", () => {
  /* the sway spring released from 1: the true solution's envelope is
     A(t) = A(0)·e^(-ζωt) with A = √(x² + ((v + ζωx)/ω_d)²); measure by
     stepping when it reaches 2% and compare with the rule of thumb
     t_s ≈ 4/(ζω) — the classic 2% settling estimate */
  const zeta = CAMERA.sway.zeta, omega = CAMERA.sway.omega;
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
  const zeta = CAMERA.sway.zeta, omega = CAMERA.sway.omega;
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

test("fence: three cases hand-run through the page's old camBox", () => {
  /* zoomed all the way out (z = 1, zf = 0): the centre-leash arm alone */
  const b1 = fence({ x: 10, y: -20, z: 1 }, { x0: 100, x1: 500, y0: 80, y1: 300 }, 1200, 800);
  near(b1.minX, -96, 1e-12);    /* 300 - 1200·0.08 - 300·1 */
  near(b1.maxX, 96, 1e-12);     /* 300 + 96 - 300 */
  near(b1.minY, -48, 1e-12);    /* 190 - 800·0.06 - 190 */
  near(b1.maxY, 48, 1e-12);     /* 190 + 48 - 190 */
  /* deep (z = 2.5, zf = 1): the edge-foothold arm alone */
  const b2 = fence({ x: 0, y: 0, z: 2.5 }, { x0: 100, x1: 500, y0: 80, y1: 300 }, 1200, 800);
  near(b2.minX, -866, 1e-12);   /* 1200·0.32 - 500·2.5 */
  near(b2.maxX, 566, 1e-12);    /* 1200·0.68 - 100·2.5 */
  near(b2.minY, -510, 1e-12);   /* 800·0.3 - 300·2.5 */
  near(b2.maxY, 240, 1e-12);    /* 800·0.55 - 80·2.5 */
  /* midway (z = 1.75, zf = 0.5): the blend of both arms */
  const b3 = fence({ x: -40, y: 15, z: 1.75 }, { x0: 140, x1: 860, y0: 120, y1: 520 }, 1280, 720);
  near(b3.minX, -786.4, 1e-12); /* ((500-102.4-875) + (409.6-1505)) / 2 */
  near(b3.maxX, 176.4, 1e-12);  /* ((500+102.4-875) + (870.4-245)) / 2 */
  near(b3.minY, -488.6, 1e-12); /* ((320-43.2-560) + (216-910)) / 2 */
  near(b3.maxY, -5.4, 1e-12);   /* ((320+43.2-560) + (396-210)) / 2 */
});
