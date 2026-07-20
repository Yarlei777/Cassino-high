// Banco de dados empírico e calibração de atração para provedoras de roleta
// Aqui armazenamos as sequências reais enviadas pelo usuário para calcular quais números estatisticamente se puxam em cada provedora.

export interface ProviderDatabase {
  playtech: number[][];
  evolution: number[][];
  pragmatic: number[][];
  winfinit: number[][];
  live_vegas: number[][];
}

// Armazena as sequências brutas enviadas pelo usuário.
// Nota: Os históricos fornecidos pelo usuário vêm na ordem em que o mais recente está na esquerda (índice 0).
// Ao analisar as puxadas cronológicas (quem puxa quem), nós revertemos para que a ordem fique do mais antigo ao mais recente.
export const PROVIDER_SEQUENCES: ProviderDatabase = {
  playtech: [
    // Primeiro histórico enviado da Playtech (19 foi o mais recente, na esquerda)
    [
      19, 11, 7, 10, 27, 20, 28, 20, 23, 4, 9, 17, 30, 23, 21, 10, 15, 12, 9, 26, 22, 11, 19, 34, 18, 8, 4, 18, 28, 5, 4, 19, 6, 13, 36, 4, 26, 2, 7, 35, 25, 3, 10, 1, 19, 31, 14, 30, 11, 35, 36, 16, 2, 19, 22, 24, 5, 10, 31, 15, 19, 23, 6, 35, 33, 7, 12, 22, 16, 0, 8, 33, 12, 34, 4, 3, 18, 13, 19, 15, 7, 31, 29, 32, 10, 13, 29, 7, 1, 28, 6, 17, 5, 7, 15, 3, 33, 32, 32, 14, 4, 4, 21, 6, 18, 14, 4, 2, 15, 14, 30, 15, 3, 7, 13, 26, 4, 31, 24, 17, 14, 6, 25, 32, 34, 24, 30, 24, 22, 2, 29, 27, 12, 33, 1, 11, 36, 10, 31, 9, 33, 8, 24, 20, 3, 7, 17, 31, 34, 21, 31, 27, 35, 35, 24, 28, 34, 11, 31, 19, 22, 36, 6, 13, 19, 20, 21, 5, 33, 12, 6, 29, 18, 13, 24, 13, 6, 3, 35, 5, 33, 11, 28, 14, 33, 21, 6, 22, 16, 30, 34, 10, 0, 0, 9, 21, 4, 11, 29, 27, 30, 22, 6, 20, 33, 14, 28, 15, 0, 19, 6, 29, 35, 33, 22, 20, 1, 24, 17, 29, 19, 0, 26, 11, 23, 11, 9, 2, 23, 12, 14, 16, 2, 4, 11, 25, 24, 31, 19, 12, 0, 10, 33, 17, 28, 18, 24, 14, 26, 20
    ],
    // Segundo histórico enviado da Playtech (3 foi o mais recente, na esquerda)
    [
      3, 8, 8, 14, 5, 15, 20, 0, 1, 0, 4, 3, 17, 23, 32, 14, 21, 34, 24, 24, 35, 13, 29, 12, 3, 28, 12, 29, 22, 17, 8, 4, 24, 20, 1, 23, 11, 29, 20, 6, 1, 19, 21, 5, 19, 20, 15, 21, 13, 15, 17, 30, 18, 9, 21, 2, 22, 14, 17, 18, 12, 25, 5, 11, 31, 22, 11, 20, 36, 1, 9, 31, 30, 4, 19, 13, 28, 4, 20, 36, 34, 2, 16, 35, 35, 2, 12, 35, 23, 17, 29, 19, 1, 2, 0, 2, 7, 4, 28, 21, 11, 9, 5, 10, 33, 25, 28, 23, 2, 34, 0, 33, 17, 19, 31, 5, 23, 24, 33, 8, 10, 17, 29, 12, 36, 34, 35, 4, 24, 9, 32, 1, 16, 26, 7, 32, 6, 14, 5, 31, 2, 34, 36, 1, 26, 7, 28, 16, 21, 30, 33, 25, 12, 30, 28, 11, 18, 2, 9, 30, 21, 33, 9, 32, 22, 1, 32, 15, 35, 8, 3, 35, 24, 32, 26, 16, 35, 26, 25, 30, 0, 15, 9, 9, 21, 22, 10, 14, 12, 20, 2, 20, 12, 20, 18, 24, 36, 32, 27, 25, 25, 25, 14, 2, 35, 27, 12, 14, 2, 32, 16, 2, 35, 18, 7, 0, 35, 36, 27, 28, 6, 14, 11, 2, 12, 11, 6, 36, 27, 2, 19, 17, 24, 26, 29, 9, 21, 21, 0, 35, 18, 16, 1, 32, 13, 30, 5, 16, 2, 32
    ],
    // Terceiro histórico enviado da Playtech (34 foi o mais recente, na esquerda)
    [
      34, 2, 31, 36, 10, 22, 29, 17, 19, 18, 19, 27, 21, 35, 29, 9, 10, 4, 0, 30, 1, 31, 8, 27, 7, 36, 3, 11, 23, 32, 23, 0, 1, 10, 9, 17, 34, 36, 17, 35, 26, 11, 36, 36, 16, 31, 34, 16, 1, 0, 7, 25, 25, 5, 22, 24, 5, 21, 24, 13, 14, 30, 13, 33, 24, 33, 14, 12, 19, 12, 18, 33, 12, 0, 0, 24, 29, 6, 27, 23, 8, 12, 5, 22, 28, 1, 17, 4, 29, 22, 11, 13, 28, 22, 5, 5, 12, 7, 36, 3, 31, 9, 31, 30, 21, 10, 36, 2, 7, 10, 15, 2, 24, 13, 25, 33, 18, 27, 1, 30, 36, 19, 21, 33, 36, 3, 10, 30, 30, 31, 6, 19, 5, 22, 7, 18, 34, 21, 25, 12, 20, 2, 28, 19, 21, 27, 24, 33, 4, 6, 28, 5, 13, 18, 12, 17, 6, 35, 34, 36, 20, 1, 35, 20, 20, 7, 32, 3, 25, 32, 18, 33, 12, 31, 8, 26, 29, 8, 32, 8, 16, 17, 30, 4, 16, 5, 10, 6, 24, 31, 31, 29, 25, 11, 32, 12, 25, 33, 31, 12, 12, 0, 3, 13, 35, 36, 1, 19, 31, 16, 22, 24, 21, 7, 4, 31, 3, 35, 32, 19, 31, 5, 16, 4, 24, 17, 3, 5, 15, 11, 18, 36, 18, 32, 28, 10, 12, 26, 14, 2, 25, 31, 13, 21, 32, 9, 25, 10, 5, 19
    ]
  ],
  evolution: [
    // Primeiro histórico enviado da Evolution (10 foi o mais recente, na esquerda)
    [
      10, 19, 7, 36, 22, 13, 7, 5, 3, 12, 6, 25, 16, 36, 16, 33, 24, 23, 1, 7, 33, 34, 11, 33, 19, 26, 10, 19, 23, 32, 8, 36, 13, 25, 32, 36, 18, 33, 24, 28, 20, 33, 23, 10, 29, 19, 0, 22, 36, 23, 1, 29, 27, 0, 19, 4, 7, 14, 32, 32, 4, 36, 32, 31, 12, 35, 22, 10, 10, 10, 30, 16, 25, 21, 25, 36, 30, 27, 5, 4, 31, 7, 4, 6, 1, 3, 36, 25, 32, 16, 33, 12, 10, 10, 34, 7, 27, 1, 34, 36, 22, 2, 13, 7, 16, 22, 35, 19, 5, 22, 28, 18, 22, 23, 16, 35, 20, 7, 5, 10, 8, 13, 17, 32, 35, 30, 31, 30, 15, 28, 5, 22, 7, 23, 8, 6, 11, 30, 15, 9, 11, 32, 29, 31, 22, 14, 21, 9, 3, 20, 22, 33, 29, 11, 32, 23, 9, 26, 22, 32, 0, 10, 10, 28, 34, 19, 28, 24, 6, 22, 19, 3, 7, 36, 19, 8, 20, 22, 1, 13, 18, 0, 29, 31, 28, 30, 11, 14, 22, 8, 29, 27, 25, 32, 7, 4, 34, 7, 13, 6, 19, 9, 26, 19, 9, 30, 11, 4, 18, 8, 19, 23, 23, 7, 3, 34, 34, 26, 24, 31, 11, 30, 35, 23, 26, 0, 3, 14, 15, 10, 17, 24, 6
    ],
    // Segundo histórico enviado da Evolution (24 foi o mais recente, na esquerda)
    [
      24, 7, 25, 26, 9, 10, 15, 22, 3, 32, 25, 31, 1, 33, 11, 17, 24, 22, 7, 24, 2, 36, 27, 16, 34, 13, 36, 15, 12, 32, 29, 23, 19, 8, 35, 19, 11, 8, 12, 21, 30, 4, 14, 12, 8, 10, 16, 8, 20, 34, 20, 0, 0, 13, 15, 7, 15, 16, 2, 17, 23, 27, 5, 31, 21, 17, 12, 25, 1, 3, 8, 28, 1, 33, 1, 22, 14, 6, 17, 11, 34, 11, 31, 5, 6, 24, 18, 4, 7, 19, 11, 2, 7, 14, 6, 10, 36, 9, 1, 7, 14, 5, 22, 23, 2, 32, 35, 4, 25, 12, 9, 26, 0, 31, 11, 6, 2, 21, 22, 14, 2, 0, 33, 0, 24, 3, 11, 34, 8, 4, 8, 13, 2, 9, 14, 16, 29, 28, 31, 17, 35, 0, 30, 28, 31, 9, 18, 18, 18, 18, 21, 4, 19, 5, 8, 2, 14, 9, 11, 24, 26, 15, 22, 2, 16, 7, 6, 19, 19, 0, 14, 36, 27, 7, 17, 27, 34, 16, 35, 29, 36, 31, 15, 7, 10, 5, 29, 36, 13, 16, 1, 17, 34, 2, 4, 12, 12, 19, 16, 9, 14, 4, 28, 1, 30, 7, 8, 34, 20, 7, 11, 3, 18, 8, 12, 34, 3, 32, 9, 3, 19, 12, 18, 10, 31, 8, 23, 16, 32, 19, 4, 9, 32
    ],
    // Terceiro histórico enviado da Evolution (7 foi o mais recente, na esquerda)
    [
      7, 28, 17, 29, 16, 6, 28, 8, 19, 12, 0, 33, 6, 7, 17, 28, 11, 13, 5, 20, 19, 36, 25, 1, 10, 11, 25, 4, 8, 8, 33, 20, 36, 18, 31, 29, 33, 15, 17, 21, 15, 5, 1, 21, 2, 20, 13, 6, 35, 30, 21, 28, 12, 17, 12, 30, 17, 13, 19, 12, 27, 6, 28, 17, 6, 16, 7, 13, 18, 23, 9, 35, 15, 13, 3, 26, 4, 33, 7, 9, 21, 5, 2, 18, 14, 21, 18, 18, 11, 27, 9, 23, 4, 14, 8, 15, 20, 11, 18, 8, 8, 23, 19, 0, 32, 21, 9, 0, 2, 23, 6, 5, 16, 24, 32, 10, 31, 11, 33, 20, 6, 33, 27, 9, 14, 18, 15, 28, 35, 23, 20, 18, 30, 9, 23, 3, 2, 23, 18, 4, 33, 0, 31, 15, 11, 29, 3, 25, 22, 36, 31, 24, 19, 31, 16, 3, 10, 21, 1, 29, 4, 12, 16, 17, 25, 21, 30, 20, 4, 1, 23, 0, 22, 0, 6, 20, 29, 18, 33, 10, 18, 4, 20, 36, 27, 30, 12, 32, 5, 1, 5, 11, 36, 32, 4, 22, 11, 3, 17, 14, 7, 10, 19, 22, 29, 17, 10, 28, 3, 3, 18, 16, 14, 20, 27, 13, 16, 16, 33, 14, 19, 9, 15, 22, 32, 11, 30, 16, 31, 36, 22, 15, 17
    ]
  ],
  pragmatic: [
    // Primeiro histórico enviado da Pragmatic (5 foi o mais recente, na esquerda)
    [
      5, 6, 35, 32, 31, 3, 30, 22, 24, 25, 5, 22, 20, 13, 30, 15, 2, 34, 9, 11, 13, 33, 36, 8, 19, 9, 12, 6, 9, 31, 36, 32, 34, 27, 7, 0, 18, 29, 1, 3, 1, 11, 0, 21, 13, 4, 7, 2, 19, 7, 19, 36, 18, 7, 13, 26, 15, 27, 5, 30, 14, 36, 14, 2, 36, 8, 18, 31, 17, 13, 7, 24, 24, 14, 35, 13, 12, 9, 5, 2, 19, 8, 4, 7, 5, 20, 9, 6, 34, 19, 17, 16, 20, 4, 1, 32, 16, 0, 35, 1, 27, 33, 26, 20, 29, 24, 18, 26, 34, 31, 8, 4, 8, 9, 35, 0, 0, 7, 22, 13, 2, 27, 25, 6, 35, 23, 0, 25, 0, 9, 13, 15, 15, 5, 17, 13, 11, 27, 17, 34, 16, 7, 0, 11, 26, 23, 12, 16, 36, 31, 26, 10, 24, 8, 29, 21, 22, 32, 5, 23
    ],
    // Segundo histórico enviado da Pragmatic (24 foi o mais recente, na esquerda)
    [
      24, 6, 20, 28, 24, 25, 27, 1, 29, 9, 30, 23, 16, 36, 9, 24, 10, 12, 19, 10, 24, 33, 5, 14, 13, 2, 23, 32, 1, 32, 33, 20, 18, 28, 4, 16, 19, 34, 25, 22, 10, 17, 13, 9, 1, 20, 15, 6, 25, 11, 16, 36, 21, 11, 18, 11, 21, 3, 27, 33, 4, 10, 31, 28, 11, 16, 4, 35, 29, 2, 0, 3, 3, 14, 32, 9, 36, 8, 26, 20, 2, 9, 9, 22, 15, 9, 10, 34, 3, 5, 14, 0, 20, 34, 14, 9, 26, 17, 0, 35, 26, 21, 36, 0, 9, 5, 18, 24, 36, 28, 36, 17, 7, 27, 9, 36, 29, 30, 34, 30, 12, 5, 31, 27, 32, 26, 24, 15, 20, 10, 0, 13, 31, 31, 26, 35, 26, 0, 2, 15, 19, 7, 4, 11, 12, 19, 14, 19, 31, 5, 19, 26, 5, 14, 5, 0, 31, 16, 31, 8
    ],
    // Terceiro histórico enviado da Pragmatic (25 foi o mais recente, na esquerda)
    [
      25, 13, 2, 9, 9, 6, 27, 33, 7, 26, 34, 28, 19, 22, 25, 35, 18, 33, 10, 35, 28, 4, 1, 32, 1, 2, 18, 11, 20, 10, 19, 1, 32, 25, 32, 6, 26, 9, 26, 22, 8, 8, 11, 35, 35, 35, 24, 13, 35, 5, 27, 33, 8, 0, 23, 4, 35, 29, 35, 2, 18, 30, 22, 28, 6, 5, 11, 30, 29, 9, 12, 29, 27, 4, 17, 27, 34, 11, 30, 20, 2, 15, 5, 23, 7, 17, 26, 9, 5, 35, 11, 0, 8, 11, 6, 13, 30, 25, 20, 22, 25, 4, 24, 32, 7, 1, 19, 30, 11, 22, 32, 6, 11, 8, 32, 34, 1, 12, 23, 19, 7, 35, 30, 8, 2, 16, 1, 32, 32, 29, 12, 8, 31, 0, 11, 18, 0, 8, 24, 10, 13, 20, 27, 1, 11, 22, 12, 25, 7, 23, 32, 7, 32, 29, 33, 15, 31, 5, 9, 0
    ]
  ],
  winfinit: [
    // Primeiro histórico enviado da Winfinit
    [
      26, 34, 1, 15, 7, 11, 8, 17, 1, 27, 33, 4, 21, 28, 5, 6, 22, 6, 4, 26, 8, 31, 30, 12, 13, 36, 4, 14, 31, 33, 5, 20, 30, 20, 10, 27, 1, 28, 3, 9, 7, 18, 4, 9, 13, 21, 8, 15
    ],
    // Segundo histórico enviado da Winfinit
    [
      30, 4, 4, 26, 34, 12, 21, 20, 3, 4, 18, 18, 26, 23, 36, 35, 2, 33, 32, 1, 1, 10, 1, 2, 2, 5, 8, 12, 4, 34, 19, 5, 7, 33, 36, 1, 2, 27, 22, 6, 28, 24, 19, 18, 2, 20, 36, 25
    ],
    // Terceiro histórico enviado da Winfinit
    [
      7, 33, 25, 15, 30, 24, 10, 36, 14, 30, 20, 10, 34, 4, 30, 20, 3, 2, 9, 1, 26, 15, 16, 18, 19, 22, 17, 24, 11, 20, 7, 17, 12, 17, 15, 1, 3, 24, 7, 31, 5, 1, 33, 31, 30, 2, 24, 34
    ]
  ],
  live_vegas: [
    // Primeiro histórico enviado da Live Vegas
    [
      5, 1, 33, 8, 22, 3, 25, 18, 20, 31, 0, 1, 23, 19, 36, 4, 30, 16, 25, 16, 17, 13, 26, 20, 7, 23, 13, 10, 6, 34, 31, 11, 13, 18, 21, 9, 18, 9, 1, 30, 14, 16, 34, 0, 31, 36, 20, 26, 20, 24, 8, 17, 36, 18, 4, 9, 0, 30, 6, 33, 24, 20, 2, 34, 4, 26, 6, 0, 28, 26, 4, 14
    ],
    // Segundo histórico enviado da Live Vegas
    [
      12, 2, 13, 34, 4, 29, 5, 35, 19, 25, 15, 4, 26, 5, 28, 2, 1, 28, 1, 5, 32, 25, 30, 23, 19, 12, 1, 20, 15, 36, 27, 11, 31, 35, 17, 33, 19, 24, 21, 32, 5, 7, 7, 11, 14, 5, 8, 31, 17, 5, 23, 30, 35, 3, 27, 29, 16, 1, 22, 4, 9, 7, 16, 5, 15, 17, 29, 15, 17, 24, 11, 30
    ],
    // Terceiro histórico enviado da Live Vegas
    [
      26, 6, 9, 15, 16, 26, 3, 7, 36, 17, 22, 24, 32, 36, 26, 4, 32, 31, 8, 17, 24, 35, 5, 4, 11, 23, 23, 19, 32, 26, 8, 29, 8, 13, 30, 8, 17, 28, 8, 18, 8, 3, 27, 20, 24, 13, 28, 2, 33, 34, 11, 15, 11, 18, 25, 15, 9, 36, 21, 14, 25, 7, 10, 31, 28, 3, 22, 30, 7, 27, 8, 7
    ]
  ]
};

