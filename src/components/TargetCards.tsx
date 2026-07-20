import React from 'react';
import { motion } from 'motion/react';
import { COLORS, getNeighbors, getTerminal, getNumberSector, getSectorName } from '../lib/roulette';

interface TargetCardsProps {
  activeTargets: number[];
  neighborRange: number;
  prevStrongestTarget?: number | null;
}

export default function TargetCards({ activeTargets, neighborRange, prevStrongestTarget }: TargetCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
      {activeTargets.map((target, idx) => {
        const isTerminal2Camouflage = activeTargets.includes(20) && (activeTargets.includes(2) || activeTargets.includes(12) || activeTargets.includes(22) || activeTargets.includes(32));
        const currentNeighborRange = (target === 20 && isTerminal2Camouflage) ? 1 : neighborRange;
        const neighbors = getNeighbors(target, currentNeighborRange);
        const terminal = getTerminal(target);
        const sectorKey = getNumberSector(target);
        const sectorName = getSectorName(sectorKey);
        const isPrevStrongest = prevStrongestTarget === target;

        // Split neighbors into left, center (target), and right
        const midIdx = Math.floor(neighbors.length / 2);
        const leftSide = neighbors.slice(0, midIdx);
        const rightSide = neighbors.slice(midIdx + 1);

        return (
          <motion.div
            key={`target-card-${target}-${idx}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.04 }}
            className={`bg-white border rounded-xl p-2.5 flex flex-col justify-between hover:bg-slate-50/50 transition-all shadow-sm ${
              isPrevStrongest
                ? 'border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.12)] bg-gradient-to-b from-amber-50/40 to-white'
                : 'border-slate-200 hover:border-indigo-400/80'
            }`}
          >
            {/* Top header line */}
            <div className="flex items-center justify-between text-[10px] text-slate-500 mb-2">
              <span className={`font-bold border px-1.5 py-0.5 rounded uppercase ${
                isPrevStrongest
                  ? 'text-amber-700 bg-amber-50 border-amber-300'
                  : 'text-emerald-700 bg-emerald-50 border-emerald-200'
              }`}>
                {isPrevStrongest ? '🔄 ALVO FORTE PRESERVADO' : `ALVO #${idx + 1}`}
              </span>
              <span className="font-mono text-slate-400">
                T{terminal} • {sectorName.split(' ')[0]}
              </span>
            </div>

            {/* Target Display and Description */}
            <div className="flex items-center gap-2.5 my-1.5">
              <div
                className={`w-10 h-10 rounded-full flex flex-col items-center justify-center font-bold text-base shadow-sm select-none border border-white/10 ${
                  COLORS[target] === 'red'
                    ? 'bg-red-600 text-white'
                    : COLORS[target] === 'black'
                    ? 'bg-slate-900 text-white border-slate-950'
                    : 'bg-emerald-600 text-white'
                }`}
              >
                <span className="leading-none">{target}</span>
              </div>

              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-bold text-slate-800 truncate uppercase tracking-wider">
                  Jogar {target} + {currentNeighborRange} {currentNeighborRange === 1 ? 'vizinho' : 'vizinhos'}
                </div>
                <div className="text-[9px] text-slate-400 truncate">
                  Setor: {sectorName}
                </div>
              </div>
            </div>

            {/* Micro wheel representation */}
            <div className="mt-2 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between gap-1 bg-slate-50/80 px-2 py-1 rounded-lg border border-slate-100">
                {/* Left side neighbors */}
                <div className="flex gap-1">
                  {leftSide.map((num) => (
                    <span
                      key={`left-${num}`}
                      className={`w-5 h-5 rounded flex items-center justify-center font-mono font-bold text-[9px] border ${
                        COLORS[num] === 'red'
                          ? 'bg-red-50 text-red-600 border-red-200'
                          : COLORS[num] === 'black'
                          ? 'bg-slate-900 text-white border-slate-950'
                          : 'bg-emerald-50 text-emerald-600 border-emerald-200'
                      }`}
                    >
                      {num}
                    </span>
                  ))}
                </div>

                {/* Arrow indicator */}
                <span className="text-[8px] text-slate-300 font-bold">➜</span>

                {/* Right side neighbors */}
                <div className="flex gap-1">
                  {rightSide.map((num) => (
                    <span
                      key={`right-${num}`}
                      className={`w-5 h-5 rounded flex items-center justify-center font-mono font-bold text-[9px] border ${
                        COLORS[num] === 'red'
                          ? 'bg-red-50 text-red-600 border-red-200'
                          : COLORS[num] === 'black'
                          ? 'bg-slate-900 text-white border-slate-950'
                          : 'bg-emerald-50 text-emerald-600 border-emerald-200'
                      }`}
                    >
                      {num}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
