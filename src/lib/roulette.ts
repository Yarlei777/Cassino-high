export const CYLINDER = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24,
  16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26,
];

// Standard European Roulette Wheel Sectors
export const SECTORS = {
  voisins: {
    name: 'Voisins du Zéro',
    numbers: [22, 18, 29, 7, 28, 12, 35, 3, 26, 0, 32, 15, 19, 4, 21, 2, 25],
    color: 'from-emerald-500/20 to-emerald-600/10',
  },
  tiers: {
    name: 'Tiers du Cylindre',
    numbers: [27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33],
    color: 'from-blue-500/20 to-blue-600/10',
  },
  orphelins: {
    name: 'Orphelins',
    numbers: [1, 20, 14, 31, 9, 17, 34, 6],
    color: 'from-purple-500/20 to-purple-600/10',
  },
  zeroGame: {
    name: 'Jeu Zéro',
    numbers: [12, 35, 3, 26, 0, 32, 15],
    color: 'from-amber-500/20 to-amber-600/10',
  },
};

export const VARIATIONS: Record<string, number[]> = {
  '1-4-7': [1, 4, 7],
  '2-5-8': [2, 5, 8],
  '3-6-9': [3, 6, 9],
  '2-4-7': [2, 4, 7],
  '1-5-8': [1, 5, 8],
  T0: [0],
};

export function getNeighbors(target: number, range: number = 2): number[] {
  const index = CYLINDER.indexOf(target);
  if (index === -1) return [];

  const neighbors: number[] = [];
  for (let i = -range; i <= range; i++) {
    const circularIndex =
      (index + i + CYLINDER.length) % CYLINDER.length;
    neighbors.push(CYLINDER[circularIndex]);
  }
  return neighbors;
}

export function getTerminal(num: number): number {
  return num % 10;
}

export function getActiveVariations(terminal: number): string[] {
  const active: string[] = [];
  for (const [name, list] of Object.entries(VARIATIONS)) {
    if (list.includes(terminal)) {
      active.push(name);
    }
  }
  return active;
}

export interface StrategyCoverage {
  coveredNumbers: number[];
  percentage: number;
}

export function getStrategyCoverage(targets: number[], range: number): StrategyCoverage {
  const coveredSet = new Set<number>();
  if (!targets || !Array.isArray(targets)) {
    return { coveredNumbers: [], percentage: 0 };
  }
  const validTargets = targets.filter((t) => typeof t === 'number' && !isNaN(t));
  const isTerminal2Camouflage = validTargets.includes(20) && (validTargets.includes(2) || validTargets.includes(12) || validTargets.includes(22) || validTargets.includes(32));
  
  validTargets.forEach((target) => {
    const currentRange = (target === 20 && isTerminal2Camouflage) ? 1 : range;
    const neighbors = getNeighbors(target, currentRange);
    if (Array.isArray(neighbors)) {
      neighbors.forEach((n) => {
        if (typeof n === 'number' && !isNaN(n)) {
          coveredSet.add(n);
        }
      });
    }
  });
  const coveredNumbers = Array.from(coveredSet).sort((a, b) => a - b);
  const percentage = Number(((coveredNumbers.length / 37) * 100).toFixed(1));
  return { coveredNumbers, percentage };
}

export function getNumberSector(num: number): string {
  if (SECTORS.zeroGame.numbers.includes(num)) return 'zeroGame';
  if (SECTORS.voisins.numbers.includes(num)) return 'voisins';
  if (SECTORS.tiers.numbers.includes(num)) return 'tiers';
  return 'orphelins';
}

export function getSectorName(key: string): string {
  return (SECTORS as any)[key]?.name || 'Outro';
}

