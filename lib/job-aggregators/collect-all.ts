import { collectRemoteOk } from "./collectors/remoteok";
import { collectRemotive } from "./collectors/remotive";
import { collectJobicy } from "./collectors/jobicy";
import { collectAdzuna } from "./collectors/adzuna";
import type { CollectorResult } from "./types";

export async function runAllCollectors(): Promise<CollectorResult[]> {
  const [a, b, c, d] = await Promise.all([
    collectRemoteOk(),
    collectRemotive(),
    collectJobicy(),
    collectAdzuna(),
  ]);
  return [a, b, c, d];
}
