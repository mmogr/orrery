/* Haze as a measurement: how many languages a week spoke at once, in bits.
   A week of one tongue is clear; a week of five is thick. */
import { entropyBits } from "../math/stats.ts";

export function weeklyEntropy(perWeekLangWeights: ReadonlyArray<Record<string, number>>): Float64Array {
  throw new Error("todo: weeklyEntropy");
}

void entropyBits;   /* stub; the implementation uses this */