// Cache interno para armazenar o mapa de puxadas calculadas para cada provedora
const pullsCache: Record<string, Record<number, number[]>> = {};

/**
 * Calcula dinamicamente quais números o número informado costuma puxar (maiores frequências de transição consecutiva)
 * com base em todas as sequências empíricas inseridas para a respectiva provedora e o histórico em tempo real do app.
 */
export function getCalculatedProviderPulls(spin: number, provider: string, liveHistory?: number[]): number[] {
  if (provider === 'standard') return [];

  const cacheKey = provider;
  
  // Se NÃO houver liveHistory e já calculamos e colocamos em cache o mapa completo para esta provedora, usamos ele
  if (!liveHistory && pullsCache[cacheKey]) {
    return pullsCache[cacheKey][spin] || [];
  }

  // Inicializa o mapa de transições para todos os números (0 a 36)
  const transitionMap: Record<number, Record<number, number>> = {};
  for (let i = 0; i <= 36; i++) {
    transitionMap[i] = {};
  }

  // 1. Carrega sequências salvas (pré-configuradas)
  const sequences = PROVIDER_SEQUENCES[provider as keyof ProviderDatabase] || [];

  sequences.forEach((seq) => {
    // Como a sequência foi fornecida com o mais recente na esquerda, nós a revertemos para obter a ordem cronológica (antigo para recente)
    const chronologicalSeq = [...seq].reverse();

    for (let i = 0; i < chronologicalSeq.length - 1; i++) {
      const current = chronologicalSeq[i];
      const next = chronologicalSeq[i + 1];

      if (current >= 0 && current <= 36 && next >= 0 && next <= 36) {
        transitionMap[current][next] = (transitionMap[current][next] || 0) + 1;
      }
    }
  });

  // 2. Incorpora o histórico em tempo real do app (aprendizado contínuo)
  if (liveHistory && liveHistory.length > 1) {
    // No app, history[0] é o mais recente. Portanto, revertemos para ordem cronológica.
    const chronologicalLive = [...liveHistory].reverse();
    for (let i = 0; i < chronologicalLive.length - 1; i++) {
      const current = chronologicalLive[i];
      const next = chronologicalLive[i + 1];

      if (current >= 0 && current <= 36 && next >= 0 && next <= 36) {
        // Multiplicamos o peso do liveHistory por 3 para destacar as tendências mais recentes do jogo atual!
        transitionMap[current][next] = (transitionMap[current][next] || 0) + 3;
      }
    }
  }

  // Para cada número, ordena as transições pela frequência mais alta e pega os top 4
  const finalProviderMap: Record<number, number[]> = {};
  for (let i = 0; i <= 36; i++) {
    const nextFreqs = transitionMap[i];
    const sorted = Object.entries(nextFreqs)
      .map(([numStr, freq]) => ({ num: parseInt(numStr, 10), freq }))
      .sort((a, b) => b.freq - a.freq);

    // Pegamos até os 4 números de maior atração
    const top4 = sorted.slice(0, 4).map((item) => item.num);
    
    // Se a amostra empírica não possuir dados para o número 'i', usamos um padrão de fallback consistente
    if (top4.length === 0) {
      // Fallback matemático baseado no cilindro (vizinhos próximos no cilindro)
      // Como não temos histórico suficiente de transição para o número 'i', sugerimos vizinhos da roleta
      const cylinder = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];
      const idx = cylinder.indexOf(i);
      if (idx !== -1) {
        finalProviderMap[i] = [
          cylinder[(idx - 1 + 37) % 37],
          cylinder[(idx + 1) % 37],
          cylinder[(idx - 2 + 37) % 37],
          cylinder[(idx + 2) % 37]
        ];
      } else {
        finalProviderMap[i] = [];
      }
    } else {
      finalProviderMap[i] = top4;
    }
  }

  // Se não houver liveHistory, salvamos no cache para otimizar os acessos futuros
  if (!liveHistory) {
    pullsCache[cacheKey] = finalProviderMap;
  }

  return finalProviderMap[spin] || [];
}
