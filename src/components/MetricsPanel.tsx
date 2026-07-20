import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { SECTORS, COLORS, getTerminal, getNumberSector, CYLINDER } from '../lib/roulette';

interface HistoryEntry {
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
}

interface MetricsPanelProps {
  history: HistoryEntry[];
}

export default function MetricsPanel({ history }: MetricsPanelProps) {
  const lastSpins = useMemo(() => history.map((h) => h.number), [history]);

  // 1. Sector distributions
  const sectorData = useMemo(() => {
    const hits: Record<string, number> = { voisins: 0, tiers: 0, orphelins: 0, zeroGame: 0 };
    if (lastSpins.length === 0) return hits;

    // Analyze up to last 30 spins
    const sample = lastSpins.slice(0, 30);
    sample.forEach((num) => {
      const sec = getNumberSector(num);
      hits[sec]++;
    });

    return hits;
  }, [lastSpins]);

  // 2. Terminal frequencies (0-9)
  const terminalData = useMemo(() => {
    const counts = Array(10).fill(0);
    if (lastSpins.length === 0) return counts;

    const sample = lastSpins.slice(0, 30);
    sample.forEach((num) => {
      counts[getTerminal(num)]++;
    });
    return counts;
  }, [lastSpins]);

  // 3. Spacing patterns (intervals)
  const dealerIntervals = useMemo(() => {
    if (lastSpins.length < 2) return [];
    const list: Array<{ from: number; to: number; diff: number; direction: 'left' | 'right' }> = [];

    // Analyze last 8 transitions
    const sample = lastSpins.slice(0, 9);
    for (let i = 0; i < sample.length - 1; i++) {
      const curr = sample[i];
      const prev = sample[i + 1];
      const currIdx = CYLINDER.indexOf(curr);
      const prevIdx = CYLINDER.indexOf(prev);

      if (currIdx !== -1 && prevIdx !== -1) {
        let diff = currIdx - prevIdx;
        // Keep it within +/- 18 slots
        if (diff > 18) diff -= 37;
        if (diff < -18) diff += 37;

        list.push({
          from: prev,
          to: curr,
          diff: Math.abs(diff),
          direction: diff >= 0 ? 'right' : 'left',
        });
      }
    }
    return list;
  }, [lastSpins]);

  // 4. Basic standard metrics (red/black, odd/even, high/low)
  const standardRatios = useMemo(() => {
    const sample = lastSpins.slice(0, 30);
    const total = sample.length || 1;

    let red = 0;
    let black = 0;
    let green = 0;

    let odd = 0;
    let even = 0;

    let low = 0; // 1-18
    let high = 0; // 19-36

    sample.forEach((num) => {
      // Color
      if (num === 0) green++;
      else if (COLORS[num] === 'red') red++;
      else black++;

      if (num !== 0) {
        // Odd/Even
        if (num % 2 !== 0) odd++;
        else even++;

        // High/Low
        if (num <= 18) low++;
        else high++;
      }
    });

    return {
      redPct: Math.round((red / total) * 100),
      blackPct: Math.round((black / total) * 100),
      greenPct: Math.round((green / total) * 100),
      oddPct: Math.round((odd / Math.max(1, odd + even)) * 100),
      evenPct: Math.round((even / Math.max(1, odd + even)) * 100),
      lowPct: Math.round((low / Math.max(1, low + high)) * 100),
      highPct: Math.round((high / Math.max(1, low + high)) * 100),
    };
  }, [lastSpins]);

  if (history.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-8 text-center shadow-sm">
        <p className="text-xs text-slate-500 italic">
          Gere dados de teste na aba de Histórico ou insira números na Mesa de Alvos para desbloquear os gráficos analíticos!
        </p>
      </div>
    );
  }

  const totalSectorsSample = Math.min(30, lastSpins.length);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      
      {/* Sector Heat Wave */}
      <div className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-3 shadow-sm">
        <div>
          <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            🎯 Distribuição dos Setores
          </h4>
          <p className="text-[10px] text-slate-500">
            Análise de frequência de queda por setor do cilindro europeu (últimas {totalSectorsSample} jogadas)
          </p>
        </div>

        <div className="space-y-2.5 pt-1.5">
          {Object.entries(SECTORS).map(([key, value]) => {
            const hits = sectorData[key] || 0;
            const pct = Math.round((hits / totalSectorsSample) * 100);

            return (
              <div key={key} className="space-y-1">
                <div className="flex justify-between items-center text-[10px]">
                  <span className="font-extrabold text-slate-700">{value.name}</span>
                  <span className="font-mono text-slate-500 font-bold">
                    {hits} {hits === 1 ? 'queda' : 'quedas'} ({pct}%)
                  </span>
                </div>
                {/* Custom styled HTML progress bar */}
                <div className="w-full h-2 bg-slate-50 border border-slate-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full bg-gradient-to-r ${value.color} rounded-full transition-all duration-500`}
                    style={{ width: `${Math.max(3, pct)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Terminal Digit Heats */}
      <div className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-3 shadow-sm">
        <div>
          <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
            🔢 Frequência de Terminais
          </h4>
          <p className="text-[10px] text-slate-500">
            Qual dígito terminal (0 a 9) está saindo mais no histórico recente
          </p>
        </div>

        <div className="grid grid-cols-5 gap-1.5 pt-1">
          {terminalData.map((hits, digit) => {
            const maxHits = Math.max(...terminalData, 1);
            const intensity = hits / maxHits;

            return (
              <div
                key={`term-hit-${digit}`}
                className="bg-slate-50 border border-slate-200/80 rounded-lg p-2 flex flex-col items-center justify-between shadow-xs"
              >
                <span className="text-xs font-bold font-mono text-slate-500">T-{digit}</span>
                <span className="text-base font-black text-slate-800 font-mono my-0.5">{hits}</span>
                {/* Visual indicator light */}
                <div className="w-full h-1 bg-slate-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-emerald-500 transition-all"
                    style={{ width: `${intensity * 100}%`, opacity: 0.3 + intensity * 0.7 }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Standard Basic Balance Ratios */}
      <div className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-3 shadow-sm">
        <div>
          <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
            📊 Balanço Estatístico Padrão
          </h4>
          <p className="text-[10px] text-slate-500">
            Balanço de cores, paridade e níveis de valores
          </p>
        </div>

        <div className="space-y-3 pt-1">
          {/* Colors balance */}
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] text-slate-500 font-bold">
              <span>Cores (Vermelho / Preto / Verde)</span>
              <span className="font-mono">
                {standardRatios.redPct}% / {standardRatios.blackPct}% / {standardRatios.greenPct}%
              </span>
            </div>
            <div className="w-full h-2.5 bg-slate-50 rounded-full overflow-hidden flex border border-slate-200">
              <div className="h-full bg-red-600" style={{ width: `${standardRatios.redPct}%` }} />
              <div className="h-full bg-slate-800" style={{ width: `${standardRatios.blackPct}%` }} />
              <div className="h-full bg-emerald-600" style={{ width: `${standardRatios.greenPct}%` }} />
            </div>
          </div>

          {/* Odd/Even balance */}
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] text-slate-500 font-bold">
              <span>Paridade (Ímpar / Par)</span>
              <span className="font-mono">
                {standardRatios.oddPct}% / {standardRatios.evenPct}%
              </span>
            </div>
            <div className="w-full h-2.5 bg-slate-50 rounded-full overflow-hidden flex border border-slate-200">
              <div className="h-full bg-blue-500" style={{ width: `${standardRatios.oddPct}%` }} />
              <div className="h-full bg-indigo-900" style={{ width: `${standardRatios.evenPct}%` }} />
            </div>
          </div>

          {/* High/Low balance */}
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] text-slate-500 font-bold">
              <span>Valores (Baixos 1-18 / Altos 19-36)</span>
              <span className="font-mono">
                {standardRatios.lowPct}% / {standardRatios.highPct}%
              </span>
            </div>
            <div className="w-full h-2.5 bg-slate-50 rounded-full overflow-hidden flex border border-slate-200">
              <div className="h-full bg-purple-500" style={{ width: `${standardRatios.lowPct}%` }} />
              <div className="h-full bg-pink-600" style={{ width: `${standardRatios.highPct}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Dealer Spacing Intervals / Signature */}
      <div className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-3 shadow-sm">
        <div>
          <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
            ⚡ Ritmo de Intervalo (Assinatura de Dealer)
          </h4>
          <p className="text-[10px] text-slate-500">
            Espaçamento de slots no cilindro entre rodadas consecutivas. Padrões consistentes indicam viés físico.
          </p>
        </div>

        <div className="space-y-2 pt-1">
          {dealerIntervals.length === 0 ? (
            <div className="text-center py-6 text-[10px] text-slate-400 italic">
              Insira pelo menos 2 números para ver a análise de espaçamento de salto no cilindro.
            </div>
          ) : (
            <div className="space-y-1.5 max-h-[120px] overflow-y-auto custom-scrollbar">
              {dealerIntervals.map((item, idx) => (
                <div
                  key={`interval-${idx}`}
                  className="bg-slate-50 border border-slate-200/80 rounded-lg p-2 flex items-center justify-between text-[11px]"
                >
                  <div className="flex items-center gap-1.5 text-slate-700">
                    <span className="text-[9px] text-slate-400 font-mono font-bold">#{dealerIntervals.length - idx}</span>
                    <span className="font-bold">De {item.from}</span>
                    <span className="text-slate-400">➜</span>
                    <span className="font-bold">Para {item.to}</span>
                  </div>

                  <div className="flex items-center gap-1.5 font-mono">
                    <span className="text-[9px] text-slate-400 font-bold">Pulo:</span>
                    <span className="bg-amber-50 text-amber-700 border border-amber-200 font-black px-1.5 py-0.5 rounded text-[10px]">
                      {item.diff} slots ({item.direction === 'right' ? 'Horário ↻' : 'Anti-Horário ↺'})
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
