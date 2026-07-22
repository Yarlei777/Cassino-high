import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { 
  TrendingUp, 
  Trash2, 
  Award, 
  Sparkles, 
  Layers, 
  History, 
  Search, 
  CheckCircle, 
  XCircle, 
  RefreshCw 
} from 'lucide-react';
import { COLORS } from '../lib/roulette';

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

interface HistoryPanelProps {
  history: HistoryEntry[];
  onClearHistory: () => void;
  onGenerateDemoData: () => void;
}

export default function HistoryPanel({ history, onClearHistory, onGenerateDemoData }: HistoryPanelProps) {
  const [filterStrategy, setFilterStrategy] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Calculate advanced stats safely
  const stats = useMemo(() => {
    try {
      const safeHistory = Array.isArray(history) 
        ? history.filter((h) => h && typeof h === 'object' && typeof h.number === 'number') 
        : [];

      const entriesWithPredictions = safeHistory.filter((h) => 
        (h.coveredNumbers && h.coveredNumbers.length > 0) || 
        (h as any).hasDynamicPrediction
      );

      if (entriesWithPredictions.length === 0) {
        return {
          total: 0,
          wins: 0,
          losses: 0,
          rate: 0,
          currentStreak: 0,
          maxStreak: 0,
        };
      }

      // Total spins that had predictions
      const total = entriesWithPredictions.length;

      // Rate is calculated using all predictions (as requested by user: "pode contar todos os giros")
      const winsForRate = entriesWithPredictions.filter((h) => h.isWin || (h as any).dynamicIsHit).length;
      const rate = total > 0 ? Math.round((winsForRate / total) * 100) : 0;

      // Greens and Reds are counted ONLY when the analysis lighted up (wasPlayed === true)
      const wins = entriesWithPredictions.filter((h) => h.wasPlayed && (h.isWin || (h as any).dynamicIsHit)).length;
      const losses = entriesWithPredictions.filter((h) => h.wasPlayed && !(h.isWin || (h as any).dynamicIsHit)).length;

      // Calculate streaks chronologically (history[0] is newest, so reverse it for forward streak)
      let currentStreak = 0;
      let maxStreak = 0;
      let tempStreak = 0;

      const cronList = [...entriesWithPredictions].reverse();
      cronList.forEach((entry) => {
        const hit = entry.isWin || (entry as any).dynamicIsHit;
        if (hit) {
          tempStreak++;
          maxStreak = Math.max(maxStreak, tempStreak);
        } else {
          tempStreak = 0;
        }
      });

      // Current streak (counting backward from newest)
      for (let i = 0; i < entriesWithPredictions.length; i++) {
        const hit = entriesWithPredictions[i].isWin || (entriesWithPredictions[i] as any).dynamicIsHit;
        if (hit) {
          currentStreak++;
        } else {
          break;
        }
      }

      return { total, wins, losses, rate, currentStreak, maxStreak };
    } catch (e) {
      console.error('Error calculating history stats in HistoryPanel:', e);
      return {
        total: 0,
        wins: 0,
        losses: 0,
        rate: 0,
        currentStreak: 0,
        maxStreak: 0,
      };
    }
  }, [history]);

  // Strategy naming map
  const strategyLabelMap: Record<string, string> = {
    terminals: 'Terminais',
    frequency: 'Frequência',
    opposite: 'Opostos',
    sectors: 'Sectores',
    signature: 'Espaçamento',
    manual: 'Manual',
    all: 'Todas',
    ai: 'Auto-Pilot IA',
    'AUTO-PILOT: Fusão Multi-Motor IA': 'Auto-Pilot (Multi-Motor)',
    'AUTO-PILOT: Fusão de Gatilhos IA': 'Auto-Pilot (Gatilhos)',
  };

  // Filtered history entries safely
  const filteredHistory = useMemo(() => {
    try {
      const safeHistory = Array.isArray(history) 
        ? history.filter((h) => h && typeof h === 'object' && typeof h.number === 'number') 
        : [];

      return safeHistory.filter((entry) => {
        const matchStrategy = filterStrategy === 'all' || entry.strategyUsed === filterStrategy;
        const strategyLabel = strategyLabelMap[entry.strategyUsed || ''] || entry.strategyUsed || '';
        const matchSearch =
          searchQuery === '' ||
          entry.number.toString().includes(searchQuery) ||
          strategyLabel.toLowerCase().includes(searchQuery.toLowerCase());
        return matchStrategy && matchSearch;
      });
    } catch (e) {
      console.error('Error filtering history in HistoryPanel:', e);
      return [];
    }
  }, [history, filterStrategy, searchQuery]);

  return (
    <div className="space-y-4">
      {/* Stats row - Ultra Slim, Custom Designed Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5">
        
        {/* Win Rate Panel */}
        <div className="bg-white border border-slate-200 rounded-xl p-3 flex flex-col justify-between col-span-2 md:col-span-1 shadow-sm">
          <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block">Assertividade</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className={`text-2xl font-bold font-mono ${
              stats.rate >= 70 ? 'text-emerald-600' : stats.rate >= 45 ? 'text-amber-600' : 'text-slate-400'
            }`}>
              {stats.rate}%
            </span>
            <span className="text-[10px] text-slate-400">taxa</span>
          </div>
          <div className="mt-1.5 text-[9px] text-slate-500 flex items-center gap-1">
            <span className={`w-1.5 h-1.5 rounded-full ${stats.rate >= 60 ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`}></span>
            {stats.rate >= 70 ? 'Excelente 🚀' : stats.rate >= 45 ? 'Moderado 🔥' : 'Em análise ⏱️'}
          </div>
        </div>

        {/* Total Spins */}
        <div className="bg-white border border-slate-200 rounded-xl p-3 flex flex-col justify-between shadow-sm">
          <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block">Total Jogadas</span>
          <div className="text-2xl font-bold font-mono text-slate-800 mt-1">
            {stats.total}
          </div>
          <span className="text-[9px] text-slate-400 block">Rodadas salvas</span>
        </div>

        {/* Wins vs Losses Split */}
        <div className="bg-white border border-slate-200 rounded-xl p-3 flex flex-col justify-between shadow-sm">
          <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block">Greens vs Reds</span>
          <div className="flex items-center gap-2 mt-1 font-mono">
            <span className="text-emerald-600 font-bold text-lg">{stats.wins}G</span>
            <span className="text-slate-300">/</span>
            <span className="text-red-600 font-bold text-lg">{stats.losses}R</span>
          </div>
          <span className="text-[9px] text-slate-400 block">Proporção total</span>
        </div>

        {/* Current Green Streak */}
        <div className="bg-white border border-slate-200 rounded-xl p-3 flex flex-col justify-between shadow-sm">
          <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block">Sequência Atual</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className={`text-2xl font-bold font-mono ${stats.currentStreak > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
              {stats.currentStreak}
            </span>
            {stats.currentStreak > 0 && <span className="text-[9px] text-emerald-600 font-bold">G</span>}
          </div>
          <span className="text-[9px] text-slate-400 block">Greens seguidos</span>
        </div>

        {/* Max Green Streak */}
        <div className="bg-white border border-slate-200 rounded-xl p-3 flex flex-col justify-between shadow-sm">
          <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block">Maior Sequência</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-bold font-mono text-amber-600">
              {stats.maxStreak}
            </span>
            <span className="text-[9px] text-amber-600 font-bold">MAX</span>
          </div>
          <span className="text-[9px] text-slate-400 block">Recorde de Green</span>
        </div>

      </div>

      {/* Control panel: filter and search */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Filtrar número..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:border-indigo-500 w-36 focus:bg-white transition-all"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-slate-400 uppercase font-bold">Estratégia:</span>
            <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
              {['all', 'ai', 'terminals', 'frequency', 'opposite', 'sectors', 'signature', 'manual'].map((strat) => (
                <button
                  key={strat}
                  onClick={() => setFilterStrategy(strat)}
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all cursor-pointer ${
                    filterStrategy === strat
                      ? 'bg-white text-indigo-700 border border-slate-200 shadow-sm font-bold'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {strategyLabelMap[strat] || strat}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          {history.length > 0 && (
            <button
              onClick={onClearHistory}
              className="flex items-center gap-1 text-[10px] bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer"
            >
              <Trash2 className="w-3 h-3" />
              Limpar Tudo
            </button>
          )}
        </div>
      </div>

      {/* Main List */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        {filteredHistory.length === 0 ? (
          <div className="text-center py-10 px-4 space-y-4">
            <History className="w-8 h-8 text-slate-300 mx-auto" />
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-slate-700">Nenhuma jogada encontrada</h4>
              <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                {history.length === 0 
                  ? 'Insira números no teclado ou no scanner para registrar suas primeiras rodadas.'
                  : 'Nenhum resultado corresponde aos filtros selecionados acima.'}
              </p>
            </div>
            {history.length === 0 && (
              <button
                onClick={onGenerateDemoData}
                className="inline-flex items-center gap-1.5 bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-emerald-500 transition-colors cursor-pointer shadow-sm"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Preencher Dados de Teste
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[10px] text-slate-500 uppercase font-bold tracking-wider">
                  <th className="py-2.5 px-3 w-16">Nº</th>
                  <th className="py-2.5 px-3 w-20">Número Sorteado</th>
                  <th className="py-2.5 px-3 w-32">Status da Jogada</th>
                  <th className="py-2.5 px-3 w-24">Resultado</th>
                  <th className="py-2.5 px-3 w-28">Estratégia Ativa</th>
                  <th className="py-2.5 px-3">Alvos do Momento</th>
                  <th className="py-2.5 px-3 text-right w-24">Hora</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-xs">
                {filteredHistory.map((entry, idx) => {
                  const numColor = COLORS[entry.number];
                  const spinNum = history.length - history.indexOf(entry);

                  return (
                    <tr 
                      key={entry.id} 
                      className={`hover:bg-slate-50/50 transition-colors ${
                        idx === 0 ? 'bg-emerald-50/20' : ''
                      }`}
                    >
                      {/* Spin index */}
                      <td className="py-2.5 px-3 font-mono text-slate-400 text-[10px]">
                        #{spinNum}
                      </td>

                      {/* Rolled number chip */}
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-7 h-7 rounded-full flex items-center justify-center font-bold font-mono text-[11px] shadow-sm border border-white/5 ${
                              numColor === 'red'
                                ? 'bg-red-600 text-white'
                                : numColor === 'black'
                                ? 'bg-slate-900 text-white border-slate-950'
                                : 'bg-emerald-600 text-white'
                            }`}
                          >
                            {entry.number}
                          </span>
                          <span 
                            className="text-[9px] text-slate-500 font-black bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 font-mono flex items-center gap-0.5 select-none" 
                            title={`Soma de dígitos: ${entry.number === 0 ? 0 : Math.floor(entry.number / 10) + (entry.number % 10)}`}
                          >
                            <span className="text-emerald-600">∑</span>
                            {(() => {
                              const n = entry.number;
                              if (n === 0) return 0;
                              const sum = Math.floor(n / 10) + (n % 10);
                              return sum < 10 ? sum : Math.floor(sum / 10) + (sum % 10);
                            })()}
                          </span>
                          {entry.ballDirection && (
                            <span 
                              className={`text-[8.5px] font-black px-1.5 py-0.5 rounded border font-mono flex items-center gap-1 select-none ${
                                entry.ballDirection === 'cw'
                                  ? 'bg-amber-50 border-amber-200 text-amber-700'
                                  : 'bg-indigo-50 border-indigo-200 text-indigo-700'
                              }`} 
                              title={entry.ballDirection === 'cw' ? 'Lançamento Horário (CW)' : 'Lançamento Anti-Horário (CCW)'}
                            >
                              <span>{entry.ballDirection === 'cw' ? '🕒 CW' : '↺ CCW'}</span>
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Win / Loss indicator with precise green / red labels requested by the user */}
                      <td className="py-2.5 px-3">
                        {(() => {
                          const hasPrediction = (entry as any).hasDynamicPrediction !== undefined 
                            ? (entry as any).hasDynamicPrediction 
                            : (entry.coveredNumbers && entry.coveredNumbers.length > 0);
                          const hit = (entry as any).hasDynamicPrediction !== undefined 
                            ? (entry as any).dynamicIsHit 
                            : entry.isWin;

                          if (!hasPrediction) {
                            return (
                              <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-400 border border-slate-200 px-2.5 py-0.5 rounded-full text-[9px] font-black tracking-wide uppercase">
                                ⏳ ANALISANDO (SEM ENTRADA)
                              </span>
                            );
                          }

                          return hit ? (
                            <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border-emerald-200 px-2 py-0.5 rounded-full text-[10px] font-bold">
                              <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                              RESPEITOU (GREEN)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 bg-red-50 text-red-700 border-red-200 px-2 py-0.5 rounded-full text-[10px] font-bold">
                              <XCircle className="w-3.5 h-3.5 text-red-600" />
                              NÃO RESPEITOU (RED)
                            </span>
                          );
                        })()}
                      </td>

                      {/* Financial change column */}
                      <td className="py-2.5 px-3 font-mono font-bold">
                        {entry.balanceChange !== undefined && entry.balanceChange !== 0 ? (
                          <span className={entry.balanceChange > 0 ? 'text-emerald-600' : 'text-red-600'}>
                            {entry.balanceChange > 0 ? '+' : ''}R$ {entry.balanceChange.toFixed(0)}
                          </span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>

                      {/* Strategy name badge */}
                      <td className="py-2.5 px-3 text-slate-600">
                        <span className="bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded text-[10px] text-slate-500 font-mono">
                          {strategyLabelMap[entry.strategyUsed] || entry.strategyUsed}
                        </span>
                      </td>

                      {/* Active targets that were guessed for that spin */}
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1 flex-wrap">
                          {(() => {
                            const targets = ((entry as any).hasDynamicPrediction !== undefined 
                              ? (entry as any).dynamicTargets 
                              : entry.targets) || [];
                            const covered = ((entry as any).hasDynamicPrediction !== undefined 
                              ? (entry as any).dynamicCovered 
                              : entry.coveredNumbers) || [];

                            return targets.map((tgt, tIdx) => {
                              const isExactHit = tgt === entry.number;
                              const isNeighborHit = !isExactHit && (covered || []).includes(entry.number);
                              return (
                                <span
                                  key={`${entry.id}-target-${tgt}-${tIdx}`}
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border transition-all ${
                                    isExactHit
                                      ? 'bg-amber-100 text-amber-800 border-amber-300 font-black shadow-sm'
                                      : isNeighborHit
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                      : 'bg-slate-100 text-slate-400 border-slate-200'
                                  }`}
                                  title={isExactHit ? 'Alvo exato acertado!' : isNeighborHit ? 'Vizinho acertado!' : ''}
                                >
                                  {tgt}
                                </span>
                              );
                            });
                          })()}
                        </div>
                      </td>

                      {/* Timestamp */}
                      <td className="py-2.5 px-3 text-right font-mono text-[10px] text-slate-400">
                        {entry.timestamp}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
