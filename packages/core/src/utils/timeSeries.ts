/**
 * Downsample an ordered time series with the Largest-Triangle-Three-Buckets
 * algorithm.
 *
 * The returned series never mutates `rows`, retains both endpoints whenever
 * `maxPoints` is at least two, and preserves visually significant intermediate
 * points better than fixed-interval sampling. Callers should pass rows in
 * ascending X order.
 *
 * Non-finite projected coordinates are treated as zero so malformed source
 * observations cannot make every triangle area `NaN`.
 */
export function downsampleTimeSeries<T>(
  rows: readonly T[],
  maxPoints: number,
  xOf: (row: T) => number,
  yOf: (row: T) => number,
): T[] {
  if (!Number.isSafeInteger(maxPoints) || maxPoints < 0) {
    throw new RangeError("maxPoints must be a non-negative safe integer");
  }
  if (maxPoints === 0 || rows.length === 0) return [];
  if (rows.length <= maxPoints) return rows.slice();
  if (maxPoints < 3) {
    return [rows[0]!, rows[rows.length - 1]!].slice(0, maxPoints);
  }

  const x = rows.map((row) => finite(xOf(row)));
  const y = rows.map((row) => finite(yOf(row)));
  const sampled: T[] = [rows[0]!];
  const bucketWidth = (rows.length - 2) / (maxPoints - 2);
  let anchorIndex = 0;

  for (let bucketIndex = 0; bucketIndex < maxPoints - 2; bucketIndex += 1) {
    const averageStart = Math.floor((bucketIndex + 1) * bucketWidth) + 1;
    const averageEnd = Math.min(
      Math.floor((bucketIndex + 2) * bucketWidth) + 1,
      rows.length,
    );
    const averageLength = averageEnd - averageStart;
    let averageX = 0;
    let averageY = 0;

    for (let index = averageStart; index < averageEnd; index += 1) {
      averageX += x[index]!;
      averageY += y[index]!;
    }
    averageX /= averageLength;
    averageY /= averageLength;

    const rangeStart = Math.floor(bucketIndex * bucketWidth) + 1;
    const rangeEnd = Math.min(
      Math.floor((bucketIndex + 1) * bucketWidth) + 1,
      rows.length - 1,
    );
    const anchorX = x[anchorIndex]!;
    const anchorY = y[anchorIndex]!;
    let largestArea = -1;
    let selectedIndex = rangeStart;

    for (let index = rangeStart; index < rangeEnd; index += 1) {
      const area = Math.abs(
        (anchorX - averageX) * (y[index]! - anchorY) -
          (anchorX - x[index]!) * (averageY - anchorY),
      );
      if (area > largestArea) {
        largestArea = area;
        selectedIndex = index;
      }
    }

    sampled.push(rows[selectedIndex]!);
    anchorIndex = selectedIndex;
  }

  sampled.push(rows[rows.length - 1]!);
  return sampled;
}

function finite(value: number): number {
  return Number.isFinite(value) ? value : 0;
}
