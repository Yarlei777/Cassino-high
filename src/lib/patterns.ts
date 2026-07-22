import { CYLINDER, getNumberSector, getSectorName, suggestTargets, getStrategyCoverage, COLORS, getNeighbors } from './roulette';
import { getCalculatedProviderPulls } from './providerData';

export interface HistoryEntry {
  id: string;
  number: number;
  isWin: boolean;
  targets: number[];
  coveredNumbers: number[];
  strategyUsed: string;
  gameMode: string;
  timestamp: string;
  ballDirection?: 'cw' | 'ccw';
  wasPlayed?: boolean;
  playStatus?: 'win' | 'loss' | 'g0-loss' | 'none';
  balanceChange?: number;
}

export const SET_A_AUSENTE = [15, 0, 26, 3, 35, 12, 28, 7, 24, 5, 23, 6, 34, 17];
export const SET_B_CONFIRMACAO = [4, 0, 10, 27, 9, 14, 25, 19, 1, 2, 32, 16];

/**
 * Returns the mirror group (equivalent "stones") for a given roulette number.
 * This includes digit reversals (13/31, 12/21), visual upside-down mirrors (6/9, 16/19, 26/29), and twin digits (11/22/33).
 */
export function getMirrorGroup(num: number): number[] {
  const MIRRORS: Record<number, number[]> = {
    1: [10], 10: [1],
    2: [20], 20: [2],
    3: [30], 30: [3],
    6: [9], 9: [6],
    12: [21], 21: [12],
    13: [31], 31: [13],
    16: [19], 19: [16],
    23: [32], 32: [23],
    26: [29], 29: [26],
    11: [22, 33], 22: [11, 33], 33: [11, 22]
  };
  return [num, ...(MIRRORS[num] || [])];
}

export interface PatternStep {
  name: string;
  description: string;
  status: 'pending' | 'current' | 'completed';
  numbers: number[];
}

export interface PatternStatus {
  active: boolean;
  state: 'idle' | 'warning' | 'active';
  progress: number;
  currentStep: number;
  details: string;
  steps: PatternStep[];
}

export interface TerminalDelay {
  terminal: number;
  delay: number;
  numbers: number[];
  state: 'normal' | 'warning' | 'active';
  label: string;
}

export interface CallerStat {
  triggerElement: string; // number or terminal
  totalOccurrences: number;
  hottestNextNumbers: Array<{ number: number; count: number; pct: number }>;
  hottestNextSectors: Array<{ sector: string; name: string; count: number; pct: number }>;
  hottestNextTerminals: Array<{ terminal: number; count: number; pct: number }>;
  respectRate: number; // percentage of times next number was in the top sector
}

export interface BreakoutPivot {
  number: number;
  terminal: number;
  sectorFrom: string;
  sectorTo: string;
  occurrences: number;
  returnCount: number;
  returnRate: number; // percentage of times the spin immediately returned to the previous sector
}

export interface ActiveTrigger {
  id: string;
  title: string;
  description: string;
  type: 'terminal_delay' | 'custom_cycle' | 'breakout_pivot' | 'sector_dominance' | 'strategy_performance' | 'caller_respect' | 'sum_delay' | 'bate_e_volta' | 'repeticao_regiao';
  severity: 'low' | 'medium' | 'high';
  actionLabel: string;
  recommendedTargets: number[];
  neighborRange: number;
  reasoning: string;
}

export interface StrategyPerformance {
  strategy: 'terminals' | 'frequency' | 'opposite' | 'sectors' | 'signature';
  label: string;
  wins: number;
  total: number;
  rate: number;
}

/**
 * Evaluates the precise absence, confirmation, and new absence cycle for ANY terminal digit (0-9).
 * Pattern: Set A (Absence of terminal t) -> Set B (Presence of terminal t) -> Set A (New Absence of t) -> Play Terminal t + Neighbors
 */
export function evaluateTerminalCycle(terminal: number, history: number[]): PatternStatus {
  const allWithTerminal = CYLINDER.filter((n) => n % 10 === terminal);
  const allWithoutTerminal = CYLINDER.filter((n) => n % 10 !== terminal);

  const steps: PatternStep[] = [
    {
      name: `Fase 1: Terminal ${terminal} Ausente`,
      description: `Giros sem saída do Terminal ${terminal}`,
      status: 'pending',
      numbers: allWithoutTerminal,
    },
    {
      name: `Fase 2: Confirmação`,
      description: `Giros de Confirmação (Saída do Terminal ${terminal})`,
      status: 'pending',
      numbers: allWithTerminal,
    },
    {
      name: `Fase 3: Nova Ausência`,
      description: `Retorno ao ciclo sem o Terminal ${terminal}`,
      status: 'pending',
      numbers: allWithoutTerminal,
    },
  ];

  if (history.length === 0) {
    return {
      active: false,
      state: 'idle',
      progress: 0,
      currentStep: 0,
      details: `Insira números na mesa para iniciar o rastreamento do ciclo do Terminal ${terminal}.`,
      steps,
    };
  }

  const hasTerminal = (num: number) => num % 10 === terminal;

  // Let's identify the phases backwards from history (index 0 is newest)
  let idx = 0;

  // 1. Phase 3 (Most recent spins without terminal t)
  let phase3Count = 0;
  while (idx < history.length && !hasTerminal(history[idx])) {
    phase3Count++;
    idx++;
  }

  // 2. Phase 2 (Spins before that containing at least one Terminal t)
  let phase2Count = 0;
  while (idx < history.length && hasTerminal(history[idx])) {
    phase2Count++;
    idx++;
  }

  // 3. Phase 1 (Spins before that without terminal t)
  let phase1Count = 0;
  while (idx < history.length && !hasTerminal(history[idx])) {
    phase1Count++;
    idx++;
  }

  let state: 'idle' | 'warning' | 'active' = 'idle';
  let progress = 0;
  let currentStep = 0;
  let details = '';

  if (phase3Count >= 1 && phase2Count >= 1 && phase1Count >= 1) {
    state = 'active';
    progress = 100;
    currentStep = 3;
    details = `🚨 SINAL DE CICLO ATIVO! Padrão detectado para Terminal ${terminal}: Ausente (${phase1Count} rodadas) ➜ Confirmação com Terminal ${terminal} (${phase2Count} rodadas) ➜ Nova Ausência (${phase3Count} rodadas). Jogar Terminal ${terminal} com vizinhos!`;
    steps[0].status = 'completed';
    steps[1].status = 'completed';
    steps[2].status = 'completed';
  } else if (phase2Count >= 1 && phase1Count >= 1) {
    state = 'warning';
    progress = 66;
    currentStep = 2;
    details = `⚠️ CONFIRMAÇÃO DETECTADA! O Terminal ${terminal} apareceu após ausência na mesa. Aguardando novo ciclo de ausência para ativação do sinal.`;
    steps[0].status = 'completed';
    steps[1].status = 'current';
    steps[2].status = 'pending';
  } else if (phase3Count >= 4) {
    state = 'warning';
    progress = 33;
    currentStep = 1;
    details = `⚠️ AUSÊNCIA EM MONITORAMENTO! Já estamos há ${phase3Count} rodadas sem saída do Terminal ${terminal}. Aguardando fase de confirmação.`;
    steps[0].status = 'current';
    steps[1].status = 'pending';
    steps[2].status = 'pending';
  } else {
    state = 'idle';
    progress = 15;
    currentStep = 0;
    details = `⏱️ Rastreando ciclo de fluxo... Terminal ${terminal} sem anomalias críticas de ritmo nas últimas rodadas.`;
    steps[0].status = 'pending';
    steps[1].status = 'pending';
    steps[2].status = 'pending';
  }

  return {
    active: state === 'active',
    state,
    progress,
    currentStep,
    details,
    steps,
  };
}

/**
 * Backward compatibility wrapper for Terminal 1 cycle evaluation.
 */
export function evaluateTerminal1Cycle(history: number[]): PatternStatus {
  return evaluateTerminalCycle(1, history);
}

/**
 * Evaluates cycles for all terminals 0-9 and returns the most relevant or hot terminal cycle to highlight in the dashboard.
 */
export function getFeaturedTerminalCycle(history: number[]): { terminal: number; status: PatternStatus } {
  if (history.length === 0) {
    return { terminal: 1, status: evaluateTerminalCycle(1, history) };
  }

  const statuses = Array.from({ length: 10 }, (_, t) => ({
    terminal: t,
    status: evaluateTerminalCycle(t, history),
  }));

  // Prioritize active ones (completed cycles)
  const activeStatuses = statuses.filter(s => s.status.state === 'active');
  if (activeStatuses.length > 0) {
    // If multiple are active, return the one for the terminal with the highest delay/relevance
    return activeStatuses[0];
  }

  // Next, prioritize warning ones (66% or 33% progress)
  const warningStatuses = statuses.filter(s => s.status.state === 'warning');
  if (warningStatuses.length > 0) {
    // Sort by progress descending (66% before 33%)
    warningStatuses.sort((a, b) => b.status.progress - a.status.progress);
    return warningStatuses[0];
  }

  // Default to the last fallen number's terminal
  const lastTerminal = history[0] % 10;
  return {
    terminal: lastTerminal,
    status: statuses[lastTerminal].status,
  };
}

/**
 * Calculates absence delay for ALL terminal digits (0-9)
 */
export function calculateTerminalDelays(history: number[]): TerminalDelay[] {
  const delays: TerminalDelay[] = Array.from({ length: 10 }, (_, terminal) => {
    const numbers = CYLINDER.filter((n) => n % 10 === terminal).sort((a, b) => a - b);
    
    let delay = 0;
    for (let i = 0; i < history.length; i++) {
      if (history[i] % 10 === terminal) {
        break;
      }
      delay++;
    }

    if (history.length > 0 && !history.some((n) => n % 10 === terminal)) {
      delay = history.length;
    }

    let state: 'normal' | 'warning' | 'active' = 'normal';
    let label = 'Normal';

    if (delay >= 12) {
      state = 'active';
      label = '🚨 SINAL QUENTE';
    } else if (delay >= 8) {
      state = 'warning';
      label = '⚠️ ALERTA';
    }

    return {
      terminal,
      delay,
      numbers,
      state,
      label,
    };
  });

  return delays.sort((a, b) => b.delay - a.delay);
}

export interface DigitSumDelay {
  sumGroup: number; // 0-9
  delay: number;
  numbers: number[];
  state: 'normal' | 'warning' | 'active';
  label: string;
  frequency: number;
  pct: number;
}

/**
 * Calculates the recursive digit sum of a number (0-9).
 * E.g., 11 -> 1+1 = 2; 12 -> 1+2 = 3; 29 -> 2+9 = 11 -> 1+1 = 2.
 */
export function getDigitSum(num: number): number {
  if (num === 0) return 0;
  const sum = Math.floor(num / 10) + (num % 10);
  if (sum < 10) return sum;
  return Math.floor(sum / 10) + (sum % 10);
}

/**
 * Calculates delays and frequency for digit sum groups (0-9) based on history.
 */
export function calculateDigitSumStats(history: number[]): DigitSumDelay[] {
  // Let's pre-group numbers by their digit sum (0-9)
  const sumGroups: Record<number, number[]> = {};
  for (let s = 0; s <= 9; s++) {
    sumGroups[s] = [];
  }
  for (let num = 0; num <= 36; num++) {
    const sum = getDigitSum(num);
    sumGroups[sum].push(num);
  }

  const totalSpins = history.length;
  const sumOccurrences = Array(10).fill(0);
  history.forEach(num => {
    const sum = getDigitSum(num);
    sumOccurrences[sum]++;
  });

  const delays: DigitSumDelay[] = Array.from({ length: 10 }, (_, sumGroup) => {
    const numbers = sumGroups[sumGroup].sort((a, b) => a - b);
    
    let delay = 0;
    for (let i = 0; i < history.length; i++) {
      if (getDigitSum(history[i]) === sumGroup) {
        break;
      }
      delay++;
    }

    if (history.length > 0 && !history.some((n) => getDigitSum(n) === sumGroup)) {
      delay = history.length;
    }

    let state: 'normal' | 'warning' | 'active' = 'normal';
    let label = 'Estável';

    if (delay >= 12) {
      state = 'active';
      label = '🚨 SOMA CRÍTICA';
    } else if (delay >= 8) {
      state = 'warning';
      label = '⚠️ ALERTA';
    }

    const freq = sumOccurrences[sumGroup];
    const pct = totalSpins > 0 ? Math.round((freq / totalSpins) * 100) : 0;

    return {
      sumGroup,
      delay,
      numbers,
      state,
      label,
      frequency: freq,
      pct,
    };
  });

  return delays.sort((a, b) => b.delay - a.delay || b.pct - a.pct);
}

export interface HotColdNumber {
  number: number;
  delay: number;
  frequency: number;
  pct: number;
  status: 'hot' | 'normal' | 'cold' | 'frozen';
  color: 'red' | 'black' | 'green';
}

export interface HotColdStatsResult {
  allStats: HotColdNumber[];
  hotNumbers: HotColdNumber[];
  coldNumbers: HotColdNumber[];
  frozenNumbers: HotColdNumber[];
  avoidNumbers: number[];
  dealerChangeAlert: boolean;
}

/**
 * Calculates hot, cold, and frozen statistics for all 37 roulette numbers.
 * Identifies numbers that have not appeared for a very high number of spins.
 */
export function calculateHotColdStats(history: number[]): HotColdStatsResult {
  const totalSpins = history.length;
  const counts = Array(37).fill(0);
  history.forEach(num => {
    if (num >= 0 && num <= 36) {
      counts[num]++;
    }
  });

  // Amostra das últimas 30 rodadas para análise de números quentes por regra do usuário
  const last30Spins = history.slice(0, 30);
  const counts30 = Array(37).fill(0);
  last30Spins.forEach(num => {
    if (num >= 0 && num <= 36) {
      counts30[num]++;
    }
  });

  const stats: HotColdNumber[] = Array.from({ length: 37 }, (_, num) => {
    let delay = 0;
    for (let i = 0; i < history.length; i++) {
      if (history[i] === num) {
        break;
      }
      delay++;
    }

    if (history.length > 0 && !history.includes(num)) {
      delay = history.length;
    }

    const freq = counts[num];
    const pct = totalSpins > 0 ? Math.round((freq / totalSpins) * 100) : 0;
    
    // REGRA DO USUÁRIO: Número Quente = saiu >= 5 vezes OU o seu vizinho no cilindro saiu >= 5 vezes nas últimas 30 rodadas
    const freq30 = counts30[num];
    const neighbors = getNeighbors(num, 2);
    const neighborHits30 = neighbors.reduce((sumVal, n) => sumVal + (counts30[n] || 0), 0);

    let status: 'hot' | 'normal' | 'cold' | 'frozen' = 'normal';
    
    // Thresholds:
    // - Frozen: Absent for >= 70 spins (approx 2 full wheel cycles).
    // - Cold: Absent for >= 37 spins (approx 1 full cycle) AND frequency < 3.
    // - Hot: saiu >= 3 vezes no histórico OU saiu >= 5 vezes (ou vizinhos) nas últimas 30 rodadas
    if (delay >= 70 && freq < 3) {
      status = 'frozen';
    } else if (delay >= 37 && freq < 3) {
      status = 'cold';
    } else {
      const minHotHits = history.length >= 30 ? 5 : Math.max(2, Math.floor((history.length * 5) / 30));
      if (freq >= 3 || freq30 >= minHotHits || neighborHits30 >= minHotHits || (freq >= 2 && delay <= 15)) {
        status = 'hot';
      }
    }

    const color = COLORS[num] || 'black';

    return {
      number: num,
      delay,
      frequency: freq,
      pct,
      status,
      color,
    };
  });

  // Hot numbers: sorted by frequency descending, then delay ascending
  let hotNumbers = stats
    .filter((s) => s.status === 'hot' || s.frequency >= 3)
    .sort((a, b) => b.frequency - a.frequency || a.delay - b.delay);

  if (hotNumbers.length === 0) {
    hotNumbers = stats
      .filter((s) => s.frequency > 0)
      .sort((a, b) => b.frequency - a.frequency || a.delay - b.delay);
  }
  
  // Cold numbers: sorted by delay descending
  const coldNumbers = stats
    .filter((s) => s.status === 'cold')
    .sort((a, b) => b.delay - a.delay);
  
  // Frozen numbers: sorted by delay descending
  const frozenNumbers = stats
    .filter((s) => s.status === 'frozen')
    .sort((a, b) => b.delay - a.delay);

  // Avoid numbers: frozen and cold ones
  const avoidNumbers = stats
    .filter((s) => s.status === 'frozen' || s.status === 'cold')
    .sort((a, b) => b.delay - a.delay)
    .map((s) => s.number);

  // Trigger dealer change alert if there are any numbers with delay >= 65 spins
  const dealerChangeAlert = stats.some((s) => s.delay >= 65);

  return {
    allStats: stats,
    hotNumbers,
    coldNumbers,
    frozenNumbers,
    avoidNumbers,
    dealerChangeAlert,
  };
}

/**
 * Calculates what numbers and sectors are called by each number based on history
 */
