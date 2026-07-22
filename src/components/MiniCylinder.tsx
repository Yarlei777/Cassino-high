import React, { useState } from 'react';
import { Grid, RefreshCw, Info, Disc } from 'lucide-react';
import { COLORS, CYLINDER } from '../lib/roulette';

interface MiniCylinderProps {
  activeTargets: number[];
  coveredNumbers: number[];
  yellowNumbers?: number[];
}

export default function MiniCylinder({ activeTargets, coveredNumbers, yellowNumbers = [] }: MiniCylinderProps) {
  const [viewMode, setViewMode] = useState<'racetrack' | 'table' | 'wheel'>('racetrack');
  const [isInvertCylinder, setIsInvertCylinder] = useState(false);

  const coveragePercentage = Math.round((coveredNumbers.length / 37) * 100);

  // High-fidelity styling based on the actual number state
  const getRenderChipStyles = (num: number, isTableLayout: boolean) => {
    const isTarget = activeTargets.includes(num);
    const isYellow = yellowNumbers.includes(num);
    const isCovered = coveredNumbers.includes(num);
    const color = COLORS[num];

    // Base active targets - Premium glowing gold badge
    if (isTarget) {
      return `font-black text-slate-950 border select-none transition-all duration-300 ${
        isTableLayout 
          ? 'bg-gradient-to-br from-amber-300 via-amber-400 to-amber-500 border-amber-200 ring-1 ring-amber-400/40 shadow-[0_0_8px_rgba(245,158,11,0.6)] scale-[1.08] rounded-md text-slate-950'
          : 'bg-gradient-to-br from-amber-300 via-amber-400 to-amber-500 border-amber-200 ring-1 ring-amber-400/50 shadow-[0_0_10px_rgba(245,158,11,0.8)] scale-[1.12] rounded-full z-20 animate-pulse text-slate-950'
      }`;
    }

    // Yellow auxiliary target - soft yellow background and bold yellow border
    if (isYellow) {
      return `font-black border border-yellow-400 select-none transition-all duration-300 ${
        isTableLayout
          ? 'bg-yellow-100 text-yellow-800 border-yellow-300 shadow-[0_0_4px_rgba(234,179,8,0.3)] scale-[1.03] rounded-md'
          : 'bg-yellow-100 text-yellow-800 border-yellow-300 shadow-[0_0_6px_rgba(234,179,8,0.4)] scale-[1.08] rounded-full z-15'
      }`;
    }

    // Covered neighbors - High-contrast emerald green outline & bg
    if (isCovered) {
      return `font-black border select-none transition-all duration-300 ${
        isTableLayout
          ? 'bg-emerald-50 text-emerald-700 border-emerald-300 shadow-[0_0_4px_rgba(16,185,129,0.2)] scale-[1.03] rounded-md'
          : 'bg-emerald-50 text-emerald-700 border-emerald-300 shadow-[0_0_6px_rgba(16,185,129,0.3)] scale-[1.08] rounded-full z-10'
      }`;
    }

    // Default chips color coded with real roulette colors (red, black, green)
    const shapeClass = isTableLayout ? 'rounded-md' : 'rounded-full hover:scale-110';
    if (color === 'green') {
      return `bg-emerald-600 hover:bg-emerald-500 border border-emerald-500/50 text-white font-black ${shapeClass}`;
    }
    if (color === 'red') {
      return `bg-red-600 hover:bg-red-500 border border-red-500/30 text-red-50 font-bold ${shapeClass}`;
    }
    // Black numbers
    return `bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-100 font-bold ${shapeClass}`;
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-3 flex flex-col items-center space-y-3 shadow-xs relative overflow-hidden w-full max-w-[380px] text-slate-800">
      
      {/* HEADER SECTION with Title & Stats */}
      <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-2 border-b border-slate-100 pb-2">
        <div className="flex items-center gap-1.5 flex-wrap justify-center sm:justify-start">
          <div className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-indigo-500"></span>
          </div>
          <span className="text-[10px] sm:text-[11px] font-black text-indigo-600 uppercase tracking-widest font-sans">
            HUD de Cobertura
          </span>
          {coveredNumbers.length > 0 && (
            <span className="text-[8px] sm:text-[9px] bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded text-emerald-700 font-mono font-black shadow-xs">
              Cob: {coveragePercentage}% ({coveredNumbers.length}/37)
            </span>
          )}
          {yellowNumbers.length > 0 && (
            <span className="text-[8px] sm:text-[9px] bg-yellow-50 border border-yellow-200 px-1.5 py-0.5 rounded text-yellow-700 font-mono font-black shadow-xs" title="Vizinhos de órbita e preenchimento de buracos (Gap fill)">
              ⚠️ Sinergia: {yellowNumbers.length} Amarelos
            </span>
          )}
        </div>

        {/* CONTROLS TOOLBAR */}
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="flex items-center gap-0.5 bg-slate-100 p-0.5 rounded border border-slate-200">
            <button
              onClick={() => setViewMode('racetrack')}
              className={`px-1.5 py-0.5 rounded text-[8px] sm:text-[9px] font-black uppercase transition-all cursor-pointer ${
                viewMode === 'racetrack'
                  ? 'bg-white text-slate-800 shadow-xs border border-slate-200/50'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Pista Oval (Racetrack)"
            >
              Pista
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-1.5 py-0.5 rounded text-[8px] sm:text-[9px] font-black uppercase transition-all cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-white text-slate-800 shadow-xs border border-slate-200/50'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Mesa de Apostas"
            >
              Mesa
            </button>
            <button
              onClick={() => setViewMode('wheel')}
              className={`px-1.5 py-0.5 rounded text-[8px] sm:text-[9px] font-black uppercase transition-all cursor-pointer ${
                viewMode === 'wheel'
                  ? 'bg-white text-slate-800 shadow-xs border border-slate-200/50'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Cilindro Circular Real"
            >
              Roda
            </button>
          </div>
          
          {viewMode === 'racetrack' && (
            <button
              onClick={() => setIsInvertCylinder(!isInvertCylinder)}
              className={`flex items-center gap-1 px-1 py-1 rounded border text-[8px] sm:text-[9px] font-black uppercase transition-all cursor-pointer ${
                isInvertCylinder
                  ? 'bg-amber-50 text-amber-700 border-amber-300'
                  : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200 hover:text-slate-800'
              }`}
              title="Girar o Cilindro em 180º (Inverter Lados)"
            >
              <RefreshCw className={`w-2.5 h-2.5 text-indigo-500 transition-transform duration-500 ${isInvertCylinder ? 'rotate-180' : ''}`} />
            </button>
          )}
        </div>
      </div>

      {/* CENTER WORKSPACE CONTAINER - Flat and small horizontal space */}
      <div className={`relative w-full ${viewMode === 'racetrack' ? 'max-w-[360px] h-[130px]' : viewMode === 'wheel' ? 'max-w-[340px] h-[250px]' : 'max-w-[340px] h-[100px]'} flex items-center justify-center bg-slate-50 rounded-xl p-1 border border-slate-200 shadow-inner overflow-hidden transition-all duration-300`}>
        
        {viewMode === 'table' ? (
          /* VISÃO 1: MINI MESA DE APOSTAS DEITADA (HORIZONTAL) */
          <div className="absolute inset-0 flex items-center justify-center p-1 z-10 w-full">
            <div className="flex gap-0.5 items-stretch h-[76px] w-full max-w-[280px]">
              
              {/* Zero Column on Left */}
              <div className="w-[18px] shrink-0 flex">
                <div 
                  className={`w-full flex items-center justify-center text-[9px] transition-all duration-300 border ${getRenderChipStyles(0, true)}`}
                  title="Número 0"
                >
                  0
                </div>
              </div>

              {/* 12 Columns containing 3 numbers each */}
              <div className="flex-1 grid grid-cols-12 gap-0.5">
                {Array.from({ length: 12 }).map((_, c) => {
                  const colIndex = c;
                  const nTop = colIndex * 3 + 3;
                  const nMid = colIndex * 3 + 2;
                  const nBot = colIndex * 3 + 1;

                  return (
                    <div key={`col-${colIndex}`} className="flex flex-col gap-0.5 h-full">
                      <div 
                        className={`flex-1 flex items-center justify-center text-[8px] transition-all duration-300 border ${getRenderChipStyles(nTop, true)}`}
                        title={`Número ${nTop}`}
                      >
                        {nTop}
                      </div>
                      <div 
                        className={`flex-1 flex items-center justify-center text-[8px] transition-all duration-300 border ${getRenderChipStyles(nMid, true)}`}
                        title={`Número ${nMid}`}
                      >
                        {nMid}
                      </div>
                      <div 
                        className={`flex-1 flex items-center justify-center text-[8px] transition-all duration-300 border ${getRenderChipStyles(nBot, true)}`}
                        title={`Número ${nBot}`}
                      >
                        {nBot}
                      </div>
                    </div>
                  );
                })}
              </div>

            </div>
          </div>
        ) : viewMode === 'wheel' ? (
          /* VISÃO 3: CÍRCULO RODA DE CILINDRO REAL - ENHANCED AND RESIZED */
          <div className="absolute inset-0 w-full h-full flex items-center justify-center p-2">
            <svg className="w-full h-full" viewBox="0 0 300 250">
              <defs>
                <radialGradient id="wheelGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#ffffff" />
                  <stop offset="60%" stopColor="#f8fafc" />
                  <stop offset="85%" stopColor="#f1f5f9" />
                  <stop offset="100%" stopColor="#e2e8f0" />
                </radialGradient>
                <radialGradient id="rotorGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
                </radialGradient>
              </defs>
              
              {/* Main Outer Wheel Rings */}
              <circle cx="150" cy="125" r="118" fill="none" stroke="#f59e0b" strokeWidth="1.5" opacity="0.4" />
              <circle cx="150" cy="125" r="115" fill="url(#wheelGlow)" stroke="#e2e8f0" strokeWidth="1" />
              <circle cx="150" cy="125" r="110" fill="none" stroke="#cbd5e1" strokeWidth="0.5" />
              
              {/* Inner bounds for numbers and pocket separation */}
              <circle cx="150" cy="125" r="92" fill="none" stroke="#cbd5e1" strokeWidth="0.5" />
              <circle cx="150" cy="125" r="72" fill="none" stroke="#e2e8f0" strokeWidth="0.5" />
              
              {/* Center rotor area */}
              <circle cx="150" cy="125" r="34" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="0.5" />
              <circle cx="150" cy="125" r="25" fill="url(#rotorGlow)" opacity="0.6" />
              <circle cx="150" cy="125" r="16" fill="#f1f5f9" stroke="#f59e0b" strokeWidth="0.5" opacity="0.5" />
              
              {/* Rotor Center path */}
              <path d="M 150 97 L 150 153 M 122 125 L 178 125" stroke="#f59e0b" strokeWidth="2.2" strokeLinecap="round" opacity="0.8" />
              <circle cx="150" cy="125" r="5" fill="#f59e0b" stroke="#ffffff" strokeWidth="1" />

              {/* Loop of 37 numbers arranged circularly */}
              {CYLINDER.map((num, i) => {
                const angle = (i * 2 * Math.PI) / 37 - Math.PI / 2;
                
                 // Radius variables
                 const tx = 150 + 98 * Math.cos(angle);
                 const ty = 125 + 98 * Math.sin(angle);
                 
                 const px = 150 + 80 * Math.cos(angle);
                 const py = 125 + 80 * Math.sin(angle);
  
                 const sx = 150 + 20 * Math.cos(angle);
                 const sy = 125 + 20 * Math.sin(angle);
                 const ex = 150 + 70 * Math.cos(angle);
                 const ey = 125 + 70 * Math.sin(angle);

                const isTarget = activeTargets.includes(num);
                const isYellow = yellowNumbers.includes(num);
                const isCovered = coveredNumbers.includes(num);
                const color = COLORS[num];

                return (
                  <g key={`wheel-node-${num}`}>
                    {/* Spokes */}
                    <line x1={sx} y1={sy} x2={ex} y2={ey} stroke="#cbd5e1" strokeWidth="0.5" opacity="0.4" />
                    
                    {/* Glowing highlight for active targets or covered neighbors */}
                    {isTarget && (
                      <circle 
                        cx={px} 
                        cy={py} 
                        r={9.5} 
                        fill="none"
                        stroke="#f59e0b" 
                        strokeWidth="1.5" 
                        className="animate-pulse opacity-90"
                      />
                    )}
                    {isYellow && !isTarget && (
                      <circle 
                        cx={px} 
                        cy={py} 
                        r={8.5} 
                        fill="none"
                        stroke="#eab308" 
                        strokeWidth="1.2" 
                        className="opacity-90 animate-pulse"
                      />
                    )}
                    {isCovered && !isTarget && !isYellow && (
                      <circle 
                        cx={px} 
                        cy={py} 
                        r={8} 
                        fill="none"
                        stroke="#10b981" 
                        strokeWidth="1" 
                        className="opacity-85"
                      />
                    )}

                    {/* Pocket cell block */}
                    <circle 
                      cx={px} 
                      cy={py} 
                      r={5.5} 
                      className={`transition-all duration-300 ${
                        isTarget
                          ? 'fill-amber-400 stroke-amber-200 stroke-[1px] drop-shadow-[0_0_6px_#f59e0b]'
                          : isYellow
                          ? 'fill-yellow-300 stroke-yellow-400 stroke-[1px] drop-shadow-[0_0_4px_#eab308]'
                          : isCovered
                          ? 'fill-emerald-100 stroke-emerald-400 stroke-[1px]'
                          : color === 'green' 
                          ? 'fill-emerald-600 stroke-emerald-500/20 stroke-[0.5px]' 
                          : color === 'red' 
                          ? 'fill-red-650 stroke-red-500/10 stroke-[0.5px]' 
                          : 'fill-slate-800 stroke-slate-900/50 stroke-[0.5px]'
                      }`}
                    />

                    {/* Pocket bead/ball inside the cell */}
                    {(isTarget || isYellow || isCovered) && (
                      <circle 
                        cx={px} 
                        cy={py} 
                        r={isTarget ? 2.5 : isYellow ? 2.0 : 1.8} 
                        className={`transition-all duration-300 ${
                          isTarget 
                            ? 'fill-white stroke-amber-100 stroke-[0.5px] drop-shadow-[0_0_4px_#ffffff]' 
                            : isYellow
                            ? 'fill-yellow-800 stroke-yellow-200 stroke-[0.5px]'
                            : 'fill-emerald-500'
                        }`}
                      />
                    )}
                    
                    {/* Number label text rotated radially for high physical fidelity */}
                    <text 
                      x={tx} 
                      y={ty + 2} 
                      textAnchor="middle" 
                      transform={`rotate(${(angle * 180) / Math.PI + 90}, ${tx}, ${ty})`}
                      className={`text-[7.5px] font-black font-mono transition-all duration-300 cursor-default select-none ${
                        isTarget 
                          ? 'fill-amber-500 font-black text-[9px] drop-shadow-[0_0_3px_rgba(245,158,11,0.6)]' 
                          : isYellow
                          ? 'fill-yellow-600 font-extrabold text-[8.5px]'
                          : isCovered 
                          ? 'fill-emerald-600 font-extrabold text-[8.5px]' 
                          : color === 'green'
                          ? 'fill-emerald-600'
                          : color === 'red'
                          ? 'fill-red-600'
                          : 'fill-slate-600'
                      }`}
                    >
                      {num}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        ) : (
          /* VISÃO 2: CILINDRO RACETRACK OVAL DEITADO (HORIZONTAL) */
          <div className="relative w-[300px] h-[100px] scale-[1.18] sm:scale-[1.22] origin-center flex-shrink-0 transition-transform duration-300">
            {/* Linhas Visíveis da Pista SVG Deitada */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 300 100">
              {/* Outer Racetrack */}
              <rect x="8" y="8" width="284" height="84" rx="42" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1" />
              {/* Inner Racetrack */}
              <rect x="24" y="24" width="252" height="52" rx="26" fill="none" stroke="#cbd5e1" strokeWidth="1" opacity="0.6" />
              
              {/* Vertical boundary lines for sectors at correct visual thresholds */}
              <line x1="110" y1="8" x2="110" y2="24" stroke="#cbd5e1" strokeWidth="1" opacity="0.6"/>
              <line x1="110" y1="76" x2="110" y2="92" stroke="#cbd5e1" strokeWidth="1" opacity="0.6"/>
              <line x1="200" y1="8" x2="200" y2="24" stroke="#cbd5e1" strokeWidth="1" opacity="0.6"/>
              <line x1="200" y1="76" x2="200" y2="92" stroke="#cbd5e1" strokeWidth="1" opacity="0.6"/>
            </svg>

            {/* Zonas Textuais do Fundo (Setores Voisins/Orphelins/Tiers) */}
            <div className="absolute inset-y-[24px] inset-x-[24px] flex items-center justify-between text-slate-400 font-black opacity-60 tracking-wider pointer-events-none select-none z-0">
              {isInvertCylinder ? (
                <>
                  <div className="flex-1 text-center text-[7.5px] font-black leading-tight border-r border-slate-200">
                    <div className="text-[8.5px] text-slate-600 font-bold">TIERS</div>
                    <div className="text-[6.5px] opacity-60">(TIER)</div>
                  </div>
                  <div className="flex-1 text-center text-[7.5px] font-black leading-tight border-r border-slate-200">
                    <div className="text-[8.5px] text-slate-600 font-bold">ORPHELINS</div>
                    <div className="text-[6.5px] opacity-60">(ORFLENS)</div>
                  </div>
                  <div className="flex-1 text-center text-[7.5px] font-black leading-tight">
                    <div className="text-[8.5px] text-slate-600 font-bold">VOISINS</div>
                    <div className="text-[6.5px] opacity-60">(VOISAN)</div>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex-1 text-center text-[7.5px] font-black leading-tight border-r border-slate-200">
                    <div className="text-[8.5px] text-slate-600 font-bold">VOISINS</div>
                    <div className="text-[6.5px] opacity-60">(VOISAN)</div>
                  </div>
                  <div className="flex-1 text-center text-[7.5px] font-black leading-tight border-r border-slate-200">
                    <div className="text-[8.5px] text-slate-600 font-bold">ORPHELINS</div>
                    <div className="text-[6.5px] opacity-60">(ORFLENS)</div>
                  </div>
                  <div className="flex-1 text-center text-[7.5px] font-black leading-tight">
                    <div className="text-[8.5px] text-slate-600 font-bold">TIERS</div>
                    <div className="text-[6.5px] opacity-60">(TIER)</div>
                  </div>
                </>
              )}
            </div>

            {/* Loop de Posições Matemáticas - Criação Dinâmica dos 37 Números no Racetrack Deitado */}
            {CYLINDER.map((num, i) => {
              const cy = 50; // Middle height
              const r = 34; // Precise center radius between 42 (outer) and 26 (inner)
              const cxLeft = 50;
              const cxRight = 250;
              const L = cxRight - cxLeft; // 200px straight line segment
              const arcLen = Math.PI * r; // ~106.8px
              const perim = 2 * L + 2 * arcLen; // ~613.6px

              const leftTipDistance = 2 * L + 1.5 * arcLen;
              let d = (leftTipDistance + (i / 37) * perim) % perim;
              if (isInvertCylinder) d = (d + perim / 2) % perim;

              let x = 0, y = 0;
              if (d <= L) {
                x = cxLeft + d;
                y = cy - r;
              } else if (d - L <= arcLen) {
                const angle = -Math.PI / 2 + ((d - L) / arcLen) * Math.PI;
                x = cxRight + r * Math.cos(angle);
                y = cy + r * Math.sin(angle);
              } else if (d - L - arcLen <= L) {
                x = cxRight - (d - L - arcLen);
                y = cy + r;
              } else {
                const angle = Math.PI / 2 + ((d - L - arcLen - L) / arcLen) * Math.PI;
                x = cxLeft + r * Math.cos(angle);
                y = cy + r * Math.sin(angle);
              }

              const isTarget = activeTargets.includes(num);
              
              return (
                <div
                  key={`cylinder-num-${num}`}
                  className={`absolute w-[18px] h-[18px] -ml-[9px] -mt-[9px] flex items-center justify-center text-[9.5px] font-bold transition-all duration-300 ${getRenderChipStyles(num, false)}`}
                  style={{ left: `${x}px`, top: `${y}px` }}
                  title={`Número ${num}${isTarget ? ' (ALVO)' : ''}`}
                >
                  <span className="leading-none">{num}</span>
                  {isTarget && (
                    <span className="absolute -top-0.5 -right-0.5 flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500"></span>
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Mini Legend Footer */}
      <div className="w-full flex items-center justify-between text-[8px] sm:text-[9px] text-slate-400 font-mono border-t border-slate-100 pt-1.5 px-0.5">
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 border border-amber-200 shadow-[0_0_4px_rgba(245,158,11,0.4)]" />
          Alvo
        </span>
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-100 border border-emerald-300 shadow-[0_0_4px_rgba(16,185,129,0.2)]" />
          Vizinho
        </span>
        <span className="flex items-center gap-0.5 text-slate-500">
          <Info className="w-2.5 h-2.5 text-slate-400" />
          {viewMode === 'table' ? 'Mesa' : viewMode === 'wheel' ? 'Roda' : 'Cilindro'}
        </span>
      </div>
    </div>
  );
}
