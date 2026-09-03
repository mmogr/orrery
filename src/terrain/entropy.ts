/* Haze as a measurement: how many languages a week spoke at once, in bits.
   A week of one tongue is clear; a week of five is thick. */
import { entropyBits } from "../math/stats.ts";

export function weeklyEntropy(perWeekLangWeights: ReadonlyArray<Record<string, number>>): Float64Array {
  const out = new Float64Array(perWeekLangWeights.length);
  for (let w = 0; w < perWeekLangWeights.length; w++)
    out[w] = entropyBits(Object.values(perWeekLangWeights[w]));
  return out;
}
