import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Cpu, 
  CheckCircle2, 
  Circle, 
  AlertTriangle, 
  Sparkles, 
  Zap, 
  ArrowRight,
  TrendingUp,
  Search,
  LineChart,
  RefreshCw,
  HelpCircle,
  Award,
  Flame,
  Snowflake,
  ShieldAlert,
  Ban
} from 'lucide-react';
import { 
  PatternStatus, 
  TerminalDelay, 
  evaluateTerminal1Cycle, 
  calculateTerminalDelays,
  calculateCallerStats,
  calculateSequenceBreakouts,
  generateActiveTriggers,
  getFeaturedTerminalCycle,
  DigitSumDelay,
  calculateDigitSumStats,
  getDigitSum,
  calculateHotColdStats,
  HotColdNumber,
  HotColdStatsResult,
  evaluateSimplePatterns
} from '../lib/patterns';

interface PatternDetectorProps {
  historyNumbers: number[];
  onApplyTargets: (targets: number[], neighborRange: number, strategyName: string) => void;
}

type TabType = 'triggers' | 'simple_patterns' | 'callers' | 'breakouts' | 'delays' | 'somas' | 'hotcold';

export default function PatternDetector({ historyNumbers, onApplyTargets }: PatternDetectorProps) {
  const [activeTab, setActiveTab] = useState<TabType>('triggers');
  const [selectedCallerNum, setSelectedCallerNum] = useState<number | null>(
    historyNumbers.length > 0 ? historyNumbers[0] : null
  );

  // Synchronize selected caller number with the latest rolled number, or null if history is cleared
  useEffect(() => {
    if (historyNumbers.length > 0) {
      // Only set it automatically if it was null, or if the latest number changed
      setSelectedCallerNum(historyNumbers[0]);
    } else {
      setSelectedCallerNum(null);
    }
  }, [historyNumbers]);

  const featuredCycle = getFeaturedTerminalCycle(historyNumbers);
  const terminal1Status = featuredCycle.status;
  const featuredTerminal = featuredCycle.terminal;
  const terminalDelays = calculateTerminalDelays(historyNumbers);
  const activeTriggers = generateActiveTriggers(historyNumbers);
  const sequenceBreakouts = calculateSequenceBreakouts(historyNumbers);
  const callerStats = calculateCallerStats(historyNumbers, selectedCallerNum);
  const digitSumStats = calculateDigitSumStats(historyNumbers);
  const hotColdStats = calculateHotColdStats(historyNumbers);
  const simplePatterns = evaluateSimplePatterns(historyNumbers);

  // Quick select recent numbers for caller analysis
  const recentUniqueNumbers = Array.from(new Set(historyNumbers)).slice(0, 8);

  const handleApplyTargetsFromTrigger = (targets: number[], range: number, label: string) => {
    onApplyTargets(targets, range, 'manual');
  };

  const handleApplyGeneralTerminal = (terminal: number) => {
    const targets = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
      .map((x) => x * 10 + terminal)
      .filter((n) => n <= 36);
    onApplyTargets(targets, 2, 'manual');
  };

  const handleApplySector = (sectorKey: string) => {
    let targets: number[] = [];
    if (sectorKey === 'zeroGame') targets = [12, 35, 3, 26, 0, 32, 15];
    else if (sectorKey === 'voisins') targets = [22, 18, 29, 7, 28, 12, 35, 3, 26, 0, 32, 15, 19, 4, 21, 2, 25];
    else if (sectorKey === 'tiers') targets = [27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33];
    else targets = [1, 20, 14, 31, 9, 17, 34, 6];
    
    // Pick the top 4 numbers from that sector for the 4-targets mode
    onApplyTargets(targets.slice(0, 4), 2, 'manual');
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm space-y-0">
      
      {/* HEADER WITH METRIC STATUS */}
      <div className="bg-gradient-to-r from-slate-50 to-white p-4 border-b border-slate-200/85 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
            <Cpu className="w-4 h-4 text-indigo-600 animate-pulse" />
            Análise Avançada e Alvos Inteligentes
          </h3>
          <p className="text-[10px] text-slate-500 mt-0.5">
            Mapeador de ciclos, quebras de ritmo e taxas de respeito baseados nos últimos {historyNumbers.length} giros.
          </p>
        </div>

        {/* Global alert counter badge */}
        <div className="flex gap-2">
          {activeTriggers.length > 0 && (
            <span className="text-[9px] bg-red-50 border border-red-200 text-red-600 font-bold px-2.5 py-1 rounded-full uppercase tracking-wider animate-pulse flex items-center gap-1">
              <Zap className="w-3 h-3 fill-red-500" />
              {activeTriggers.length} Gatilhos Ativos
            </span>
          )}
          {terminal1Status.state === 'active' && (
            <span className="text-[9px] bg-emerald-500 text-white font-black px-2.5 py-1 rounded-full uppercase tracking-wider flex items-center gap-1 animate-pulse">
              Ciclo T{featuredTerminal} Completo
            </span>
          )}
        </div>
      </div>

      {/* DETECTOR QUICK TABS */}
      <div className="flex border-b border-slate-200 bg-slate-50/50 p-1 gap-1 overflow-x-auto">
        {[
          { id: 'triggers', label: 'Gatilhos', badge: activeTriggers.length },
          { id: 'simple_patterns', label: 'Padrão Simples', badge: (simplePatterns.bateEVolta.active ? 1 : 0) + (simplePatterns.repeticaoRegiao.active ? 1 : 0) },
          { id: 'callers', label: 'Chamadores', badge: null },
          { id: 'breakouts', label: 'Pivots', badge: sequenceBreakouts.length > 0 ? sequenceBreakouts.length : null },
          { id: 'delays', label: 'Terminais', badge: terminalDelays.filter(d => d.state === 'active').length },
          { id: 'somas', label: 'Somas', badge: digitSumStats.filter(d => d.state === 'active').length },
          { id: 'hotcold', label: 'Quentes & Frios', badge: hotColdStats.frozenNumbers.length > 0 ? hotColdStats.frozenNumbers.length : null }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as TabType)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === tab.id
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-500 hover:bg-white/40 hover:text-slate-800'
            }`}
          >
            <span>{tab.label}</span>
            {tab.badge !== null && tab.badge > 0 && (
              <span className={`px-1.5 py-0.2 text-[8px] font-black rounded-full ${
                tab.id === 'triggers' ? 'bg-red-500 text-white' : 'bg-slate-200 text-slate-700'
              }`}>
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* MAIN CONTENT DISPLAY */}
      <div className="p-4 bg-white min-h-[220px]">
        <AnimatePresence mode="wait">
          {historyNumbers.length < 30 ? (
            <motion.div
              key="germination-phase"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="flex flex-col items-center justify-center py-10 px-4 text-center space-y-4"
            >
              <div className="relative">
                <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-sm animate-pulse">
                  <Cpu className="w-8 h-8" />
                </div>
                <div className="absolute -bottom-1 -right-1 bg-white border border-emerald-300 text-[9px] font-black text-emerald-700 px-1.5 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
                  🌱 {historyNumbers.length}/30
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="text-xs font-black uppercase tracking-wider text-slate-800">
                  Mapeador em Período de Germinação
                </div>
                <p className="text-[10px] text-slate-500 max-w-md mx-auto leading-relaxed">
                  Os motores analíticos de IA e os varredores de ciclos estão em calibração dinâmica.
                  Para blindar suas operações contra desvios de curto prazo e garantir significância estatística de Markov,
                  é necessário acumular <span className="text-emerald-600 font-bold">no mínimo 30 números</span> no histórico.
                </p>
              </div>

              {/* Progress bar */}
              <div className="w-full max-w-xs space-y-1">
                <div className="flex justify-between text-[8px] font-black uppercase tracking-widest text-slate-400">
                  <span>Semeadura de Dados</span>
                  <span className="text-emerald-600">{Math.round((historyNumbers.length / 30) * 100)}%</span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                  <motion.div
                    className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400"
                    initial={{ width: 0 }}
                    animate={{ width: `${(historyNumbers.length / 30) * 100}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
                <div className="text-[8px] text-slate-400 italic">
                  Faltam exatamente {30 - historyNumbers.length} giros registrados.
                </div>
              </div>
            </motion.div>
          ) : (
            <>
              {/* TAB 1: ACTIVE ENTRY TRIGGERS */}
              {activeTab === 'triggers' && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="space-y-3.5"
            >
              {activeTriggers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center space-y-2">
                  <div className="p-3 bg-slate-50 rounded-full border border-slate-200 text-slate-400">
                    <Sparkles className="w-5 h-5 text-indigo-500 animate-pulse" />
                  </div>
                  <div className="text-xs font-black text-slate-700 uppercase tracking-wider">Rastreando oportunidades...</div>
                  <p className="text-[10px] text-slate-400 max-w-sm leading-relaxed">
                    Gatilhos de entrada com alta precisão matemática serão mostrados aqui assim que os atrasos de terminais superarem 12 giros ou ciclos forem confirmados.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  <p className="text-[10px] text-slate-400 italic">
                    💡 Clique em "Ativar Gatilho" para focar a mesa de apostas imediatamente no sinal quente.
                  </p>
                  
                  {activeTriggers.map((trigger) => (
                    <div
                      key={trigger.id}
                      className={`border rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all relative overflow-hidden ${
                        trigger.severity === 'high'
                          ? 'bg-red-50/70 border-red-200 text-red-950 shadow-sm'
                          : 'bg-amber-50/70 border-amber-200 text-amber-950'
                      }`}
                    >
                      {/* Left Side: Info */}
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${trigger.severity === 'high' ? 'bg-red-500 animate-ping' : 'bg-amber-500'}`}></span>
                          <span className="text-[11px] font-black uppercase tracking-wider text-slate-800">
                            {trigger.title}
                          </span>
                          <span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wide ${
                            trigger.severity === 'high' ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-amber-100 text-amber-700 border border-amber-200'
                          }`}>
                            GATILHO {trigger.severity === 'high' ? 'QUENTE' : 'CONFIRMADO'}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 leading-relaxed font-medium">
                          {trigger.description}
                        </p>

                        {/* Targets preview */}
                        <div className="flex items-center gap-1.5 pt-1">
                          <span className="text-[9px] text-slate-400 font-bold uppercase">Alvos:</span>
                          <div className="flex gap-1">
                            {trigger.recommendedTargets.map((num) => (
                              <span key={num} className="text-[9px] font-mono bg-white text-slate-800 font-bold border border-slate-200 px-1.5 py-0.5 rounded shadow-xs">
                                {num}
                              </span>
                            ))}
                          </div>
                          <span className="text-[9px] text-slate-400 ml-1">+{trigger.neighborRange} vizinhos</span>
                        </div>
                      </div>

                      {/* Right Side: Action Button */}
                      <div className="shrink-0">
                        <button
                          onClick={() => handleApplyTargetsFromTrigger(trigger.recommendedTargets, trigger.neighborRange, trigger.actionLabel)}
                          className={`w-full sm:w-auto flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer shadow-sm ${
                            trigger.severity === 'high'
                              ? 'bg-red-600 text-white hover:bg-red-500 hover:scale-102'
                              : 'bg-amber-500 text-slate-950 hover:bg-amber-400 hover:scale-102'
                          }`}
                        >
                          <Zap className="w-3.5 h-3.5 fill-current" />
                          <span>Ativar Gatilho</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* SPECIFIC DYNAMIC TERMINAL FLOW STATE (Persistent detail) */}
              <div className="mt-3 bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2.5 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-700 font-bold uppercase tracking-wider flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    Ciclo Histórico do Terminal {featuredTerminal}
                  </span>
                  <span className="text-[9px] font-mono text-slate-400 font-bold">
                    Etapa Atual: {terminal1Status.currentStep}/3
                  </span>
                </div>
                <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-500 ${
                      terminal1Status.state === 'active' 
                        ? 'bg-emerald-500' 
                        : terminal1Status.state === 'warning' 
                        ? 'bg-amber-500' 
                        : 'bg-slate-400'
                    }`}
                    style={{ width: `${terminal1Status.progress}%` }}
                  ></div>
                </div>
                <p className="text-[9px] text-slate-500 leading-normal font-medium">
                  {terminal1Status.details}
                </p>
              </div>

            </motion.div>
          )}

                   {/* TAB: SIMPLE PATTERNS (BATE E VOLTA & REPETIÇÃO) */}
          {activeTab === 'simple_patterns' && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="space-y-4"
            >
              <div>
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-500" />
                  Estratégias de Fluxo Térmico e de Zona
                </h4>
                <p className="text-[10px] text-slate-400 font-medium">
                  Modelagem preditiva em tempo real sobre ancoragem e escapes de balística física no cilindro.
                </p>
              </div>

              {/* PRIMARY ANALYSIS CARD: TERMINAL BASE (USER'S MAIN STRATEGY) */}
              <div className={`border rounded-xl p-4 flex flex-col justify-between space-y-3.5 transition-all relative overflow-hidden ${
                simplePatterns.terminalBaseAnalysis?.triggerSignal
                  ? 'bg-red-50/50 border-red-200 text-red-950 shadow-sm'
                  : 'bg-slate-50/70 border-slate-200 text-slate-700'
              }`}>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[9px] bg-red-100 text-red-700 border border-red-200 font-black px-1.5 py-0.5 rounded uppercase tracking-wider">
                        Análise Principal
                      </span>
                      {simplePatterns.terminalBaseAnalysis?.observationDistance === 1 ? (
                        <span className="text-[9px] bg-indigo-50 border border-indigo-200 text-indigo-700 font-black px-1.5 py-0.5 rounded uppercase tracking-wider">
                          🎯 Distância: 1 Vizinho
                        </span>
                      ) : (
                        <span className="text-[9px] bg-amber-50 border border-amber-200 text-amber-700 font-black px-1.5 py-0.5 rounded uppercase tracking-wider">
                          ⚠️ 1 Vizinho Aleatório ➔ Distância: 2 Vizinhos
                        </span>
                      )}
                    </div>
                    <h5 className="text-xs font-black uppercase text-slate-800 tracking-wide flex items-center gap-1.5 mt-1.5">
                      🎯 Terminal Base Ativo: T{simplePatterns.terminalBaseAnalysis?.activeTerminal ?? 4}
                    </h5>
                  </div>
                  {simplePatterns.terminalBaseAnalysis?.triggerSignal ? (
                    <span className="text-[9px] bg-red-600 text-white font-black px-2.5 py-0.8 rounded-full uppercase tracking-wider flex items-center gap-1 animate-bounce shadow-md">
                      🚨 ENTRAR AGORA (VOLTA)
                    </span>
                  ) : (
                    <span className="text-[9px] bg-slate-200/80 text-slate-500 font-extrabold px-2.5 py-0.8 rounded-full uppercase tracking-wider">
                      Mapeando Tendência
                    </span>
                  )}
                </div>

                <p className="text-[10.5px] text-slate-600 leading-relaxed font-medium">
                  {simplePatterns.terminalBaseAnalysis?.reasoning ?? 'Análise indisponível.'}
                </p>

                {/* Sub-lists of base numbers and neighbors */}
                {simplePatterns.terminalBaseAnalysis?.baseNumbers && simplePatterns.terminalBaseAnalysis.baseNumbers.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1.5">
                    <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-xs">
                      <span className="text-[9px] text-emerald-600 font-extrabold uppercase tracking-wider block mb-1">
                        Alvos do Terminal ({simplePatterns.terminalBaseAnalysis.baseNumbers.length})
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {simplePatterns.terminalBaseAnalysis.baseNumbers.map(n => (
                          <span key={`tb-base-${n}`} className="px-1.5 py-0.5 bg-slate-50 border border-slate-200 text-slate-800 rounded text-[10px] font-mono font-bold shadow-xs">
                            {n}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-xs">
                      <span className="text-[9px] text-amber-600 font-extrabold uppercase tracking-wider block mb-1">
                        1º Vizinho Físico ({simplePatterns.terminalBaseAnalysis.neighbors1.length})
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {simplePatterns.terminalBaseAnalysis.neighbors1.map(n => (
                          <span key={`tb-n1-${n}`} className="px-1.5 py-0.5 bg-slate-50 border border-slate-200 text-slate-600 rounded text-[10px] font-mono">
                            {n}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-xs">
                      <span className="text-[9px] text-indigo-600 font-extrabold uppercase tracking-wider block mb-1">
                        2º Vizinho Físico ({simplePatterns.terminalBaseAnalysis.neighbors2.length})
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {simplePatterns.terminalBaseAnalysis.neighbors2.map(n => (
                          <span key={`tb-n2-${n}`} className="px-1.5 py-0.5 bg-slate-50 border border-slate-200 text-slate-500 rounded text-[10px] font-mono">
                            {n}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Dashboard statistics */}
                <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-slate-200">
                  <div className="flex items-center gap-3.5 text-[9.5px] text-slate-400 font-mono">
                    <div>
                      Densidade T{simplePatterns.terminalBaseAnalysis?.activeTerminal ?? 4} (15 giros):{' '}
                      <span className="text-slate-700 font-bold">{simplePatterns.terminalBaseAnalysis?.densityInHistory ?? 0} acertos</span>
                    </div>
                    <div className="hidden sm:block text-slate-200">|</div>
                    <div>
                      Ancoragem recente (5 giros):{' '}
                      <span className="text-slate-700 font-bold">{simplePatterns.terminalBaseAnalysis?.recentHitsCount ?? 0}x vizinhos</span>
                    </div>
                  </div>

                  {simplePatterns.terminalBaseAnalysis?.baseNumbers && (
                    <button
                      onClick={() => onApplyTargets(simplePatterns.terminalBaseAnalysis.baseNumbers, 2, `Terminal Base: T${simplePatterns.terminalBaseAnalysis.activeTerminal}`)}
                      className={`text-[9.5px] uppercase font-black tracking-wider py-1.5 px-3 rounded-lg cursor-pointer transition-all flex items-center gap-1 shrink-0 ${
                        simplePatterns.terminalBaseAnalysis.triggerSignal
                          ? 'bg-red-600 hover:bg-red-500 text-white font-black animate-pulse'
                          : 'bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold'
                      }`}
                    >
                      Ativar Alvos T{simplePatterns.terminalBaseAnalysis.activeTerminal}
                    </button>
                  )}
                </div>
              </div>

              {/* Main Analysis Cards (Grid of Bate e Volta + Repetição) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                
                {/* CARD 1: BATE E VOLTA */}
                <div className={`border rounded-xl p-3.5 flex flex-col justify-between space-y-3 transition-all relative overflow-hidden ${
                  simplePatterns.bateEVolta.active
                    ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                    : 'bg-slate-50/70 border-slate-200 text-slate-500'
                }`}>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <span className="text-[9px] uppercase tracking-widest font-black text-slate-400">OPERACIONAL</span>
                      <h5 className="text-[11px] font-black uppercase text-slate-800 tracking-wide flex items-center gap-1.5">
                        🔄 Bate e Volta (Alternância)
                      </h5>
                    </div>
                    {simplePatterns.bateEVolta.active ? (
                      <span className="text-[8px] bg-emerald-500 text-white font-black px-1.5 py-0.5 rounded uppercase tracking-wider flex items-center gap-1 animate-pulse">
                        <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
                        ATIVO ({simplePatterns.bateEVolta.streak + 1} Giros)
                      </span>
                    ) : (
                      <span className="text-[8px] bg-slate-200 text-slate-400 font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider">
                        Aguardando
                      </span>
                    )}
                  </div>

                  {simplePatterns.bateEVolta.active ? (
                    <div className="space-y-2">
                      <p className="text-[10px] text-slate-600 font-medium">
                        O cilindro está alternando padrões de <strong>{simplePatterns.bateEVolta.description}</strong>.
                      </p>
                      
                      {/* Sequence tracker */}
                      <div className="flex items-center gap-1.5 bg-white p-2 rounded-lg border border-slate-200 w-fit shadow-xs">
                        <span className="text-[8px] text-slate-400 uppercase tracking-tighter font-extrabold">Sequência:</span>
                        <div className="flex gap-1">
                          {simplePatterns.bateEVolta.sequence.map((term, i) => (
                            <span key={`seq-term-${i}`} className="text-xs font-bold text-slate-700">{term}</span>
                          ))}
                        </div>
                      </div>

                      {/* Entry advice */}
                      <div className="bg-emerald-100/40 border border-emerald-200 rounded-lg p-2.5 text-left space-y-1">
                        <span className="text-[8px] text-emerald-700 font-black uppercase tracking-wider">Jogada Recomendada:</span>
                        <div className="flex justify-between items-center gap-2">
                          <span className="text-[10.5px] font-bold text-slate-800">Seguir fluxo para {simplePatterns.bateEVolta.recommendedPlay}</span>
                          <button
                            onClick={() => onApplyTargets(simplePatterns.bateEVolta.targets.slice(0, 5), 2, `Bate e Volta: ${simplePatterns.bateEVolta.recommendedPlay}`)}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[9px] uppercase tracking-wider py-1 px-2.5 rounded cursor-pointer transition-all shrink-0"
                          >
                            Ativar Alvos
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2 py-1 text-left">
                      <p className="text-[10px] text-slate-400 leading-relaxed font-medium">
                        Nenhuma alternância crítica ativa no momento. O sistema está aguardando pelo menos 3 rodadas consecutivas de alternância entre cores ou paridade para sinalizar entrada.
                      </p>
                      <div className="text-[9px] text-slate-400 font-mono italic">
                        {simplePatterns.delays.colorStreakDelay >= 3 ? (
                          <span className="text-amber-600 font-bold">🚨 Mesma cor repetindo há {simplePatterns.delays.colorStreakDelay} rodadas. Alternância atrasando!</span>
                        ) : (
                          <span>Cores consecutivas: {simplePatterns.delays.colorStreakDelay}x</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* CARD 2: REPETIÇÃO DE REGIÃO */}
                <div className={`border rounded-xl p-3.5 flex flex-col justify-between space-y-3 transition-all relative overflow-hidden ${
                  simplePatterns.repeticaoRegiao.active
                    ? 'bg-amber-50/70 border-amber-200 text-amber-950'
                    : 'bg-slate-50/70 border-slate-200 text-slate-500'
                }`}>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <span className="text-[9px] uppercase tracking-widest font-black text-slate-400">OPERACIONAL</span>
                      <h5 className="text-[11px] font-black uppercase text-slate-800 tracking-wide flex items-center gap-1.5">
                        🎯 Repetição de Região
                      </h5>
                    </div>
                    {simplePatterns.repeticaoRegiao.active ? (
                      <span className="text-[8px] bg-amber-500 text-white font-black px-1.5 py-0.5 rounded uppercase tracking-wider flex items-center gap-1 animate-pulse">
                        <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
                        ATIVO ({simplePatterns.repeticaoRegiao.streak} Giros)
                      </span>
                    ) : (
                      <span className="text-[8px] bg-slate-200 text-slate-400 font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider">
                        Aguardando
                      </span>
                    )}
                  </div>

                  {simplePatterns.repeticaoRegiao.active ? (
                    <div className="space-y-2">
                      <p className="text-[10px] text-slate-600 font-medium">
                        A bola está se concentrando na região de: <strong>{simplePatterns.repeticaoRegiao.description}</strong>.
                      </p>

                      {/* Region type details */}
                      <div className="bg-white p-1.5 rounded-lg border border-slate-200 text-[9px] font-mono text-slate-600 font-bold w-fit shadow-xs">
                        Área ativa: {simplePatterns.repeticaoRegiao.sectorName} ({simplePatterns.repeticaoRegiao.streak}x consecutivas)
                      </div>

                      {/* Entry advice */}
                      <div className="bg-amber-100/40 border border-amber-200 rounded-lg p-2.5 text-left space-y-1">
                        <span className="text-[8px] text-amber-700 font-black uppercase tracking-wider">Jogada Recomendada:</span>
                        <div className="flex justify-between items-center gap-2">
                          <span className="text-[10.5px] font-bold text-slate-800">Cercar região para repetição de fluxo</span>
                          <button
                            onClick={() => onApplyTargets(simplePatterns.repeticaoRegiao.targets.slice(0, 5), 2, `Repetição: ${simplePatterns.repeticaoRegiao.sectorName}`)}
                            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[9px] uppercase tracking-wider py-1 px-2.5 rounded cursor-pointer transition-all shrink-0"
                          >
                            Ativar Alvos
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2 py-1 text-left">
                      <p className="text-[10px] text-slate-400 leading-relaxed font-medium">
                        Nenhuma repetição física de setor ou quadrante detectada nos últimos giros. A roleta está mudando de área a cada rodada.
                      </p>
                      <div className="text-[9px] text-slate-400 font-mono italic">
                        {simplePatterns.delays.sectorRepeatDelay >= 8 ? (
                          <span className="text-red-500 font-bold">🚨 Sem repetição de setor há {simplePatterns.delays.sectorRepeatDelay} giros (Atrasado!)</span>
                        ) : (
                          <span>Giros desde última dobra: {simplePatterns.delays.sectorRepeatDelay}x</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

              </div>

              {/* CARD 3 (FULL WIDTH): PREVISÃO AVANÇADA DE DOBRAS E RETORNOS */}
              <div className={`border rounded-xl p-4 flex flex-col justify-between space-y-3.5 transition-all relative overflow-hidden ${
                simplePatterns.previsaoDobraRetorno.active
                  ? 'bg-indigo-50/70 border-indigo-200 text-indigo-950 shadow-sm'
                  : 'bg-slate-50/70 border-slate-200 text-slate-500'
              }`}>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] bg-indigo-100 text-indigo-700 border border-indigo-200 font-black px-1.5 py-0.5 rounded uppercase tracking-wider">
                        Gatilho Especial
                      </span>
                      <span className="text-[9px] uppercase tracking-widest font-black text-slate-400">PADRÃO DE ROLETAS</span>
                    </div>
                    <h5 className="text-[12px] font-black uppercase text-slate-800 tracking-wide flex items-center gap-1.5 mt-1.5">
                      🧿 Previsão de Dobras e Retornos (Região de Começo)
                    </h5>
                  </div>
                  {simplePatterns.previsaoDobraRetorno.active ? (
                    <span className="text-[8.5px] bg-indigo-600 text-white font-black px-2 py-0.5 rounded uppercase tracking-widest flex items-center gap-1 animate-pulse shadow-md">
                      <Sparkles className="w-3 h-3 text-white" />
                      ALVO DETECTADO
                    </span>
                  ) : (
                    <span className="text-[8px] bg-slate-200 text-slate-400 font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider">
                      Aguardando Dobra
                    </span>
                  )}
                </div>

                {simplePatterns.previsaoDobraRetorno.active ? (
                  <div className="space-y-3.5">
                    <p className="text-[11px] text-slate-700 leading-relaxed font-medium">
                      O sistema identificou a sequência de dobra: <strong className="text-slate-800 font-mono text-xs bg-white px-2 py-0.5 rounded border border-slate-200 shadow-xs">{simplePatterns.previsaoDobraRetorno.description}</strong>.
                      <br />
                      Quando esse padrão ocorre, a roleta costuma descarregar de três formas principais de repetição simples:
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mt-2">
                      {/* Opção 1: Retorno ao Terminal */}
                      <div className="bg-white border border-slate-200 p-2.5 rounded-lg flex flex-col justify-between text-left shadow-xs">
                        <div>
                          <span className="text-[8px] text-indigo-600 font-black uppercase tracking-wider block mb-1">Opção A: Retorno de Terminal</span>
                          <p className="text-[10px] text-slate-500 leading-tight font-medium">
                            Volta no terminal <strong className="text-indigo-600 font-mono text-xs">"{simplePatterns.previsaoDobraRetorno.terminalA}"</strong> para pagar a simetria de terminais.
                          </p>
                        </div>
                        <div className="mt-2.5 flex items-center gap-1 flex-wrap">
                          {simplePatterns.previsaoDobraRetorno.targetsTerminal.map(n => (
                            <span key={`dobra-term-${n}`} className="text-[9px] font-mono font-bold bg-slate-50 text-slate-800 border border-slate-200 w-5 h-5 rounded-full flex items-center justify-center shadow-xs">
                              {n}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Opção 2: Repetição Tripla */}
                      <div className="bg-white border border-slate-200 p-2.5 rounded-lg flex flex-col justify-between text-left shadow-xs">
                        <div>
                          <span className="text-[8px] text-indigo-600 font-black uppercase tracking-wider block mb-1">Opção B: Repetição Tripla</span>
                          <p className="text-[10px] text-slate-500 leading-tight font-medium">
                            O número atual <strong className="text-slate-800 font-mono text-xs">{simplePatterns.previsaoDobraRetorno.numB}</strong> repete uma 3ª vez consecutiva.
                          </p>
                        </div>
                        <div className="mt-2.5 flex items-center gap-1">
                          <span className="text-xs font-mono font-black bg-slate-900 text-white border border-slate-850 w-6 h-6 rounded-full flex items-center justify-center shadow-md">
                            {simplePatterns.previsaoDobraRetorno.numB}
                          </span>
                        </div>
                      </div>

                      {/* Opção 3: Retorno de Região */}
                      <div className="bg-white border border-slate-200 p-2.5 rounded-lg flex flex-col justify-between text-left shadow-xs">
                        <div>
                          <span className="text-[8px] text-indigo-600 font-black uppercase tracking-wider block mb-1">Opção C: Região de Início</span>
                          <p className="text-[10px] text-slate-500 leading-tight font-medium">
                            Volta para a região física do cilindro onde o movimento começou (<strong className="text-indigo-600 font-mono text-xs">{simplePatterns.previsaoDobraRetorno.numA}</strong>).
                          </p>
                        </div>
                        <div className="mt-2.5 flex items-center gap-1 flex-wrap">
                          {simplePatterns.previsaoDobraRetorno.targetsRegion.slice(0, 5).map(n => (
                            <span key={`dobra-reg-${n}`} className="text-[9px] font-mono font-bold bg-slate-50 text-slate-800 border border-slate-200 w-5 h-5 rounded-full flex items-center justify-center shadow-xs">
                              {n}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Button to apply combined strategy */}
                    <div className="bg-indigo-100/40 border border-indigo-200 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-1 text-left">
                      <div>
                        <span className="text-[8.5px] text-indigo-700 font-black uppercase tracking-wider block">Fazer Cerco Completo:</span>
                        <span className="text-[10px] text-slate-600 font-medium">Recomendamos cobrir os terminais de {simplePatterns.previsaoDobraRetorno.terminalA}, a tripla de {simplePatterns.previsaoDobraRetorno.numB} e a vizinhança de {simplePatterns.previsaoDobraRetorno.numA}.</span>
                      </div>
                      <button
                        onClick={() => onApplyTargets(simplePatterns.previsaoDobraRetorno.combinedTargets, 2, `Retorno de Dobra: Terminal ${simplePatterns.previsaoDobraRetorno.terminalA} & Região ${simplePatterns.previsaoDobraRetorno.numA}`)}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white font-black text-[10px] uppercase tracking-wider py-2 px-4 rounded-xl cursor-pointer transition-all shrink-0 shadow-md"
                      >
                        Ativar Cerco de Dobras
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-left space-y-1.5 py-1">
                    <p className="text-[10.5px] text-slate-400 leading-relaxed font-medium">
                      Nenhum gatilho de dobra ativa no momento. Este analisador entra em prontidão máxima quando ocorrem sequências do tipo <span className="font-mono text-slate-600 bg-white px-1.5 py-0.5 rounded border border-slate-200 shadow-xs">12 ➜ 36 36</span> ou <span className="font-mono text-slate-600 bg-white px-1.5 py-0.5 rounded border border-slate-200 shadow-xs">12 12 ➜ 36 36</span>.
                    </p>
                    <p className="text-[9.5px] text-slate-400 italic">
                      O sistema prevê automaticamente: (1) Volta no terminal do número inicial para pagar o terminal correspondente, (2) Repetição tripla do número repetidor, ou (3) Retorno à vizinhança física do cilindro onde o movimento começou.
                    </p>
                  </div>
                )}
              </div>

              {/* STATS BOARD: DELAYS OF THE SIMPLE PATTERNS */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-3 shadow-xs">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="text-[10px] text-slate-800 font-black uppercase tracking-widest">
                    Métricas de Atraso e Tendência (Padrões Simples)
                  </span>
                  <span className="text-[8.5px] text-slate-400 font-bold uppercase">Muito Atrasado = Alerta Vermelho</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  
                  {/* Delay 1: Sector Repetition */}
                  <div className={`p-2.5 rounded-lg border flex flex-col justify-between ${
                    simplePatterns.delays.sectorRepeatDelay >= 10
                      ? 'bg-red-50 border-red-200 text-red-900 shadow-xs'
                      : simplePatterns.delays.sectorRepeatDelay >= 7
                      ? 'bg-amber-50 border-amber-200 text-amber-900 shadow-xs'
                      : 'bg-white border-slate-200 text-slate-500 shadow-xs'
                  }`}>
                    <span className="text-[8px] uppercase tracking-wider font-extrabold text-slate-400">Dobrar Setor</span>
                    <div className="my-1.5">
                      <div className="text-sm font-black font-mono text-slate-800 leading-none">
                        {simplePatterns.delays.sectorRepeatDelay} <span className="text-[8px] font-bold text-slate-400">giros</span>
                      </div>
                    </div>
                    <span className={`text-[7px] font-black uppercase tracking-wide px-1 rounded-sm w-fit ${
                      simplePatterns.delays.sectorRepeatDelay >= 10
                        ? 'bg-red-100 text-red-700 border border-red-200'
                        : 'bg-slate-100 text-slate-500 border border-slate-200'
                    }`}>
                      {simplePatterns.delays.sectorRepeatDelay >= 10 ? 'MUITO ATRASADO' : 'NORMAL'}
                    </span>
                  </div>

                  {/* Delay 2: Color Streak Delay */}
                  <div className={`p-2.5 rounded-lg border flex flex-col justify-between ${
                    simplePatterns.delays.colorStreakDelay >= 5
                      ? 'bg-red-50 border-red-200 text-red-900 shadow-xs'
                      : simplePatterns.delays.colorStreakDelay >= 4
                      ? 'bg-amber-50 border-amber-200 text-amber-900 shadow-xs'
                      : 'bg-white border-slate-200 text-slate-500 shadow-xs'
                  }`}>
                    <span className="text-[8px] uppercase tracking-wider font-extrabold text-slate-400">Cores Seguidas</span>
                    <div className="my-1.5">
                      <div className="text-sm font-black font-mono text-slate-800 leading-none">
                        {simplePatterns.delays.colorStreakDelay} <span className="text-[8px] font-bold text-slate-400">giros</span>
                      </div>
                    </div>
                    <span className={`text-[7px] font-black uppercase tracking-wide px-1 rounded-sm w-fit ${
                      simplePatterns.delays.colorStreakDelay >= 5
                        ? 'bg-red-100 text-red-700 border border-red-200'
                        : 'bg-slate-100 text-slate-500 border border-slate-200'
                    }`}>
                      {simplePatterns.delays.colorStreakDelay >= 5 ? 'QUEBRA IMINENTE' : 'ESTÁVEL'}
                    </span>
                  </div>

                  {/* Delay 3: Dozen Repeat Delay */}
                  <div className={`p-2.5 rounded-lg border flex flex-col justify-between ${
                    simplePatterns.delays.dozenRepeatDelay >= 8
                      ? 'bg-red-50 border-red-200 text-red-900 shadow-xs'
                      : 'bg-white border-slate-200 text-slate-500 shadow-xs'
                  }`}>
                    <span className="text-[8px] uppercase tracking-wider font-extrabold text-slate-400">Dobrar Dúzia</span>
                    <div className="my-1.5">
                      <div className="text-sm font-black font-mono text-slate-800 leading-none">
                        {simplePatterns.delays.dozenRepeatDelay} <span className="text-[8px] font-bold text-slate-400">giros</span>
                      </div>
                    </div>
                    <span className={`text-[7px] font-black uppercase tracking-wide px-1 rounded-sm w-fit ${
                      simplePatterns.delays.dozenRepeatDelay >= 8
                        ? 'bg-red-100 text-red-700 border border-red-200'
                        : 'bg-slate-100 text-slate-500 border border-slate-200'
                    }`}>
                      {simplePatterns.delays.dozenRepeatDelay >= 8 ? 'ATRASADO' : 'NORMAL'}
                    </span>
                  </div>

                  {/* Delay 4: Column Repeat Delay */}
                  <div className={`p-2.5 rounded-lg border flex flex-col justify-between ${
                    simplePatterns.delays.columnRepeatDelay >= 8
                      ? 'bg-red-50 border-red-200 text-red-900 shadow-xs'
                      : 'bg-white border-slate-200 text-slate-500 shadow-xs'
                  }`}>
                    <span className="text-[8px] uppercase tracking-wider font-extrabold text-slate-400">Dobrar Coluna</span>
                    <div className="my-1.5">
                      <div className="text-sm font-black font-mono text-slate-800 leading-none">
                        {simplePatterns.delays.columnRepeatDelay} <span className="text-[8px] font-bold text-slate-400">giros</span>
                      </div>
                    </div>
                    <span className={`text-[7px] font-black uppercase tracking-wide px-1 rounded-sm w-fit ${
                      simplePatterns.delays.columnRepeatDelay >= 8
                        ? 'bg-red-100 text-red-700 border border-red-200'
                        : 'bg-slate-100 text-slate-500 border border-slate-200'
                    }`}>
                      {simplePatterns.delays.columnRepeatDelay >= 8 ? 'ATRASADO' : 'NORMAL'}
                    </span>
                  </div>

                </div>
              </div>

              {/* Informative Footer explaining Padrão Simples */}
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl text-left text-[9.5px] text-slate-500 leading-relaxed font-medium">
                ℹ️ <strong>O que são Padrões Simples?</strong> São comportamentos mecânicos previsíveis e de alta frequência na roleta. O <strong>Bate e Volta</strong> consiste no pêndulo ou ping-pong de cores ou paridades, excelente para alvos de fluxo rápido. A <strong>Repetição de Região</strong> analisa a tendência do crupiê de soltar a bola repetidamente no mesmo setor do cilindro ou na vizinhança física próxima do giro anterior, ideal para cercos rápidos com vizinhos!
              </div>

            </motion.div>
          )}

          {/* TAB 2: INTERACTIVE CALLERS STUDY MAP (50+ NUMBERS ANALYTICS) */}
          {activeTab === 'callers' && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="space-y-4"
            >
              <div>
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <LineChart className="w-4 h-4 text-indigo-500" />
                  Mapeador Analítico de Chamadas ("Que Número chama o quê")
                </h4>
                <p className="text-[10px] text-slate-400 font-medium">
                  Estudo de probabilidade. Quando o número selecionado cai, qual área ou terminal costuma respeitar logo em seguida?
                </p>
              </div>

              {/* Selection row */}
              <div className="flex flex-wrap items-center gap-1.5 bg-slate-50 p-2.5 rounded-xl border border-slate-200 shadow-xs">
                <span className="text-[9px] text-slate-500 font-bold uppercase mr-1">Rápidos:</span>
                {recentUniqueNumbers.length === 0 ? (
                  <span className="text-[9px] text-slate-400 font-mono">Nenhum número no histórico</span>
                ) : (
                  recentUniqueNumbers.map((num) => (
                    <button
                      key={`caller-sel-${num}`}
                      onClick={() => setSelectedCallerNum(num)}
                      className={`w-7 h-7 rounded-lg text-xs font-black font-mono flex items-center justify-center transition-all cursor-pointer ${
                        selectedCallerNum === num
                          ? 'bg-emerald-500 text-white border border-emerald-400 shadow-sm scale-105'
                          : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 shadow-xs'
                      }`}
                    >
                      {num}
                    </button>
                  ))
                )}

                {/* Manual Number Picker input */}
                <div className="ml-auto flex items-center gap-1">
                  <span className="text-[9px] text-slate-400">Outro:</span>
                  <select
                    value={selectedCallerNum ?? ''}
                    onChange={(e) => setSelectedCallerNum(e.target.value !== '' ? parseInt(e.target.value) : null)}
                    className="bg-white text-slate-700 text-xs font-mono font-bold rounded border border-slate-200 px-1.5 py-0.5 cursor-pointer focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="">Selecione...</option>
                    {Array.from({ length: 37 }, (_, i) => i).map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* STATS RESULTS PANEL */}
              {callerStats === null ? (
                <div className="text-center py-8 text-slate-400 text-[10px] font-medium">
                  Selecione um número acima para calcular e exibir o estudo de chamadores.
                </div>
              ) : callerStats.totalOccurrences === 0 ? (
                <div className="text-center py-8 text-slate-400 text-[10px] border border-dashed border-slate-200 rounded-xl font-medium leading-relaxed">
                  O número <span className="font-mono text-slate-800 font-bold">{selectedCallerNum}</span> não possui ocorrências suficientes no histórico para gerar projeções de sucessores. Insira mais rodadas!
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  
                  {/* Column 1: Sectors called */}
                  <div className="bg-slate-50/50 border border-slate-200 p-3 rounded-xl space-y-2">
                    <span className="text-[9px] text-slate-700 font-black uppercase tracking-wider flex items-center gap-1">
                      👑 Áreas Preferidas
                    </span>
                    <div className="space-y-2">
                      {callerStats.hottestNextSectors.map((sec, i) => (
                        <div key={sec.sector} className="space-y-1">
                          <div className="flex justify-between text-[10px] font-medium">
                            <span className="text-slate-800 font-bold">{sec.name}</span>
                            <span className="font-mono text-emerald-600 font-bold">{sec.pct}% ({sec.count}x)</span>
                          </div>
                          <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${i === 0 ? 'bg-emerald-500' : 'bg-slate-400'}`}
                              style={{ width: `${sec.pct}%` }}
                            ></div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Quick play area button */}
                    {callerStats.hottestNextSectors.length > 0 && (
                      <button
                        onClick={() => handleApplySector(callerStats.hottestNextSectors[0].sector)}
                        className="w-full mt-2 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded text-[9px] font-black uppercase tracking-wider cursor-pointer border border-emerald-200 transition-all shadow-xs"
                      >
                        Jogar {callerStats.hottestNextSectors[0].name.split(' ')[0]}
                      </button>
                    )}
                  </div>

                  {/* Column 2: Numbers called */}
                  <div className="bg-slate-50/50 border border-slate-200 p-3 rounded-xl space-y-2">
                    <span className="text-[9px] text-slate-700 font-black uppercase tracking-wider flex items-center gap-1">
                      🎯 Números Vizinhos Quentes
                    </span>
                    <div className="space-y-1.5">
                      {callerStats.hottestNextNumbers.map((item) => (
                        <div key={item.number} className="flex items-center justify-between text-[10px] bg-white p-1.5 rounded-lg border border-slate-200 shadow-xs">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 bg-slate-900 text-white font-mono font-black text-[10px] flex items-center justify-center rounded shadow-xs">
                              {item.number}
                            </span>
                            <span className="text-slate-500 text-[9px] font-medium">Sucedeu {item.count}x</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold text-slate-800 text-[9px]">{item.pct}%</span>
                            <button
                              onClick={() => onApplyTargets([item.number], 2, 'manual')}
                              className="p-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-md cursor-pointer transition-all border border-slate-200"
                              title="Jogar este número com vizinhos"
                            >
                              <Zap className="w-3 h-3 fill-amber-400 text-amber-500" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Column 3: Terminals called */}
                  <div className="bg-slate-50/50 border border-slate-200 p-3 rounded-xl space-y-2">
                    <span className="text-[9px] text-slate-700 font-black uppercase tracking-wider flex items-center gap-1">
                      🔢 Terminais Sucedidos
                    </span>
                    <div className="space-y-1.5">
                      {callerStats.hottestNextTerminals.map((item) => (
                        <div key={item.terminal} className="flex items-center justify-between text-[10px] bg-white p-1.5 rounded-lg border border-slate-200 shadow-xs">
                          <div className="flex items-center gap-2">
                            <span className="px-1.5 py-0.5 bg-slate-50 text-emerald-600 border border-slate-200 font-mono font-black text-[9px] rounded shadow-xs">
                              T-{item.terminal}
                            </span>
                            <span className="text-slate-500 text-[9px] font-medium">{item.count} vezes</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold text-slate-800 text-[9px]">{item.pct}%</span>
                            <button
                              onClick={() => handleApplyGeneralTerminal(item.terminal)}
                              className="px-2 py-0.8 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded text-[8px] font-black uppercase tracking-wider cursor-pointer transition-all"
                            >
                              Jogar
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              )}
            </motion.div>
          )}

          {/* TAB 3: BREAKOUT PIVOTS (QUEBRAS E RETORNOS) */}
          {activeTab === 'breakouts' && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="space-y-3.5"
            >
              <div>
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <RefreshCw className="w-4 h-4 text-indigo-500 animate-spin-slow" />
                  Pivots de Quebra e Retorno
                </h4>
                <p className="text-[10px] text-slate-400 font-medium">
                  Identifica números que interromperam sequências de um setor, mas fizeram o cilindro retornar imediatamente ao setor anterior no giro seguinte.
                </p>
              </div>

              {sequenceBreakouts.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-[10px] font-medium border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                  Nenhum padrão de quebra e retorno encontrado no histórico atual. É necessário ter mais giros na mesa para calcular os pivots de quebra.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {sequenceBreakouts.map((pivot) => (
                    <div
                      key={`pivot-card-${pivot.number}`}
                      className="border border-slate-200 bg-white p-2.5 rounded-xl flex items-center justify-between shadow-xs hover:shadow-sm transition-all"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 bg-slate-900 rounded-lg flex flex-col items-center justify-center border border-slate-800 shadow-xs">
                          <span className="text-[8px] opacity-60 text-white font-black leading-none uppercase">PIVOT</span>
                          <span className="text-xs font-black font-mono leading-none mt-0.5 text-emerald-400">{pivot.number}</span>
                        </div>

                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-black text-slate-800 font-mono">{pivot.returnRate}%</span>
                            <span className="text-[8px] text-emerald-700 font-bold uppercase tracking-wider bg-emerald-50 border border-emerald-100 px-1 rounded">Taxa Retorno</span>
                          </div>
                          <p className="text-[9px] text-slate-500 font-medium">
                            Quebrou sequência e retornou {pivot.returnCount} de {pivot.occurrences} vezes.
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => handleApplySector(pivot.sectorFrom)}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-[9px] text-slate-700 font-bold uppercase tracking-wider rounded-lg cursor-pointer border border-slate-200 transition-all flex items-center gap-1 shadow-xs"
                      >
                        <span>Jogar</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* TAB 4: GENERAL TERMINAL ABSENCE DELAYS */}
          {activeTab === 'delays' && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="space-y-3"
            >
              <div>
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-indigo-500" />
                  Rastreador Completo de Atraso dos Terminais (0-9)
                </h4>
                <p className="text-[10px] text-slate-400 font-medium">
                  Quantos giros faz que o final (último dígito) do número não cai no cilindro. Atrasos ≥ 12 representam oportunidades estatísticas excelentes.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {terminalDelays.map((item) => {
                  const isHot = item.state === 'active';
                  const isWarning = item.state === 'warning';

                  return (
                    <div
                      key={`delay-grid-${item.terminal}`}
                      className={`border rounded-xl p-3 flex flex-col items-center justify-between text-center transition-all ${
                        isHot
                          ? 'bg-red-50 border-red-200 text-red-900 shadow-xs ring-1 ring-red-200'
                          : isWarning
                          ? 'bg-amber-50 border-amber-200 text-amber-900'
                          : 'bg-white border-slate-200 text-slate-500 shadow-xs'
                      }`}
                    >
                      <span className="text-[9px] uppercase tracking-widest font-extrabold text-slate-400">T-{item.terminal}</span>
                      <span className="text-base font-black font-mono my-1.5 text-slate-800">{item.delay} <span className="text-[10px] font-bold text-slate-400">giros</span></span>
                      
                      <button
                        onClick={() => handleApplyGeneralTerminal(item.terminal)}
                        className={`w-full py-1 rounded-md text-[8px] font-black uppercase tracking-wider cursor-pointer transition-all border ${
                          isHot
                            ? 'bg-red-500 text-white hover:bg-red-600 border-red-600 shadow-xs'
                            : isWarning
                            ? 'bg-amber-500 text-white hover:bg-amber-600 border-amber-600 shadow-xs'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200'
                        }`}
                      >
                        Jogar
                      </button>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* TAB 5: DIGIT SUMS ANALYSIS */}
          {activeTab === 'somas' && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="space-y-4"
            >
              <div>
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-indigo-500" />
                  Rastreador de Soma de Dígitos (Padrões Camuflados)
                </h4>
                <p className="text-[10px] text-slate-400 font-medium">
                  Rastreia a soma dos dígitos das pedras (ex: 11 = 1+1 = 2; 12 = 1+2 = 3). A roleta frequentemente envia números da mesma soma antes de mandar a pedra certa ou de forma camuflada.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {digitSumStats.map((item) => {
                  const isHot = item.state === 'active';
                  const isWarning = item.state === 'warning';

                  return (
                    <div
                      key={`sum-grid-${item.sumGroup}`}
                      className={`border rounded-xl p-3 flex flex-col justify-between text-center transition-all relative overflow-hidden ${
                        isHot
                          ? 'bg-red-50 border-red-200 text-red-950 ring-1 ring-red-200 shadow-xs'
                          : isWarning
                          ? 'bg-amber-50 border-amber-200 text-amber-950 shadow-xs'
                          : 'bg-white border-slate-200 text-slate-500 shadow-xs'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className={`text-[10px] uppercase tracking-wider font-extrabold ${isHot ? 'text-red-900' : isWarning ? 'text-amber-900' : 'text-slate-800'}`}>
                            Soma {item.sumGroup}
                          </span>
                          {isHot && (
                            <span className="text-[7px] bg-red-100 text-red-700 px-1 py-0.2 rounded font-black uppercase tracking-wide border border-red-200">
                              CRÍTICA
                            </span>
                          )}
                          {isWarning && (
                            <span className="text-[7px] bg-amber-100 text-amber-700 px-1 py-0.2 rounded font-black uppercase tracking-wide border border-amber-200">
                              ALERTA
                            </span>
                          )}
                        </div>

                        {/* Delay & frequency */}
                        <div className="my-2.5">
                          <div className={`text-base font-black font-mono leading-none ${isHot ? 'text-red-900' : isWarning ? 'text-amber-900' : 'text-slate-800'}`}>
                            {item.delay} <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">giros</span>
                          </div>
                          <p className="text-[8px] text-slate-400 font-bold mt-1">
                            Frequência: {item.frequency}x ({item.pct}%)
                          </p>
                        </div>

                        {/* Numbers in sum */}
                        <div className="flex flex-wrap justify-center gap-1 my-2">
                          {item.numbers.map((n) => {
                            const lastRolled = historyNumbers.length > 0 && historyNumbers[0] === n;
                            return (
                              <span
                                key={`sum-n-${n}`}
                                className={`text-[8px] font-mono px-1 rounded ${
                                  lastRolled
                                    ? 'bg-emerald-500 text-white font-black shadow-xs'
                                    : 'bg-slate-50 text-slate-600 border border-slate-200'
                                }`}
                                title={lastRolled ? 'Último número sorteado!' : ''}
                              >
                                {n}
                              </span>
                            );
                          })}
                        </div>
                      </div>

                      <button
                        onClick={() => onApplyTargets(item.numbers, 2, `Soma ${item.sumGroup}`)}
                        className={`w-full py-1.5 mt-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer border ${
                          isHot
                            ? 'bg-red-500 text-white hover:bg-red-600 border-red-600 shadow-xs'
                            : isWarning
                            ? 'bg-amber-500 text-white hover:bg-amber-600 border-amber-600 shadow-xs'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200'
                        }`}
                      >
                        Jogar
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Informative Tips Footer for the strategy */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex gap-2.5">
                <span className="text-base">💡</span>
                <div className="space-y-1 text-left">
                  <h5 className="text-[10px] font-black uppercase text-slate-800 tracking-wider">Como operar no Padrão de Somas de Dígitos?</h5>
                  <p className="text-[9px] text-slate-500 font-medium leading-relaxed">
                    Somas de dígitos representam grupos de pedras da roleta com a mesma raiz matemática (ex: Soma 2 une 2, 11, 20 e 29). Quando uma soma entra em atraso extremo (≥ 12 giros), ela gera um sinal quente no painel. Fique atento também a repetições rápidas de somas na mesma zona do cilindro!
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 6: HOT & COLD ANALYSIS */}
          {activeTab === 'hotcold' && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="space-y-4"
            >
              <div>
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-indigo-500" />
                  Zonas de Risco: Números Quentes & Frios (Troca de Crupiê)
                </h4>
                <p className="text-[10px] text-slate-400 font-medium">
                  Evite jogar em números congelados que a roleta ignora devido à mecânica do crupiê atual, e prepare-se para pegá-los na troca de crupiê!
                </p>
              </div>

              {/* Status Alert for Dealer */}
              {hotColdStats.dealerChangeAlert ? (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-left shadow-xs">
                  <div className="flex gap-2.5 items-start text-left">
                    <span className="text-xl">🚨</span>
                    <div>
                      <h5 className="text-[10.5px] font-black uppercase text-red-700 tracking-wider">Viés Físico Detectado: Números Congelados!</h5>
                      <p className="text-[9px] text-red-600 font-medium leading-relaxed max-w-[480px]">
                        Há {hotColdStats.frozenNumbers.length} número(s) com atraso extremo (≥ 65 giros). O crupiê atual está evitando esta região ou usando um ritmo de lançamento que bloqueia essas pedras. <strong className="text-red-700">Evite apostar neles agora.</strong>
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => onApplyTargets(hotColdStats.frozenNumbers.map(n => n.number), 2, 'Troca de Crupiê')}
                    className="bg-red-500 hover:bg-red-600 text-white font-black text-[9px] uppercase tracking-wider py-1.5 px-3 rounded-lg transition-all shadow-xs cursor-pointer whitespace-nowrap self-stretch sm:self-auto text-center border border-red-600"
                  >
                    🎯 Cercar para Troca de Crupiê
                  </button>
                </div>
              ) : (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex gap-2.5 text-left shadow-xs">
                  <span className="text-lg">✅</span>
                  <div>
                    <h5 className="text-[10px] font-black uppercase text-emerald-700 tracking-wider">Mesa Estabilizada</h5>
                    <p className="text-[9px] text-emerald-600 font-medium leading-relaxed">
                      Não há números com atraso extremo congelante no momento. Os giros atuais parecem seguir uma distribuição balanceada típica sem forte viés do crupiê.
                    </p>
                  </div>
                </div>
              )}

              {/* Grid content */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* 1. Frozen Numbers (Risco Extremo) */}
                <div className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-3 shadow-xs">
                  <div className="flex items-center justify-between">
                    <h5 className="text-[10px] font-black text-red-600 uppercase tracking-wider flex items-center gap-1">
                      <Ban className="w-3.5 h-3.5 text-red-500" />
                      Risco Extremo (Congelados)
                    </h5>
                    <span className="text-[9px] bg-red-50 text-red-700 border border-red-200 font-black px-1.5 py-0.2 rounded font-mono shadow-xs">
                      {hotColdStats.frozenNumbers.length}
                    </span>
                  </div>
                  <p className="text-[9px] text-slate-400 font-medium text-left">
                    Números ausentes há mais de 70 giros. <strong className="text-slate-600">NÃO JOGAR</strong> até trocar o crupiê da mesa!
                  </p>

                  <div className="space-y-1.5 max-h-[160px] overflow-y-auto custom-scrollbar pt-1">
                    {hotColdStats.frozenNumbers.length === 0 ? (
                      <div className="text-center py-6 text-[9px] text-slate-400 font-medium italic">
                        Nenhum número congelado.
                      </div>
                    ) : (
                      hotColdStats.frozenNumbers.map((item) => (
                        <div
                          key={`frozen-n-${item.number}`}
                          className="bg-red-50 border border-red-100 rounded-lg p-2 flex items-center justify-between text-[11px]"
                        >
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`w-5 h-5 rounded-md flex items-center justify-center font-bold font-mono text-[10px] text-white ${
                                item.color === 'red' ? 'bg-red-600' : item.color === 'black' ? 'bg-slate-800' : 'bg-emerald-600'
                              }`}
                            >
                                {item.number}
                            </span>
                            <span className="text-[9px] text-slate-400 font-medium">Atraso:</span>
                            <span className="text-red-600 font-bold font-mono">{item.delay} giros</span>
                          </div>
                          <span className="text-[8px] bg-red-100 text-red-700 border border-red-200 font-extrabold px-1.5 py-0.2 rounded uppercase tracking-wider">
                            Bloqueado
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* 2. Cold Numbers (Frios / Cautela) */}
                <div className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-3 shadow-xs">
                  <div className="flex items-center justify-between">
                    <h5 className="text-[10px] font-black text-amber-600 uppercase tracking-wider flex items-center gap-1">
                      <Snowflake className="w-3.5 h-3.5 text-sky-500 animate-spin" style={{ animationDuration: '6s' }} />
                      Números Frios (Evitar)
                    </h5>
                    <span className="text-[9px] bg-amber-50 text-amber-700 border border-amber-200 font-black px-1.5 py-0.2 rounded font-mono shadow-xs">
                      {hotColdStats.coldNumbers.length}
                    </span>
                  </div>
                  <p className="text-[9px] text-slate-400 font-medium text-left">
                    Ausentes entre 37 e 69 giros. Recomendável evitar cobertura em rodadas secas de recuperação.
                  </p>

                  <div className="space-y-1.5 max-h-[160px] overflow-y-auto custom-scrollbar pt-1">
                    {hotColdStats.coldNumbers.length === 0 ? (
                      <div className="text-center py-6 text-[9px] text-slate-400 font-medium italic">
                        Nenhum número frio no padrão atual.
                      </div>
                    ) : (
                      hotColdStats.coldNumbers.map((item) => (
                        <div
                          key={`cold-n-${item.number}`}
                          className="bg-amber-50 border border-amber-100 rounded-lg p-2 flex items-center justify-between text-[11px]"
                        >
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`w-5 h-5 rounded-md flex items-center justify-center font-bold font-mono text-[10px] text-white ${
                                item.color === 'red' ? 'bg-red-600' : item.color === 'black' ? 'bg-slate-800' : 'bg-emerald-600'
                              }`}
                            >
                              {item.number}
                            </span>
                            <span className="text-[9px] text-slate-400 font-medium">Atraso:</span>
                            <span className="text-amber-600 font-bold font-mono">{item.delay} giros</span>
                          </div>
                          <span className="text-[8px] bg-amber-100 text-amber-700 border border-amber-200 font-semibold px-1 rounded">
                            Evitar
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* 3. Hot Numbers (Quentes / Frequentes) */}
                <div className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-3 shadow-xs">
                  <div className="flex items-center justify-between">
                    <h5 className="text-[10px] font-black text-emerald-600 uppercase tracking-wider flex items-center gap-1">
                      <Flame className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                      Números Quentes (Alvos)
                    </h5>
                    <span className="text-[9px] bg-emerald-50 text-emerald-700 border border-emerald-200 font-black px-1.5 py-0.2 rounded font-mono shadow-xs">
                      {hotColdStats.hotNumbers.length}
                    </span>
                  </div>
                  <p className="text-[9px] text-slate-400 font-medium text-left">
                    Números em alta frequência recente. Tendem a repetir ou puxar vizinhos próximos!
                  </p>

                  <div className="space-y-1.5 max-h-[160px] overflow-y-auto custom-scrollbar pt-1">
                    {hotColdStats.hotNumbers.length === 0 ? (
                      <div className="text-center py-6 text-[9px] text-slate-400 font-medium italic">
                        Histórico curto para classificar números quentes.
                      </div>
                    ) : (
                      hotColdStats.hotNumbers.slice(0, 8).map((item) => (
                        <div
                          key={`hot-n-${item.number}`}
                          className="bg-emerald-50 border border-emerald-100 rounded-lg p-2 flex items-center justify-between text-[11px]"
                        >
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`w-5 h-5 rounded-md flex items-center justify-center font-bold font-mono text-[10px] text-white ${
                                item.color === 'red' ? 'bg-red-600' : item.color === 'black' ? 'bg-slate-800' : 'bg-emerald-600'
                              }`}
                            >
                              {item.number}
                            </span>
                            <span className="text-[9px] text-slate-400 font-medium font-mono">Freq:</span>
                            <span className="text-emerald-600 font-extrabold font-mono">{item.frequency}x</span>
                          </div>
                          <button
                            onClick={() => onApplyTargets([item.number], 2, `Quente ${item.number}`)}
                            className="text-[8px] bg-emerald-500 hover:bg-emerald-600 text-white font-black px-2 py-1 rounded-md uppercase tracking-wider cursor-pointer border border-emerald-600 shadow-xs transition-all"
                          >
                            Cercar
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Informative tips */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex gap-2.5 text-left shadow-xs">
                <span className="text-base">💡</span>
                <div className="space-y-1">
                  <h5 className="text-[10px] font-black uppercase text-slate-800 tracking-wider">Como o padrão físico do Crupiê funciona?</h5>
                  <p className="text-[9px] text-slate-500 font-medium leading-relaxed">
                    Cada crupiê possui uma "assinatura física" — o ritmo muscular de impulsionar a bola e o cilindro. Isso causa padrões camuflados onde certos números ficam bloqueados/congelados (giros &gt; 70 sem sair). <strong className="text-slate-700">A melhor técnica consiste em banir esses números das suas coberturas durante o turno do crupiê atual</strong>, mas cercá-los no exato momento em que há troca de crupiê na mesa!
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </>
      )}
        </AnimatePresence>
      </div>

    </div>
  );
}