export function suggestTargets(
  history: number[],
  count: number = 3,
  strategy: 'terminals' | 'frequency' | 'opposite' | 'sectors' | 'signature' | 'manual' | 'default' = 'default'
): number[] {
  if (!history || history.length === 0) {
    // Return high-coverage standard targets if history is empty
    return count === 3 ? [21, 14, 26] : [21, 14, 26, 0];
  }

  if (strategy === 'frequency') {
    // Count frequencies in recent history (last 30 spins) and overall history
    const sample30 = history.slice(0, 30);
    const freqs30: Record<number, number> = {};
    const freqsAll: Record<number, number> = {};
    const delays: Record<number, number> = {};

    for (let i = 0; i <= 36; i++) {
      const idx = history.indexOf(i);
      delays[i] = idx === -1 ? 9999 : idx; // 0 = last spin, 1 = 1 spin ago, 9999 = never hit
    }

    sample30.forEach((num) => {
      if (num >= 0 && num <= 36) {
        freqs30[num] = (freqs30[num] || 0) + 1;
      }
    });

    history.forEach((num) => {
      if (num >= 0 && num <= 36) {
        freqsAll[num] = (freqsAll[num] || 0) + 1;
      }
    });

    const numbers = Array.from({ length: 37 }, (_, i) => i);
    // Sort primarily by recent 30 spins frequency, secondarily by total frequency, thirdly by delay ascending
    numbers.sort((a, b) => {
      const f30A = freqs30[a] || 0;
      const f30B = freqs30[b] || 0;
      if (f30B !== f30A) return f30B - f30A;

      const fAllA = freqsAll[a] || 0;
      const fAllB = freqsAll[b] || 0;
      if (fAllB !== fAllA) return fAllB - fAllA;

      return delays[a] - delays[b];
    });

    return numbers.slice(0, count);
  }

  if (strategy === 'terminals') {
    // Count frequencies of each terminal digit (0-9)
    const termFreqs: Record<number, number> = {};
    history.forEach((num) => {
      const term = getTerminal(num);
      termFreqs[term] = (termFreqs[term] || 0) + 1;
    });

    // Sort terminals by frequency
    const sortedTerminals = Array.from({ length: 10 }, (_, i) => i).sort(
      (a, b) => (termFreqs[b] || 0) - (termFreqs[a] || 0)
    );

    const selectedTargets: number[] = [];
    for (const term of sortedTerminals) {
      const termNumbers = CYLINDER.filter((n) => getTerminal(n) === term);
      
      const individualFreqs: Record<number, number> = {};
      history.forEach((num) => {
        individualFreqs[num] = (individualFreqs[num] || 0) + 1;
      });
      termNumbers.sort((a, b) => (individualFreqs[b] || 0) - (individualFreqs[a] || 0));

      for (const num of termNumbers) {
        if (!selectedTargets.includes(num)) {
          selectedTargets.push(num);
          if (selectedTargets.length === count) return selectedTargets;
        }
      }
    }
    return selectedTargets.slice(0, count);
  }

  if (strategy === 'opposite') {
    // Opposite point of the wheel relative to the last number
    const lastNum = history[0];
    const lastIndex = CYLINDER.indexOf(lastNum);
    if (lastIndex === -1) {
      return count === 3 ? [21, 14, 26] : [21, 14, 26, 0];
    }

    const oppositeIndex = (lastIndex + 18) % CYLINDER.length;
    
    if (count === 3) {
      const indices = [
        oppositeIndex,
        (oppositeIndex - 6 + CYLINDER.length) % CYLINDER.length,
        (oppositeIndex + 6) % CYLINDER.length,
      ];
      return indices.map((idx) => CYLINDER[idx]);
    } else {
      const indices = [
        oppositeIndex,
        (oppositeIndex - 5 + CYLINDER.length) % CYLINDER.length,
        (oppositeIndex + 5) % CYLINDER.length,
        (oppositeIndex - 10 + CYLINDER.length) % CYLINDER.length,
      ];
      return indices.map((idx) => CYLINDER[idx]);
    }
  }

  if (strategy === 'sectors') {
    // Find the hottest wheel sector in recent history
    const sectorHits: Record<string, number> = { voisins: 0, tiers: 0, orphelins: 0, zeroGame: 0 };
    history.slice(0, 15).forEach((num) => {
      const sec = getNumberSector(num);
      sectorHits[sec]++;
    });

    // Find the sector with the most hits
    const hottestSectorKey = Object.keys(sectorHits).reduce((a, b) =>
      sectorHits[a] > sectorHits[b] ? a : b
    );

    const targetList = (SECTORS as any)[hottestSectorKey].numbers;
    // Extract targets from the hottest sector, prioritizing numbers that popped recently or are spaced well
    const targets: number[] = [];
    history.forEach((num) => {
      if (targetList.includes(num) && !targets.includes(num)) {
        targets.push(num);
      }
    });

    // Fill with default numbers from that sector if not enough history
    let idx = 0;
    while (targets.length < count && idx < targetList.length) {
      if (!targets.includes(targetList[idx])) {
        targets.push(targetList[idx]);
      }
      idx++;
    }

    return targets.slice(0, count);
  }

  if (strategy === 'signature') {
    // "Dealer Signature" - measure spacing/intervals of last spins on the wheel
    if (history.length < 3) {
      return count === 3 ? [32, 15, 19] : [32, 15, 19, 4];
    }

    const intervals: number[] = [];
    for (let i = 0; i < Math.min(history.length - 1, 5); i++) {
      const currIdx = CYLINDER.indexOf(history[i]);
      const prevIdx = CYLINDER.indexOf(history[i + 1]);
      if (currIdx !== -1 && prevIdx !== -1) {
        let diff = currIdx - prevIdx;
        if (diff > 18) diff -= 37;
        if (diff < -18) diff += 37;
        intervals.push(diff);
      }
    }

    // Calculate median or average jump interval
    const avgInterval = Math.round(intervals.reduce((a, b) => a + b, 0) / intervals.length);
    const lastWheelIdx = CYLINDER.indexOf(history[0]);
    const predictedIdx = (lastWheelIdx + avgInterval + CYLINDER.length) % CYLINDER.length;

    // Place targets around the predicted index
    if (count === 3) {
      return [
        CYLINDER[predictedIdx],
        CYLINDER[(predictedIdx - 5 + CYLINDER.length) % CYLINDER.length],
        CYLINDER[(predictedIdx + 5) % CYLINDER.length],
      ];
    } else {
      return [
        CYLINDER[predictedIdx],
        CYLINDER[(predictedIdx - 4 + CYLINDER.length) % CYLINDER.length],
        CYLINDER[(predictedIdx + 4) % CYLINDER.length],
        CYLINDER[(predictedIdx - 8 + CYLINDER.length) % CYLINDER.length],
      ];
    }
  }

  // Fallback defaults
  const populars = [0, 32, 15, 19, 4, 21, 26, 14];
  const targets: number[] = [];
  history.slice(0, count).forEach((num) => {
    if (!targets.includes(num)) {
      targets.push(num);
    }
  });

  let popIdx = 0;
  while (targets.length < count && popIdx < populars.length) {
    if (!targets.includes(populars[popIdx])) {
      targets.push(populars[popIdx]);
    }
    popIdx++;
  }

  return targets.slice(0, count);
}

