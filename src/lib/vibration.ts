/**
 * Vibrational Digit Synergy Analysis (Redução de Dígitos 1-9)
 * Calculates components, sums, and reduced single digits of a roulette number.
 * For example:
 *   - 19: Digits 1, 9; Sum 10 (Digits 1, 0); Reduced Sum 1.
 *   - 22: Digits 2, 2; Sum 4.
 */

export interface VibrationalBreakdown {
  original: number;
  digits: number[];
  sum: number;
  reducedSum?: number;
  allVibrations: number[]; // Unique single digits representing the vibrational energy of this number
}

/**
 * Calculates the complete vibrational breakdown of a single roulette number.
 */
export function getVibrationalComponents(num: number): VibrationalBreakdown {
  // Safe parsing
  const safeNum = Math.max(0, Math.min(36, Math.floor(num)));
  const digits = String(safeNum).split('').map(Number);
  
  const sum = digits.reduce((sumVal, digit) => sumVal + digit, 0);
  const reducedSum = sum > 9 ? String(sum).split('').map(Number).reduce((sumVal, digit) => sumVal + digit, 0) : undefined;
  
  const allVibeSet = new Set<number>();
  
  // Add original digits
  digits.forEach(d => {
    if (!isNaN(d)) allVibeSet.add(d);
  });
  
  // Add digits from the sum
  String(sum).split('').map(Number).forEach(d => {
    if (!isNaN(d)) allVibeSet.add(d);
  });
  
  // Add reduced sum if present
  if (reducedSum !== undefined && !isNaN(reducedSum)) {
    allVibeSet.add(reducedSum);
  }
  
  // Sort vibrations ascending (usually digits 0-9)
  const allVibrations = Array.from(allVibeSet).sort((a, b) => a - b);
  
  return {
    original: safeNum,
    digits,
    sum,
    reducedSum,
    allVibrations,
  };
}

export interface VibrationalFrequency {
  digit: number;
  count: number;
  percentage: number;
}

/**
 * Calculates frequencies of each vibrational digit (0-9) in the history.
 */
export function getVibrationalHistoryMetrics(historyNumbers: number[], sampleSize = 30): {
  frequencies: VibrationalFrequency[];
  hotVibrations: number[];
  coldVibrations: number[];
} {
  const sample = historyNumbers.slice(0, sampleSize);
  const totalNumbers = sample.length || 1;
  
  const counts = Array(10).fill(0);
  
  sample.forEach(num => {
    const info = getVibrationalComponents(num);
    info.allVibrations.forEach(v => {
      if (v >= 0 && v <= 9) {
        counts[v]++;
      }
    });
  });
  
  const frequencies: VibrationalFrequency[] = counts.map((count, digit) => ({
    digit,
    count,
    percentage: Math.round((count / totalNumbers) * 100),
  }));
  
  // Sort to find hot/cold
  const sortedByCount = [...frequencies].sort((a, b) => b.count - a.count);
  
  const hotVibrations = sortedByCount.slice(0, 3).map(f => f.digit);
  const coldVibrations = sortedByCount.slice(-3).map(f => f.digit);
  
  return {
    frequencies,
    hotVibrations,
    coldVibrations,
  };
}
