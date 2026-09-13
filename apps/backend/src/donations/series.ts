const DAY_MS = 24 * 60 * 60 * 1000;

/** Epoch day 0 is a Thursday, so shifting by 3 puts week starts on Monday. */
const MONDAY_OFFSET = 3;

export type Bucket = "day" | "week" | "month";

export interface DailyEarnings {
  /** Days since the epoch, UTC. */
  day: number;
  net: number;
}

export interface EarningsPoint {
  /** Start of the bucket in milliseconds since the epoch, UTC. */
  at: number;
  net: number;
}

function startOfBucket(day: number, bucket: Bucket): number {
  if (bucket === "day") return day;
  if (bucket === "week") return Math.floor((day + MONDAY_OFFSET) / 7) * 7 - MONDAY_OFFSET;
  const at = new Date(day * DAY_MS);
  return Math.floor(Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), 1) / DAY_MS);
}

function nextBucket(day: number, bucket: Bucket): number {
  if (bucket === "day") return day + 1;
  if (bucket === "week") return day + 7;
  const at = new Date(day * DAY_MS);
  return Math.floor(Date.UTC(at.getUTCFullYear(), at.getUTCMonth() + 1, 1) / DAY_MS);
}

/**
 * Rolls daily sums up into dense buckets spanning [from, to], so the chart gets
 * a continuous axis with an explicit zero for every quiet day rather than a gap.
 */
export function bucketEarnings(input: {
  daily: DailyEarnings[];
  bucket: Bucket;
  from: number;
  to: number;
}): EarningsPoint[] {
  const { daily, bucket } = input;
  const totals = new Map<number, number>();

  for (const entry of daily) {
    const start = startOfBucket(entry.day, bucket);
    totals.set(start, (totals.get(start) ?? 0) + entry.net);
  }

  const first = startOfBucket(Math.floor(input.from / DAY_MS), bucket);
  const last = startOfBucket(Math.floor(input.to / DAY_MS), bucket);
  const points: EarningsPoint[] = [];

  for (let start = first; start <= last; start = nextBucket(start, bucket)) {
    points.push({ at: start * DAY_MS, net: totals.get(start) ?? 0 });
  }

  return points;
}