export function getColors(): Record<number, 'red' | 'black' | 'green'> {
  const reds = [
    1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
  ];
  const colors: Record<number, 'red' | 'black' | 'green'> = {};
  
  for (let i = 0; i <= 36; i++) {
    if (i === 0) {
      colors[i] = 'green';
    } else if (reds.includes(i)) {
      colors[i] = 'red';
    } else {
      colors[i] = 'black';
    }
  }
  return colors;
}

export const COLORS = getColors();

/**
 * Calculates yellow numbers (vizinhos directos + preenchimento de buracos de vizinhos)
 * based on main target numbers (alvos principais), to assist in visualizing the gaps/crossings.
 */
export function calcularNumerosAmarelos(alvosPrincipais: number[]): number[] {
  if (!alvosPrincipais || !Array.isArray(alvosPrincipais)) return [];
  
  const todosIluminados = new Set<number>();
  const amarelos = new Set<number>();

  // Etapa 1: Marca o alvo e +1 vizinho de cada lado
  alvosPrincipais.forEach(alvo => {
    const index = CYLINDER.indexOf(alvo);
    if (index === -1) return;
    
    let vizinhoEsquerda = CYLINDER[(index - 1 + 37) % 37];
    let vizinhoDireita = CYLINDER[(index + 1) % 37];
    
    // Cadastra todos no set geral de iluminados
    todosIluminados.add(alvo);
    todosIluminados.add(vizinhoEsquerda);
    todosIluminados.add(vizinhoDireita);

    // Separa quem é apenas vizinho (amarelo)
    amarelos.add(vizinhoEsquerda);
    amarelos.add(vizinhoDireita);
  });

  // Etapa 2: Regra de preencher buracos (Gap fill / cruzamento)
  for (let i = 0; i < CYLINDER.length; i++) {
    const numAtual = CYLINDER[i];
    
    // Se o número atual está apagado...
    if (!todosIluminados.has(numAtual)) {
      const leftNum = CYLINDER[(i - 1 + 37) % 37];
      const rightNum = CYLINDER[(i + 1) % 37];
      
      // ...Mas o da direita e da esquerda estão acesos, ele abraça o número do meio!
      if (todosIluminados.has(leftNum) && todosIluminados.has(rightNum)) {
        amarelos.add(numAtual);
        todosIluminados.add(numAtual);
      }
    }
  }

  // Remove do conjunto amarelo qualquer número que seja o próprio alvo principal
  alvosPrincipais.forEach(alvo => amarelos.delete(alvo));

  // Retorna todos os números que vão acender em amarelo
  return Array.from(amarelos).sort((a, b) => a - b);
}