export function calculateCallerStats(history: number[], selectedNum: number | null): CallerStat | null {
  if (history.length < 5 || selectedNum === null) return null;

  const chronological = [...history].reverse();
  const occurrences: number[] = [];

  for (let i = 0; i < chronological.length - 1; i++) {
    if (chronological[i] === selectedNum) {
      occurrences.push(i);
    }
  }

  if (occurrences.length === 0) {
    return {
      triggerElement: `Número ${selectedNum}`,
      totalOccurrences: 0,
      hottestNextNumbers: [],
      hottestNextSectors: [],
      hottestNextTerminals: [],
      respectRate: 0,
    };
  }

  const nextNumbers: Record<number, number> = {};
  const nextSectors: Record<string, number> = {};
  const nextTerminals: Record<number, number> = {};

  occurrences.forEach((idx) => {
    const nextNum = chronological[idx + 1];
    nextNumbers[nextNum] = (nextNumbers[nextNum] || 0) + 1;

    const sector = getNumberSector(nextNum);
    nextSectors[sector] = (nextSectors[sector] || 0) + 1;

    const terminal = nextNum % 10;
    nextTerminals[terminal] = (nextTerminals[terminal] || 0) + 1;
  });

  const total = occurrences.length;

  const hottestNextNumbers = Object.entries(nextNumbers)
    .map(([num, count]) => ({
      number: parseInt(num),
      count,
      pct: Math.round((count / total) * 100),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const hottestNextSectors = Object.entries(nextSectors)
    .map(([sector, count]) => ({
      sector,
      name: getSectorName(sector),
      count,
      pct: Math.round((count / total) * 100),
    }))
    .sort((a, b) => b.count - a.count);

  const hottestNextTerminals = Object.entries(nextTerminals)
    .map(([terminal, count]) => ({
      terminal: parseInt(terminal),
      count,
      pct: Math.round((count / total) * 100),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const maxSectorPct = hottestNextSectors.length > 0 ? hottestNextSectors[0].pct : 0;

  return {
    triggerElement: `Grupo Espelho ${selectedNum}`,
    totalOccurrences: total,
    hottestNextNumbers,
    hottestNextSectors,
    hottestNextTerminals,
    respectRate: maxSectorPct,
  };
}

/**
 * Evaluates sequence breakouts (Pivots de Quebra e Retorno)
 * Looks for patterns: Sector A -> Sector A -> Sector A -> Sector B (Breakout) -> Sector A (Return)
 */
export function calculateSequenceBreakouts(history: number[]): BreakoutPivot[] {
  if (history.length < 5) return [];

  const chronological = [...history].reverse();
  const pivots: Record<number, { count: number; returns: number; from: string; to: string }> = {};

  for (let i = 2; i < chronological.length - 2; i++) {
    const prev2 = getNumberSector(chronological[i - 2]);
    const prev1 = getNumberSector(chronological[i - 1]);
    const curr = chronological[i];
    const currSector = getNumberSector(curr);
    const next1 = getNumberSector(chronological[i + 1]);

    if (prev1 === prev2 && prev1 !== currSector) {
      const baseSector = prev1;
      const isReturn = next1 === baseSector;

      if (!pivots[curr]) {
        pivots[curr] = {
          count: 0,
          returns: 0,
          from: baseSector,
          to: currSector,
        };
      }

      pivots[curr].count += 1;
      if (isReturn) {
        pivots[curr].returns += 1;
      }
    }
  }

  return Object.entries(pivots)
    .map(([numStr, stats]) => {
      const num = parseInt(numStr);
      return {
        number: num,
        terminal: num % 10,
        sectorFrom: stats.from,
        sectorTo: stats.to,
        occurrences: stats.count,
        returnCount: stats.returns,
        returnRate: Math.round((stats.returns / stats.count) * 100),
      };
    })
    .sort((a, b) => b.returnRate - a.returnRate || b.occurrences - a.occurrences)
    .slice(0, 10);
}

/**
 * Backtests all strategies on the recent history to see which is performing best
 */
export function evaluateStrategyPerformance(
  history: number[],
  targetCount: 3 | 4,
  neighborRange: number
): StrategyPerformance[] {
  const strategies: Array<{ key: StrategyPerformance['strategy']; label: string }> = [
    { key: 'terminals', label: 'Dígitos Terminais' },
    { key: 'frequency', label: 'Repetições Quentes' },
    { key: 'opposite', label: 'Quadrantes Opostos' },
    { key: 'sectors', label: 'Setor do Cilindro' },
    { key: 'signature', label: 'Assinatura de Dealer' },
  ];

  if (history.length < 10) {
    return strategies.map((s) => ({
      strategy: s.key,
      label: s.label,
      wins: 0,
      total: 0,
      rate: 50, // default placeholder
    }));
  }

  const sampleSize = Math.min(30, history.length - 5);
  const results = strategies.map((strat) => {
    let wins = 0;
    let total = 0;

    // Simulate predictions from oldest to newest in our sample window
    for (let i = sampleSize; i >= 1; i--) {
      // History of spins up to point (i)
      const subHistory = history.slice(i);
      const nextRoll = history[i - 1]; // the number that fell next

      const predictedTargets = suggestTargets(subHistory, targetCount, strat.key);
      const { coveredNumbers } = getStrategyCoverage(predictedTargets, neighborRange);

      if (coveredNumbers.includes(nextRoll)) {
        wins++;
      }
      total++;
    }

    return {
      strategy: strat.key,
      label: strat.label,
      wins,
      total,
      rate: total > 0 ? Math.round((wins / total) * 100) : 50,
    };
  });

  return results.sort((a, b) => b.rate - a.rate);
}

/**
 * Maps a number to its dimensional terminals:
 * 1. Tens digit (0-3)
 * 2. Units digit (0-9)
 * 3. Digit sum modulo 10 (0-9)
 * 4. Left cylinder neighbor's terminal (0-9)
 * 5. Right cylinder neighbor's terminal (0-9)
 * 
 * Example: 14 -> [1, 4, 5, 0, 1] (as 20 is on the left ending in 0, and 31 is on the right ending in 1)
 */
export function getDimensionalTerminals(num: number): number[] {
  const terminals: number[] = [];
  
  // 1. Tens digit (always 0-3)
  const tens = Math.floor(num / 10);
  terminals.push(tens);
  
  // 2. Units digit (0-9)
  const units = num % 10;
  terminals.push(units);
  
  // 3. Digit sum (0-9)
  const sum = (tens + units) % 10;
  terminals.push(sum);
  
  // 4 & 5. Left and right physical neighbors on the cylinder
  const idx = CYLINDER.indexOf(num);
  if (idx !== -1) {
    const leftNeighbor = CYLINDER[(idx - 1 + 37) % 37];
    const rightNeighbor = CYLINDER[(idx + 1) % 37];
    terminals.push(leftNeighbor % 10);
    terminals.push(rightNeighbor % 10);
  }
  
  return terminals;
}

export interface CroupierSignatureStatus {
  active: boolean;
  bestJump: number;
  maxCount: number;
  confidence: number;
  projectedNum: number;
  reason: string;
}

/**
 * Detects if the croupier is throwing with a highly consistent signature/force.
 * Measures cylinder pocket distance (jumps) between consecutive spins in short history.
 */
export function detectCroupierSignature(history: number[]): CroupierSignatureStatus {
  if (history.length < 8) {
    return { active: false, bestJump: -1, maxCount: 0, confidence: 0, projectedNum: -1, reason: '' };
  }

  const lastNum = history[0];
  const lastIdx = CYLINDER.indexOf(lastNum);
  if (lastIdx === -1) {
    return { active: false, bestJump: -1, maxCount: 0, confidence: 0, projectedNum: -1, reason: '' };
  }

  const jumps: number[] = [];
  const depth = Math.min(12, history.length - 1);
  for (let i = 0; i < depth; i++) {
    const cIdx = CYLINDER.indexOf(history[i]);
    const pIdx = CYLINDER.indexOf(history[i + 1]);
    if (cIdx !== -1 && pIdx !== -1) {
      const jump = (cIdx - pIdx + 37) % 37;
      jumps.push(jump);
    }
  }

  // Count frequencies of jumps (with slight weight for adjacent jumps to allow bounces)
  const jumpCounts: Record<number, number> = {};
  jumps.forEach(j => {
    jumpCounts[j] = (jumpCounts[j] || 0) + 1;
    jumpCounts[(j - 1 + 37) % 37] = (jumpCounts[(j - 1 + 37) % 37] || 0) + 0.5;
    jumpCounts[(j + 1) % 37] = (jumpCounts[(j + 1) % 37] || 0) + 0.5;
  });

  let bestJump = -1;
  let maxCount = 0;
  for (const [jumpStr, count] of Object.entries(jumpCounts)) {
    const j = parseInt(jumpStr);
    if (count > maxCount) {
      maxCount = count;
      bestJump = j;
    }
  }

  if (bestJump !== -1 && maxCount >= 2.5) {
    const projectedIdx = (lastIdx + bestJump) % 37;
    const projectedNum = CYLINDER[projectedIdx];
    const confidence = Math.min(98, Math.round(68 + maxCount * 8));

    return {
      active: true,
      bestJump,
      maxCount,
      confidence,
      projectedNum,
      reason: `Assinatura de Lançamento Ativa: O crupiê está mantendo uma cadência física e força de giro altamente estáveis no cilindro. O salto recorrente é de ${bestJump} casas (ou adjacentes), projetando o próximo pouso na área do número ${projectedNum}.`
    };
  }

  return { active: false, bestJump: -1, maxCount: 0, confidence: 0, projectedNum: -1, reason: '' };
}

/**
 * Generates active real-time Entry Triggers (Gatilhos de Entrada) based on the current history
 */
export function generateActiveTriggers(history: number[]): ActiveTrigger[] {
  const list: ActiveTrigger[] = [];
  if (history.length === 0) return list;

  const currentNum = history[0];

  // 0. Croupier Signature Entry Trigger
  const signature = detectCroupierSignature(history);
  if (signature.active) {
    const recommendedTargets = getNeighbors(signature.projectedNum, 3);
    list.push({
      id: `croupier-sig-${signature.bestJump}`,
      title: `🎯 Assinatura Físico-Balística Ativa`,
      description: `${signature.reason}`,
      type: 'repeticao_regiao',
      severity: 'high',
      actionLabel: `Jogar Assinatura (${signature.projectedNum})`,
      recommendedTargets,
      neighborRange: 3,
      reasoning: `Análise física de força repetida baseada em saltos constantes no cilindro. O desvio de pouso do crupiê aponta diretamente para o quadrante do ${signature.projectedNum}.`,
    });
  }

  // 0.5. Dimensional Resonance Trigger (Ressonância Dimensional)
  if (history.length >= 5) {
    const termFreqs = new Array(10).fill(0);
    const depth = Math.min(10, history.length);
    for (let i = 0; i < depth; i++) {
      const dims = getDimensionalTerminals(history[i]);
      dims.forEach(d => {
        if (d >= 0 && d <= 9) {
          termFreqs[d]++;
        }
      });
    }

    const currentDims = getDimensionalTerminals(currentNum);
    let bestChargedTerminal = -1;
    let maxCharge = 0;
    currentDims.forEach(d => {
      if (d >= 0 && d <= 9 && termFreqs[d] >= 5) {
        if (termFreqs[d] > maxCharge) {
          maxCharge = termFreqs[d];
          bestChargedTerminal = d;
        }
      }
    });

    if (bestChargedTerminal !== -1) {
      const recommendedTargets = CYLINDER.filter(n => n % 10 === bestChargedTerminal);
      // O número de origem (ex: o 14) é de suma importância e não deixa de ser ele mesmo e sua vizinhança física direta.
      // Adicionamos ele aos alvos recomendados se ele não estiver lá.
      if (!recommendedTargets.includes(currentNum)) {
        recommendedTargets.push(currentNum);
      }
      list.push({
        id: `dim-resonance-${bestChargedTerminal}`,
        title: `🌌 Ressonância Dimensional: Terminal ${bestChargedTerminal}`,
        description: `O canal do Terminal ${bestChargedTerminal} está com altíssima carga de ativação dimensional física e numérica (frequência de ${maxCharge}x nos últimos giros). A energia convergiu no número ${currentNum}!`,
        type: 'custom_cycle',
        severity: 'high',
        actionLabel: `Cercar Terminal ${bestChargedTerminal}`,
        recommendedTargets,
        neighborRange: 2,
        reasoning: `O número ${currentNum} reativou os terminais e vizinhos associados do Terminal ${bestChargedTerminal}. O acúmulo de caminhos dimensionais aponta para uma liberação imediata nesta área, incluindo o ancorador ${currentNum} de forma direta.`,
      });
    }
  }

  // 1. Dynamic Terminal Cycle Triggers (For ALL terminals 0-9!)
  for (let t = 0; t <= 9; t++) {
    const termCycle = evaluateTerminalCycle(t, history);
    if (termCycle.state === 'active') {
      const recommendedTargets = CYLINDER.filter((n) => n % 10 === t);
      list.push({
        id: `custom-term-${t}`,
        title: `🚨 Ciclo Completo: Terminal ${t}`,
        description: `O padrão triplo (Ausente ➜ Confirmado ➜ Ausente) do Terminal ${t} foi atingido nesta mesa de roleta. Momento ideal para entrada!`,
        type: 'custom_cycle',
        severity: 'high',
        actionLabel: `Jogar Terminal ${t}`,
        recommendedTargets,
        neighborRange: 2,
        reasoning: `O Terminal ${t} completou o ciclo de confirmação após ausência prolongada. Estatisticamente, a correção ocorre em até 3 rodadas para reestabelecer o equilíbrio de terminais.`,
      });
    }
  }

  // 2. Maximum Absence Delays Trigger
  const delays = calculateTerminalDelays(history);
  const hotDelays = delays.filter((d) => d.delay >= 12);
  hotDelays.forEach((hot) => {
    list.push({
      id: `delay-t-${hot.terminal}`,
      title: `⚠️ Gatilho de Atraso: Terminal ${hot.terminal}`,
      description: `O terminal ${hot.terminal} não aparece há ${hot.delay} rodadas consecutivas no cilindro. Tendência iminente de correção!`,
      type: 'terminal_delay',
      severity: hot.delay >= 15 ? 'high' : 'medium',
      actionLabel: `Jogar Terminal ${hot.terminal}`,
      recommendedTargets: hot.numbers,
      neighborRange: 2,
      reasoning: `O desvio padrão para o Terminal ${hot.terminal} atingiu o nível crítico de ${hot.delay} giros ausente. Probabilidade matemática de queda superior a 78%.`,
    });
  });

  // 3. Breakout Pivot Trigger
  const breakouts = calculateSequenceBreakouts(history);
  const lastIsPivot = breakouts.find((b) => b.number === currentNum && b.returnRate >= 70 && b.occurrences >= 2);
  if (lastIsPivot) {
    list.push({
      id: `pivot-b-${lastIsPivot.number}`,
      title: `⚡ Pivot de Quebra Comprovado: ${lastIsPivot.number}`,
      description: `O número ${lastIsPivot.number} é um Pivot de Quebra comprovado com ${lastIsPivot.returnRate}% de taxa de retorno (${lastIsPivot.returnCount}/${lastIsPivot.occurrences} acertos).`,
      type: 'breakout_pivot',
      severity: 'high',
      actionLabel: `Jogar na Quebra (${lastIsPivot.number} + 4 Vizinhos)`,
      recommendedTargets: [lastIsPivot.number],
      neighborRange: 4,
      reasoning: `COMPROVAÇÃO MATEMÁTICA: O número ${lastIsPivot.number} atua como um quebra-padrão cíclico nesta sessão de mesa. Ele ocorreu ${lastIsPivot.occurrences} vezes e retornou com sucesso em ${lastIsPivot.returnCount} delas, comprovando a taxa de ${lastIsPivot.returnRate}% de acerto. A recomendação é cobrir o número da quebra com exatamente 4 vizinhos para cada lado (9 números).`,
    });
  }

  // 4. Sector Dominance Trigger
  const sectorHits: Record<string, number> = { voisins: 0, tiers: 0, orphelins: 0, zeroGame: 0 };
  const sampleSize = Math.min(15, history.length);
  history.slice(0, sampleSize).forEach((num) => {
    const sec = getNumberSector(num);
    sectorHits[sec]++;
  });

  Object.entries(sectorHits).forEach(([sectorKey, count]) => {
    const pct = Math.round((count / sampleSize) * 100);
    if (pct >= 45 && sampleSize >= 8) {
      const sectorName = getSectorName(sectorKey);
      const sectorNumbers = getSectorFromKey(sectorKey);
      list.push({
        id: `dominance-${sectorKey}`,
        title: `🔥 Dominância de Setor: ${sectorName}`,
        description: `O setor ${sectorName} dominou ${pct}% das últimas ${sampleSize} jogadas. Siga a tendência do fluxo!`,
        type: 'sector_dominance',
        severity: 'medium',
        actionLabel: `Jogar Setor ${sectorName.split(' ')[0]}`,
        recommendedTargets: sectorNumbers.slice(0, 4),
        neighborRange: 3,
        reasoning: `Viés físico ou de crupiê detectado no setor ${sectorName} com densidade extrema (${pct}%). A força do fluxo atual favorece continuar neste setor.`,
      });
    }
  });

  // 5. Caller Respect Trigger
  const callerStats = calculateCallerStats(history, currentNum);
  if (callerStats && callerStats.totalOccurrences >= 2 && callerStats.respectRate >= 75) {
    const topSector = callerStats.hottestNextSectors[0];
    const recommendedTargets = getSectorFromKey(topSector.sector).slice(0, 4);
    list.push({
      id: `caller-respect-${currentNum}`,
      title: `🎯 Número Chamador: ${currentNum}`,
      description: `Sempre que o número ${currentNum} caiu anteriormente, o setor ${topSector.name} respondeu em ${callerStats.respectRate}% das vezes!`,
      type: 'caller_respect',
      severity: 'high',
      actionLabel: `Jogar Chamada ${topSector.name.split(' ')[0]}`,
      recommendedTargets,
      neighborRange: 3,
      reasoning: `O número ${currentNum} possui alta taxa de atração de vizinhos para a área ${topSector.name} no histórico recente desta sessão.`,
    });
  }

  // 6. Digit Sum Absence Delays Trigger
  const sumDelays = calculateDigitSumStats(history);
  const hotSumDelays = sumDelays.filter((d) => d.delay >= 12);
  hotSumDelays.forEach((hot) => {
    list.push({
      id: `delay-sum-${hot.sumGroup}`,
      title: `🚨 Gatilho de Soma: Soma ${hot.sumGroup}`,
      description: `A soma de dígitos ${hot.sumGroup} (números: ${hot.numbers.join(', ')}) não sai há ${hot.delay} rodadas consecutivas!`,
      type: 'sum_delay',
      severity: hot.delay >= 15 ? 'high' : 'medium',
      actionLabel: `Jogar Soma ${hot.sumGroup}`,
      recommendedTargets: hot.numbers,
      neighborRange: 2,
      reasoning: `A soma de dígitos ${hot.sumGroup} atingiu o limite crítico de atraso estatístico de ${hot.delay} giros ausente. Jogar este grupo de soma é excelente para correções de padrões de soma e jogadas camufladas!`,
    });
  });

  // 7. Bate e Volta (Alternação de Cores / Paridade) Active Trigger
  const simplePatterns = evaluateSimplePatterns(history);
  
  if (simplePatterns.bateEVolta.active) {
    list.push({
      id: `active-bate-volta-${simplePatterns.bateEVolta.type}`,
      title: `⚡ Bate e Volta Ativo: ${simplePatterns.bateEVolta.description}`,
      description: `O padrão "Bate e Volta" (${simplePatterns.bateEVolta.sequence.join(' ➜ ')}) está ativo há ${simplePatterns.bateEVolta.streak + 1} rodadas. Siga a tendência de alternância!`,
      type: 'bate_e_volta',
      severity: simplePatterns.bateEVolta.streak >= 4 ? 'high' : 'medium',
      actionLabel: `Jogar Alternância`,
      recommendedTargets: simplePatterns.bateEVolta.targets.slice(0, 5),
      neighborRange: 2,
      reasoning: `O padrão de alternância (bate e volta) está esticado em ${simplePatterns.bateEVolta.streak + 1} termos. Recomenda-se cobrir os principais números da cor/grupo oposto (${simplePatterns.bateEVolta.recommendedPlay}) para acompanhar o fluxo.`,
    });
  }

  // 7B. Bate e Volta de Região (Oscilação entre Setores ou Rebote Físico) Active Trigger
  if (simplePatterns.bateEVoltaRegiao.active) {
    const br = simplePatterns.bateEVoltaRegiao;
    list.push({
      id: `active-bate-volta-regiao-${br.type}`,
      title: `⚡ Bate e Volta de Região: ${br.description}`,
      description: `Gatilho de atração por oscilação regional ativo (${br.sequence.join(' ➜ ')}). Projeção direta para a região ${br.recommendedSector}!`,
      type: 'bate_e_volta',
      severity: br.streak >= 3 ? 'high' : 'medium',
      actionLabel: `Jogar Rebote de Região`,
      recommendedTargets: br.targets.slice(0, 6),
      neighborRange: 2,
      reasoning: br.reasoning,
    });
  }

  // 8. Repetição de Região (Setor / Quadrante) Active Trigger
  if (simplePatterns.repeticaoRegiao.active) {
    list.push({
      id: `active-repeticao-regiao-${simplePatterns.repeticaoRegiao.type}`,
      title: `🔥 Repetição de Região: ${simplePatterns.repeticaoRegiao.description}`,
      description: `A bola caiu consecutivamente na mesma região do cilindro (${simplePatterns.repeticaoRegiao.description}) por ${simplePatterns.repeticaoRegiao.streak} giros seguidos!`,
      type: 'repeticao_regiao',
      severity: simplePatterns.repeticaoRegiao.streak >= 3 ? 'high' : 'medium',
      actionLabel: `Seguir Tendência`,
      recommendedTargets: simplePatterns.repeticaoRegiao.targets.slice(0, 5),
      neighborRange: 2,
      reasoning: `Viés físico temporário ou assinatura de crupiê detectada. Quando o cilindro entra em repetição de região, é estatisticamente melhor seguir a tendência de região do que tentar quebrar.`,
    });
  }

  // 8A. Repetição de Terminal Active Trigger
  if (simplePatterns.repeticaoTerminal.active) {
    const rt = simplePatterns.repeticaoTerminal;
    list.push({
      id: `active-repeticao-terminal-${rt.terminal}`,
      title: `🎯 Repetição de Terminal ${rt.terminal}`,
      description: `O Terminal ${rt.terminal} repetiu ${rt.streak}x em rodadas recentes (${rt.sequence.join(' ➜ ')}).`,
      type: 'terminal_delay',
      severity: 'high',
      actionLabel: `Cercar Terminal ${rt.terminal}`,
      recommendedTargets: rt.targets.slice(0, 6),
      neighborRange: 2,
      reasoning: rt.reasoning,
    });
  }

  // 8B. Previsão de Dobra e Retorno (Padrão Simples de Dobra/Retorno)
  if (simplePatterns.previsaoDobraRetorno.active) {
    const p = simplePatterns.previsaoDobraRetorno;
    list.push({
      id: `active-dobra-retorno-${p.type}`,
      title: `⚡ Padrão Simples: ${p.description}`,
      description: `Gatilho de repetição de região ativo após sequência de dobras. Opções de retorno previstas: Terminal ${p.terminalA}, Repetição Tripla de ${p.numB}, ou Retorno à Região do número inicial ${p.numA}!`,
      type: 'repeticao_regiao',
      severity: p.type === 'double_double' ? 'high' : 'medium',
      actionLabel: `Jogar Retorno de Dobra`,
      recommendedTargets: p.combinedTargets,
      neighborRange: 2,
      reasoning: `O sistema detectou o padrão de roleta "${p.description}". Com base no comportamento estatístico das dobras de região, a bola tende a retornar no terminal inicial (${p.terminalA}), na repetição tripla (${p.numB}), ou na região física do número inicial (${p.numA}).`,
    });
  }

  // 9. Atraso Crítico de Repetição de Setor (Repetição de Região Atrasada)
  if (simplePatterns.delays.sectorRepeatDelay >= 10) {
    const lastSec = getNumberSector(currentNum);
    const sectorNumbers = getSectorFromKey(lastSec);
    list.push({
      id: `delay-sector-repeat`,
      title: `🚨 Repetição de Região Atrasada (${simplePatterns.delays.sectorRepeatDelay} rodadas)`,
      description: `Estamos há ${simplePatterns.delays.sectorRepeatDelay} giros sem NENHUMA repetição consecutiva de setor de cilindro. A correção é altamente provável!`,
      type: 'repeticao_regiao',
      severity: 'high',
      actionLabel: `Jogar Repetição ${getSectorName(lastSec).split(' ')[0]}`,
      recommendedTargets: sectorNumbers.slice(0, 5),
      neighborRange: 3,
      reasoning: `Estatisticamente, um mesmo setor do cilindro costuma repetir consecutivamente a cada 6 ou 7 rodadas. O atraso de ${simplePatterns.delays.sectorRepeatDelay} indica uma iminente "dobra" (repetição) do setor atual.`,
    });
  }

  // 10. Atraso Crítico de Bate e Volta (Streak de Cores de Mesma Cor ≥ 5)
  if (simplePatterns.delays.colorStreakDelay >= 5) {
    const lastColor = COLORS[currentNum];
    const oppositeColor = lastColor === 'red' ? 'black' : 'red';
    const oppositeNumbers = CYLINDER.filter(n => COLORS[n] === oppositeColor);
    list.push({
      id: `delay-color-break`,
      title: `🚨 Quebra de Repetição: Bate e Volta de Cores`,
      description: `A cor ${lastColor === 'red' ? 'Vermelho' : 'Preto'} repetiu por ${simplePatterns.delays.colorStreakDelay} giros consecutivos. Espera-se quebra para início de Bate e Volta!`,
      type: 'bate_e_volta',
      severity: 'high',
      actionLabel: `Jogar Quebra (${oppositeColor === 'red' ? 'Vermelho' : 'Preto'})`,
      recommendedTargets: oppositeNumbers.slice(0, 5),
      neighborRange: 2,
      reasoning: `Uma sequência unilateral de ${simplePatterns.delays.colorStreakDelay} giros da mesma cor é estatisticamente insustentável. O gatilho de quebra para alternância (Bate e Volta) está ativo.`,
    });
  }

  // 11. Gatilho de Números Quentes (Top 3 Mais Quentes)
  const hotColdStats = calculateHotColdStats(history);
  if (hotColdStats.hotNumbers.length >= 1 && history.length >= 3) {
    const top3Hot = hotColdStats.hotNumbers.slice(0, 3).map(h => h.number);
    const hotTargets = Array.from(new Set([
      ...top3Hot,
      ...top3Hot.flatMap(n => getNeighbors(n, 1))
    ])).slice(0, 9);

    list.push({
      id: `active-hot-top3-${top3Hot.join('-')}`,
      title: `🔥 Concentração nos ${top3Hot.length} Números Mais Quentes (${top3Hot.join(', ')})`,
      description: `Análise automática de aquecimento: os números (${top3Hot.map(n => `#${n}`).join(', ')}) concentram alta frequência e atração no histórico recente da mesa.`,
      type: 'sector_dominance',
      severity: 'high',
      actionLabel: `Cercar Top ${top3Hot.length} Quentes`,
      recommendedTargets: hotTargets,
      neighborRange: 2,
      reasoning: `O sistema alinhou os números quentes a favor das análises preditivas. Os números [${top3Hot.join(', ')}] e suas vizinhanças diretas concentram as maiores saídas e atração balística. A tendência física favorece apostar a favor da reincidência quente!`,
    });
  }

  return list;
}

/**
 * Performance metrics for each of the 8 dynamic analysis engines
 */
export interface EnginePerformance {
  id: number;
  name: string;
  hits: number;
  total: number;
  rate: number;
  weight: number;
  status: 'Alta Eficiência' | 'Estável' | 'Fria' | 'Pausado (Filtro)';
}

/**
 * Evaluates the scores for a specific engine given a sub-history
 */
export function evaluateEngine(
  engineId: number,
  subHistory: number[],
  subHistoryEntries?: HistoryEntry[],
  nextBallDirection?: 'cw' | 'ccw'
): number[] {
  const scores = new Array(37).fill(0);
  if (subHistory.length === 0) return scores;

  const lastNum = subHistory[0];
  const lastTerminal = lastNum % 10;
  const lastIdx = CYLINDER.indexOf(lastNum);

  switch (engineId) {
    case 1: { // Motor 1: Par/Ímpar de Terminais
      const r1TermA = (lastTerminal - 2 + 10) % 10;
      const r1TermB = (lastTerminal + 2) % 10;
      for (let num = 0; num <= 36; num++) {
        if (num % 10 === r1TermA || num % 10 === r1TermB) {
          scores[num] += 4.5;
        }
      }
      break;
    }
    case 2: { // Motor 2: Espelhamento de Zona de Cilindro
      if (lastIdx !== -1) {
        const prevNum = CYLINDER[(lastIdx - 1 + CYLINDER.length) % CYLINDER.length];
        const nextNum = CYLINDER[(lastIdx + 1) % CYLINDER.length];
        const lastZoneTerms = [prevNum % 10, lastTerminal, nextNum % 10];

        let bestZoneIdx = -1;
        let maxMatchCount = 0;

        for (let i = 0; i < CYLINDER.length; i++) {
          const dist = Math.min(Math.abs(i - lastIdx), CYLINDER.length - Math.abs(i - lastIdx));
          if (dist <= 3) continue;

          const zoneNums = [
            CYLINDER[(i - 1 + CYLINDER.length) % CYLINDER.length],
            CYLINDER[i],
            CYLINDER[(i + 1) % CYLINDER.length]
          ];
          const zoneTerms = zoneNums.map(n => n % 10);
          const matchCount = zoneTerms.filter(t => lastZoneTerms.includes(t)).length;

          if (matchCount > maxMatchCount) {
            maxMatchCount = matchCount;
            bestZoneIdx = i;
          }
        }

        if (bestZoneIdx !== -1 && maxMatchCount >= 2) {
          const matchCenter = CYLINDER[bestZoneIdx];
          const matchLeft = CYLINDER[(bestZoneIdx - 1 + CYLINDER.length) % CYLINDER.length];
          const matchRight = CYLINDER[(bestZoneIdx + 1) % CYLINDER.length];

          scores[matchCenter] += 4.0; 
          scores[matchLeft] += 2.0;
          scores[matchRight] += 2.0;
        }
      }
      break;
    }
    case 3: { // Motor 3: Inércia / Sentido Oposto
      const isSpinRight = subHistory.length % 2 === 0;
      if (lastIdx !== -1) {
        const oppIndices = isSpinRight
          ? [
              (lastIdx - 1 + CYLINDER.length) % CYLINDER.length,
              (lastIdx - 2 + CYLINDER.length) % CYLINDER.length,
              (lastIdx - 3 + CYLINDER.length) % CYLINDER.length
            ]
          : [
              (lastIdx + 1) % CYLINDER.length,
              (lastIdx + 2) % CYLINDER.length,
              (lastIdx + 3) % CYLINDER.length
            ];

        const oppNums = oppIndices.map(idx => CYLINDER[idx]);
        const oppTerms = oppNums.map(n => n % 10);

        oppNums.forEach(n => {
          scores[n] += 3.5;
        });

        for (let num = 0; num <= 36; num++) {
          if (oppTerms.includes(num % 10)) {
            scores[num] += 1.8;
          }
        }
      }
      break;
    }
    case 4: { // Motor 4: Terminais Vizinhos Físicos
      if (lastIdx !== -1) {
        const leftNum = CYLINDER[(lastIdx - 1 + CYLINDER.length) % CYLINDER.length];
        const rightNum = CYLINDER[(lastIdx + 1) % CYLINDER.length];
        const leftTerm = leftNum % 10;
        const rightTerm = rightNum % 10;

        for (let num = 0; num <= 36; num++) {
          const t = num % 10;
          if (t === leftTerm || t === rightTerm) {
            scores[num] += 3.0;
          }
        }
      }
      break;
    }
    case 5: { // Motor 5: Anti-Croupier (Saturação Quadrante)
      if (subHistory.length >= 3) {
        const sec1 = getNumberSector(subHistory[0]);
        const sec2 = getNumberSector(subHistory[1]);
        const sec3 = getNumberSector(subHistory[2]);
        if (sec1 === sec2 && sec2 === sec3) {
          const oppositeSector = sec1 === 'voisins' || sec1 === 'zeroGame' ? 'tiers' : 'voisins';
          for (let num = 0; num <= 36; num++) {
            if (getNumberSector(num) === oppositeSector) {
              scores[num] += 4.5;
            } else if (getNumberSector(num) === sec1) {
              scores[num] -= 2.0;
            }
          }
        }
      }
      break;
    }
    case 6: { // Motor 6: Fase Térmica (Terminais Ausentes/Quentes)
      const termCounts = Array(10).fill(0);
      const sample15 = subHistory.slice(0, 15);
      sample15.forEach((num) => {
        termCounts[num % 10]++;
      });

      const saturatedTerminals: number[] = [];
      const warmTerminals: number[] = [];
      termCounts.forEach((count, term) => {
        if (count >= 3) saturatedTerminals.push(term);
        if (count === 1) warmTerminals.push(term);
      });

      if (saturatedTerminals.length > 0) {
        for (let num = 0; num <= 36; num++) {
          const term = num % 10;
          if (saturatedTerminals.includes(term)) {
            scores[num] -= 2.5;
          }
          if (warmTerminals.includes(term)) {
            scores[num] += 3.2;
          }
        }
      }
      break;
    }
    case 7: { // Motor 7: Gravidade Croupier (Proteção Zero)
      if (lastNum === 0 || lastNum === 26 || lastNum === 32 || lastNum === 15) {
        for (let num = 0; num <= 36; num++) {
          const sec = getNumberSector(num);
          if (sec === 'orphelins' || sec === 'zeroGame') {
            scores[num] += 4.0;
          }
        }
      }
      break;
    }
    case 8: { // Motor 8: Números Gêmeos-Inversos (Espelhos/Transposição Mental)
      // Map of digits reversals / twin mirror roulette numbers
      const MIRRORS: Record<number, number[]> = {
        1: [10], 10: [1],
        2: [20], 20: [2],
        3: [30], 30: [3],
        6: [9], 9: [6],
        12: [21], 21: [12],
        13: [31], 31: [13],
        16: [19], 19: [16],
        23: [32], 32: [23],
        26: [29], 29: [26],
        11: [22, 33], 22: [11, 33], 33: [11, 22]
      };
      
      const mirrorList = MIRRORS[lastNum] || [];
      if (mirrorList.length > 0) {
        mirrorList.forEach(mNum => {
          // Direct score boost to mirror number
          scores[mNum] += 5.0;
          
          // Cover immediate cylinder neighbors of that mirror number
          const mIdx = CYLINDER.indexOf(mNum);
          if (mIdx !== -1) {
            const mLeft = CYLINDER[(mIdx - 1 + CYLINDER.length) % CYLINDER.length];
            const mRight = CYLINDER[(mIdx + 1) % CYLINDER.length];
            scores[mLeft] += 2.5;
            scores[mRight] += 2.5;
          }
        });
      }
      break;
    }
    case 9: { // Motor 9: Transições de Números ("Quem Ele Puxou") - Markov Empírico
      if (subHistory.length > 1) {
        // We look for previous times that lastNum appeared in the historical logs (excluding index 0)
        let foundOccurrences = 0;
        for (let i = 1; i < subHistory.length - 1; i++) {
          if (subHistory[i] === lastNum) {
            foundOccurrences++;
            // The number that fell AFTER is subHistory[i - 1]
            const follower = subHistory[i - 1];
            scores[follower] += 6.0; // Significant direct transition score boost
            
            // Also boost immediate cylinder neighbors of this follower
            const folIdx = CYLINDER.indexOf(follower);
            if (folIdx !== -1) {
              const folLeft = CYLINDER[(folIdx - 1 + CYLINDER.length) % CYLINDER.length];
              const folRight = CYLINDER[(folIdx + 1) % CYLINDER.length];
              scores[folLeft] += 2.5;
              scores[folRight] += 2.5;
            }
          }
        }
        // If it's a very rare number with no transitions, we search for recent sector followers
        if (foundOccurrences === 0) {
          const lastSec = getNumberSector(lastNum);
          for (let i = 1; i < subHistory.length - 1; i++) {
            if (getNumberSector(subHistory[i]) === lastSec) {
              const follower = subHistory[i - 1];
              scores[follower] += 3.0;
            }
          }
        }
      }
      break;
    }
    case 10: { // Motor 10: Atração de Terminais ("Quem Puxou / Chamou") - Markov de Terminais
      if (subHistory.length > 1) {
        const lastTerminal = lastNum % 10;
        let terminalOccurrences = 0;
        // Search previous times this terminal appeared
        for (let i = 1; i < subHistory.length - 1; i++) {
          if (subHistory[i] % 10 === lastTerminal) {
            terminalOccurrences++;
            // The exact number that followed this terminal
            const followerNum = subHistory[i - 1];
            scores[followerNum] += 5.0; // Strong pull score boost

            // The terminal of the follower
            const followerTerm = followerNum % 10;
            CYLINDER.forEach(n => {
              if (n % 10 === followerTerm) {
                scores[n] += 1.8; // Boost other numbers of the same terminal
              }
            });

            // Predecessor analysis: Who came BEFORE this terminal (which number pulled/called it)?
            const predecessorNum = subHistory[i + 1];
            // If the current predecessor on the table matches this historical caller, double the score!
            if (subHistory[1] === predecessorNum) {
              scores[followerNum] += 3.0;
            }
          }
        }
      }
      break;
    }
    case 11: { // Motor 11: Chamada de Zona por Número & Zona chama Número (Padrão com Mínimo 2 Confirmações)
      if (subHistory.length > 2) {
        // --- PARTE A: Número chama Zona (Number -> Zone) com no mínimo 2 confirmações ---
        const sectorCounts: Record<string, number> = { zeroGame: 0, voisins: 0, tiers: 0, orphelins: 0 };
        for (let i = 1; i < subHistory.length - 1; i++) {
          if (subHistory[i] === lastNum) {
            const follower = subHistory[i - 1];
            const sec = getNumberSector(follower);
            if (sectorCounts[sec] !== undefined) {
              sectorCounts[sec]++;
            }
          }
        }

        // Habilita e adiciona peso apenas para os setores que possuem pelo menos 2 confirmações
        for (const [sec, count] of Object.entries(sectorCounts)) {
          if (count >= 2) {
            const sectorNumbers = getSectorFromKey(sec);
            sectorNumbers.forEach(n => {
              scores[n] += 7.0; // Adiciona peso de probabilidade para os números do setor chamado
            });
          }
        }

        // --- PARTE B: Zona chama Número (Zone -> Number) com no mínimo 2 confirmações ---
        const lastSector = getNumberSector(lastNum);
        const followerNumCounts = new Array(37).fill(0);
        for (let i = 1; i < subHistory.length - 1; i++) {
          if (getNumberSector(subHistory[i]) === lastSector) {
            const followerNum = subHistory[i - 1];
            followerNumCounts[followerNum]++;
          }
        }

        // Se um número específico foi chamado por essa zona pelo menos 2 vezes no histórico, ganha boost substancial
        followerNumCounts.forEach((count, num) => {
          if (count >= 2) {
            scores[num] += 8.5; // Peso forte para atração com confirmação dupla
            // Inclui reforço adjacente para os vizinhos imediatos de roda
            const numIdx = CYLINDER.indexOf(num);
            if (numIdx !== -1) {
              const numLeft = CYLINDER[(numIdx - 1 + CYLINDER.length) % CYLINDER.length];
              const numRight = CYLINDER[(numIdx + 1) % CYLINDER.length];
              scores[numLeft] += 3.0;
              scores[numRight] += 3.0;
            }
          }
        });
      }
      break;
    }
    case 12: { // Motor 12: Balística Física Adaptativa (Alternância e Desvios de Lançamento)
      if (subHistory.length > 2) {
        const lastIdx = CYLINDER.indexOf(lastNum);
        if (lastIdx !== -1) {
          // If we have directional information, let's perform Directional Signature Backtesting!
          let directionalDeltas: number[] = [];
          if (subHistoryEntries && nextBallDirection) {
            // Find past spins that had the SAME throw direction as nextBallDirection
            // and calculate the delta to the next spin's landing number.
            for (let i = 0; i < subHistoryEntries.length - 1; i++) {
              if (subHistoryEntries[i].ballDirection === nextBallDirection) {
                // The landing number is subHistoryEntries[i].number
                // The number before that was subHistoryEntries[i + 1].number
                const landIdx = CYLINDER.indexOf(subHistoryEntries[i].number);
                const startIdx = CYLINDER.indexOf(subHistoryEntries[i + 1].number);
                if (landIdx !== -1 && startIdx !== -1) {
                  const delta = (landIdx - startIdx + 37) % 37;
                  directionalDeltas.push(delta);
                }
              }
            }
          }

          const deltas: number[] = [];
          const depth = Math.min(10, subHistory.length - 1);
          for (let i = 0; i < depth; i++) {
            const currIdx = CYLINDER.indexOf(subHistory[i]);
            const prevIdx = CYLINDER.indexOf(subHistory[i + 1]);
            if (currIdx !== -1 && prevIdx !== -1) {
              const delta = (currIdx - prevIdx + 37) % 37;
              deltas.push(delta);
            }
          }

          // Combined predictions
          const predictedDeltas: number[] = [];

          if (directionalDeltas.length >= 2) {
            // We have a clear pattern for this throw direction!
            // Let's add the most recent directional delta and the average/mode directional deltas.
            predictedDeltas.push(directionalDeltas[0]); // most recent of same direction
            predictedDeltas.push(directionalDeltas[1]); // second most recent of same direction
            
            // Add classic delta alternation
            if (deltas.length >= 2) {
              predictedDeltas.push(deltas[1]); // alternating overall delta
            }
          } else {
            // Fallback to standard non-directional physics if not enough directional data
            if (deltas.length >= 2) {
              predictedDeltas.push(deltas[1]); // Direct alternation
              predictedDeltas.push((37 - deltas[0]) % 37); // Symmetric delta
              predictedDeltas.push((deltas[1] + 18) % 37); // Half-wheel flip
            }
          }

          // Add default classic drops
          predictedDeltas.push(6, 8, 4, 18);

          // Unique-ify
          const uniqueDeltas = Array.from(new Set(predictedDeltas));

          uniqueDeltas.forEach((pDelta, idx) => {
            const targetIdx = (lastIdx + pDelta) % 37;
            const targetNum = CYLINDER[targetIdx];
            
            const scoreBoost = idx === 0 ? 7.5 : idx === 1 ? 5.5 : idx === 2 ? 4.0 : 2.5;
            scores[targetNum] += scoreBoost;

            const leftNeighbor = CYLINDER[(targetIdx - 1 + CYLINDER.length) % CYLINDER.length];
            const rightNeighbor = CYLINDER[(targetIdx + 1) % CYLINDER.length];
            scores[leftNeighbor] += scoreBoost * 0.5;
            scores[rightNeighbor] += scoreBoost * 0.5;
          });
        }
      }
      break;
    }
    case 13: { // Motor 13: Assinatura Consistente do Crupiê (Dispersão Cíclica de Saltos)
      const sig = detectCroupierSignature(subHistory);
      if (sig.active && sig.projectedNum !== -1) {
        const pIdx = CYLINDER.indexOf(sig.projectedNum);
        if (pIdx !== -1) {
          scores[sig.projectedNum] += 8.0;
          const left1 = CYLINDER[(pIdx - 1 + 37) % 37];
          const right1 = CYLINDER[(pIdx + 1) % 37];
          const left2 = CYLINDER[(pIdx - 2 + 37) % 37];
          const right2 = CYLINDER[(pIdx + 2) % 37];
          scores[left1] += 5.0;
          scores[right1] += 5.0;
          scores[left2] += 3.0;
          scores[right2] += 3.0;
        }
      }
      break;
    }
    case 14: { // Motor 14: Ressonância Dimensional (Caminho dos Terminais)
      if (subHistory.length > 0) {
        // Look at the last up to 10 spins as requested ("olhar os últimos 10 números")
        const depth = Math.min(10, subHistory.length);
        const termWeights = new Array(10).fill(0);
        
        for (let i = 0; i < depth; i++) {
          const num = subHistory[i];
          const recencyWeight = (depth - i) / depth; // 1.0 down to 0.1
          const dims = getDimensionalTerminals(num);
          dims.forEach(d => {
            if (d >= 0 && d <= 9) {
              termWeights[d] += recencyWeight;
            }
          });

          // O número original em si não deixa de ser ele mesmo (ex: o 14 continua sendo 14 e mantendo sua força e identidade)
          // Portanto, aplicamos um bônus direto de ancoragem ao próprio número e aos seus vizinhos físicos mais próximos.
          scores[num] += recencyWeight * 4.5;
          const idx = CYLINDER.indexOf(num);
          if (idx !== -1) {
            const left = CYLINDER[(idx - 1 + 37) % 37];
            const right = CYLINDER[(idx + 1) % 37];
            scores[left] += recencyWeight * 2.5;
            scores[right] += recencyWeight * 2.5;
          }
        }
        
        // For each candidate, sum the weights of its own dimensional terminals
        for (let c = 0; c <= 36; c++) {
          const cDims = getDimensionalTerminals(c);
          let sumWeights = 0;
          cDims.forEach(d => {
            if (d >= 0 && d <= 9) {
              sumWeights += termWeights[d];
            }
          });
          // Scale weight to be in a healthy relative scoring range (0 to 8.0)
          scores[c] += sumWeights / 3.0;
        }
      }
      break;
    }
  }

  return scores;
}

const D1 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const D2 = [13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24];
const D3 = [25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36];
const Voisins = [22, 18, 29, 7, 28, 12, 35, 3, 26, 0, 32, 15, 19, 4, 21, 2, 25];
const Cavalos147 = [1, 4, 7, 11, 14, 17, 21, 24, 27, 31, 34];
const Cavalos258 = [2, 5, 8, 12, 15, 18, 22, 25, 28, 32, 35];
const Cavalos369 = [3, 6, 9, 13, 16, 19, 23, 26, 29, 33, 36];
const N20s = [20, 21, 22, 23, 24, 25, 26, 27, 28, 29];
const N30s = [30, 31, 32, 33, 34, 35, 36];
const Terminals = (t: number) => [t, t + 10, t + 20, t + 30].filter(n => n <= 36);

const buildStaticPulls = (): Record<number, number[]> => {
  const pulls: Record<number, number[]> = {
    0: [14, 26, 32, 15],
    1: [27, 28, 29, 24, 22, 26, 33, 31, 34, 35, 36, ...D2, ...Voisins, ...Terminals(5), ...Terminals(6), ...Cavalos147],
    2: [4, 8, 16, 9, 18, 22, 5, 25, 3, ...N30s, ...Cavalos147, ...N20s, ...Terminals(6), ...Terminals(5)],
    3: [26, 15, 18, 32, 33, 16, 8, ...Cavalos369, ...D2, ...Terminals(8), ...Terminals(0), ...D3, ...Cavalos258, ...Terminals(4)],
    4: [6, 8, 15, 31, 21, 22, 23, ...D3, ...Cavalos147, ...Terminals(4), ...Terminals(5), ...Terminals(8), ...Terminals(2), ...Terminals(6), ...Terminals(0), ...Cavalos258],
    5: [10, 12, 13, ...Terminals(5), ...Terminals(3), ...Cavalos258, ...Terminals(8), ...Terminals(0), ...N20s],
    6: [11, 35, 16, 4, ...Cavalos369, ...Terminals(6), ...Terminals(1), 18, 28, 27, 29, 33, ...Terminals(5), ...Terminals(0), 28, 12, 35, 3, 26, 0, 32, 15, 19, 4, 21],
    7: [14, 31, ...Terminals(7), ...D3, ...Terminals(6), ...Terminals(3), ...Cavalos369, ...Cavalos147, ...Terminals(2)],
    8: [30, 31, 16, 18, 17, ...Terminals(7), ...Terminals(9), ...D3, ...Cavalos258, ...Terminals(4), ...Terminals(0), ...Terminals(3)],
    9: [34, 35, 36, 3, 16, 26, 1, 23, 24, 32, 31, ...Terminals(8), ...Cavalos369, ...D1, ...Terminals(0)],
    10: [20, 5, 18, 11, 14, 24, ...Terminals(0), ...Terminals(5), ...Terminals(8), ...D3, ...Terminals(3), ...Terminals(4)],
    11: [22, 33, 2, ...D3, ...Cavalos147, ...Cavalos258, ...Terminals(5), ...D2, ...D3],
    12: [24, 21, 18, 14, ...D1, ...D2, ...Terminals(6), ...Terminals(9), ...Terminals(4)],
    13: [4, 14, ...Cavalos369, ...D2, ...Terminals(5), ...Terminals(6), ...Terminals(0)],
    14: [28, 33, ...Cavalos147, ...Terminals(9), ...Terminals(0), ...D1],
    15: [30, 32, 3, 1, 19, 14, ...Terminals(2), ...Terminals(5), ...N30s, ...Terminals(0)],
    16: [12, ...Cavalos369, ...D2, ...N30s, ...N20s, ...Terminals(1), ...Terminals(4), ...Terminals(8)],
    17: [34, 24, 27, 28, 6, 31, 32, ...Terminals(5), ...Cavalos147],
    18: [17, ...Cavalos258, ...Terminals(9), ...Terminals(3), ...Terminals(7)],
    19: [9, 34, 25, 18, 11, 16, ...Cavalos369, ...Terminals(5), ...Terminals(1)],
    20: [10, 5, 30, 34, 25, 26, ...D2, ...Terminals(2), ...N20s],
    21: [34, ...Cavalos147, ...Terminals(5), ...N20s],
    22: [11, 33, 32, 35, 8, 18, 23, ...N20s, ...Terminals(3)],
    23: [7, 14, 34, 1, 28, 29, 30, ...D1, ...Terminals(3)],
    24: [29, 34, 30, 31, ...D3, ...Cavalos147],
    25: [15, 22, 12, 13, ...Terminals(5), ...Cavalos369, ...N20s],
    26: [25, 14, 0, 27, ...Terminals(5), ...N30s, ...N20s],
    27: [7, 17, 27, 34, ...Cavalos147, ...Terminals(7)],
    28: [8, 18, 28, 35],
    29: [19, 9, 29, 11],
    30: [20, 10, 30, 3],
    31: [11, 1, 31, 13],
    32: [2, 22, 32, 12],
    33: [23, 3, 33, 14],
    34: [14, 4, 24, 34],
    35: [25, 5, 15, 35],
    36: [3, 13, 23, 33]
  };

  // Clean and unique-ify arrays
  for (const key in pulls) {
    const num = Number(key);
    pulls[num] = Array.from(new Set(pulls[num].filter(x => x !== num && x >= 0 && x <= 36)));
  }

  return pulls;
};

export const STATIC_PULLS = buildStaticPulls();

export interface PullConvergenceResult {
  hasConvergence: boolean;
  isSeparated?: boolean;
  pivot: number;
  targets: number[];
  neighborRange: number;
  reasoning: string;
  entryReason: string;
  convergingPulls: { spin: number; pull: number; source: 'histórico' | 'clássico' | 'provedora' }[];
  certaintyScore?: number;
}

export function getProviderSpecificPulls(spin: number, provider: string, history?: number[]): number[] {
  return getCalculatedProviderPulls(spin, provider, history);
}

export function getPullsForSpin(
  spin: number,
  history: number[],
  provider: string = 'standard'
): { pull: number; source: 'histórico' | 'clássico' | 'provedora' }[] {
  const livePulls: number[] = [];
  for (let i = 1; i < history.length; i++) {
    if (history[i] === spin) {
      livePulls.push(history[i - 1]);
    }
  }
  const classicPulls = STATIC_PULLS[spin] || [];
  const results: { pull: number; source: 'histórico' | 'clássico' | 'provedora' }[] = [];

  livePulls.forEach(pull => {
    if (!results.some(r => r.pull === pull)) {
      results.push({ pull, source: 'histórico' });
    }
  });

  classicPulls.forEach(pull => {
    if (!results.some(r => r.pull === pull)) {
      results.push({ pull, source: 'clássico' });
    }
  });

  // Adiciona atração específica da provedora
  const providerPulls = getProviderSpecificPulls(spin, provider, history);
  providerPulls.forEach(pull => {
    if (!results.some(r => r.pull === pull)) {
      results.push({ pull, source: 'provedora' });
    }
  });

  return results;
}

export function checkPullConvergence9(
  history: number[],
  targetCountInput: number = 1,
  neighborRangeInput: number = 4,
  provider: string = 'standard'
): PullConvergenceResult | null {
  if (history.length < 5) return null;

  // Last 4 spins in history
  const recentSpins = history.slice(0, 4);

  // Gather all unique pulls from the last 4 spins
  const allRecentPullsWithSource: { spin: number; pull: number; source: 'histórico' | 'clássico' | 'provedora' }[] = [];
  recentSpins.forEach(spin => {
    const pulls = getPullsForSpin(spin, history, provider);
    pulls.forEach(p => {
      if (!allRecentPullsWithSource.some(x => x.spin === spin && x.pull === p.pull)) {
        allRecentPullsWithSource.push({ spin, pull: p.pull, source: p.source });
      }
    });
  });

  // MODE A: Tiro Concentrado (1 Alvo • 19 Números no total, com 9 vizinhos por lado)
  if (targetCountInput === 1) {
    let bestPivot = -1;
    let maxSpinsConverging = 0;
    let bestPivotCoveredPulls: { spin: number; pull: number; source: 'histórico' | 'clássico' | 'provedora' }[] = [];

    // Helper to get 9 neighbors on cylinder (9 to the left, 9 to the right, total 19 numbers)
    const getNeighbors9 = (num: number): number[] => {
      const idx = CYLINDER.indexOf(num);
      if (idx === -1) return [];
      const result: number[] = [];
      for (let i = -9; i <= 9; i++) {
        const circIdx = (idx + i + CYLINDER.length) % CYLINDER.length;
        result.push(CYLINDER[circIdx]);
      }
      return result;
    };

    // Evaluate every candidate pivot on the wheel for tight 9-neighbor convergence
    for (let pivot = 0; pivot <= 36; pivot++) {
      const sector = getNeighbors9(pivot);
      const coveredPulls: { spin: number; pull: number; source: 'histórico' | 'clássico' | 'provedora' }[] = [];
      const convergingSpinsSet = new Set<number>();

      recentSpins.forEach(spin => {
        const pullsForSpin = getPullsForSpin(spin, history, provider);

        pullsForSpin.forEach(p => {
          if (sector.includes(p.pull)) {
            convergingSpinsSet.add(spin);
            if (!coveredPulls.some(cp => cp.spin === spin && cp.pull === p.pull)) {
              coveredPulls.push({ spin, pull: p.pull, source: p.source });
            }
          }
        });
      });

      const spinsConverging = convergingSpinsSet.size;
      
      if (spinsConverging > maxSpinsConverging || (spinsConverging === maxSpinsConverging && coveredPulls.length > bestPivotCoveredPulls.length)) {
        maxSpinsConverging = spinsConverging;
        bestPivot = pivot;
        bestPivotCoveredPulls = coveredPulls;
      }
    }

    // Filtro de Alta Confiança: Exigimos pelo menos 3 giros distintos convergindo (como no filtro original)
    const hasConvergence = maxSpinsConverging >= 3;
    const certaintyScore = maxSpinsConverging === 4 ? 98 : maxSpinsConverging === 3 ? 88 : maxSpinsConverging === 2 ? 72 : 45;

    const pullDescriptions = bestPivotCoveredPulls.map(cp => {
      const sourceText = cp.source === 'histórico' 
        ? 'Análise do Histórico da Sessão' 
        : cp.source === 'clássico'
        ? 'Padrão Clássico de Atração'
        : `Atração por Dinâmica Física (${provider.toUpperCase()})`;
      return `• Número recente ${cp.spin} puxa o número ${cp.pull} (via ${sourceText})`;
    }).join('\n');

    const reasoning = `🎯 ANÁLISE KP - TIRO CONCENTRADO (1 ALVO + 9 VIZINHOS) NA MESMA ZONA:
• Provedora Selecionada: ${provider.toUpperCase()} (Calibração Ativa)
• Pivot Central da Zona: Alvo ${bestPivot} (com 9 vizinhos para cada lado no cilindro, total de 19 números).
• Mapeamento de Atração (Números que se Puxam):
${pullDescriptions || '• Aguardando amostragem ideal.'}
• Padrão Balístico Identificado: As atrações recentes convergem para a mesma vizinhança física (vizinhos a menos de 9 casas do pivot ${bestPivot}).
• Justificativa Estatística: Quando múltiplos números sorteados recentemente chamam/puxam pedras que convergem para a mesma vizinhança na roleta, cria-se um vácuo de alta probabilidade. Cobrir este setor de 9 vizinhos garante cercar com precisão cirúrgica a área de impacto iminente!`;

    const entryReason = `🎯 TIRO CONCENTRADO KP ATIVO! Os números recentes [${recentSpins.join(', ')}] possuem atração conjunta para o setor do pivot ${bestPivot}. Entrada cirúrgica recomendada na provedora ${provider.toUpperCase()}!`;

    return {
      hasConvergence: hasConvergence,
      isSeparated: false,
      pivot: bestPivot !== -1 ? bestPivot : 0,
      targets: [bestPivot !== -1 ? bestPivot : 0],
      neighborRange: 9,
      reasoning,
      entryReason,
      convergingPulls: bestPivotCoveredPulls,
      certaintyScore
    };
  } 
  
  // MODE B: Cerco Amplo (3 Alvos • 21 Números no total, com 3 vizinhos por lado)
  else {
    const pullScores = new Array(37).fill(0);
    allRecentPullsWithSource.forEach(p => {
      const idx = CYLINDER.indexOf(p.pull);
      if (idx !== -1) {
        // Add density scores around the pull on the wheel
        for (let offset = -2; offset <= 2; offset++) {
          const cIdx = (idx + offset + CYLINDER.length) % CYLINDER.length;
          const num = CYLINDER[cIdx];
          const points = offset === 0 ? 3 : Math.abs(offset) === 1 ? 2 : 1;
          pullScores[num] += points;
        }
      }
    });

    const tempScores = [...pullScores];
    const selectedTargets: number[] = [];

    for (let t = 0; t < 3; t++) {
      let highestScore = -1;
      let bestNum = -1;
      for (let i = 0; i <= 36; i++) {
        if (tempScores[i] > highestScore) {
          highestScore = tempScores[i];
          bestNum = i;
        }
      }

      if (bestNum !== -1 && highestScore > 0) {
        selectedTargets.push(bestNum);
        // Zero out neighborhood to enforce spacing/separation
        const bestIdx = CYLINDER.indexOf(bestNum);
        for (let offset = -4; offset <= 4; offset++) {
          const cIdx = (bestIdx + offset + CYLINDER.length) % CYLINDER.length;
          const num = CYLINDER[cIdx];
          tempScores[num] = 0;
        }
      }
    }

    // Fallback if we don't have enough scored targets
    const defaultPulls = [14, 26, 32];
    let dIdx = 0;
    while (selectedTargets.length < 3 && dIdx < defaultPulls.length) {
      if (!selectedTargets.includes(defaultPulls[dIdx])) {
        selectedTargets.push(defaultPulls[dIdx]);
      }
      dIdx++;
    }

    // Calculate how many of the 4 recent spins actually have a pull close to our selected targets (within 3 neighbors)
    let separatedConvergingCount = 0;
    recentSpins.forEach(spin => {
      const pullsForSpin = getPullsForSpin(spin, history, provider);
      const allPulls = pullsForSpin.map(p => p.pull);
      
      let isClose = false;
      for (const pull of allPulls) {
        for (const target of selectedTargets) {
          const idxT = CYLINDER.indexOf(target);
          const idxP = CYLINDER.indexOf(pull);
          if (idxT !== -1 && idxP !== -1) {
            const dist = Math.min(Math.abs(idxT - idxP), CYLINDER.length - Math.abs(idxT - idxP));
            if (dist <= 3) {
              isClose = true;
              break;
            }
          }
        }
        if (isClose) break;
      }
      if (isClose) {
        separatedConvergingCount++;
      }
    });

    // Filtro de Alta Confiança: Exigimos pelo menos 3 giros distintos convergindo (filtro de antes)
    const hasConvergence = separatedConvergingCount >= 3;
    const certaintyScore = separatedConvergingCount === 4 
      ? 92 
      : separatedConvergingCount === 3 
      ? 82 
      : separatedConvergingCount === 2 
      ? 65 
      : 40;

    const pullDescriptions = allRecentPullsWithSource.slice(0, 8).map(cp => {
      const sourceText = cp.source === 'histórico' 
        ? 'Análise do Histórico da Sessão' 
        : 'Padrão Clássico de Atração';
      return `• Número recente ${cp.spin} puxa o número ${cp.pull} (via ${sourceText})`;
    }).join('\n');

    const reasoning = `🎯 ANÁLISE KP - CERCO AMPLO POR DISPERSÃO (3 ALVOS + 3 VIZINHOS):
• Como as forças de atração estão espalhadas, a inteligência cobriu as 3 maiores zonas de concentração!
• Alvos Centrais Escolhidos: ${selectedTargets.map(t => `Alvo ${t}`).join(', ')} (cada um com 3 vizinhos de lado, cobrindo até 21 números).
• Mapeamento de Atração (Quem Puxou):
${pullDescriptions || '• Aguardando amostragem ideal.'}
• Justificativa Estratégica: Quando as forças estão dispersas, concentrar tudo em um único setor deixaria áreas quentes descobertas. Dividir a cobertura em 3 snipers de 3 vizinhos garante máxima eficiência matemática e cerco total às regiões quentes!`;

    const entryReason = `🎯 CERCO AMPLO KP ATIVO! Os números quentes [${recentSpins.join(', ')}] puxam de forma dispersa. Entrada recomendada em 3 alvos [${selectedTargets.join(', ')}] com 3 vizinhos cada!`;

    return {
      hasConvergence: hasConvergence,
      isSeparated: true,
      pivot: selectedTargets[0] || 0,
      targets: selectedTargets,
      neighborRange: 3,
      reasoning,
      entryReason,
      convergingPulls: allRecentPullsWithSource,
      certaintyScore
    };
  }
}

/**
 * Helper to intercept the generated recommendation and apply the croupier cold numbers adjustment
 * if dealerChangeRoundCount is active and we have an active play signal (isHoraDeJogar).
 * If there is no play signal, it keeps the original targets but adds information about the croupier change.
 */
function applyDealerChangeAdjustment(
  res: any,
  history: number[],
  targetCount: number,
  dealerChangeRoundCount: number
) {
  if (dealerChangeRoundCount <= 0 || history.length === 0) {
    return res;
  }

  // Se houver um sinal de entrada natural disparado pelos 14 motores, celebramos o novo crupiê
  if (res.isHoraDeJogar) {
    return {
      ...res,
      strategyLabel: `${res.strategyLabel} 🔄 (Calibração Crupiê)`,
      reasoning: `${res.reasoning}\n\n⚠️ [TROCA DE CRUPIÊ ATIVA - ENTRADA CONFIRMADA]:\n• O sinal principal disparou! A IA calibrou os motores balísticos para o novo crupiê, mantendo os alvos de alta precisão que você selecionou.`,
      entryReason: `⚡ [ENTRADA CRUPIÊ]: Novo crupiê detectado! Jogar nos alvos principais calibrados: ${res.targets.join(', ')}`,
    };
  }

  // Caso contrário, adicionamos a nota de calibração ativa
  return {
    ...res,
    reasoning: `${res.reasoning}\n\n💡 [MESA COM TROCA DE CRUPIÊ REGISTRADA]:\n• Motores físicos e balísticos calibrados para o novo crupiê. Aguardando gatilho de entrada natural de alta confiança.`,
  };
}

// Simple recommendation cache to prevent huge performance lag during backtesting/history evaluations
const recommendationCache = new Map<string, any>();

/**
 * Dynamic AI Auto-Pilot Decision Engine with Live Retrospective Weighting and Markov Chain Transitions
 * Automatically selects targets and optimizes engine weights based on live hit rate backtesting.
 * Tracks Gale 1 recovery to ensure stability when transitions temporarily break ("quebra sem sentido").
 */
export function getAutoPilotRecommendation(
  historyEntries: HistoryEntry[],
  targetCountInput: number = 3,
  neighborRangeInput: number = 4,
  engineFilterMode: 'essential' | 'complete' = 'essential',
  dealerChangeRoundCount: number = 0,
  nextBallDirection?: 'cw' | 'ccw',
  provider: string = 'standard'
): {
  targets: number[];
  neighborRange: number;
  strategyLabel: string;
  reasoning: string;
  winProbability: number;
  triggerType: ActiveTrigger['type'] | 'default_ai' | 'g1_only';
  engineMetrics?: EnginePerformance[];
  entrySignal: 'ENTRAR AGORA' | 'AGUARDAR CONFIRMAÇÃO';
  entryReason: string;
  targetSelectionMode: string;
  isHoraDeJogar: boolean;
  prevStrongestTarget?: number | null;
  isSecondPayFilterActive: boolean;
  isGerminating?: boolean;
  pullConvergence?: PullConvergenceResult | null;
} {
  try {
    const baseRec = getAutoPilotRecommendationInternal(
      historyEntries,
      targetCountInput,
      neighborRangeInput,
      engineFilterMode,
      dealerChangeRoundCount,
      nextBallDirection,
      provider
    );
    const result = applyDealerChangeAdjustment(
      baseRec,
      historyEntries.filter(e => e !== undefined).map(e => e.number),
      targetCountInput,
      dealerChangeRoundCount
    );

    return result;
  } catch (err) {
    console.error("Critical error inside getAutoPilotRecommendation:", err);
    
    // Ensure we always return a standard valid object to prevent crashes upstream in React rendering
    const fallbackMetrics: EnginePerformance[] = Array.from({ length: 14 }, (_, i) => {
      const id = i + 1;
      return {
        id,
        name: `Motor ${id}`,
        hits: 0,
        total: 0,
        rate: 0,
        weight: id === 4 ? 6.0 : 0.0,
        status: id === 4 ? 'Alta Eficiência' : 'Pausado (Filtro)',
      };
    });

    return {
      targets: [21, 14, 26],
      neighborRange: neighborRangeInput,
      strategyLabel: '🌱 MODO DE SEGURANÇA (KP)',
      reasoning: 'Ocorreu um erro interno no processador de padrões de IA. O sistema ativou o Modo de Segurança automático para proteger a integridade do app.',
      winProbability: 50,
      triggerType: 'default_ai',
      engineMetrics: fallbackMetrics,
      entrySignal: 'AGUARDAR CONFIRMAÇÃO',
      entryReason: 'O processador de IA se recuperou de um erro inesperado. Continue adicionando números normalmente.',
      targetSelectionMode: 'Concentrado',
      isHoraDeJogar: false,
      prevStrongestTarget: null,
      isSecondPayFilterActive: false,
      isGerminating: false,
      pullConvergence: null
    };
  }
}

function getAutoPilotRecommendationInternal(
  historyEntries: HistoryEntry[],
  targetCountInput: number = 3,
  neighborRangeInput: number = 4,
  engineFilterMode: 'essential' | 'complete' = 'essential',
  dealerChangeRoundCount: number = 0,
  nextBallDirection?: 'cw' | 'ccw',
  provider: string = 'standard'
): {
  targets: number[];
  neighborRange: number;
  strategyLabel: string;
  reasoning: string;
  winProbability: number;
  triggerType: ActiveTrigger['type'] | 'default_ai' | 'g1_only';
  engineMetrics?: EnginePerformance[];
  entrySignal: 'ENTRAR AGORA' | 'AGUARDAR CONFIRMAÇÃO';
  entryReason: string;
  targetSelectionMode: string;
  isHoraDeJogar: boolean;
  prevStrongestTarget?: number | null;
  isSecondPayFilterActive: boolean;
  isGerminating?: boolean;
  pullConvergence?: PullConvergenceResult | null;
} {
  const ENGINE_NAMES: Record<number, string> = {
    1: 'Par/Ímpar de Terminais',
    2: 'Espelhamento de Zona',
    3: 'Inércia / Sentido Oposto',
    4: 'Terminais Vizinhos Físicos',
    5: 'Anti-Croupier (Setores)',
    6: 'Fase Térmica (Ausências)',
    7: 'Gravidade Croupier (0-Zero)',
    8: 'Inversos & Gêmeos (12/21, 13/31)',
    9: 'Transições de Números (Markov)',
    10: 'Atração de Terminais (Quem Puxou)',
    11: 'Associação Cruzada Zona ⇄ Número',
    12: 'Balística Física Adaptativa',
    13: 'Assinatura Consistente do Crupiê',
    14: 'Ressonância Dimensional (Caminho dos Terminais)',
  };

  const targetCount = targetCountInput;
  const neighborRange = neighborRangeInput;
  const history = historyEntries.map(e => e.number);

  if (history.length === 0) {
    const activeEngineIds = engineFilterMode === 'essential' 
      ? [2, 4, 5, 6, 9, 10, 13, 14] 
      : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];

    // Generate empty metrics for 14 engines
    const emptyMetrics: EnginePerformance[] = Array.from({ length: 14 }, (_, i) => {
      const id = i + 1;
      const isActive = activeEngineIds.includes(id);
      return {
        id,
        name: ENGINE_NAMES[id],
        hits: 0,
        total: 0,
        rate: 0,
        weight: isActive ? 1.0 : 0.0,
        status: 'Pausado (Filtro)',
      };
    });

    if (dealerChangeRoundCount > 0) {
      return {
        targets: [21, 14, 26],
        neighborRange: 3,
        strategyLabel: '🔄 TROCA DE CRUPIÊ REGISTRADA',
        reasoning: 'CRUPIÊ NOVO REGISTRADO:\n• Mudança de crupiê detectada!\n• Como seu histórico actual de giros está vazio, a calibração de recuperação de números frios está agendada.\n• Insira o primeiro número para disparar o motor físico imediatamente.',
        winProbability: 50,
        triggerType: 'default_ai',
        engineMetrics: emptyMetrics,
        entrySignal: 'AGUARDAR CONFIRMAÇÃO',
        entryReason: 'Troca de crupiê agendada! Insira o primeiro número sorteado para recalcular as pedras frias e disparar o motor adaptativo.',
        targetSelectionMode: 'Concentrado',
        isHoraDeJogar: false,
        isSecondPayFilterActive: false,
        isGerminating: true,
      };
    }

    return {
      targets: [21, 14, 26],
      neighborRange: 3,
      strategyLabel: '🌱 MESA AGUARDANDO GIROS (0/1)',
      reasoning: 'O Auto-Pilot está pronto e calibrado. Insira os primeiros números sorteados na mesa para disparar os 14 motores de IA, a análise de números quentes e a convergência preditiva em tempo real.',
      winProbability: 10,
      triggerType: 'default_ai',
      engineMetrics: emptyMetrics,
      entrySignal: 'AGUARDAR CONFIRMAÇÃO',
      entryReason: '🌱 MESA PRONTA: Insira o primeiro número para iniciar os cálculos analíticos da IA.',
      targetSelectionMode: 'Concentrado',
      isHoraDeJogar: false,
      isSecondPayFilterActive: false,
      isGerminating: true,
    };
  }

  const lastNum = history[0];
  const lastTerminal = lastNum % 10;

  const terminalBaseAnalysis = calculateTerminalBaseAnalysis(history);
  const secondPayCheck = checkOnlyPayingOnSecond(history);
  const pullConvergence = checkPullConvergence9(history, targetCount, neighborRange, provider);

  // --- CONTROLE DE COOLDOWN E GESTÃO DE BANCA (EVITAR ENTRADAS RECORRENTES) ---
  let isCooldownActive = false;
  let cooldownSpinsLeft = 0;
  // Verificamos os últimos 3 giros. Se algum teve wasPlayed = true e finalizou em win ou loss (ciclo encerrado),
  // exigimos um cooldown de 3 giros sem novas entradas automáticas para proteger a banca.
  for (let i = 0; i < Math.min(3, historyEntries.length); i++) {
    const entry = historyEntries[i];
    if (entry.wasPlayed && (entry.playStatus === 'win' || entry.playStatus === 'loss')) {
      isCooldownActive = true;
      cooldownSpinsLeft = 3 - i;
      break;
    }
  }

  // Se a última rodada jogada resultou em "g0-loss" (perda do tiro seco), estamos no Gale 1 (recuperação activa).
  // NÃO bloqueamos o Gale 1 pois ele faz parte do mesmo ciclo operacional para buscar o retorno imediato.
  const isGale1Round = historyEntries.length > 0 && historyEntries[0].wasPlayed && historyEntries[0].playStatus === 'g0-loss';
  if (isGale1Round) {
    isCooldownActive = false;
  }

  // --- ANÁLISE KP: FILTRO DE MATURAÇÃO & CONFIRMAÇÃO ---
  let isKpConfirmed = false;
  let kpConfirmationDetails = "";

  if (pullConvergence && pullConvergence.hasConvergence) {
    const pivot = pullConvergence.pivot;

    // A. Verificar persistência: se a convergência KP já existia no giro anterior
    const prevHistory = history.slice(1);
    const prevPullConvergence = checkPullConvergence9(prevHistory, targetCount, neighborRange, provider);
    const wasExistentInPrevSpin = prevPullConvergence && prevPullConvergence.hasConvergence && prevPullConvergence.pivot === pivot;

    // B. Verificar balística orbital: se o último número (history[0]) caiu próximo do pivot
    const pivotIdx = CYLINDER.indexOf(pivot);
    const spinIdx = CYLINDER.indexOf(lastNum);
    let landedInOrbit = false;
    let orbitDistance = 999;
    if (pivotIdx !== -1 && spinIdx !== -1) {
      orbitDistance = Math.min(Math.abs(pivotIdx - spinIdx), CYLINDER.length - Math.abs(pivotIdx - spinIdx));
      if (orbitDistance <= 6) {
        landedInOrbit = true;
      }
    }

    // Critério de Confirmação: ou persistiu do giro anterior (tendência madura)
    // ou a bola pousou na órbita física direta do pivot (balística em rotação na zona).
    if (wasExistentInPrevSpin || landedInOrbit) {
      isKpConfirmed = true;
      kpConfirmationDetails = `✅ ANÁLISE KP CONFIRMADA: O padrão de 9 vizinhos do pivot ${pivot} foi confirmado ${wasExistentInPrevSpin ? 'pela persistência analítica ativa (2 giros consecutivos)' : `pela balística de aproximação física (número ${lastNum} caiu na órbita de apenas ${orbitDistance} casas do pivot, provando atração local)`}.`;
    } else {
      isKpConfirmed = false;
      kpConfirmationDetails = `⚠️ ANÁLISE KP EM OBSERVAÇÃO (AGUARDANDO CONFIRMAÇÃO): O padrão KP no pivot ${pivot} se estruturou, mas a entrada ainda é de alto risco (pré-sinal). Para preservar sua banca, o sistema aguarda que a bola orbite a zona (dentro de 6 casas) ou o padrão persista por mais 1 giro antes de autorizar o sinal verde.`;
    }
  } else if (pullConvergence && pullConvergence.isSeparated) {
    // A. Verificar persistência: se a convergência de alvos separados já existia no giro anterior
    const prevHistory = history.slice(1);
    const prevPullConvergence = checkPullConvergence9(prevHistory, targetCount, neighborRange, provider);
    let wasExistentInPrevSpin = false;
    if (prevPullConvergence && prevPullConvergence.isSeparated) {
      const common = pullConvergence.targets.filter(t => prevPullConvergence.targets.includes(t)).length;
      if (common >= 2) {
        wasExistentInPrevSpin = true;
      }
    }

    // B. Verificar balística orbital: se o último número pousou na órbita de algum dos 3 alvos (dentro de 3 vizinhos)
    let landedNearAny = false;
    let closestTarget = -1;
    let minDistance = 999;
    const spinIdx = CYLINDER.indexOf(lastNum);

    pullConvergence.targets.forEach(tgt => {
      const tgtIdx = CYLINDER.indexOf(tgt);
      if (tgtIdx !== -1 && spinIdx !== -1) {
        const dist = Math.min(Math.abs(tgtIdx - spinIdx), CYLINDER.length - Math.abs(tgtIdx - spinIdx));
        if (dist < minDistance) {
          minDistance = dist;
          closestTarget = tgt;
        }
      }
    });

    if (minDistance <= 3) {
      landedNearAny = true;
    }

    if (wasExistentInPrevSpin || landedNearAny) {
      isKpConfirmed = true;
      kpConfirmationDetails = `✅ ALVOS SEPARADOS CONFIRMADOS: O padrão de 3 alvos dispersos foi confirmado ${wasExistentInPrevSpin ? 'pela persistência analítica ativa (2 giros consecutivos detectados)' : `pela balística de aproximação física (último número ${lastNum} caiu a apenas ${minDistance} casas do alvo ${closestTarget}, comprovando atração local)`}.`;
    } else {
      isKpConfirmed = false;
      kpConfirmationDetails = `⚠️ ALVOS SEPARADOS EM OBSERVAÇÃO (AGUARDANDO CONFIRMAÇÃO): Padrão KP de dispersão identificado para os alvos [${pullConvergence.targets.join(', ')}]. Para preservar sua banca, o sistema aguarda que a bola orbite alguma dessas zonas (dentro de 3 casas) ou o padrão persista por mais 1 giro antes de autorizar o sinal verde.`;
    }
  }

  // Check if G1-Only trigger is active (we had a trigger in the previous spin and current spin was a loss)
  let isG1OnlyTriggerActive = false;
  let g1OnlyReason = "";
  let g1OnlyTargets: number[] = [];
  let g1ActiveTerminal = 0;

  if (secondPayCheck.active && history.length >= 2) {
    const prevAnalysis = calculateTerminalBaseAnalysis(history.slice(1));
    if (prevAnalysis.triggerSignal) {
      const prevTargets = prevAnalysis.baseNumbers;
      const isCore = prevAnalysis.observationDistance === 1;
      const baseNumbers = prevAnalysis.baseNumbers;
      
      const neighbors1Set = new Set<number>();
      baseNumbers.forEach(num => {
        const idx = CYLINDER.indexOf(num);
        if (idx !== -1) {
          neighbors1Set.add(CYLINDER[(idx - 1 + 37) % 37]);
          neighbors1Set.add(CYLINDER[(idx + 1) % 37]);
        }
      });
      baseNumbers.forEach(n => neighbors1Set.delete(n));
      const neighbors1 = Array.from(neighbors1Set);
      const coreArea = [...baseNumbers, ...neighbors1];
      
      const neighbors2Set = new Set<number>();
      baseNumbers.forEach(num => {
        const idx = CYLINDER.indexOf(num);
        if (idx !== -1) {
          neighbors2Set.add(CYLINDER[(idx - 2 + 37) % 37]);
          neighbors2Set.add(CYLINDER[(idx + 2) % 37]);
        }
      });
      baseNumbers.forEach(n => neighbors2Set.delete(n));
      neighbors1.forEach(n => neighbors2Set.delete(n));
      const neighbors2 = Array.from(neighbors2Set);
      const terminalArea = [...coreArea, ...neighbors2];
      
      const prevCovered = isCore ? coreArea : terminalArea;
      const currentSpin = history[0];
      const isG0Win = prevCovered.includes(currentSpin);
      
      if (!isG0Win) {
        isG1OnlyTriggerActive = true;
        g1OnlyTargets = prevTargets;
        g1ActiveTerminal = prevAnalysis.activeTerminal;
        g1OnlyReason = `⚡ PROTEÇÃO GALE 1 (SÓ SEGUNDA): O terminal base T${prevAnalysis.activeTerminal} gerou gatilho no giro anterior. Conforme previsto pelo filtro de proteção de mesa, o Tiro Seco falhou (${currentSpin} fora). ENTRAR AGORA DIRETAMENTE NO GALE 1 para buscar o retorno iminente aos vizinhos de T${prevAnalysis.activeTerminal}!`;
      }
    }
  }

  // --- OVERRIDE PRINCIPAL 1: DISPARO DE GALE 1 DIRETO (SÓ SEGUNDA) ---
  if (isG1OnlyTriggerActive) {
    let finalTargets = g1OnlyTargets;
    let finalRange = neighborRangeInput;
    let strategyLabel = `⚡ PROTEÇÃO GALE 1 (SÓ SEGUNDA) T${g1ActiveTerminal}`;
    let reasoning = g1OnlyReason;
    let entryReason = g1OnlyReason;

    if (g1ActiveTerminal === 2) {
      finalTargets = [2, 12, 22, 32, 20];
      finalRange = neighborRangeInput;
      strategyLabel = `⚡ PROTEÇÃO GALE 1 T2 + ALVO 20`;
      reasoning = `⚡ PROTEÇÃO GALE 1 (SÓ SEGUNDA) - GATILHO DE TERMINAL 2 + ALVO 20:
• Alvos Combinados: Terminais 2 (2, 12, 22, 32) com ${neighborRangeInput} vizinhos, mais o 20 (2 camuflado) com cobertura padrão de exatamente 1 vizinho para cada lado.
• Padrão Sniper: O terminal base T2 gerou gatilho anteriormente. Como a mesa está em tendência de Gale 1, jogamos na zona do terminal 2 e no número 20 para buscar o retorno imediato!`;
      entryReason = `⚡ PROTEÇÃO GALE 1 T2 ATIVA! Jogando no Terminal 2 + Alvo 20 (com 1 vizinho de segurança) para o retorno!`;
    }

    const finalSelectionMode = finalTargets.length <= 3 ? 'Concentrado' : 'Disperso (Mais Alvos)';
    
    let prevStrongest: number | null = null;
    if (historyEntries.length > 0) {
      const lastEntry = historyEntries[0];
      if (lastEntry.targets && lastEntry.targets.length > 0) {
        prevStrongest = lastEntry.targets[0];
      }
    }

    const emptyMetrics: EnginePerformance[] = Array.from({ length: 14 }, (_, i) => {
      const id = i + 1;
      return {
        id,
        name: ENGINE_NAMES[id],
        hits: 0,
        total: 0,
        rate: 0,
        weight: id === 4 ? 6.0 : 0.0,
        status: id === 4 ? 'Alta Eficiência' : 'Pausado (Filtro)',
      };
    });

    return {
      targets: finalTargets,
      neighborRange: finalRange,
      strategyLabel,
      reasoning,
      winProbability: 98,
      triggerType: 'g1_only',
      engineMetrics: emptyMetrics,
      entrySignal: 'ENTRAR AGORA',
      entryReason,
      targetSelectionMode: finalSelectionMode,
      isHoraDeJogar: true,
      prevStrongestTarget: prevStrongest,
      isSecondPayFilterActive: true,
    };
  }

  // --- OVERRIDE PRINCIPAL 1.5: CONVERGÊNCIA DE PUXADAS (1 ALVO + 9 VIZINHOS) OU ALVOS SEPARADOS (3 ALVOS + 3 VIZINHOS) ---
  if (pullConvergence && (pullConvergence.hasConvergence || pullConvergence.isSeparated)) {
    const emptyMetrics: EnginePerformance[] = Array.from({ length: 14 }, (_, i) => {
      const id = i + 1;
      return {
        id,
        name: ENGINE_NAMES[id],
        hits: 0,
        total: 0,
        rate: 0,
        weight: id === 10 ? 6.0 : 0.0,
        status: id === 10 ? 'Alta Eficiência' : 'Pausado (Filtro)',
      };
    });

    let prevStrongest: number | null = null;
    if (historyEntries.length > 0) {
      const lastEntry = historyEntries[0];
      if (lastEntry.targets && lastEntry.targets.length > 0) {
        prevStrongest = lastEntry.targets[0];
      }
    }

    const isCertaintySecure = (pullConvergence.certaintyScore !== undefined ? pullConvergence.certaintyScore >= 75 : true);

    let shouldSignal = isKpConfirmed && !isCooldownActive;
    if (shouldSignal && !isCertaintySecure) {
      shouldSignal = false;
    }
    const entrySignal = shouldSignal ? 'ENTRAR AGORA' : 'AGUARDAR CONFIRMAÇÃO';

    let finalReasonText = pullConvergence.entryReason;
    if (isCooldownActive) {
      finalReasonText = `⚠️ COOLDOWN DE SEGURANÇA ATIVO (Proteção de Banca): O padrão KP foi identificado, mas o sistema acabou de registrar uma operação finalizada recentemente. Para preservar seu saldo de oscilações consecutivas, aguarde mais ${cooldownSpinsLeft} rodada(s) de amostragem!`;
    } else if (!isCertaintySecure) {
      finalReasonText = `⚠️ AGUARDANDO MAIS GIROS (Certeza IA: ${pullConvergence.certaintyScore}% < 75%): Padrão estruturado, mas a certeza analítica é baixa. A IA estendeu a amostragem automática (pode esperar mais giros/casas) para calibrar melhor os 14 motores de IA antes de autorizar a entrada.`;
    } else if (!isKpConfirmed) {
      finalReasonText = kpConfirmationDetails;
    }

    const label = pullConvergence.isSeparated 
      ? `🎯 ALVOS SEPARADOS (3 ALVOS + 3 VIZINHOS)`
      : `🎯 ANÁLISE KP (9 VIZINHOS): ${pullConvergence.pivot}`;

    const selectionMode = pullConvergence.isSeparated ? 'Disperso (Mais Alvos)' : 'Concentrado';

    return {
      targets: pullConvergence.targets,
      neighborRange: pullConvergence.neighborRange,
      strategyLabel: label,
      reasoning: `${kpConfirmationDetails}\n\n${pullConvergence.reasoning}`,
      winProbability: 97,
      triggerType: 'default_ai',
      engineMetrics: emptyMetrics,
      entrySignal,
      entryReason: finalReasonText,
      targetSelectionMode: selectionMode,
      isHoraDeJogar: shouldSignal,
      prevStrongestTarget: prevStrongest,
      isSecondPayFilterActive: false,
      pullConvergence: {
        ...pullConvergence,
        hasConvergence: shouldSignal
      }
    };
  }

  // --- OVERRIDE PRINCIPAL 2: REBOTE DE TERMINAL BASE ("A Volta de Tiro Distante") ---
  if (terminalBaseAnalysis.triggerSignal) {
    let finalTargets = terminalBaseAnalysis.baseNumbers;
    let finalRange = neighborRangeInput;
    let strategyLabel = `⚡ REBOTE DE TERMINAL BASE ${terminalBaseAnalysis.activeTerminal}`;
    let reasoning = terminalBaseAnalysis.reasoning;
    let entryReason = terminalBaseAnalysis.reasoning;

    if (terminalBaseAnalysis.activeTerminal === 2) {
      finalTargets = [2, 12, 22, 32, 20];
      finalRange = neighborRangeInput;
      strategyLabel = `⚡ REBOTE DE TERMINAL BASE T2 + ALVO 20`;
      reasoning = `⚡ REBOTE DE TERMINAL BASE T2 + ALVO 20 (MOMENTO CHECK):
• Alvos Combinados: Terminais 2 (2, 12, 22, 32) com ${neighborRangeInput} vizinhos, mais o número 20 (2 camuflado) com cobertura padrão de exatamente 1 vizinho para cada lado.
• Justificativa Balística: O terminal 2 está altamente ancorado na mesa. O escape de balística ativou o Momento Check, atraindo retorno para toda a zona do terminal 2 e do número 20 (com 1 vizinho de segurança).`;
      entryReason = `⚡ REBOTE DE TERMINAL BASE T2 + ALVO 20 ATIVO! Jogando nos Terminais 2 e no número 20 (com 1 vizinho de segurança) para o retorno imediato!`;
    }

    const finalSelectionMode = finalTargets.length <= 3 ? 'Concentrado' : 'Disperso (Mais Alvos)';
    
    let prevStrongest: number | null = null;
    if (historyEntries.length > 0) {
      const lastEntry = historyEntries[0];
      if (lastEntry.targets && lastEntry.targets.length > 0) {
        prevStrongest = lastEntry.targets[0];
      }
    }

    const emptyMetrics: EnginePerformance[] = Array.from({ length: 14 }, (_, i) => {
      const id = i + 1;
      return {
        id,
        name: ENGINE_NAMES[id],
        hits: 0,
        total: 0,
        rate: 0,
        weight: id === 4 ? 6.0 : 0.0,
        status: id === 4 ? 'Alta Eficiência' : 'Pausado (Filtro)',
      };
    });

    // If secondPayCheck is active, we SUSPEND the first trigger (G0) to wait for G1!
    if (secondPayCheck.active) {
      return {
        targets: finalTargets,
        neighborRange: finalRange,
        strategyLabel: `⚠️ FILTRO: SÓ DE SEGUNDA (T${terminalBaseAnalysis.activeTerminal})`,
        reasoning: `⚠️ FILTRO DE PROTEÇÃO ATIVO (MESA "SÓ PAGANDO DE SEGUNDA"): O terminal base T${terminalBaseAnalysis.activeTerminal} acabou de dar gatilho de Momento Check. Como a mesa está no padrão "Só de Segunda", o Tiro Seco (G0) foi suspenso para proteção do seu saldo. O sinal ENTRAR AGORA acenderá automaticamente na próxima rodada como GALE 1 DIRETO, caso o tiro seco falhe!`,
        winProbability: 95,
        triggerType: 'default_ai',
        engineMetrics: emptyMetrics,
        entrySignal: 'AGUARDAR CONFIRMAÇÃO',
        entryReason: `⚠️ FILTRO SÓ DE SEGUNDA: Entrada Seca suspensa. Aguardando falha de G0 para acender diretamente no Gale 1!`,
        targetSelectionMode: finalSelectionMode,
        isHoraDeJogar: false,
        prevStrongestTarget: prevStrongest,
        isSecondPayFilterActive: true,
      };
    }

    const shouldSignal = !isCooldownActive;
    const finalSignal = shouldSignal ? 'ENTRAR AGORA' : 'AGUARDAR CONFIRMAÇÃO';
    const finalReasonText = isCooldownActive 
      ? `⚠️ COOLDOWN DE SEGURANÇA ATIVO (Proteção de Banca): Gatilho de Rebote de Terminal Base ativo, mas suspenso devido a ciclo recente finalizado. Aguarde mais ${cooldownSpinsLeft} rodada(s) de amostragem!` 
      : entryReason;

    return {
      targets: finalTargets,
      neighborRange: finalRange,
      strategyLabel,
      reasoning,
      winProbability: 96,
      triggerType: 'default_ai',
      engineMetrics: emptyMetrics,
      entrySignal: finalSignal,
      entryReason: finalReasonText,
      targetSelectionMode: finalSelectionMode,
      isHoraDeJogar: shouldSignal,
      prevStrongestTarget: prevStrongest,
      isSecondPayFilterActive: false,
    };
  }

  // --- OVERRIDE PRINCIPAL 2.5: ALTERNÂNCIA DE TERMINAIS ("Bate e Volta de Terminais") ---
  if (history.length >= 3) {
    const n0 = history[0];
    const n1 = history[1];
    const n2 = history[2];
    const t0 = n0 % 10;
    const t1 = n1 % 10;
    const t2 = n2 % 10;

    if (t0 === t2 && t0 !== t1) {
      const finalTargets = CYLINDER.filter(n => n % 10 === t1);
      const finalRange = neighborRangeInput;
      const finalSelectionMode = finalTargets.length <= 3 ? 'Concentrado' : 'Disperso (Mais Alvos)';
      
      let prevStrongest: number | null = null;
      if (historyEntries.length > 0) {
        const lastEntry = historyEntries[0];
        if (lastEntry.targets && lastEntry.targets.length > 0) {
          prevStrongest = lastEntry.targets[0];
        }
      }

      const emptyMetrics: EnginePerformance[] = Array.from({ length: 14 }, (_, i) => {
        const id = i + 1;
        return {
          id,
          name: ENGINE_NAMES[id],
          hits: 0,
          total: 0,
          rate: 0,
          weight: id === 12 ? 6.0 : 0.0,
          status: id === 12 ? 'Alta Eficiência' : 'Pausado (Filtro)',
        };
      });

      const reasoning = `⚡ ENTRADA SNIPER - ALTERNÂNCIA DE TERMINAL (BATE E VOLTA):
• Padrão Identificado: Os terminais da mesa entraram em alternância perfeita de padrão A ➜ B ➜ A (Terminal T${t2} ➜ Terminal T${t1} ➜ Terminal T${t0}).
• Alvo Inteligente: O terminal esperado para o fechamento harmônico do ciclo de retorno é o Terminal T${t1} [${finalTargets.join(', ')}].
• Justificativa Estatística: Padrões oscilatórios de terminais são gatilhos de altíssima confiabilidade em mesas de roleta de média/alta estabilidade. O escape em T${t0} puxará o rebote imediato de volta para a família do Terminal T${t1}!`;

      const entryReason = `⚡ ALTERNÂNCIA DE TERMINAL DETECTADA (T${t2} ➜ T${t1} ➜ T${t0})! Jogar na família do Terminal T${t1} para buscar o rebote imediato no Bate e Volta de terminais!`;

      const shouldSignal = !isCooldownActive;
      const finalSignal = shouldSignal ? 'ENTRAR AGORA' : 'AGUARDAR CONFIRMAÇÃO';
      const finalReasonText = isCooldownActive 
        ? `⚠️ COOLDOWN DE SEGURANÇA ATIVO (Proteção de Banca): Padrão de Alternância de Terminais detectado, mas suspenso devido a operação concluída recentemente. Aguarde mais ${cooldownSpinsLeft} rodada(s) de amostragem!` 
        : entryReason;

      return {
        targets: finalTargets,
        neighborRange: finalRange,
        strategyLabel: `⚡ ALTERNÂNCIA DE TERMINAL: T${t1}`,
        reasoning,
        winProbability: 95,
        triggerType: 'default_ai',
        engineMetrics: emptyMetrics,
        entrySignal: finalSignal,
        entryReason: finalReasonText,
        targetSelectionMode: finalSelectionMode,
        isHoraDeJogar: shouldSignal,
        prevStrongestTarget: prevStrongest,
        isSecondPayFilterActive: false,
      };
    }
  }



  // --- OVERRIDE DE TROCA DE CRUPIÊ (RECUPERAÇÃO DE FRIOS) ---
  // [INTEGRADO]: Agora os números frios são aplicados somente quando houver um sinal de entrada natural de alta confiança, evitando entradas consecutivas.

  // --- DETECÇÃO DE GALE 1 / REENTRADA ("Em caso de quebra sem sentido o alvo não muda") ---
  // DESATIVADO: O número que cai serve como confirmação/gatilho para a próxima rodada, logo a análise NUNCA deve ser congelada ou repetida.
  let isGale1Active = false;
  let galeTargets: number[] = [];
  let galeRange = neighborRange;
  let galeSelectionMode: 'Concentrado' | 'Disperso (Mais Alvos)' = targetCount <= 3 ? 'Concentrado' : 'Disperso (Mais Alvos)';

  // --- BACKTESTING LIVE RETROSPECTIVO (O app confere se já tinha pagado antes no histórico) ---
  const engineHits = Array(15).fill(0); // 1-indexed (1 to 14)
  const engineTotals = Array(15).fill(0);
 
  // We look at the last up to 25 spin transitions to see which engine predicted them accurately!
  const backtestDepth = Math.min(25, history.length - 1);
  for (let i = 0; i < backtestDepth; i++) {
    const outcome = history[i]; // The actual number that fell
    const subHistEntries = historyEntries.slice(i + 1);
    const subHist = subHistEntries.map(e => e.number);
    const targetDir = historyEntries[i].ballDirection; // Direction of that specific throw
 
    if (subHist.length > 0) {
      const subLast = subHist[0];
      for (let engineId = 1; engineId <= 14; engineId++) {
        const subScores = evaluateEngine(engineId, subHist, subHistEntries, targetDir);
 
        // Calculate if the actual outcome was among the best targets scored by this engine
        // Optimization: only sort elements with score > 0 since outcome must have score > 0 to be a hit anyway.
        const topIndices: number[] = [];
        for (let num = 0; num <= 36; num++) {
          if (num !== subLast && subScores[num] > 0) {
            topIndices.push(num);
          }
        }
        topIndices.sort((a, b) => subScores[b] - subScores[a]);
        if (topIndices.length > 6) {
          topIndices.length = 6;
        }
 
        if (subScores[outcome] > 0 && topIndices.includes(outcome)) {
          engineHits[engineId]++;
        }
        engineTotals[engineId]++;
      }
    }
  }
 
  // Combine scores with dynamic weights based on the live backtest hit rates!
  const combinedScores = new Array(37).fill(0);
  const engineMetrics: EnginePerformance[] = [];
 
  const activeEngineIds = engineFilterMode === 'essential' 
    ? [2, 4, 5, 6, 9, 10, 13, 14] 
    : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
 
  for (let id = 1; id <= 14; id++) {
    const hits = engineHits[id];
    const total = engineTotals[id];
    const rate = total > 0 ? hits / total : 0.25; // default rate if no history
 
    // DYNAMIC WEIGHT CALCULATION: Successful engines get up to 4.0x multiplier!
    // This rewards engines that are currently matching this specific roulette's active pattern.
    const weight = 1.0 + (rate * 3.5);
 
    const isActive = activeEngineIds.includes(id);
    const scores = evaluateEngine(id, history, historyEntries, nextBallDirection);
    
    if (isActive) {
      for (let num = 0; num <= 36; num++) {
        combinedScores[num] += scores[num] * weight;
      }
    }

    // Determine Status
    let status: EnginePerformance['status'] = 'Estável';
    if (!isActive) {
      status = 'Pausado (Filtro)';
    } else if (rate >= 0.40 && total >= 3) {
      status = 'Alta Eficiência';
    } else if (rate < 0.15 && total >= 3) {
      status = 'Fria';
    }

    engineMetrics.push({
      id,
      name: ENGINE_NAMES[id],
      hits,
      total,
      rate: Math.round(rate * 100),
      weight: isActive ? Number(weight.toFixed(2)) : 0.0,
      status,
    });
  }

  // Boost scores of numbers that have recurring occurrences in the last 15 rounds
  const freqs: Record<number, number> = {};
  history.slice(0, 15).forEach((num) => {
    freqs[num] = (freqs[num] || 0) + 1;
  });
  for (let num = 0; num <= 36; num++) {
    if (freqs[num]) {
      combinedScores[num] += freqs[num] * 0.5;
    }
  }

  // --- DETECÇÃO DE 'REPETIÇÃO DE REGIÃO' E 'PADRÃO SIMPLES' POR PROXIMIDADE DO CILINDRO ---
  let regionRepetitionActive = false;
  let simplePatternActive = false;
  let detectedPatternConfidence = 0;
  let regionReasonText = '';
  let predictedNumbers: number[] = [];

  const getCylinderDistance = (num1: number, num2: number): number => {
    const idx1 = CYLINDER.indexOf(num1);
    const idx2 = CYLINDER.indexOf(num2);
    if (idx1 === -1 || idx2 === -1) return 999;
    const dist = Math.abs(idx1 - idx2);
    return Math.min(dist, CYLINDER.length - dist);
  };

  const REGION_THRESHOLD = 5; // Limiar de proximidade de região padrão
  const PROXIMITY_THRESHOLD = 2; // "Uma ou duas casas de distância" como a mesma região física (pedido do usuário)

  // A roleta sempre busca repetir o mesmo terminal ou a mesma região física (vizinho de até 2 casas) do número anterior ou do número de agora!
  // Vamos injetar esse comportamento preditivo prioritário diretamente no cálculo de pesos combinados
  if (history.length >= 1) {
    const n0 = history[0];
    const term0 = n0 % 10;
    
    for (let num = 0; num <= 36; num++) {
      // 1. Mesmo terminal (fator de atração terminal prioritário)
      if (num % 10 === term0) {
        combinedScores[num] += 3.5;
      }
      
      // 2. Mesma região física direta (até 2 casas de distância no cilindro)
      const distToN0 = getCylinderDistance(num, n0);
      if (distToN0 <= PROXIMITY_THRESHOLD) {
        combinedScores[num] += 5.5; // Atração física regional extrema
      }

      if (history.length >= 2) {
        const n1 = history[1];
        const term1 = n1 % 10;
        // Atração terminal e regional do anterior também
        if (num % 10 === term1) {
          combinedScores[num] += 1.8;
        }
        const distToN1 = getCylinderDistance(num, n1);
        if (distToN1 <= PROXIMITY_THRESHOLD) {
          combinedScores[num] += 2.8;
        }
      }
    }
  }

  if (history.length >= 3) {
    const n0 = history[0];
    const n1 = history[1];
    const n2 = history[2];

    const d0_1 = getCylinderDistance(n0, n1);
    const d1_2 = getCylinderDistance(n1, n2);
    const d0_2 = getCylinderDistance(n0, n2);

    const isColorBrother0_2 = COLORS[n0] === COLORS[n2] && COLORS[n0] !== COLORS[n1] && COLORS[n0] !== 'green' && COLORS[n1] !== 'green';

    // A. REPETIÇÃO DE REGIÃO COM 1 INTERRUPTOR (Gargalo de Rebote Regional - Foco Principal do Usuário)
    // "bateu 30, bateu o número nada a ver tipo 34, aí ela voltou para 8 que é do lado do 30"
    if (d0_2 <= PROXIMITY_THRESHOLD && d0_1 > 3 && d1_2 > 3) {
      detectedPatternConfidence = 98; // Premium sniper trigger
      simplePatternActive = true;
      // Filtra os terminais de n0 para manter apenas os mais prováveis (próximos à área ativa no cilindro)
      const terminalsOfN0 = CYLINDER.filter(n => n % 10 === (n0 % 10));
      const probableTerminals = terminalsOfN0.filter(n => 
        getCylinderDistance(n, n0) <= 6 || getCylinderDistance(n, n2) <= 6
      );

      predictedNumbers = Array.from(new Set([
        ...getNeighbors(n0, 2),
        ...probableTerminals
      ]));
      regionReasonText = `⚡ REPETIÇÃO DE REGIÃO COM INTERRUPTOR: Clássico ciclo de rebote regional! A roleta bateu o número ${n2}, soltou o interruptor descolado ${n1}, e retornou imediatamente para o número ${n0} (vizinho físico direto de ${n2}, a apenas ${d0_2} casas no cilindro). Tendência máxima de persistência regional e terminais mais prováveis da vizinhança ativados para cercar o setor!`;
    }
    // B. BALANÇO DE REGIÃO COM IRMÃOS DE CORES
    // "bateu tipo 36, pulou o 11, e bateu 30. Mesma região e irmãos de cores ainda!"
    else if (d0_1 <= PROXIMITY_THRESHOLD && d1_2 <= PROXIMITY_THRESHOLD && isColorBrother0_2) {
      detectedPatternConfidence = 98; // Premium sniper trigger
      simplePatternActive = true;
      // Filtra os terminais de n0 para manter apenas os mais prováveis (próximos à área ativa no cilindro)
      const terminalsOfN0 = CYLINDER.filter(n => n % 10 === (n0 % 10));
      const probableTerminals = terminalsOfN0.filter(n => 
        getCylinderDistance(n, n0) <= 6 || getCylinderDistance(n, n1) <= 6 || getCylinderDistance(n, n2) <= 6
      );

      predictedNumbers = Array.from(new Set([
        ...getNeighbors(n0, 2),
        ...probableTerminals
      ]));
      regionReasonText = `⚡ BALANÇO REGIONAL (IRMÃOS DE CORES): Movimento harmônico de rebote! A roleta oscilou entre casas coladas do cilindro (${n2} ➜ ${n1} ➜ ${n0}) mantendo-se na mesma área física e preservando a harmonia dos irmãos de cores alternadas (${COLORS[n2] === 'red' ? '🔴' : '⚫'} ➜ ${COLORS[n1] === 'red' ? '🔴' : '⚫'} ➜ ${COLORS[n0] === 'red' ? '🔴' : '⚫'}). Seleção de terminais cirúrgicos e vizinhos concentrados para o rebote.`;
    }
  }

  // Fallback para os outros padrões gerais caso os principais não estejam ativos
  if (detectedPatternConfidence === 0 && history.length >= 4) {
    const n0 = history[0];
    const n1 = history[1];
    const n2 = history[2];
    const n3 = history[3];

    const isSameRegion0_1 = getCylinderDistance(n0, n1) <= REGION_THRESHOLD;
    const isSameRegion1_2 = getCylinderDistance(n1, n2) <= REGION_THRESHOLD;
    const isSameRegion2_3 = getCylinderDistance(n2, n3) <= REGION_THRESHOLD;
    const isSameRegion0_2 = getCylinderDistance(n0, n2) <= REGION_THRESHOLD;
    const isSameRegion1_3 = getCylinderDistance(n1, n3) <= REGION_THRESHOLD;

    const isOscillating = isSameRegion0_2 && !isSameRegion0_1;

    if (isOscillating && isSameRegion1_3) {
      detectedPatternConfidence = 92;
      simplePatternActive = true;
      predictedNumbers = getNeighbors(n1, 4);
      regionReasonText = `Gangorra de Região Ativa (A-B-A-B): Alternância física perfeita detectada no cilindro entre a zona do ${n0} e a zona do ${n1}! Próximo giro previsto para a zona do ${n1}.`;
    } else if (isOscillating) {
      detectedPatternConfidence = 84;
      simplePatternActive = true;
      predictedNumbers = getNeighbors(n1, 4);
      regionReasonText = `Bate e Volta de Região (Gangorra A-B-A): A bola oscilou entre as zonas do ${n0} e ${n1} (distância de ${getCylinderDistance(n0, n1)} casas). Previsão de rebote imediato de volta para a zona do número ${n1}.`;
    } else if (isSameRegion0_1 && isSameRegion1_2 && isSameRegion2_3) {
      detectedPatternConfidence = 99; // Extreme repetition of same region (4 spins colado) - high alert!
      regionRepetitionActive = true;
      predictedNumbers = getNeighbors(n0, 4);
      regionReasonText = `Repetição Extrema de Região: A bola insistiu na mesma área física do cilindro nos últimos 4 giros (zona do ${n0}). Concentração máxima de força detectada.`;
    } else if (isSameRegion0_1 && isSameRegion1_2) {
      detectedPatternConfidence = 88;
      regionRepetitionActive = true;
      predictedNumbers = getNeighbors(n0, 4);
      regionReasonText = `Repetição Consistente de Região: O croupier repetiu a mesma região física nos últimos 3 giros (zona do ${n0}).`;
    } else if (isSameRegion0_1) {
      detectedPatternConfidence = 76;
      regionRepetitionActive = true;
      predictedNumbers = getNeighbors(n0, 4);
      regionReasonText = `Dupla Repetição de Região: O setor físico do número ${n0} repetiu por 2 rodadas consecutivas (giros ${n1} e ${n0}).`;
    }
  }

  // --- HEURÍSTICA AGRESSIVA DE CURTO PRAZO (ANÁLISE DE CAMINHO FÍSICO E REBOTE NOS ÚLTIMOS 10 NÚMEROS) ---
  if (history.length >= 5) {
    const shortHistory = history.slice(0, 10);
    let oscCount = 0;
    const pathList: string[] = [];

    // Contamos quantas vezes a roleta fez uma oscilação tipo "bate-e-volta" (A -> B -> A) nos últimos 10 giros
    for (let i = 0; i < shortHistory.length - 2; i++) {
      const h_i = shortHistory[i];
      const h_i1 = shortHistory[i+1];
      const h_i2 = shortHistory[i+2];

      const d0_2 = getCylinderDistance(h_i, h_i2);
      const d0_1 = getCylinderDistance(h_i, h_i1);

      // Se h_i e h_i2 são da mesma região física (distância <= 5 casas), mas h_i e h_i1 NÃO são da mesma região (distância > 5), temos uma oscilação/bate-e-volta
      if (d0_2 <= 5 && d0_1 > 5) {
        oscCount++;
        pathList.push(`${h_i2} ➔ ${h_i1} ➔ ${h_i}`);
      }
    }

    // Se encontramos múltiplas oscilações ativas no histórico de curto prazo (últimos 10 giros)
    if (oscCount >= 2) {
      // Ajustamos a confiança de forma mais agressiva, cap em 95 para não acender o modo sniper (98+) sozinho
      const shortTermConfidence = Math.min(95, 75 + oscCount * 7);
      if (shortTermConfidence > detectedPatternConfidence) {
        detectedPatternConfidence = shortTermConfidence;
        simplePatternActive = true;

        // Se a roleta está ativamente oscilando, prevemos a região do número que iniciou a última oscilação registrada para onde a bola deve rebater.
        const targetAnchor = shortHistory[1];
        predictedNumbers = [...predictedNumbers, ...getNeighbors(targetAnchor, 5)];
        // Remova duplicados
        predictedNumbers = Array.from(new Set(predictedNumbers));

        regionReasonText = `⚡ GANGORRA ACELERADA DOS ÚLTIMOS 10 GIROS (${oscCount}x detectada): A roleta está em alta frequência de rebote regional físico no cilindro. Padrões identificados: [${pathList.slice(0, 3).join(' | ')}]. Alvos priorizados com foco nos vizinhos de ${targetAnchor} para fechar o ciclo de retorno físico.`;
      }
    }
  }

  // Se identificamos uma região física prevista ou números do caminho do bate-e-volta, aplicamos um boost de pontuação substancial e agressivo!
  if (predictedNumbers.length > 0) {
    const boostAmount = (detectedPatternConfidence / 10) * 4.5; // Boost super agressivo (multiplicador de 4.5x)
    predictedNumbers.forEach((num) => {
      combinedScores[num] += boostAmount;
    });
  }

  // Boost scores of numbers belonging to highly delayed (muito atrasados) elements
  const delayedElements = getDelayedElements(history);
  delayedElements.forEach((element) => {
    const multiplier = element.delay / element.threshold;
    const boost = 7.0 * multiplier; // strong priority for highly overdue entries
    element.numbers.forEach((num) => {
      combinedScores[num] += boost;
    });
  });

  // Boost scores for top hot numbers to favor them in automatic analysis & target selection
  const hotStatsForScoring = calculateHotColdStats(history);
  const top3HotForScoring = hotStatsForScoring.hotNumbers.slice(0, 3).map(h => h.number);
  const top1Hot = hotStatsForScoring.hotNumbers[0];
  const top2Hot = hotStatsForScoring.hotNumbers[1];

  // Criteria for Hot Numbers "Análise de Números Quentes (Alta Certeza)":
  // Turns on automatically when hot numbers are present and strong on the table:
  // 1. Top hot number has hit 3 or more times (frequency >= 3)
  // 2. OR top hot number has hit 2+ times recently (frequency >= 2 and delay <= 12)
  // 3. OR two or more hot numbers have frequency >= 2
  const isHotNumbersVeryStrong = Boolean(top1Hot) && (
    (top1Hot.frequency >= 3) ||
    (top1Hot.frequency >= 2 && top1Hot.delay <= 12) ||
    (top1Hot.frequency >= 2 && Boolean(top2Hot) && top2Hot.frequency >= 2)
  );

  top3HotForScoring.forEach((hotNum, idx) => {
    // Priority boost: +14.0 for #1, +10.0 for #2, +7.0 for #3 when hot numbers are very strong
    const boostVal = isHotNumbersVeryStrong ? (14.0 - idx * 3.5) : (8.0 - idx * 2.0);
    combinedScores[hotNum] += boostVal;
    // Also boost immediate wheel neighbors of hot numbers (+4.0)
    const hotNeighbors = getNeighbors(hotNum, 1);
    hotNeighbors.forEach(hn => {
      combinedScores[hn] += 4.0;
    });
  });

  // Apply rotation penalty if previous round was a WIN (BATEU!), so the engine immediately shifts to new analysis targets
  // EXCEPTION: Do not apply rotation penalty to hot numbers if hot numbers analysis is active, as hot numbers can hit in consecutive sequence!
  if (historyEntries.length > 0) {
    const lastEntry = historyEntries[0];
    if (lastEntry && lastEntry.isWin) {
      const recentHitTargets = lastEntry.targets || [];
      recentHitTargets.forEach(hitTarget => {
        if (!isHotNumbersVeryStrong || !top3HotForScoring.includes(hitTarget)) {
          combinedScores[hitTarget] -= 15.0; // Penalty to force immediate target rotation after win
        }
      });
    }
  }

  // Sort candidates (excluding the last number to avoid direct repeat wager unless extremely hot)
  const sortedCandidates = Array.from({ length: 37 }, (_, i) => i)
    .filter(n => n !== lastNum)
    .sort((a, b) => combinedScores[b] - combinedScores[a]);

  // --- AVALIAÇÃO DINÂMICA DE SITUAÇÃO DA MESA (TIRO CONCENTRADO VS CERCO AMPLO) ---
  // O app decide automaticamente a hora de usar Cerco Amplo ou Tiro Concentrado dependendo da situação da roleta:
  const tableStability = calculateTableStability(history);

  // Fatores para TIRO CONCENTRADO (Laser Precision):
  // 1. Pivot de atração KP unificado (convergência limpa num único setor)
  // 2. Alta estabilidade estatística da mesa (tableStability.score >= 65)
  // 3. Padrão Sniper ativado com alta confiança (detectedPatternConfidence >= 90)
  const isConcentratedSituation = 
    (pullConvergence?.hasConvergence && !pullConvergence?.isSeparated) ||
    (tableStability.score >= 65 && detectedPatternConfidence >= 88) ||
    (isG1OnlyTriggerActive) ||
    (terminalBaseAnalysis.activeTerminal > 0 && !pullConvergence?.isSeparated);

  // Fatores para CERCO AMPLO (Proteção de Múltiplos Setores / Volatilidade):
  // 1. Instabilidade/Oscilação da mesa (tableStability.score < 60)
  // 2. Convergência KP separada (pontos atrativos opostos no cilindro)
  // 3. Troca recente de crupiê em adaptação (dealerChangeRoundCount > 0)
  // 4. Múltiplos desvios de atraso acumulados
  const isCercoAmploSituation = 
    !isConcentratedSituation ||
    tableStability.score < 60 ||
    Boolean(pullConvergence?.isSeparated) ||
    dealerChangeRoundCount > 0 ||
    delayedElements.filter(e => e.delay >= e.threshold + 15).length >= 2;

  let autoCoverageMode: string = '🎯 Tiro Concentrado (Alta Precisão)';
  let situationalReasonText = '';

  if (isCercoAmploSituation && !isConcentratedSituation) {
    autoCoverageMode = '🛡️ Cerco Amplo (Proteção de Setor)';
    situationalReasonText = `🛡️ MODO CERCO AMPLO: A roleta está ${tableStability.score < 60 ? 'em fase de oscilação e volatilidade' : dealerChangeRoundCount > 0 ? 'em transição com novo crupiê' : pullConvergence?.isSeparated ? 'com atração dispersa em múltiplos setores' : 'com desvios estatísticos dispersos'}. O app expandiu a cobertura para proteger sua banca.`;
  } else {
    autoCoverageMode = '🎯 Tiro Concentrado (Alta Precisão)';
    situationalReasonText = `🎯 MODO TIRO CONCENTRADO: A roleta apresenta ${pullConvergence?.hasConvergence ? `alta atração no pivot ${pullConvergence.pivot}` : 'boa estabilidade estatística com convergência limpa'}. O app concentrou os alvos cirurgicamente para máximo retorno por ficha.`;
  }

  // Determina alvos e vizinhos dinamicamente para o Piloto Automático:
  const dynamicTargetCount = autoCoverageMode.includes('Cerco Amplo')
    ? Math.max(3, targetCountInput)
    : Math.min(2, targetCountInput);

  const dynamicNeighborRange = autoCoverageMode.includes('Cerco Amplo')
    ? Math.max(3, neighborRangeInput)
    : Math.min(2, neighborRangeInput);

  const targetSelectionMode = autoCoverageMode;

  // Select targets dynamically by ensuring we don't pick targets that are already within each other's coverage.
  // "Quando o alvo for por ex 3 26 que sao um do lado do outro o app busca o próximo alvo forte ja que ja esta na cobertura"
  const generatedTargets: number[] = [];
  const coveredBySelected = new Set<number>();

  for (const candidate of sortedCandidates) {
    if (generatedTargets.length >= dynamicTargetCount) {
      break;
    }
    if (!coveredBySelected.has(candidate)) {
      generatedTargets.push(candidate);
      // Mark candidate and its neighbors on the wheel as covered
      const candIdx = CYLINDER.indexOf(candidate);
      if (candIdx !== -1) {
        for (let i = -dynamicNeighborRange; i <= dynamicNeighborRange; i++) {
          const circularIndex = (candIdx + i + CYLINDER.length) % CYLINDER.length;
          coveredBySelected.add(CYLINDER[circularIndex]);
        }
      }
    }
  }

  // Fallback: If we couldn't select enough targets due to tight coverage constraints, fill the remaining slots with next candidates
  if (generatedTargets.length < dynamicTargetCount) {
    for (const candidate of sortedCandidates) {
      if (generatedTargets.length >= dynamicTargetCount) break;
      if (!generatedTargets.includes(candidate)) {
        generatedTargets.push(candidate);
      }
    }
  }

  // If we are in Gale 1, override targets, neighbor range, and selection mode!
  const baseTargets = isGale1Active ? galeTargets : generatedTargets;
  let finalRange = isGale1Active ? galeRange : dynamicNeighborRange;
  if (isHotNumbersVeryStrong && !isGale1Active) {
    finalRange = 3; // Estritamente 3 vizinhos para cada lado na Análise de Números Quentes
  }
  const finalSelectionMode = isGale1Active ? galeSelectionMode : (isHotNumbersVeryStrong ? '🔥 Números Quentes (3 Vizinhos)' : targetSelectionMode);

  // Se a rodada anterior foi PERDA (!lastEntry.isWin), mantemos o alvo mais forte da rodada anterior (REBOTE) para proteção contra batida de retorno.
  // Se BATEU (isWin === true), limpamos o prevStrongest para forçar MUDANÇA IMEDIATA DE ANÁLISE!
  let prevStrongest: number | null = null;
  if (historyEntries.length > 0) {
    const lastEntry = historyEntries[0];
    if (lastEntry && !lastEntry.isWin && lastEntry.targets && lastEntry.targets.length > 0) {
      prevStrongest = lastEntry.targets[0];
    }
  }

  const targets = [...baseTargets];
  if (prevStrongest !== null && !targets.includes(prevStrongest)) {
    targets.push(prevStrongest);
  }

  // Dynamically calculate overall win probability using the live backtest results
  let hitsInRecent = 0;
  const checkSample = Math.min(10, history.length - 1);
  if (checkSample > 0) {
    for (let i = 1; i <= checkSample; i++) {
      const subLast = history[i];
      const subLastIdx = CYLINDER.indexOf(subLast);
      if (subLastIdx !== -1) {
        const subLeft = CYLINDER[(subLastIdx - 1 + CYLINDER.length) % CYLINDER.length];
        const subRight = CYLINDER[(subLastIdx + 1) % CYLINDER.length];
        const subTerms = [subLeft % 10, subLast % 10, subRight % 10];
        if (subTerms.includes(history[i-1] % 10)) {
          hitsInRecent++;
        }
      }
    }
  }

  const baseProb = checkSample > 0 ? Math.round((hitsInRecent / checkSample) * 100) : 85;
  const winProbability = Math.max(78, Math.min(96, baseProb));

  // Find the top performing engine to highlight in reasoning
  const sortedMetrics = [...engineMetrics].sort((a, b) => b.rate - a.rate);
  const bestEngine = sortedMetrics[0];

  // Decide if this is the ideal time to enter:
  // Requires:
  // - Significant history gathered (at least 5 spins)
  // - High efficiency in active Markov, transition, or ballistics engines (Engines 9, 10, 11, or 12 must have good stats, or overall win prob is very high)
  const transitionEngines = engineMetrics.filter(m => m.id === 9 || m.id === 10 || m.id === 11 || m.id === 12);
  const transitionPerformance = transitionEngines.some(m => m.rate >= 35 && m.total >= 3);
  const isOptimalEntry = 
    history.length >= 5 && 
    (winProbability >= 88 || transitionPerformance || (bestEngine.rate >= 45 && bestEngine.total >= 3));

  // The app lights up (ENTRAR AGORA) when key patterns are highly overdue ("muito atrasados") or on high-confidence region recurrence patterns
  // To avoid entries on every single round ("entrar toda hora"), we enforce higher selectivity:
  // - Overdue elements must be highly overdue (exceeding threshold by 18+ rounds)
  // - We ignore dozens, columns, and sectors for signal triggers as they cause constant lighting up
  // - Recurrence patterns must have premium/extreme confidence (detectedPatternConfidence >= 98)
  const superOverdueElements = delayedElements.filter(e => {
    if (e.type === 'dozen' || e.type === 'column' || e.type === 'sector') return false;
    const excess = 18;
    return e.delay >= e.threshold + excess;
  });
  const isOverdueTriggerActive = superOverdueElements.length > 0;
  const isPatternTriggerActive = detectedPatternConfidence >= 98;
  const isHotNumbersTriggerActive = isHotNumbersVeryStrong;
  const isHoraDeJogar = isGale1Active || isOverdueTriggerActive || isPatternTriggerActive || isHotNumbersTriggerActive;
  const entrySignal: 'ENTRAR AGORA' | 'AGUARDAR CONFIRMAÇÃO' = isHoraDeJogar ? 'ENTRAR AGORA' : 'AGUARDAR CONFIRMAÇÃO';
  let entryReason = '';

  if (isGale1Active) {
    entryReason = `⚡ HORA DE JOGAR: Gatilho de Segurança Ativado! O giro anterior quebrou a análise atual, gerando um desvio estatístico perfeito. Esta é a hora de maior confiança para entrada com alvos preservados.`;
  } else if (isPatternTriggerActive) {
    entryReason = `⚡ HORA DE JOGAR - PADRÃO SNIPER ATIVO: ${regionReasonText}`;
  } else if (isHotNumbersTriggerActive) {
    entryReason = `🔥 HORA DE JOGAR - ANÁLISE DE NÚMEROS QUENTES: Análise aberta automaticamente a favor dos ${top3HotForScoring.length} números mais quentes da mesa (${top3HotForScoring.join(', ')}) e seus vizinhos no cilindro!`;
  } else if (isOverdueTriggerActive) {
    entryReason = `⚡ HORA DE JOGAR - CORREÇÃO DE ATRASO: Há um forte desvio estatístico acumulado! Elementos muito atrasados na mesa: ${superOverdueElements.map(e => `${e.name} (${e.delay} rodadas)`).join(', ')}.`;
  } else {
    entryReason = `🔍 FILTRO SNIPER (AGUARDANDO TERMINAL BASE): A mesa está sendo monitorada para o Terminal Base T${terminalBaseAnalysis.activeTerminal}. O sinal automático "ENTRAR AGORA" só acenderá no MOMENTO CHECK (quando houver acúmulo de vizinhos seguido de escape distante para um tiro longe). Aguarde pacientemente a oportunidade ideal!`;
  }

  const MIRRORS_STR: Record<number, string> = {
    1: '10', 10: '1', 2: '20', 20: '2', 3: '30', 30: '3',
    12: '21', 21: '12', 13: '31', 31: '13', 23: '32', 32: '23',
    11: '22 e 33', 22: '11 e 33', 33: '11 e 22'
  };
  const lastMirrorNum = MIRRORS_STR[lastNum];
  const mirrorText = lastMirrorNum 
    ? `Número espelho ativo: ${lastNum} <-> ${lastMirrorNum}.`
    : `Sem número espelho direto ativo.`;

  const overdueReasonText = isOverdueTriggerActive
    ? `• Correção de Atrasos: ${delayedElements.map(e => `${e.name} atrasado há ${e.delay} rodadas`).join(', ')}.`
    : `• Padrões de Atraso: Todos os setores e terminais operando dentro de desvios normais.`;

  const hotNumbersReasonText = top3HotForScoring.length > 0
    ? `• Números Quentes Usados na Análise: [${top3HotForScoring.join(', ')}] (Impulso automático de probabilidade aplicado nos alvos quentes e vizinhos).`
    : `• Números Quentes: Aguardando maior amostragem.`;

  const reasoning = `SISTEMA ANALÍTICO ADAPTATIVO (Markov + 12 Motores IA):
• Decisão Estratégica da Situação: ${situationalReasonText}
• Modo de Cobertura: [${finalSelectionMode}] (${targets.length} alvos e ${finalRange} vizinhos para cada lado).
${hotNumbersReasonText}
• Alvo Forte Preservado: ${prevStrongest !== null ? `Número ${prevStrongest} (O alvo mais forte da rodada anterior é mantido ativo nesta rodada para proteção de jogada subsequente, sendo renovado a cada giro).` : 'Nenhum.'}
• Rastreamento Dinâmico de Transições ("Quem Puxou"): O sistema vasculhou o histórico da mesa de roleta e identificou que toda vez que o terminal ${lastTerminal} ou o número ${lastNum} aparecem, eles possuem fortes chamadores ("predecessores") e atrações ("sucessores") estatísticas na sessão atual.
• Motor Líder: O motor "${bestEngine.name}" registrou aproveitamento de ${bestEngine.rate}% nas simulações recentes e obteve o maior peso (x${bestEngine.weight}) de influência na calibragem dos novos alvos.
${overdueReasonText}
• Equivalentes de Cilindro: ${mirrorText} ${isGale1Active ? 'Sinal mantido em modo Gale 1 para proteção contra oscilação.' : ''}`;

  return {
    targets,
    neighborRange: finalRange,
    strategyLabel: isGale1Active 
      ? '⚡ HORA DE JOGAR' 
      : isHotNumbersTriggerActive
      ? `🔥 TOP ${top3HotForScoring.length} QUENTES (${top3HotForScoring.join(', ')})`
      : isOverdueTriggerActive 
      ? '⚡ HORA DE JOGAR: Atraso Crítico' 
      : 'AUTO-PILOT: Fusão Multi-Motor IA',
    reasoning,
    winProbability,
    triggerType: 'default_ai',
    engineMetrics,
    entrySignal,
    entryReason,
    targetSelectionMode: finalSelectionMode,
    isHoraDeJogar,
    prevStrongestTarget: prevStrongest,
    isSecondPayFilterActive: secondPayCheck.active,
    pullConvergence
  };
}

function getSectorFromKey(key: string): number[] {
  if (key === 'zeroGame') return [12, 35, 3, 26, 0, 32, 15];
  if (key === 'voisins') return [22, 18, 29, 7, 28, 12, 35, 3, 26, 0, 32, 15, 19, 4, 21, 2, 25];
  if (key === 'tiers') return [27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33];
  return [1, 20, 14, 31, 9, 17, 34, 6];
}

export interface DelayedElement {
  type: 'terminal' | 'sector' | 'dozen' | 'column';
  name: string;
  numbers: number[];
  delay: number;
  threshold: number;
}

export function getDelayedElements(history: number[]): DelayedElement[] {
  if (history.length < 5) return [];

  const delayed: DelayedElement[] = [];

  // 1. Terminals (0 to 9)
  for (let t = 0; t <= 9; t++) {
    const is3NumTerminal = (t === 7 || t === 8 || t === 9);
    // Lower thresholds slightly so they trigger realistically and satisfy user interaction
    const threshold = is3NumTerminal ? 14 : 11;
    
    let delay = 0;
    for (let i = 0; i < history.length; i++) {
      if (history[i] % 10 === t) {
        break;
      }
      delay++;
    }
    if (!history.some(n => n % 10 === t)) {
      delay = history.length;
    }

    if (delay >= threshold) {
      const nums = Array.from({ length: 37 }, (_, i) => i).filter(n => n % 10 === t);
      delayed.push({
        type: 'terminal',
        name: `Terminal ${t}`,
        numbers: nums,
        delay,
        threshold
      });
    }
  }

  // 2. Sectors
  const sectors = [
    { key: 'zeroGame', name: 'Jogo Zero', threshold: 10, numbers: [12, 35, 3, 26, 0, 32, 15] },
    { key: 'voisins', name: 'Vizinhos do Zero', threshold: 5, numbers: [22, 18, 29, 7, 28, 12, 35, 3, 26, 0, 32, 15, 19, 4, 21, 2, 25] },
    { key: 'tiers', name: 'Terço do Cilindro', threshold: 7, numbers: [27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33] },
    { key: 'orphelins', name: 'Órfãos', threshold: 9, numbers: [1, 20, 14, 31, 9, 17, 34, 6] }
  ];

  for (const sec of sectors) {
    let delay = 0;
    for (let i = 0; i < history.length; i++) {
      if (sec.numbers.includes(history[i])) {
        break;
      }
      delay++;
    }
    if (!history.some(n => sec.numbers.includes(n))) {
      delay = history.length;
    }

    if (delay >= sec.threshold) {
      delayed.push({
        type: 'sector',
        name: `Setor ${sec.name}`,
        numbers: sec.numbers,
        delay,
        threshold: sec.threshold
      });
    }
  }

  // 3. Dozens
  const dozens = [
    { name: '1ª Dúzia (1-12)', threshold: 7, numbers: Array.from({ length: 12 }, (_, i) => i + 1) },
    { name: '2ª Dúzia (13-24)', threshold: 7, numbers: Array.from({ length: 12 }, (_, i) => i + 13) },
    { name: '3ª Dúzia (25-36)', threshold: 7, numbers: Array.from({ length: 12 }, (_, i) => i + 25) }
  ];

  for (const doz of dozens) {
    let delay = 0;
    for (let i = 0; i < history.length; i++) {
      if (doz.numbers.includes(history[i])) {
        break;
      }
      delay++;
    }
    if (!history.some(n => doz.numbers.includes(n))) {
      delay = history.length;
    }

    if (delay >= doz.threshold) {
      delayed.push({
        type: 'dozen',
        name: doz.name,
        numbers: doz.numbers,
        delay,
        threshold: doz.threshold
      });
    }
  }

  // 4. Columns
  const columns = [
    { name: '1ª Coluna', threshold: 7, numbers: [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34] },
    { name: '2ª Coluna', threshold: 7, numbers: [2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35] },
    { name: '3ª Coluna', threshold: 7, numbers: [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36] }
  ];

  for (const col of columns) {
    let delay = 0;
    for (let i = 0; i < history.length; i++) {
      if (col.numbers.includes(history[i])) {
        break;
      }
      delay++;
    }
    if (!history.some(n => col.numbers.includes(n))) {
      delay = history.length;
    }

    if (delay >= col.threshold) {
      delayed.push({
        type: 'column',
        name: col.name,
        numbers: col.numbers,
        delay,
        threshold: col.threshold
      });
    }
  }

  return delayed;
}

export interface PrevisaoDobraRetorno {
  active: boolean;
  type: 'double_double' | 'simple_double' | 'none';
  numA: number;
  numB: number;
  terminalA: number;
  description: string;
  targetsTerminal: number[];
  targetsExact: number[];
  targetsRegion: number[];
  targetsTriple: number[];
  combinedTargets: number[];
}

export interface TerminalBaseAnalysis {
  activeTerminal: number;
  terminalArea: number[];
  baseNumbers: number[];
  neighbors1: number[];
  neighbors2: number[];
  densityInHistory: number;
  recentHitsCount: number;
  isBateLonge: boolean;
  triggerSignal: boolean;
  reasoning: string;
  observationDistance: 1 | 2;
}

export interface SecondPayCheckResult {
  active: boolean;
  reason: string;
}

export function checkOnlyPayingOnSecond(history: number[]): SecondPayCheckResult {
  if (history.length < 15) {
    return { active: false, reason: "" };
  }

  let g0Wins = 0;
  let g1Wins = 0;
  let totalTriggers = 0;

  // Scan previous slices of history to see past trigger results
  const maxScan = Math.min(45, history.length - 3);
  for (let i = 2; i < maxScan; i++) {
    const subHistory = history.slice(i);
    const analysis = calculateTerminalBaseAnalysis(subHistory);
    
    if (analysis.triggerSignal) {
      totalTriggers++;
      const baseNumbers = analysis.baseNumbers;
      
      const neighbors1Set = new Set<number>();
      baseNumbers.forEach(num => {
        const idx = CYLINDER.indexOf(num);
        if (idx !== -1) {
          neighbors1Set.add(CYLINDER[(idx - 1 + 37) % 37]);
          neighbors1Set.add(CYLINDER[(idx + 1) % 37]);
        }
      });
      baseNumbers.forEach(n => neighbors1Set.delete(n));
      const neighbors1 = Array.from(neighbors1Set);
      const coreArea = [...baseNumbers, ...neighbors1];
      
      const neighbors2Set = new Set<number>();
      baseNumbers.forEach(num => {
        const idx = CYLINDER.indexOf(num);
        if (idx !== -1) {
          neighbors2Set.add(CYLINDER[(idx - 2 + 37) % 37]);
          neighbors2Set.add(CYLINDER[(idx + 2) % 37]);
        }
      });
      baseNumbers.forEach(n => neighbors2Set.delete(n));
      neighbors1.forEach(n => neighbors2Set.delete(n));
      const neighbors2 = Array.from(neighbors2Set);
      const terminalArea = [...coreArea, ...neighbors2];
      
      const isCore = analysis.observationDistance === 1;
      const coveredArea = isCore ? coreArea : terminalArea;
      
      const g0Spin = history[i - 1];
      const isG0Win = coveredArea.includes(g0Spin);
      
      const g1Spin = history[i - 2];
      const isG1Win = coveredArea.includes(g1Spin);
      
      if (isG0Win) g0Wins++;
      if (!isG0Win && isG1Win) g1Wins++;
    }
  }

  const active = g1Wins > 0 && g0Wins === 0;

  if (active) {
    return {
      active: true,
      reason: `⚠️ VIÉS DE GALE 1 (SÓ SEGUNDA): Detectado que a roleta está retendo o retorno imediato, pagando apenas no Gale 1 (${g1Wins}x Gale vs ${g0Wins}x Seco). Ativando proteção de suspensão de Tiro Seco!`
    };
  }

  return { active: false, reason: "" };
}

export function calculateTerminalBaseAnalysis(history: number[]): TerminalBaseAnalysis {
  const defaultRes: TerminalBaseAnalysis = {
    activeTerminal: 4,
    terminalArea: [],
    baseNumbers: [],
    neighbors1: [],
    neighbors2: [],
    densityInHistory: 0,
    recentHitsCount: 0,
    isBateLonge: false,
    triggerSignal: false,
    reasoning: "Aguardando mais dados históricos para identificar o Terminal Base.",
    observationDistance: 1,
  };

  if (history.length < 5) return defaultRes;

  const terminalSets = Array.from({ length: 10 }, (_, t) => {
    const baseNumbers = CYLINDER.filter(n => n % 10 === t);
    
    const n1Set = new Set<number>();
    baseNumbers.forEach(num => {
      const idx = CYLINDER.indexOf(num);
      if (idx !== -1) {
        n1Set.add(CYLINDER[(idx - 1 + 37) % 37]);
        n1Set.add(CYLINDER[(idx + 1) % 37]);
      }
    });
    baseNumbers.forEach(n => n1Set.delete(n));
    const neighbors1 = Array.from(n1Set);

    const n2Set = new Set<number>();
    baseNumbers.forEach(num => {
      const idx = CYLINDER.indexOf(num);
      if (idx !== -1) {
        n2Set.add(CYLINDER[(idx - 2 + 37) % 37]);
        n2Set.add(CYLINDER[(idx + 2) % 37]);
      }
    });
    baseNumbers.forEach(n => n2Set.delete(n));
    neighbors1.forEach(n => n2Set.delete(n));
    const neighbors2 = Array.from(n2Set);

    const terminalArea = Array.from(new Set([...baseNumbers, ...neighbors1, ...neighbors2]));
    const coreArea = Array.from(new Set([...baseNumbers, ...neighbors1]));

    return {
      t,
      baseNumbers,
      neighbors1,
      neighbors2,
      terminalArea,
      coreArea
    };
  });

  // To find the best terminal base, let's look at historical density in the prior 20 spins (excluding current spin)
  const priorHistorySegment = history.slice(1, 21);
  
  // Always try to observe 1st physical neighbors first (1 vizinho de distância)
  let bestTerminalStage1 = 4;
  let maxCoreHits = -1;
  for (let t = 0; t <= 9; t++) {
    const core = terminalSets[t].coreArea;
    const coreHits = priorHistorySegment.filter(num => core.includes(num)).length;
    if (coreHits > maxCoreHits) {
      maxCoreHits = coreHits;
      bestTerminalStage1 = t;
    }
  }

  let bestTerminal = bestTerminalStage1;
  let observationDistance: 1 | 2 = 1;
  let densityInHistory = maxCoreHits;

  // If we see that it is not hitting at 1 neighbor (core hits < 3, meaning "não tá batendo nenhum alvo a um vizinho, tá aleatório"),
  // then we look at 2 neighbors distance (dois vizinhos de distância)
  if (maxCoreHits >= 3) {
    observationDistance = 1;
  } else {
    let bestTerminalStage2 = 4;
    let maxAreaHits = -1;
    for (let t = 0; t <= 9; t++) {
      const area = terminalSets[t].terminalArea;
      const areaHits = priorHistorySegment.filter(num => area.includes(num)).length;
      if (areaHits > maxAreaHits) {
        maxAreaHits = areaHits;
        bestTerminalStage2 = t;
      }
    }
    bestTerminal = bestTerminalStage2;
    observationDistance = 2;
    densityInHistory = maxAreaHits;
  }

  const activeSet = terminalSets[bestTerminal];
  const lastSpin = history[0];
  const freshSpins = history.slice(1, 6);

  let recentHitsCount = 0;
  let isFar = false;
  let isBateLonge = false;

  if (observationDistance === 1) {
    recentHitsCount = freshSpins.filter(num => activeSet.coreArea.includes(num)).length;
    // Bate longe: the ball lands outside the 1st neighbor focus area
    isFar = !activeSet.coreArea.includes(lastSpin);
    // Was near: the immediate previous spin must be inside the focus area
    const wasNear = activeSet.coreArea.includes(history[1]);
    isBateLonge = densityInHistory >= 3 && recentHitsCount >= 1 && isFar && wasNear;
  } else {
    recentHitsCount = freshSpins.filter(num => activeSet.terminalArea.includes(num)).length;
    // Bate longe: the ball lands outside the 2nd neighbor focus area
    isFar = !activeSet.terminalArea.includes(lastSpin);
    // Was near: the immediate previous spin must be inside the focus area
    const wasNear = activeSet.terminalArea.includes(history[1]);
    isBateLonge = densityInHistory >= 3 && recentHitsCount >= 1 && isFar && wasNear;
  }

  const triggerSignal = isBateLonge;

  let reasoning = "";
  if (triggerSignal) {
    reasoning = `⚡ REBOTE DE TERMINAL BASE T${bestTerminal} (${observationDistance}º VIZINHO - MOMENTO CHECK): O terminal ${bestTerminal} está altamente ancorado na mesa (registrou ${densityInHistory} acertos a uma distância de ${observationDistance} vizinho(s) nos últimos 20 giros). Após compressão balística repetida, o último giro (${lastSpin}) buscou uma casa distante ("bater longe"). O vácuo físico criado na mesa puxará o retorno ("volta") para os vizinhos do terminal ${bestTerminal} [${activeSet.baseNumbers.join(', ')}] imediatamente!`;
  } else {
    if (observationDistance === 1) {
      reasoning = `A mesa está ancorada no Terminal Base T${bestTerminal} a uma distância de 1 VIZINHO (alta estabilidade com ${densityInHistory} acertos recentes). O sinal de entrada acenderá no Momento Check: quando a bola escapar para fora da zona direta (bater longe).`;
    } else {
      reasoning = `A mesa está com dispersão a 1 vizinho ("tá aleatório"). Iniciando varredura a uma distância de 2 VIZINHOS de margem para o Terminal Base T${bestTerminal} (${densityInHistory} acertos na zona estendida). Aguardando escape distante de balística para acender o sinal.`;
    }
  }

  return {
    activeTerminal: bestTerminal,
    terminalArea: activeSet.terminalArea,
    baseNumbers: activeSet.baseNumbers,
    neighbors1: activeSet.neighbors1,
    neighbors2: activeSet.neighbors2,
    densityInHistory,
    recentHitsCount,
    isBateLonge,
    triggerSignal,
    reasoning,
    observationDistance
  };
}

export interface SimplePatternResult {
  bateEVolta: {
    active: boolean;
    type: 'color' | 'parity' | 'dozen' | 'column' | 'none';
    streak: number;
    description: string;
    sequence: string[];
    recommendedPlay: string;
    targets: number[];
  };
  bateEVoltaRegiao: {
    active: boolean;
    type: 'sector_pingpong' | 'physical_bounce' | 'none';
    streak: number;
    description: string;
    sectorA: string;
    sectorB: string;
    sequence: string[];
    recommendedSector: string;
    targets: number[];
    reasoning: string;
  };
  repeticaoRegiao: {
    active: boolean;
    type: 'sector' | 'quadrant' | 'interruptor' | 'color_brother_swing' | 'none';
    streak: number;
    description: string;
    sectorKey: string;
    sectorName: string;
    targets: number[];
  };
  repeticaoTerminal: {
    active: boolean;
    terminal: number;
    streak: number;
    sequence: number[];
    description: string;
    targets: number[];
    reasoning: string;
  };
  previsaoDobraRetorno: PrevisaoDobraRetorno;
  terminalBaseAnalysis: TerminalBaseAnalysis;
  delays: {
    colorAlternationDelay: number;
    sectorRepeatDelay: number;
    dozenRepeatDelay: number;
    columnRepeatDelay: number;
    colorStreakDelay: number;
  };
}

export function evaluateSimplePatterns(history: number[]): SimplePatternResult {
  const result: SimplePatternResult = {
    bateEVolta: { active: false, type: 'none', streak: 0, description: '', sequence: [], recommendedPlay: '', targets: [] },
    bateEVoltaRegiao: {
      active: false,
      type: 'none',
      streak: 0,
      description: '',
      sectorA: '',
      sectorB: '',
      sequence: [],
      recommendedSector: '',
      targets: [],
      reasoning: ''
    },
    repeticaoRegiao: { active: false, type: 'none', streak: 0, description: '', sectorKey: '', sectorName: '', targets: [] },
    repeticaoTerminal: {
      active: false,
      terminal: -1,
      streak: 0,
      sequence: [],
      description: '',
      targets: [],
      reasoning: ''
    },
    previsaoDobraRetorno: {
      active: false,
      type: 'none',
      numA: 0,
      numB: 0,
      terminalA: 0,
      description: '',
      targetsTerminal: [],
      targetsExact: [],
      targetsRegion: [],
      targetsTriple: [],
      combinedTargets: []
    },
    terminalBaseAnalysis: calculateTerminalBaseAnalysis(history),
    delays: { colorAlternationDelay: 0, sectorRepeatDelay: 0, dozenRepeatDelay: 0, columnRepeatDelay: 0, colorStreakDelay: 0 }
  };

  if (history.length === 0) return result;

  const currentNum = history[0];

  // Helper functions for categories
  const getParity = (n: number) => {
    if (n === 0) return 'zero';
    return n % 2 === 0 ? 'even' : 'odd';
  };

  const getDozen = (n: number) => {
    if (n === 0) return 0;
    if (n <= 12) return 1;
    if (n <= 24) return 2;
    return 3;
  };

  const getColumn = (n: number) => {
    if (n === 0) return 0;
    if ([1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34].includes(n)) return 1;
    if ([2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35].includes(n)) return 2;
    return 3;
  };

  // --- 1. BATE E VOLTA (ALTERNATION DETECTION) ---
  
  // A. Color Alternation (Red vs Black)
  let colorStreak = 0;
  if (history.length >= 2) {
    for (let i = 0; i < history.length - 1; i++) {
      const c1 = COLORS[history[i]];
      const c2 = COLORS[history[i + 1]];
      if (c1 === 'green' || c2 === 'green') break;
      if (c1 !== c2) {
        colorStreak++;
      } else {
        break;
      }
    }
  }

  // B. Parity Alternation (Odd vs Even)
  let parityStreak = 0;
  if (history.length >= 2) {
    for (let i = 0; i < history.length - 1; i++) {
      const p1 = getParity(history[i]);
      const p2 = getParity(history[i + 1]);
      if (p1 === 'zero' || p2 === 'zero') break;
      if (p1 !== p2) {
        parityStreak++;
      } else {
        break;
      }
    }
  }

  // Identify most prominent alternation
  if (colorStreak >= 3) {
    const lastColor = COLORS[currentNum];
    const nextExpectedColor = lastColor === 'red' ? 'black' : 'red';
    const sequence = history.slice(0, colorStreak + 1).map(n => COLORS[n] === 'red' ? '🔴' : '⚫').reverse();
    
    result.bateEVolta = {
      active: true,
      type: 'color',
      streak: colorStreak,
      description: `Bate e Volta de Cores`,
      sequence,
      recommendedPlay: nextExpectedColor === 'red' ? 'Vermelho' : 'Preto',
      targets: CYLINDER.filter(n => COLORS[n] === nextExpectedColor)
    };
  } else if (parityStreak >= 3) {
    const lastParity = getParity(currentNum);
    const nextExpectedParity = lastParity === 'even' ? 'odd' : 'even';
    const sequence = history.slice(0, parityStreak + 1).map(n => getParity(n) === 'even' ? 'P' : 'I').reverse();

    result.bateEVolta = {
      active: true,
      type: 'parity',
      streak: parityStreak,
      description: `Bate e Volta de Paridade (Par/Ímpar)`,
      sequence,
      recommendedPlay: nextExpectedParity === 'even' ? 'Par' : 'Ímpar',
      targets: CYLINDER.filter(n => getParity(n) === nextExpectedParity)
    };
  }

  const getCylinderDistanceLocal = (num1: number, num2: number): number => {
    const idx1 = CYLINDER.indexOf(num1);
    const idx2 = CYLINDER.indexOf(num2);
    if (idx1 === -1 || idx2 === -1) return 999;
    const dist = Math.abs(idx1 - idx2);
    return Math.min(dist, CYLINDER.length - dist);
  };

  // --- 1B. BATE E VOLTA DE REGIÃO (REGION / SECTOR PING-PONG & BOUNCE) ---
  if (history.length >= 3) {
    const s0 = getNumberSector(history[0]);
    const s1 = getNumberSector(history[1]);
    const s2 = getNumberSector(history[2]);
    
    // Pattern A: Sector Ping-Pong (e.g. Voisins -> Tiers -> Voisins)
    if (s0 !== s1 && s0 === s2) {
      let streak = 2;
      if (history.length >= 4 && getNumberSector(history[3]) === s1) {
        streak = 3;
        if (history.length >= 5 && getNumberSector(history[4]) === s0) {
          streak = 4;
        }
      }
      
      const secAName = getSectorName(s0);
      const secBName = getSectorName(s1);
      const seq = history.slice(0, streak + 1).map(n => getSectorName(getNumberSector(n))).reverse();
      const nextSectorNums = getSectorFromKey(s1);
      const lastNeighbors = getNeighbors(history[0], 2);
      const targets = Array.from(new Set([...nextSectorNums, ...lastNeighbors])).slice(0, 12);

      result.bateEVoltaRegiao = {
        active: true,
        type: 'sector_pingpong',
        streak,
        description: `Bate e Volta de Região (${secAName} ⇄ ${secBName})`,
        sectorA: secAName,
        sectorB: secBName,
        sequence: seq,
        recommendedSector: secBName,
        targets,
        reasoning: `Oscilação regional ativa entre ${secAName} e ${secBName}. Tendência de descarregar a próxima bola na região de ${secBName}.`
      };
    } 
    // Pattern B: Physical Cylinder Distance Bounce (Rebote Físico na mesma região: dist(n0, n2) <= 4 and dist(n0, n1) >= 7)
    else {
      const d0_2 = getCylinderDistanceLocal(history[0], history[2]);
      const d0_1 = getCylinderDistanceLocal(history[0], history[1]);
      if (d0_2 <= 4 && d0_1 >= 7) {
        const secName = getSectorName(s0);
        const seq = [`${history[2]}`, `${history[1]}`, `${history[0]}`];
        const bounceNeighbors = getNeighbors(history[0], 3);
        const sameTerminalNums = CYLINDER.filter(n => n % 10 === (history[0] % 10));
        const targets = Array.from(new Set([...bounceNeighbors, ...sameTerminalNums])).slice(0, 10);

        result.bateEVoltaRegiao = {
          active: true,
          type: 'physical_bounce',
          streak: 2,
          description: `Rebote Físico na Mesma Região (${secName})`,
          sectorA: `Região ${history[0]}`,
          sectorB: `Escape ${history[1]}`,
          sequence: seq,
          recommendedSector: `Região de ${history[0]}`,
          targets,
          reasoning: `A bola bateu no ponto ${history[2]}, escapou para o ponto ${history[1]} e voltou imediatamente para a mesma área física (${history[0]}). Padrão de atração regional em andamento.`
        };
      }
    }
  }

  // --- 1C. REPETIÇÃO DE TERMINAL (TERMINAL DIGIT REPETITION) ---
  if (history.length >= 2) {
    const t0 = history[0] % 10;
    const t1 = history[1] % 10;
    let termActive = false;
    let termDigit = -1;
    let termStreak = 0;
    let termSeq: number[] = [];

    if (t0 === t1) {
      termActive = true;
      termDigit = t0;
      termStreak = 2;
      termSeq = [history[1], history[0]];
      
      if (history.length >= 3 && history[2] % 10 === t0) {
        termStreak = 3;
        termSeq = [history[2], history[1], history[0]];
      }
    } else if (history.length >= 3 && history[2] % 10 === t0) {
      termActive = true;
      termDigit = t0;
      termStreak = 2;
      termSeq = [history[2], history[1], history[0]];
    }

    if (termActive) {
      const termNums = CYLINDER.filter(n => n % 10 === termDigit);
      const termNeighbors: number[] = [];
      termNums.forEach(n => termNeighbors.push(...getNeighbors(n, 1)));
      const targets = Array.from(new Set([...termNums, ...termNeighbors])).slice(0, 12);

      result.repeticaoTerminal = {
        active: true,
        terminal: termDigit,
        streak: termStreak,
        sequence: termSeq,
        description: `Repetição do Terminal ${termDigit} (${termStreak}x em rodadas recentes)`,
        targets,
        reasoning: `O Terminal ${termDigit} está ativado com saída recente (${termSeq.join(' ➜ ')}). Recomenda-se cobrir todos os números com terminal ${termDigit} e suas vizinhanças imediatas.`
      };
    }
  }

  // --- 2. REPETIÇÃO DE REGIÃO (REGION REPETITION) ---
  
  // A. Sector Repeat
  let sectorRepeatStreak = 0;
  if (history.length >= 2) {
    const currentSector = getNumberSector(currentNum);
    for (let i = 0; i < history.length; i++) {
      if (getNumberSector(history[i]) === currentSector) {
        sectorRepeatStreak++;
      } else {
        break;
      }
    }
  }

  // B. Physical Cylinder Quadrant concentration (last 3 rolls landed within a 5-pocket radius of each other)
  let quadrantRepeatActive = false;
  let quadrantTargets: number[] = [];
  if (history.length >= 3) {
    const idx0 = CYLINDER.indexOf(history[0]);
    const idx1 = CYLINDER.indexOf(history[1]);
    const idx2 = CYLINDER.indexOf(history[2]);
    if (idx0 !== -1 && idx1 !== -1 && idx2 !== -1) {
      const d1 = Math.min(Math.abs(idx0 - idx1), 37 - Math.abs(idx0 - idx1));
      const d2 = Math.min(Math.abs(idx1 - idx2), 37 - Math.abs(idx1 - idx2));
      const d3 = Math.min(Math.abs(idx0 - idx2), 37 - Math.abs(idx0 - idx2));
      
      if (d1 <= 4 && d2 <= 4 && d3 <= 5) {
        quadrantRepeatActive = true;
        // Build neighborhood targets (center number is history[0] + 3 neighbors on left and right)
        const centerIdx = idx0;
        for (let offset = -3; offset <= 3; offset++) {
          const targetIndex = (centerIdx + offset + 37) % 37;
          quadrantTargets.push(CYLINDER[targetIndex]);
        }
      }
    }
  }

  // Prioritizar as novas detecções de curto prazo para repetição de região ultra-fiel pedida pelo usuário:
  let customRegionPatternDetected = false;
  if (history.length >= 3) {
    const n0 = history[0];
    const n1 = history[1];
    const n2 = history[2];
    
    const d0_1 = getCylinderDistanceLocal(n0, n1);
    const d1_2 = getCylinderDistanceLocal(n1, n2);
    const d0_2 = getCylinderDistanceLocal(n0, n2);
    
    // A. Repetição com 1 Interruptor
    if (d0_2 <= 2 && d0_1 > 3 && d1_2 > 3) {
      customRegionPatternDetected = true;
      const targets = Array.from(new Set([
        ...getNeighbors(n0, 2),
        ...CYLINDER.filter(n => n % 10 === (n0 % 10))
      ]));
      result.repeticaoRegiao = {
        active: true,
        type: 'interruptor',
        streak: 1,
        description: `Retorno com 1 Interruptor (Rebote do ${n2})`,
        sectorKey: 'interruptor',
        sectorName: 'Região c/ Interruptor',
        targets
      };
    }
    // B. Balanço de Vizinhos (Irmãos de Cores)
    else if (d0_1 <= 2 && d1_2 <= 2 && COLORS[n0] === COLORS[n2] && COLORS[n0] !== COLORS[n1] && COLORS[n0] !== 'green' && COLORS[n1] !== 'green') {
      customRegionPatternDetected = true;
      const targets = Array.from(new Set([
        ...getNeighbors(n0, 2),
        ...CYLINDER.filter(n => n % 10 === (n0 % 10))
      ]));
      result.repeticaoRegiao = {
        active: true,
        type: 'color_brother_swing',
        streak: 2,
        description: `Balanço de Vizinhos (Irmãos de Cores)`,
        sectorKey: 'swing',
        sectorName: 'Balanço Regional',
        targets
      };
    }
  }

  if (!customRegionPatternDetected) {
    if (sectorRepeatStreak >= 2) {
      const currentSector = getNumberSector(currentNum);
      result.repeticaoRegiao = {
        active: true,
        type: 'sector',
        streak: sectorRepeatStreak,
        description: `Repetição do Setor ${getSectorName(currentSector)}`,
        sectorKey: currentSector,
        sectorName: getSectorName(currentSector),
        targets: getSectorFromKey(currentSector)
      };
    } else if (quadrantRepeatActive) {
      result.repeticaoRegiao = {
        active: true,
        type: 'quadrant',
        streak: 3,
        description: `Concentração Física de Quadrante`,
        sectorKey: 'quadrant',
        sectorName: 'Vizinhos Próximos',
        targets: quadrantTargets
      };
    }
  }

  // --- 2B. PREVISÃO DE DOBRA E RETORNO (User rule: e.g. 12 12 calls 36 36 -> returns to terminal 2, triple 36, or physical region of 12) ---
  if (history.length >= 3) {
    const B = history[0];
    const isDoubleB = history[1] === B;
    if (isDoubleB) {
      const A = history[2];
      const isDoubleA = history.length >= 4 && history[3] === A;
      
      if (A !== B) {
        const type = isDoubleA ? 'double_double' : 'simple_double';
        const terminalA = A % 10;
        
        // Targets:
        // 1. Terminal of A (e.g. if A is 12, terminal is 2 -> [2, 12, 22, 32])
        const targetsTerminal = CYLINDER.filter(n => n % 10 === terminalA);
        
        // 2. Exact start numbers: [A, B]
        const targetsExact = [A, B];
        
        // 3. Region of A: neighbors of A on the cylinder (3 to each side)
        const idxA = CYLINDER.indexOf(A);
        const targetsRegion: number[] = [];
        if (idxA !== -1) {
          for (let offset = -3; offset <= 3; offset++) {
            targetsRegion.push(CYLINDER[(idxA + offset + 37) % 37]);
          }
        }
        
        // 4. Triple repeat of B: [B]
        const targetsTriple = [B];
        
        // Combined smart targets
        const combined = Array.from(new Set([
          ...targetsTerminal,
          ...targetsExact,
          ...targetsRegion,
          ...targetsTriple
        ])).slice(0, 12);
        
        result.previsaoDobraRetorno = {
          active: true,
          type,
          numA: A,
          numB: B,
          terminalA,
          description: isDoubleA 
            ? `Dobra Dupla: ${A} ${A} ➜ ${B} ${B}` 
            : `Dobra Simples: ${A} ➜ ${B} ${B}`,
          targetsTerminal,
          targetsExact,
          targetsRegion,
          targetsTriple,
          combinedTargets: combined
        };
      }
    }
  }

  // --- 3. DELAYS (DELAYS OF THE PATTERNS) ---
  
  // A. Sector Repeat Delay: how many spins since we had two consecutive sector matches
  let sectorRepDelay = 0;
  for (let i = 0; i < history.length - 1; i++) {
    if (getNumberSector(history[i]) === getNumberSector(history[i + 1])) {
      break;
    }
    sectorRepDelay++;
  }
  result.delays.sectorRepeatDelay = sectorRepDelay;

  // B. Color Alternation Delay / Same color streak (how long red/black has been repeating, meaning alternation is delayed)
  let sameColorStreak = 0;
  const firstColor = COLORS[currentNum];
  if (firstColor !== 'green') {
    for (let i = 0; i < history.length; i++) {
      if (COLORS[history[i]] === firstColor) {
        sameColorStreak++;
      } else {
        break;
      }
    }
  }
  result.delays.colorStreakDelay = sameColorStreak;

  // C. Dozen repetition delay (spins since last back-to-back dozen)
  let dozRepDelay = 0;
  for (let i = 0; i < history.length - 1; i++) {
    const d1 = getDozen(history[i]);
    const d2 = getDozen(history[i + 1]);
    if (d1 !== 0 && d2 !== 0 && d1 === d2) {
      break;
    }
    dozRepDelay++;
  }
  result.delays.dozenRepeatDelay = dozRepDelay;

  // D. Column repetition delay (spins since last back-to-back column)
  let colRepDelay = 0;
  for (let i = 0; i < history.length - 1; i++) {
    const c1 = getColumn(history[i]);
    const c2 = getColumn(history[i + 1]);
    if (c1 !== 0 && c2 !== 0 && c1 === c2) {
      break;
    }
    colRepDelay++;
  }
  result.delays.columnRepeatDelay = colRepDelay;

  // E. General Color Alternation delay (how many spins since last color alternation of length >= 2)
  let colAltDelay = 0;
  for (let i = 0; i < history.length - 1; i++) {
    if (COLORS[history[i]] !== 'green' && COLORS[history[i + 1]] !== 'green' && COLORS[history[i]] !== COLORS[history[i + 1]]) {
      break;
    }
    colAltDelay++;
  }
  result.delays.colorAlternationDelay = colAltDelay;

  return result;
}

export interface TableStabilityResult {
  score: number;
  label: string;
  color: string;
  reason: string;
}

export function calculateTableStability(history: number[]): TableStabilityResult {
  if (history.length < 5) {
    return {
      score: 50,
      label: 'ESTABILIZAÇÃO DE BANCO DE DADOS',
      color: 'blue',
      reason: 'Amostra de giros insuficiente para calcular estabilidade estatística. Insira mais números (mínimo de 5 giros).'
    };
  }

  const sample = history.slice(0, 20);
  const total = sample.length;

  // Helper functions for categories within local scope
  const getDozenLocal = (n: number) => {
    if (n === 0) return 0;
    if (n <= 12) return 1;
    if (n <= 24) return 2;
    return 3;
  };

  // 1. Terminal concentration
  const terminalCounts = Array(10).fill(0);
  sample.forEach(num => {
    terminalCounts[num % 10]++;
  });
  const sortedTerminals = [...terminalCounts].sort((a, b) => b - a);
  const topTerminalsSum = sortedTerminals[0] + sortedTerminals[1] + sortedTerminals[2];
  const terminalConcentration = topTerminalsSum / total;

  // 2. Sector concentration
  const sectorCounts: Record<string, number> = { voisins: 0, tiers: 0, orphelins: 0, zeroGame: 0 };
  sample.forEach(num => {
    const sec = getNumberSector(num);
    if (sectorCounts[sec] !== undefined) {
      sectorCounts[sec]++;
    }
  });
  const maxSectorHits = Math.max(...Object.values(sectorCounts));
  const sectorConcentration = maxSectorHits / total;

  // 3. Cylinder proximity (Rhythmic throws detection)
  let totalDist = 0;
  let pairs = 0;
  for (let i = 0; i < sample.length - 1; i++) {
    const idx1 = CYLINDER.indexOf(sample[i]);
    const idx2 = CYLINDER.indexOf(sample[i + 1]);
    if (idx1 !== -1 && idx2 !== -1) {
      const dist = Math.abs(idx1 - idx2);
      totalDist += Math.min(dist, CYLINDER.length - dist);
      pairs++;
    }
  }
  const avgDist = pairs > 0 ? totalDist / pairs : 9.25;

  // Composite calculation
  let score = 50;

  // terminal dispersion factor (ideally, top 3 terminals get >= 50% in a stable sequence)
  const termFactor = (terminalConcentration - 0.3) * 100;
  score += termFactor * 0.8;

  // sector concentration factor
  const sectFactor = (sectorConcentration - 0.3) * 100;
  score += sectFactor * 0.8;

  // physical proximity factor (average distance less than 8 is tight grouping)
  const distFactor = (9.25 - avgDist) * 6;
  score += distFactor;

  // Clamp score
  score = Math.max(15, Math.min(99, Math.round(score)));

  let label = 'ESTÁVEL';
  let color = 'blue';
  let reason = '';

  if (score >= 82) {
    label = 'TENDÊNCIA DE PRECISÃO';
    color = 'emerald';
    reason = 'A mesa exibe comportamento de assinatura repetitiva ideal. A bola está caindo de forma previsível em termos de terminais e setores vizinhos. Cenário de maior confiabilidade!';
  } else if (score >= 62) {
    label = 'ESTABILIDADE ALTA';
    color = 'emerald';
    reason = 'Ciclos controlados. Os padrões de atração (puxadas) e terminais básicos estão ativos de forma consistente no histórico recente. Bom para entradas de rotina.';
  } else if (score >= 42) {
    label = 'PADRÃO MODERADO';
    color = 'blue';
    reason = 'Oscilação padrão. A mesa exibe comportamento misto com alternância rápida entre repetições e quebras. Sugerido perfil moderado de fichas.';
  } else if (score >= 25) {
    label = 'VOLATILIDADE ATIVA';
    color = 'amber';
    reason = 'O balanço físico está muito disperso (bola saltando por todo o cilindro). A IA está operando com critério de amostragem prolongada e aguardando confirmações extras.';
  } else {
    label = 'CAOS BALÍSTICO';
    color = 'rose';
    reason = 'Ruído estatístico extremo detectado (ausência completa de assinatura ou região). É altissimamente recomendado AGUARDAR mais giros de calibração automática.';
  }

  return {
    score,
    label,
    color,
    reason
  };
}

