/**
 * Vibrational Digit Synergy Analysis (Redução de Dígitos 1-9 & Sinergia de Cores)
 * Decomposes numbers into digits, sums, vibrational reductions, AND color resonance
 * (Vermelho, Preto e Verde/Zero) to detect color-digit attraction patterns.
 * 
 * Example:
 *   - 26 (Preto): Digits 2, 6 -> Sum 8. Black Vibrational targets: 8, 17, 26, 35.
 *   - 19 (Vermelho) + 21 (Vermelho): Digits 1,9 and 2,1 -> Sum 10 (ending 0).
 *     The red number with 0 digit ending is 30 (Vermelho).
 */

export type NumberColor = 'red' | 'black' | 'green';

export const RED_NUMBERS = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
export const BLACK_NUMBERS = [2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35];

export function getNumberColor(num: number): NumberColor {
  if (num === 0) return 'green';
  if (RED_NUMBERS.includes(num)) return 'red';
  if (BLACK_NUMBERS.includes(num)) return 'black';
  return 'black';
}

export function getColorNamePT(color: NumberColor): string {
  switch (color) {
    case 'red': return 'Vermelho';
    case 'black': return 'Preto';
    case 'green': return 'Verde (Zero)';
  }
}

export interface VibrationalBreakdown {
  original: number;
  color: NumberColor;
  colorName: string;
  digits: number[];
  sum: number;
  reducedSum?: number;
  allVibrations: number[]; // Unique single digits representing the vibrational energy
  colorResonanceTargets: number[]; // Same-color targets sharing digit sum or ending
  colorReasoning: string;
}

/**
 * Calculates the complete vibrational breakdown including Color Synergy of a single roulette number.
 */
export function getVibrationalComponents(num: number): VibrationalBreakdown {
  // Safe parsing
  const isInvalid = num === undefined || num === null || typeof num !== 'number' || isNaN(num);
  const safeNum = isInvalid ? 0 : Math.max(0, Math.min(36, Math.floor(num)));
  const color = getNumberColor(safeNum);
  const colorName = getColorNamePT(color);

  const digits = String(safeNum).split('').map(Number).filter(d => !isNaN(d));
  const sum = digits.reduce((sumVal, digit) => sumVal + digit, 0);
  const reducedSum = sum > 9 ? String(sum).split('').map(Number).filter(d => !isNaN(d)).reduce((sumVal, digit) => sumVal + digit, 0) : undefined;
  
  const allVibeSet = new Set<number>();
  digits.forEach(d => { if (!isNaN(d)) allVibeSet.add(d); });
  String(sum).split('').map(Number).forEach(d => { if (!isNaN(d)) allVibeSet.add(d); });
  if (reducedSum !== undefined && !isNaN(reducedSum)) {
    allVibeSet.add(reducedSum);
  }
  
  const allVibrations = Array.from(allVibeSet).filter(v => v >= 0 && v <= 9).sort((a, b) => a - b);

  // Find same color numbers with matching digit sum or ending
  const sameColorPool = color === 'red' ? RED_NUMBERS : color === 'black' ? BLACK_NUMBERS : [0, 30];
  const targetDigitEnding = sum % 10;
  const targetReduced = reducedSum ?? sum;

  const colorResonanceTargets = sameColorPool.filter(n => {
    if (n === safeNum) return false;
    const nDigits = String(n).split('').map(Number);
    const nSum = nDigits.reduce((a, b) => a + b, 0);
    const nReduced = nSum > 9 ? Math.floor(nSum / 10) + (nSum % 10) : nSum;
    const nEnding = n % 10;
    return nEnding === targetDigitEnding || nReduced === targetReduced || nDigits.includes(targetReduced);
  }).slice(0, 4);

  let colorReasoning = '';
  if (color === 'red') {
    colorReasoning = `Pedra ${safeNum} (Vermelha) tem dígitos [${digits.join(', ')}] e soma vibracional ${sum}${reducedSum ? ` (redução ${reducedSum})` : ''}. Atrai pedras vermelhas de mesma raiz: ${colorResonanceTargets.join(', ')}.`;
  } else if (color === 'black') {
    colorReasoning = `Pedra ${safeNum} (Preta) tem dígitos [${digits.join(', ')}] e soma vibracional ${sum}${reducedSum ? ` (redução ${reducedSum})` : ''}. Atrai pedras pretas de mesma raiz: ${colorResonanceTargets.join(', ')}.`;
  } else {
    colorReasoning = `Zero (Verde) representa o ponto nulo vibracional e atrai os terminais de ponte 30 (Vermelho) e 10, 20 (Pretos).`;
  }

  return {
    original: safeNum,
    color,
    colorName,
    digits,
    sum,
    reducedSum,
    allVibrations,
    colorResonanceTargets,
    colorReasoning,
  };
}

export interface VibrationalFrequency {
  digit: number;
  count: number;
  percentage: number;
}

export interface ColorVibrationalSynergyResult {
  recentColorDominance: 'red' | 'black' | 'mixed';
  colorSequenceText: string;
  suggestedTargets: number[];
  synergyReasoning: string;
  vibrationalBridge: {
    lastNumber: number;
    lastColor: NumberColor;
    digitsSum: number;
    colorBridgeTargets: number[];
  };
}

