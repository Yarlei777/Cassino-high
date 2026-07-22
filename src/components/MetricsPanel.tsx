import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { SECTORS, COLORS, getTerminal, getNumberSector, CYLINDER } from '../lib/roulette';
import { getVibrationalComponents, getVibrationalHistoryMetrics, getVibrationalColorSynergy } from '../lib/vibration';
import { calculateHotColdStats } from '../lib/patterns';
import { Flame, Sparkles, Target, Zap } from 'lucide-react';

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
  const lastSpins = useMemo(() => (Array.isArray(history) ? history : []).map((h) => h?.number ?? 0), [history]);

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

      {/* Vibrational Digit Synergy Panel (Análise Redutora Vibracional de Dígitos 1-9 & Cores) */}
      <div className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-3 shadow-sm md:col-span-2">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              🔮 Sinergia Vibracional de Dígitos & Cores (1 a 9 + Vermelho/Preto/Verde)
            </h4>
            <p className="text-[10px] text-slate-500">
              Decompõe dezenas em dígitos e analisa pontes de cor (ex: 19 Vermelho + 21 Vermelho → Soma de dígitos 10 → Alvo 30 Vermelho).
            </p>
          </div>
          <span className="text-[9px] bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded font-black font-mono uppercase">
            Sinergia de Cores & Raízes
          </span>
        </div>

        {/* Live Last Spun Number Breakdown with Color Synergy */}
        {lastSpins.length > 0 && (
          (() => {
            const vibe = getVibrationalComponents(lastSpins[0]);
            const colorSynergy = getVibrationalColorSynergy(lastSpins);
            const isRed = COLORS[lastSpins[0]] === 'red';
            const isBlack = COLORS[lastSpins[0]] === 'black';
            const colorBg = isRed ? 'bg-red-600' : isBlack ? 'bg-slate-800' : 'bg-emerald-600';
            
            return (
              <div className="space-y-2">
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
                  <div className="flex items-center gap-2.5">
                    <span className={`w-9 h-9 rounded-full flex items-center justify-center font-mono font-black text-white text-sm shadow-sm ${colorBg}`}>
                      {vibe.original}
                    </span>
                    <div>
                      <span className="text-[10px] text-slate-500 font-bold block uppercase leading-none">
                        Última Pedra ({vibe.colorName})
                      </span>
                      <span className="text-xs font-black text-slate-800 mt-0.5 block leading-relaxed">
                        Dígitos: <span className="text-purple-700 font-mono font-black">{vibe.digits.join(' e ')}</span> {vibe.digits.length > 1 && `• Soma: ${vibe.sum}`}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] text-slate-400 font-black uppercase shrink-0">Atração Mesma Cor:</span>
                    <div className="flex items-center gap-1">
                      {(vibe?.colorResonanceTargets || []).map((num) => (
                        <span key={`color-target-${num}`} className={`px-2 py-0.5 text-white font-mono font-black text-[10px] rounded shadow-xs ${COLORS[num] === 'red' ? 'bg-red-600' : COLORS[num] === 'black' ? 'bg-slate-800' : 'bg-emerald-600'}`}>
                          {num}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Color Sequence & Multi-spin Bridge */}
                <div className="bg-gradient-to-r from-slate-900 to-purple-950 text-white p-2.5 rounded-lg border border-purple-800/40 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[9.5px] font-black uppercase text-purple-300 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                      Sequência de Cores & Ponte de Dígitos:
                    </span>
                    <span className="text-[9px] font-mono font-bold text-slate-300">
                      {colorSynergy.colorSequenceText}
                    </span>
                  </div>
                  <p className="text-[10px] text-purple-100 font-medium leading-relaxed">
                    {colorSynergy.synergyReasoning}
                  </p>
                </div>
              </div>
            );
          })()
        )}

        {/* Frequencies and Hot/Cold Badges */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 pt-1">
          {/* Heatmap of 0-9 Vibration Digits */}
          <div className="lg:col-span-8 space-y-2">
            <span className="text-[9px] text-slate-400 uppercase tracking-widest font-black block">Frequência Vibracional dos Dígitos (Últimos 30 giros)</span>
            
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {Array.from({ length: 10 }).map((_, digit) => {
                let count = 0;
                lastSpins.slice(0, 30).forEach(num => {
                  const comp = getVibrationalComponents(num);
                  if (comp.allVibrations.includes(digit)) {
                    count++;
                  }
                });
                const totalSample = Math.min(30, lastSpins.length) || 1;
                const pct = Math.round((count / totalSample) * 100);
                
                return (
                  <div key={`vibe-stat-${digit}`} className="bg-slate-50 border border-slate-200 rounded-lg p-2 flex flex-col items-center justify-center">
                    <span className="text-[9px] text-slate-500 font-black">Vibração {digit}</span>
                    <span className="text-sm font-black text-slate-800 font-mono my-0.5">{count}x</span>
                    <div className="w-full bg-slate-200 h-1 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(100, pct * 2.5)}%` }} />
                    </div>
                    <span className="text-[8px] text-slate-400 font-mono mt-0.5">{pct}% de pres.</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Hot/Cold and Mapping advice */}
          <div className="lg:col-span-4 bg-slate-50 border border-slate-200 rounded-lg p-3 flex flex-col justify-between space-y-2 text-xs">
            <div>
              <span className="text-[9px] text-slate-400 uppercase tracking-widest font-black block mb-1">Mapeamento Dinâmico de Cores</span>
              <p className="text-[10.5px] text-slate-600 leading-relaxed">
                Cada pedra possui cor e dígitos específicos. Quando pedras da mesma cor repetem (ex: 19 e 21 vermelhos), a roleta tende a buscar o terminal e soma daquela cor específica (ex: 30 vermelho).
              </p>
            </div>

            <div className="space-y-1.5 border-t border-slate-200 pt-2">
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-red-500 font-bold">🔥 Vibração Frequente:</span>
                <span className="font-mono font-black text-slate-700">
                  {(() => {
                    const counts = Array(10).fill(0);
                    lastSpins.slice(0, 30).forEach(num => {
                      getVibrationalComponents(num).allVibrations.forEach(v => counts[v]++);
                    });
                    const max = Math.max(...counts);
                    if (max === 0) return 'Nenhum';
                    const list = [];
                    for(let i=0; i<10; i++) {
                      if (counts[i] === max) list.push(i);
                    }
                    return list.map(v => `V-${v}`).join(', ');
                  })()}
                </span>
              </div>
              <div className="text-[9px] text-slate-400 leading-tight">
                Selecione alvos que combinem cor + soma vibracional para máxima convergência na roleta.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* NOVO: Painel de Análise de Números Quentes (Ranking & Tendência de Frequência) */}
      <div className="bg-gradient-to-br from-amber-950/10 via-white to-amber-900/5 border border-amber-200 rounded-xl p-3.5 space-y-3 shadow-sm md:col-span-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-amber-500/10 border border-amber-500/30 rounded-lg">
              <Flame className="w-4 h-4 text-amber-600 animate-pulse" />
            </div>
            <div>
              <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                🔥 Análise de Números Quentes (Ranking de Repetição & Recência)
              </h4>
              <p className="text-[10px] text-slate-500">
                Mapeia pedras ou setores vizinhos com 5+ saídas acumuladas nas últimas 30 rodadas.
              </p>
            </div>
          </div>
          <span className="text-[9px] bg-amber-100 text-amber-800 border border-amber-300 font-bold px-2 py-0.5 rounded font-mono uppercase">
            Top Frequência
          </span>
        </div>

        {(() => {
          const hotCold = calculateHotColdStats(lastSpins);
          const topHot = hotCold.hotNumbers.slice(0, 8);

          if (topHot.length === 0) {
            return (
              <div className="bg-amber-50/50 border border-amber-200/60 rounded-lg p-3 text-center text-[10.5px] text-amber-800 italic">
                Nenhum número atingiu a marca de 3 saídas recentes na sessão atual. Insira mais giros para estruturar o ranking de quentes.
              </div>
            );
          }

          return (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {topHot.map((item, idx) => {
                const colorBg = item.color === 'red' ? 'bg-red-600' : item.color === 'black' ? 'bg-slate-800' : 'bg-emerald-600';
                
                return (
                  <div key={`hot-rank-${item.number}`} className="bg-white border border-amber-200/80 rounded-lg p-2.5 shadow-xs flex flex-col justify-between space-y-1.5 relative overflow-hidden">
                    <div className="absolute top-0 right-0 bg-amber-500 text-white font-mono font-black text-[8px] px-1.5 py-0.2 rounded-bl">
                      #{idx + 1}
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`w-8 h-8 rounded-full flex items-center justify-center font-mono font-black text-white text-sm shadow-sm ${colorBg}`}>
                        {item.number}
                      </span>
                      <div>
                        <span className="text-[11px] font-black text-slate-900 font-mono block">
                          {item.frequency} Hits ({item.pct}%)
                        </span>
                        <span className="text-[9px] text-amber-700 font-bold block">
                          Atraso: {item.delay} giro(s)
                        </span>
                      </div>
                    </div>

                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-500 rounded-full" style={{ width: `${Math.min(100, item.pct * 4)}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}
      </div>

    </div>
  );
}