/**
 * Evaluates Color + Vibrational Digit Synergy across the recent spin history.
 * Detects patterns like: 19 Red + 21 Red -> sum digits 10 -> targets 30 Red, etc.
 */
export function getVibrationalColorSynergy(historyNumbers: number[]): ColorVibrationalSynergyResult {
  const safeHistory = Array.isArray(historyNumbers) ? historyNumbers.filter(n => typeof n === 'number' && !isNaN(n)) : [];
  if (safeHistory.length === 0) {
    return {
      recentColorDominance: 'mixed',
      colorSequenceText: 'Sem giros registrados',
      suggestedTargets: [30, 26, 19, 21],
      synergyReasoning: 'Aguardando giros para calcular a sinergia vibracional de cores e dígitos.',
      vibrationalBridge: {
        lastNumber: 0,
        lastColor: 'green',
        digitsSum: 0,
        colorBridgeTargets: [30, 10, 20],
      }
    };
  }

  const lastNum = safeHistory[0];
  const lastColor = getNumberColor(lastNum);
  const lastBreakdown = getVibrationalComponents(lastNum);

  // Analyze top 5 recent spins for color dominance
  const recentSpins = safeHistory.slice(0, 5);
  const redCount = recentSpins.filter(n => getNumberColor(n) === 'red').length;
  const blackCount = recentSpins.filter(n => getNumberColor(n) === 'black').length;

  let recentColorDominance: 'red' | 'black' | 'mixed' = 'mixed';
  if (redCount >= 3) recentColorDominance = 'red';
  else if (blackCount >= 3) recentColorDominance = 'black';

  const colorSequenceText = recentSpins.map(n => {
    const c = getNumberColor(n);
    return `${n} (${c === 'red' ? 'V' : c === 'black' ? 'P' : 'Z'})`;
  }).join(' → ');

  // Calculate Multi-Spin Color + Digit Synergy Bridge
  // Take last 2-3 numbers of same dominant color
  const sameColorSpins = recentSpins.filter(n => getNumberColor(n) === (recentColorDominance !== 'mixed' ? recentColorDominance : lastColor));
  
  let combinedDigitSum = 0;
  sameColorSpins.forEach(n => {
    const d = getVibrationalComponents(n);
    combinedDigitSum += d.sum;
  });

  const reducedCombinedSum = combinedDigitSum > 9 
    ? String(combinedDigitSum).split('').map(Number).reduce((a, b) => a + b, 0) 
    : combinedDigitSum;

  const targetColor = recentColorDominance !== 'mixed' ? recentColorDominance : lastColor;
  const targetPool = targetColor === 'red' ? RED_NUMBERS : targetColor === 'black' ? BLACK_NUMBERS : [0, 30];

  // Match numbers of that target color whose terminal digit or reduced sum matches combinedDigitSum
  const bridgeTargets = targetPool.filter(n => {
    const nDigits = String(n).split('').map(Number);
    const nSum = nDigits.reduce((a, b) => a + b, 0);
    const nEnding = n % 10;
    return nEnding === (combinedDigitSum % 10) || nSum === reducedCombinedSum || nEnding === reducedCombinedSum;
  });

  // If pool is empty or too small, complement with lastBreakdown targets
  const finalBridgeTargets = Array.from(new Set([...bridgeTargets, ...lastBreakdown.colorResonanceTargets])).slice(0, 4);

  let synergyReasoning = '';
  if (targetColor === 'red') {
    synergyReasoning = `🔴 SINERGIA VERMELHA ATIVA: Sequência recente de pedras vermelhas [${sameColorSpins.join(', ')}]. A junção dos dígitos resulta em soma ${combinedDigitSum} (Redução ${reducedCombinedSum}). O algoritmo identificou atração para as pedras vermelhas correspondentes: ${finalBridgeTargets.join(', ')}.`;
  } else if (targetColor === 'black') {
    synergyReasoning = `⚫ SINERGIA PRETA ATIVA: Sequência recente de pedras pretas [${sameColorSpins.join(', ')}]. A junção dos dígitos resulta em soma ${combinedDigitSum} (Redução ${reducedCombinedSum}). O algoritmo identificou atração para as pedras pretas correspondentes: ${finalBridgeTargets.join(', ')}.`;
  } else {
    synergyReasoning = `🟢 SINERGIA DE VERDE / ZERO: O zero unifica as vibrações. Junção vibracional ativa para os pontos 30 (Vermelho) e 10, 20 (Pretos).`;
  }

  return {
    recentColorDominance,
    colorSequenceText,
    suggestedTargets: finalBridgeTargets.length > 0 ? finalBridgeTargets : [lastNum],
    synergyReasoning,
    vibrationalBridge: {
      lastNumber: lastNum,
      lastColor,
      digitsSum: combinedDigitSum,
      colorBridgeTargets: finalBridgeTargets,
    }
  };
}

/**
 * Calculates frequencies of each vibrational digit (0-9) in the history.
 */
export function getVibrationalHistoryMetrics(historyNumbers: number[], sampleSize = 30): {
  frequencies: VibrationalFrequency[];
  hotVibrations: number[];
  coldVibrations: number[];
} {
  const safeNumbers = Array.isArray(historyNumbers) ? historyNumbers.filter(n => typeof n === 'number' && !isNaN(n)) : [];
  const sample = safeNumbers.slice(0, sampleSize);
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

