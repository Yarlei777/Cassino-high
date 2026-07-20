/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Target,
  History,
  Volume2,
  VolumeX,
  Trash2,
  Check,
  Sparkles,
  TrendingUp,
  Sliders,
  X,
  Coins,
  HelpCircle,
  Flame,
  Layers,
  ChevronRight,
  Info,
  SlidersHorizontal,
  Cpu,
  Camera,
  RotateCcw,
  Zap,
  Shield,
  Clipboard,
  User,
  Calendar,
  DollarSign,
} from 'lucide-react';
import AutoScanner from './components/AutoScanner';
import MiniCylinder from './components/MiniCylinder';
import HistoryPanel, { HistoryEntry } from './components/HistoryPanel';
import MetricsPanel from './components/MetricsPanel';
import PatternDetector from './components/PatternDetector';
import { getAutoPilotRecommendation, calculateHotColdStats, calculateTableStability } from './lib/patterns';
import {
  CYLINDER,
  getNeighbors,
  getTerminal,
  getStrategyCoverage,
  suggestTargets,
  COLORS,
  getNumberSector,
  SECTORS,
} from './lib/roulette';

let sharedAudioCtx: AudioContext | null = null;

export default function App() {
  // Application tabs
  const [activeTab, setActiveTab] = useState<'panel' | 'metrics' | 'history'>('panel');
  
  // Configurations
  const [targetCount, setTargetCount] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('roulette_target_count');
      return saved ? parseInt(saved, 10) : 1; // Default to Tiro Concentrado: 1 target
    }
    return 1;
  });
  const [neighborRange, setNeighborRange] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('roulette_neighbor_range');
      return saved ? parseInt(saved, 10) : 9; // Default to Tiro Concentrado: 9 neighbors per side (19 Números no total)
    }
    return 9;
  });
  const gameMode = `${targetCount}-targets-${neighborRange}-neighbors`;
  const [ballDirection, setBallDirection] = useState<'cw' | 'ccw'>('cw'); // 'cw' = horário, 'ccw' = anti-horário

  const [targetStrategy, setTargetStrategy] = useState<'terminals' | 'frequency' | 'opposite' | 'sectors' | 'signature' | 'manual' | 'ai'>(
    'ai'
  );
  
  // Core States
  const [history, setHistory] = useState<HistoryEntry[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('roulette_history');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          console.error('Error parsing saved history:', e);
        }
      }
    }
    return [];
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (history.length > 0) {
        localStorage.setItem('roulette_history', JSON.stringify(history));
      } else {
        localStorage.removeItem('roulette_history');
      }
    }
  }, [history]);

  const [manualTargets, setManualTargets] = useState<number[]>([]);
  const [manualInputMode, setManualInputMode] = useState<'select_targets' | 'register_spin'>('select_targets');
  const [inputMode, setInputMode] = useState<'manual' | 'auto'>('manual');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [showHelpModal, setShowHelpModal] = useState<boolean>(false);
  const [showProfileModal, setShowProfileModal] = useState<boolean>(false);
  const [username, setUsername] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('roulette_username');
      return saved || 'Operador Elite';
    }
    return 'Operador Elite';
  });
  const [startingBankrollForGoal, setStartingBankrollForGoal] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('roulette_starting_bankroll_goal');
      return saved ? parseFloat(saved) : 1000;
    }
    return 1000;
  });
  const [targetGoal, setTargetGoal] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('roulette_target_goal');
      return saved ? parseFloat(saved) : 5000;
    }
    return 5000;
  });
  const [targetDays, setTargetDays] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('roulette_target_days');
      return saved ? parseInt(saved) : 10;
    }
    return 10;
  });
  const [managementPlanMode, setManagementPlanMode] = useState<'linear' | 'compound'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('roulette_management_plan_mode');
      return (saved as 'linear' | 'compound') || 'linear';
    }
    return 'linear';
  });
  const [engineFilterMode, setEngineFilterMode] = useState<'essential' | 'complete'>('essential');
  const [dealerChangeRoundCount, setDealerChangeRoundCount] = useState<number>(0);
  const [isGaleActive, setIsGaleActive] = useState<boolean>(false);
  const [galeTargets, setGaleTargets] = useState<number[]>([]);
  const [galeNeighborRange, setGaleNeighborRange] = useState<number>(2);
  const [isPlaySignalActive, setIsPlaySignalActive] = useState<boolean>(false);
  const [frozenAiTargets, setFrozenAiTargets] = useState<number[]>([]);
  const [frozenAiNeighborRange, setFrozenAiNeighborRange] = useState<number>(2);

  // Safety Mode (Botão de Segurança) states
  const [isSafetyMode, setIsSafetyMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('roulette_safety_mode') === 'true';
    }
    return false;
  });
  const [isSafetyWaiting, setIsSafetyWaiting] = useState<boolean>(false);
  const [safetyPendingTargets, setSafetyPendingTargets] = useState<number[]>([]);
  const [safetyPendingNeighborRange, setSafetyPendingNeighborRange] = useState<number>(2);

  // Estados para colar histórico em lote
  const [isPasteModalOpen, setIsPasteModalOpen] = useState<boolean>(false);
  const [pastedText, setPastedText] = useState<string>('');
  const [pasteInvertOrder, setPasteInvertOrder] = useState<boolean>(false);
  const [pasteOverwrite, setPasteOverwrite] = useState<boolean>(true);

  // Provider Selection State (Padrão, Playtech, Evolution, Pragmatic)
  const [provider, setProvider] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('roulette_provider') || 'standard';
    }
    return 'standard';
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('roulette_provider', provider);
    }
  }, [provider]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('roulette_safety_mode', String(isSafetyMode));
    }
  }, [isSafetyMode]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('roulette_target_count', targetCount.toString());
      localStorage.setItem('roulette_neighbor_range', neighborRange.toString());
    }
  }, [targetCount, neighborRange]);

  // Bankroll and Profit/Loss States
  const [initialBankroll, setInitialBankroll] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('roulette_initial_bankroll');
      return saved ? parseFloat(saved) : 100;
    }
    return 100;
  });

  const [currentBankroll, setCurrentBankroll] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('roulette_current_bankroll');
      return saved ? parseFloat(saved) : 100;
    }
    return 100;
  });

  const [isEditingBankroll, setIsEditingBankroll] = useState<boolean>(false);
  const [bankrollInputVal, setBankrollInputVal] = useState<string>('');
  const [aiRiskProfile, setAiRiskProfile] = useState<'conservative' | 'moderate' | 'aggressive'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('roulette_ai_risk_profile');
      return (saved as 'conservative' | 'moderate' | 'aggressive') || 'moderate';
    }
    return 'moderate';
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('roulette_ai_risk_profile', aiRiskProfile);
    }
  }, [aiRiskProfile]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('roulette_initial_bankroll', initialBankroll.toString());
    }
  }, [initialBankroll]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('roulette_current_bankroll', currentBankroll.toString());
    }
  }, [currentBankroll]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('roulette_username', username);
    }
  }, [username]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('roulette_starting_bankroll_goal', startingBankrollForGoal.toString());
    }
  }, [startingBankrollForGoal]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('roulette_target_goal', targetGoal.toString());
    }
  }, [targetGoal]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('roulette_target_days', targetDays.toString());
    }
  }, [targetDays]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('roulette_management_plan_mode', managementPlanMode);
    }
  }, [managementPlanMode]);

  // Chip calculation based on bankroll and AI Risk Profile selection
  const currentChip = useMemo(() => {
    let percentage = 0.002; // moderate (0.2% per chip)
    let minChip = 1.0;
    if (aiRiskProfile === 'conservative') {
      percentage = 0.001; // 0.1% per chip
      minChip = 0.5;
    } else if (aiRiskProfile === 'aggressive') {
      percentage = 0.004; // 0.4% per chip
      minChip = 2.0;
    }
    
    const rawChip = currentBankroll * percentage;
    // Round to nearest 0.50
    const rounded = Math.round(rawChip * 2) / 2;
    // Ensure we don't go below the minimum chip size
    return Math.max(minChip, rounded);
  }, [currentBankroll, aiRiskProfile]);

  // Sound cue player using Web Audio API
  const playAudioCue = (type: 'success' | 'click' | 'alert') => {
    if (typeof window === 'undefined' || !soundEnabled) return;
    try {
      if (!sharedAudioCtx) {
        sharedAudioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const audioCtx = sharedAudioCtx;
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      if (type === 'success') {
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
        gainNode.gain.setValueAtTime(0.06, audioCtx.currentTime);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.08);
        
        const osc2 = audioCtx.createOscillator();
        const gain2 = audioCtx.createGain();
        osc2.connect(gain2);
        gain2.connect(audioCtx.destination);
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(880, audioCtx.currentTime + 0.1); // A5
        gain2.gain.setValueAtTime(0.06, audioCtx.currentTime + 0.1);
        osc2.start(audioCtx.currentTime + 0.1);
        osc2.stop(audioCtx.currentTime + 0.25);
      } else if (type === 'click') {
        oscillator.type = 'triangle';
        oscillator.frequency.setValueAtTime(320, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0.02, audioCtx.currentTime);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.04);
      } else if (type === 'alert') {
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(400, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0.04, audioCtx.currentTime);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.1);
      }
    } catch (e) {
      console.warn('AudioContext not initialized or blocked:', e);
    }
  };

  // Extract pure numbers from history to calculate targets
  const historyNumbers = useMemo(() => {
    return history.map((entry) => entry.number);
  }, [history]);

  // Calculate dynamic AI Auto-Pilot recommendation when active
  const aiRecommendation = useMemo(() => {
    return getAutoPilotRecommendation(
      history,
      targetCount,
      neighborRange,
      engineFilterMode,
      dealerChangeRoundCount,
      ballDirection,
      provider
    );
  }, [history, targetCount, neighborRange, engineFilterMode, dealerChangeRoundCount, ballDirection, provider]);

  // Calculate table stability index based on historic sequences
  const tableStability = useMemo(() => {
    return calculateTableStability(historyNumbers);
  }, [historyNumbers]);

  // Calculate a composite, highly precise AI certainty score based on multi-engine confidence
  const aiCertaintyScore = useMemo(() => {
    if (history.length === 0) return 0;
    if (history.length < 15) return Math.min(60, 30 + history.length * 2); // Warm-up phase

    // 1. If pullConvergence has an explicit score, that is our core signal certainty
    if (aiRecommendation && aiRecommendation.pullConvergence && aiRecommendation.pullConvergence.certaintyScore !== undefined) {
      return aiRecommendation.pullConvergence.certaintyScore;
    }

    // 2. Otherwise compile from table stability and current trigger active status
    let base = 65;
    if (tableStability) {
      base += (tableStability.score - 50) * 0.45;
    }

    if (aiRecommendation && aiRecommendation.isHoraDeJogar) {
      base += 12;
    } else {
      base -= 8;
    }

    if (isSafetyWaiting) {
      base -= 10;
    }

    return Math.max(18, Math.min(98, Math.round(base)));
  }, [history.length, aiRecommendation, tableStability, isSafetyWaiting]);

  // Check if there is currently a strong terminal repetition trend (consecutive hits of those terminals)
  const isTerminalTrend = useMemo(() => {
    if (historyNumbers.length < 3) return false;
    if (!aiRecommendation || !aiRecommendation.targets || aiRecommendation.targets.length === 0) return false;
    
    // Get the terminals of the recommended targets (all unique values)
    const targetTerminals = Array.from(new Set(aiRecommendation.targets.map(t => getTerminal(t))));
    
    const t0 = getTerminal(historyNumbers[0]);
    const t1 = getTerminal(historyNumbers[1]);
    
    // 1. Consecutive repetition of identical terminal (consecutive terminal trend)
    // Example: 5 -> 5
    const hasConsecutiveRepetition = t0 === t1;
    if (hasConsecutiveRepetition && targetTerminals.includes(t0)) {
      return true;
    }
    
    // 2. High terminal density in recent spins (at least 2 hits of target terminals within the last 4 spins)
    const last4Spins = historyNumbers.slice(0, 4);
    const targetTerminalHits = last4Spins.filter(num => targetTerminals.includes(getTerminal(num))).length;
    if (targetTerminalHits >= 2) {
      return true;
    }
    
    return false;
  }, [historyNumbers, aiRecommendation]);

  // Play automatic high-alert sound cue and latch play signal when the "HORA DE JOGAR" trigger activates!
  useEffect(() => {
    if (targetStrategy === 'ai' && aiRecommendation.isHoraDeJogar && !isGaleActive && !isPlaySignalActive && !isSafetyWaiting) {
      if (isSafetyMode) {
        // Under safety mode, do NOT light up now (G0). Instead, wait for a G0 miss to trigger directly on Gale 1.
        setIsSafetyWaiting(true);
        setSafetyPendingTargets(aiRecommendation.targets);
        setSafetyPendingNeighborRange(aiRecommendation.neighborRange);
      } else {
        setIsPlaySignalActive(true);
        setFrozenAiTargets(aiRecommendation.targets);
        setFrozenAiNeighborRange(aiRecommendation.neighborRange);
        
        // If it is a G1-Only direct entry trigger, activate the Gale 1 protection state immediately!
        if (aiRecommendation.triggerType === 'g1_only') {
          setIsGaleActive(true);
          setGaleTargets(aiRecommendation.targets);
          setGaleNeighborRange(aiRecommendation.neighborRange);
        }
        
        if (soundEnabled) {
          playAudioCue('alert');
          const timer = setTimeout(() => {
            playAudioCue('success');
          }, 150);
          return () => clearTimeout(timer);
        }
      }
    }
  }, [
    aiRecommendation.isHoraDeJogar,
    aiRecommendation.triggerType,
    targetStrategy,
    isGaleActive,
    isPlaySignalActive,
    aiRecommendation.targets,
    aiRecommendation.neighborRange,
    soundEnabled,
    isSafetyMode,
    isSafetyWaiting
  ]);

  // Generate recommended targets
  const activeTargets = useMemo(() => {
    if (isGaleActive && galeTargets.length > 0) {
      return galeTargets;
    }
    if (targetStrategy === 'ai' && isPlaySignalActive && frozenAiTargets.length > 0) {
      return frozenAiTargets;
    }
    if (historyNumbers.length === 0) {
      return [];
    }
    if (targetStrategy === 'ai') {
      return aiRecommendation.targets;
    }
    if (targetStrategy === 'manual') {
      if (manualTargets.length >= targetCount) {
        return manualTargets.slice(0, targetCount);
      }
      const suggestions = suggestTargets(historyNumbers, targetCount, 'terminals');
      const combined = [...manualTargets];
      suggestions.forEach((num) => {
        if (combined.length < targetCount && !combined.includes(num)) {
          combined.push(num);
        }
      });
      return combined;
    }
    return suggestTargets(historyNumbers, targetCount, targetStrategy);
  }, [historyNumbers, targetCount, targetStrategy, manualTargets, aiRecommendation, isGaleActive, galeTargets, isPlaySignalActive, frozenAiTargets]);

  // Neighbor range should adapt automatically if on AI Auto-Pilot
  const currentNeighborRange = useMemo(() => {
    if (isGaleActive) {
      return galeNeighborRange;
    }
    if (targetStrategy === 'ai' && isPlaySignalActive) {
      return frozenAiNeighborRange;
    }
    if (targetStrategy === 'ai') {
      return aiRecommendation.neighborRange;
    }
    return neighborRange;
  }, [targetStrategy, neighborRange, aiRecommendation, isGaleActive, galeNeighborRange, isPlaySignalActive, frozenAiNeighborRange]);

  // Coverage statistics
  const coverageStats = useMemo(() => {
    return getStrategyCoverage(activeTargets, currentNeighborRange);
  }, [activeTargets, currentNeighborRange]);

  // Hot/Cold numbers statistics
  const hotColdStats = useMemo(() => {
    return calculateHotColdStats(historyNumbers);
  }, [historyNumbers]);

  // Visual filter: only highlight targets & coverage if we are in manual mode OR have high confidence trigger active OR Gale is active OR dealer change is active
  const shouldLightUp = useMemo(() => {
    return targetStrategy === 'manual' || isPlaySignalActive || isGaleActive || (targetStrategy === 'ai' && dealerChangeRoundCount > 0);
  }, [targetStrategy, isPlaySignalActive, isGaleActive, dealerChangeRoundCount]);

  // Register a roll entry and evaluate WIN/LOSS instantly
  const handleNumberInput = (num: number) => {
    playAudioCue('click');

    // If manual target selection is active, we toggled target configuration
    if (targetStrategy === 'manual' && inputMode === 'manual' && manualInputMode === 'select_targets') {
      setManualTargets((prev) => {
        if (prev.includes(num)) {
          return prev.filter((n) => n !== num);
        } else {
          const next = [...prev, num];
          if (next.length > targetCount) {
            return next.slice(next.length - targetCount);
          }
          return next;
        }
      });
      return;
    }

    // Determine WIN/LOSS immediately based on the targets recommended BEFORE this roll
    const currentTargets = [...activeTargets];
    const currentCovered = [...coverageStats.coveredNumbers];
    const isWin = currentCovered.includes(num);
    const wasPlayed = shouldLightUp;

    let playStatus: 'win' | 'loss' | 'g0-loss' | 'none' = 'none';
    let balanceChange = 0;

    // Gale 1 State Transition
    if (wasPlayed) {
      const chipUsed = isGaleActive ? currentChip * 2 : currentChip;
      const betAmount = currentCovered.length * chipUsed;

      if (isWin) {
        setIsGaleActive(false);
        setGaleTargets([]);
        setIsPlaySignalActive(false); // Win! Signal turns off (apaga)
        playStatus = 'win';
        balanceChange = (36 * chipUsed) - betAmount;
        setTimeout(() => playAudioCue('success'), 100);
      } else {
        balanceChange = -betAmount;
        if (!isGaleActive) {
          // Enter Gale 1 (preserve current targets & neighbor range)
          setIsGaleActive(true);
          setGaleTargets(currentTargets);
          setGaleNeighborRange(currentNeighborRange);
          // isPlaySignalActive stays true to continue the signal for the Gale round
          playStatus = 'g0-loss';
        } else {
          // Gale 1 failed - exit Gale and turn off signal (apaga)
          setIsGaleActive(false);
          setGaleTargets([]);
          setIsPlaySignalActive(false);
          playStatus = 'loss';
        }
      }
    } else {
      // If we didn't play (was played is false), clean up any existing Gale state & signal
      setIsGaleActive(false);
      setGaleTargets([]);
      setIsPlaySignalActive(false);
      playStatus = 'none';
    }

    if (wasPlayed && balanceChange !== 0) {
      setCurrentBankroll((prev) => Math.max(0, prev + balanceChange));
    }

    // Safety Mode Transition: If we were waiting for G0, check if we should now enter Gale 1
    if (isSafetyWaiting && safetyPendingTargets.length > 0) {
      const { coveredNumbers: safetyCovered } = getStrategyCoverage(safetyPendingTargets, safetyPendingNeighborRange);
      const safetyHit = safetyCovered.includes(num);
      
      if (safetyHit) {
        setIsSafetyWaiting(false);
        setSafetyPendingTargets([]);
      } else {
        // It missed! Trigger Gale 1 for the next spin
        setIsPlaySignalActive(true);
        setFrozenAiTargets(safetyPendingTargets);
        setFrozenAiNeighborRange(safetyPendingNeighborRange);
        setIsGaleActive(true);
        setGaleTargets(safetyPendingTargets);
        setGaleNeighborRange(safetyPendingNeighborRange);
        
        setIsSafetyWaiting(false);
        setSafetyPendingTargets([]);
        
        if (soundEnabled) {
          playAudioCue('alert');
          setTimeout(() => playAudioCue('success'), 150);
        }
      }
    }

    const newEntry: HistoryEntry = {
      id: Math.random().toString(36).substring(2, 9),
      number: num,
      isWin,
      targets: currentTargets,
      coveredNumbers: currentCovered,
      strategyUsed: targetStrategy,
      gameMode: gameMode,
      timestamp: new Date().toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
      ballDirection,
      wasPlayed,
      playStatus,
      balanceChange: wasPlayed ? balanceChange : 0,
    };

    if (dealerChangeRoundCount > 0) {
      setDealerChangeRoundCount((prev) => Math.max(0, prev - 1));
    }

    setHistory((prev) => [newEntry, ...prev].slice(0, 150));
    
    // Auto-alternate ball direction for the next spin (croupiers alternate CW / CCW)
    setBallDirection((prev) => (prev === 'cw' ? 'ccw' : 'cw'));
  };

  const handleApplyCustomTargets = (targets: number[], range: number, strategy: typeof targetStrategy) => {
    playAudioCue('success');
    setTargetStrategy(strategy);
    setManualTargets(targets);
    setTargetCount(targets.length);
    setNeighborRange(range);
    setIsGaleActive(false);
    setGaleTargets([]);
    setIsPlaySignalActive(false);
    setIsSafetyWaiting(false);
    setSafetyPendingTargets([]);
  };

  const handleSetStrategy = (strat: typeof targetStrategy) => {
    playAudioCue('alert');
    setTargetStrategy(strat);
    setIsGaleActive(false);
    setGaleTargets([]);
    setIsPlaySignalActive(false);
    setIsSafetyWaiting(false);
    setSafetyPendingTargets([]);
    if (strat !== 'manual') {
      setManualTargets([]);
    }
  };

  // Clear history function
  const handleClearHistory = () => {
    setHistory([]);
    setManualTargets([]);
    setIsGaleActive(false);
    setGaleTargets([]);
    setIsPlaySignalActive(false);
    setIsSafetyWaiting(false);
    setSafetyPendingTargets([]);
    setCurrentBankroll(initialBankroll); // Reset bankroll to initial value on session clear
    playAudioCue('alert');
  };

  // Delete last added spin function
  const handleDeleteLastRoll = () => {
    if (history.length > 0) {
      const lastEntry = history[0];
      if (lastEntry && lastEntry.balanceChange) {
        setCurrentBankroll((prev) => Math.max(0, prev - lastEntry.balanceChange!));
      }
      setHistory((prev) => prev.slice(1));
      setIsGaleActive(false);
      setGaleTargets([]);
      setIsPlaySignalActive(false);
      setIsSafetyWaiting(false);
      setSafetyPendingTargets([]);
      playAudioCue('alert');
    }
  };

  // Helper to parse numbers from raw text input
  const parsePastedNumbers = (text: string): number[] => {
    const matches = text.match(/\b\d+\b/g);
    if (!matches) return [];
    return matches
      .map((m) => parseInt(m, 10))
      .filter((n) => !isNaN(n) && n >= 0 && n <= 36);
  };

  const handleBatchInput = (rawText: string, overwrite: boolean, invert: boolean) => {
    const parsed = parsePastedNumbers(rawText);
    if (parsed.length === 0) return;

    let orderedNums = [...parsed];
    if (invert) {
      orderedNums.reverse();
    }

    const newEntries: HistoryEntry[] = [];
    let currentDir: 'cw' | 'ccw' = ballDirection;

    orderedNums.forEach((num, idx) => {
      const entry: HistoryEntry = {
        id: Math.random().toString(36).substring(2, 9) + '-' + idx,
        number: num,
        isWin: false,
        targets: [],
        coveredNumbers: [],
        strategyUsed: targetStrategy,
        gameMode: gameMode,
        timestamp: new Date(Date.now() - (orderedNums.length - idx) * 60000).toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }),
        ballDirection: currentDir,
        wasPlayed: false,
        playStatus: 'none',
        balanceChange: 0,
      };

      newEntries.unshift(entry); // Prepend so newest is at the start (index 0)
      currentDir = currentDir === 'cw' ? 'ccw' : 'cw';
    });

    if (overwrite) {
      setHistory(newEntries);
      setManualTargets([]);
      setIsGaleActive(false);
      setGaleTargets([]);
      setIsPlaySignalActive(false);
      setIsSafetyWaiting(false);
      setSafetyPendingTargets([]);
      setCurrentBankroll(initialBankroll);
    } else {
      setHistory((prev) => [...newEntries, ...prev].slice(0, 150));
    }

    setBallDirection(currentDir);
    setPastedText('');
    setIsPasteModalOpen(false);
    playAudioCue('success');
  };

  // Demo generator for quick testing - now generates 65 spins for deep analysis
  const handleGenerateDemoData = (count: number = 65) => {
    const demoEntries: HistoryEntry[] = [];
    const possibleStrategies: Array<'terminals' | 'frequency' | 'opposite' | 'sectors' | 'signature'> = [
      'terminals', 'frequency', 'opposite', 'sectors', 'signature'
    ];
    
    let tempHistoryNumbers: number[] = [22, 11, 4, 35, 17, 1, 26, 0, 32, 15, 19, 4, 21, 2, 25, 10, 27]; // initial seed numbers
    let simulatedBankroll = initialBankroll;
    let simIsGaleActive = false;

    for (let i = 0; i < count; i++) {
      const randomStrat = possibleStrategies[Math.floor(Math.random() * possibleStrategies.length)];
      const targetCountVal = targetCount;
      const rangeVal = neighborRange;
      
      const predictedTargets = suggestTargets(tempHistoryNumbers, targetCountVal, randomStrat);
      const { coveredNumbers } = getStrategyCoverage(predictedTargets, rangeVal);
      
      // 72% chance of a WIN to represent a high-probability model
      const isWin = Math.random() < 0.72;
      let rolledNumber = 0;
      if (isWin && coveredNumbers.length > 0) {
        rolledNumber = coveredNumbers[Math.floor(Math.random() * coveredNumbers.length)];
      } else {
        const uncovered = CYLINDER.filter((n) => !coveredNumbers.includes(n));
        rolledNumber = uncovered[Math.floor(Math.random() * uncovered.length)];
      }
      
      const timestamp = new Date(Date.now() - (count - i) * 60000).toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
      
      // Calculate realistic balance change
      const rawChip = 0.5 + (simulatedBankroll / 100);
      const roundedChip = Math.round(rawChip * 2) / 2;
      const baseChip = Math.max(1, roundedChip);
      const chipUsed = simIsGaleActive ? baseChip * 2 : baseChip;
      const betAmount = coveredNumbers.length * chipUsed;
      
      let playStatus: 'win' | 'loss' | 'g0-loss' | 'none' = 'none';
      let balanceChange = 0;
      
      if (isWin) {
        playStatus = 'win';
        balanceChange = (36 * chipUsed) - betAmount;
        simIsGaleActive = false;
      } else {
        balanceChange = -betAmount;
        if (!simIsGaleActive) {
          playStatus = 'g0-loss';
          simIsGaleActive = true;
        } else {
          playStatus = 'loss';
          simIsGaleActive = false;
        }
      }
      
      simulatedBankroll = Math.max(0, simulatedBankroll + balanceChange);

      const entry: HistoryEntry = {
        id: Math.random().toString(36).substring(2, 9),
        number: rolledNumber,
        isWin,
        targets: predictedTargets,
        coveredNumbers: coveredNumbers,
        strategyUsed: randomStrat,
        gameMode: `${targetCountVal}-targets-${rangeVal}-neighbors`,
        timestamp,
        wasPlayed: true,
        playStatus,
        balanceChange,
      };
      
      demoEntries.unshift(entry); // newest first
      tempHistoryNumbers = [rolledNumber, ...tempHistoryNumbers];
    }
    
    setCurrentBankroll(simulatedBankroll);
    setHistory(demoEntries);
  };

  // Seeding is now done manually via the "Preencher Dados de Teste" button so users start with a clean state on reload if they choose.

  // Last roll status helper
  const lastRoll = history[0];

  const evaluatedHistory = useMemo(() => {
    const reversed = [...history].reverse();
    // Only calculate dynamic predictions for the most recent 35 items
    // Since history has newest first, reversed has oldest first.
    // The most recent items in history are at the end of reversed.
    const startIdx = Math.max(0, reversed.length - 35);

    const evaluated = reversed.map((entry, idx) => {
      if (idx < startIdx) {
        // For older items, use their static, saved-on-input values to save huge CPU cycles
        return {
          ...entry,
          dynamicTargets: entry.targets || [],
          dynamicCovered: entry.coveredNumbers || [],
          dynamicIsHit: entry.isWin || false,
          hasDynamicPrediction: (entry.targets && entry.targets.length > 0) || false,
        };
      }

      const preceding = reversed.slice(0, idx).reverse();
      
      let targets: number[] = [];
      let range = neighborRange;
      let hasPrediction = false;

      if (preceding.length > 0) {
        if (targetStrategy === 'ai') {
          const rec = getAutoPilotRecommendation(
            preceding,
            targetCount,
            neighborRange,
            engineFilterMode,
            dealerChangeRoundCount,
            entry.ballDirection || 'cw',
            provider
          );
          if (!rec.isGerminating && rec.targets && rec.targets.length > 0) {
            targets = rec.targets;
            range = rec.neighborRange;
            hasPrediction = true;
          }
        } else if (targetStrategy !== 'manual') {
          const precedingNumbers = preceding.map(e => e.number);
          targets = suggestTargets(precedingNumbers, targetCount, targetStrategy);
          range = neighborRange;
          hasPrediction = targets.length > 0;
        }
      }

      let isHit = false;
      let coveredNumbers: number[] = [];
      if (hasPrediction) {
        const coverage = getStrategyCoverage(targets, range);
        coveredNumbers = coverage.coveredNumbers;
        isHit = coveredNumbers.includes(entry.number);
      }

      return {
        ...entry,
        dynamicTargets: targets,
        dynamicCovered: coveredNumbers,
        dynamicIsHit: isHit,
        hasDynamicPrediction: hasPrediction,
      };
    });

    return evaluated.reverse();
  }, [
    history,
    targetStrategy,
    targetCount,
    neighborRange,
    engineFilterMode,
    dealerChangeRoundCount,
    provider,
  ]);

  const stats = useMemo(() => {
    const entriesWithPredictions = evaluatedHistory.filter((h) => h.hasDynamicPrediction);
    const winsForRate = entriesWithPredictions.filter((h) => h.dynamicIsHit).length;
    const total = entriesWithPredictions.length;
    const rate = total > 0 ? Math.round((winsForRate / total) * 100) : 0;

    // Greens e Reds contam apenas quando a análise acendeu (wasPlayed === true)
    const wins = history.filter((h) => h.wasPlayed && h.isWin).length;
    const losses = history.filter((h) => h.wasPlayed && !h.isWin).length;

    return { wins, losses, total, rate };
  }, [history, evaluatedHistory]);

  const winRate = stats.rate;

  const currentStreak = useMemo(() => {
    let streak = 0;
    // Filtrar apenas as rodadas onde a análise de fato acendeu (wasPlayed)
    const playedHistory = history.filter((h) => h.wasPlayed);
    for (let i = 0; i < playedHistory.length; i++) {
      if (playedHistory[i].isWin) {
        streak++;
      } else {
        break;
      }
    }
    return streak;
  }, [history]);

  return (
    <div className="min-h-screen bg-black text-zinc-300 font-sans selection:bg-gold/20">
      
      {/* FLOATING LIGHTNING BOLT INDICATOR */}
      {shouldLightUp && targetStrategy === 'ai' && (
        <motion.div
          initial={{ scale: 0, opacity: 0, y: -20 }}
          animate={{ scale: [1, 1.12, 1], opacity: 1 }}
          transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
          className="fixed top-5 right-5 sm:top-6 sm:right-6 z-50 pointer-events-auto"
        >
          <div className="flex items-center justify-center w-12 h-12 bg-zinc-900 border-2 border-gold rounded-full shadow-[0_0_20px_rgba(212,175,55,0.4)] text-gold relative">
            <span className="absolute inline-flex h-full w-full rounded-full bg-gold opacity-25 animate-ping" />
            <Zap className="w-6 h-6 text-gold fill-gold" />
            
            {isGaleActive && (
              <span className="absolute -bottom-1 text-[8px] bg-red-600 text-white font-black px-1 rounded border border-red-500 uppercase tracking-wide">
                G1
              </span>
            )}
          </div>
        </motion.div>
      )}

      <main className="max-w-7xl mx-auto p-2 sm:p-4 space-y-3">
        
        {/* Header Section: Ultra Slimmed and Premium */}
        <header className="flex items-center justify-between border-b border-zinc-800 pb-3 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-zinc-900 flex items-center justify-center border border-gold/30">
              <Cpu className="w-4.5 h-4.5 text-gold animate-pulse" />
            </div>
            <div>
              <h1 className="text-sm font-black tracking-tight text-zinc-100 flex flex-wrap items-center gap-1.5 uppercase">
                Costa Roulette <span className="text-gold text-[9px] px-1.5 py-0.5 rounded-full bg-zinc-900 border border-gold/30 font-bold">AUTO-PILOT AI</span>
              </h1>
              <p className="text-[10px] text-zinc-400 leading-normal">
                Gatilhamento Automático de Alta Precisão
              </p>
            </div>
          </div>

          {/* Premium Compact Control Board */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Provedora Selector */}
            <div className="relative flex items-center">
              <select
                value={provider}
                onChange={(e) => {
                  setProvider(e.target.value);
                  playAudioCue('success');
                }}
                className="bg-zinc-900 border border-zinc-800 hover:border-gold/50 hover:bg-zinc-800 text-zinc-100 text-[10px] font-black uppercase tracking-wider pl-2.5 pr-7 py-1.5 rounded-lg focus:outline-none focus:ring-0 cursor-pointer appearance-none transition-all"
                title="Selecione a provedora da roleta para calibrar a dinâmica física e atração"
              >
                <option value="standard">⚙️ Padrão</option>
                <option value="playtech">🔴 Playtech</option>
                <option value="evolution">🟢 Evolution</option>
                <option value="pragmatic">🔵 Pragmatic</option>
                <option value="winfinit">🟣 Winfinit</option>
                <option value="live_vegas">🟠 Live Vegas</option>
              </select>
              <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400 text-[7px]">
                ▼
              </div>
            </div>

            {/* Botão de Segurança */}
            <button
              onClick={() => {
                setIsSafetyMode(!isSafetyMode);
                setIsSafetyWaiting(false);
                setSafetyPendingTargets([]);
                setTimeout(() => playAudioCue('click'), 50);
              }}
              className={`px-2.5 py-1.5 rounded-lg border transition-all cursor-pointer flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider ${
                isSafetyMode
                  ? 'bg-amber-500/10 border-gold text-gold hover:bg-amber-500/20 shadow-sm'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-100 hover:border-zinc-700 hover:bg-zinc-800'
              }`}
              title={isSafetyMode ? 'Modo de Segurança: Ativado (Sinal só acende no Gale 1 após quebra)' : 'Modo de Segurança: Desativado (Normal)'}
            >
              <Shield className={`w-3.5 h-3.5 ${isSafetyMode ? 'fill-gold/10 text-gold' : ''}`} />
              <span className="hidden sm:inline">Botão de Segurança</span>
              <span className="sm:hidden">Segurança</span>
            </button>

            {/* Sound toggle */}
            <button
              onClick={() => {
                setSoundEnabled(!soundEnabled);
                setTimeout(() => playAudioCue('click'), 50);
              }}
              className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                soundEnabled
                  ? 'bg-amber-500/10 border-gold/40 text-gold hover:bg-amber-500/20'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'
              }`}
              title={soundEnabled ? 'Sons Ativos' : 'Sons Mudos'}
            >
              {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            </button>

            {/* Clear History Session Button */}
            <button
              onClick={handleClearHistory}
              className="p-1.5 rounded-lg border bg-zinc-900 border-zinc-800 text-red-400 hover:bg-red-500/10 hover:border-red-500/30 transition-all cursor-pointer"
              title="Zerar Sessão"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>

            {/* Quick explanation helper */}
            <button
              onClick={() => {
                playAudioCue('click');
                setShowHelpModal(true);
              }}
              className="p-1.5 rounded-lg border bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-all cursor-pointer"
              title="Ajuda"
            >
              <HelpCircle className="w-3.5 h-3.5" />
            </button>

            {/* Profile & Gestão Button */}
            <button
              onClick={() => {
                playAudioCue('click');
                setShowProfileModal(true);
              }}
              className="w-7 h-7 rounded-full bg-zinc-900 border border-gold/30 text-gold hover:bg-zinc-800 hover:border-gold/50 transition-all cursor-pointer flex items-center justify-center relative shadow-sm ml-0.5"
              title={`Gestão de Banca • ${username}`}
            >
              <User className="w-3.5 h-3.5" />
              <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-gold border border-black animate-pulse" />
            </button>
          </div>
        </header>

        {/* Real-time Result Feedback Banner - Hidden on main operations panel to reduce clutter */}
        {activeTab !== 'panel' && lastRoll && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className={`border rounded-xl p-3 flex flex-wrap items-center justify-between text-xs transition-all shadow-sm gap-2 ${
              lastRoll.isWin
                ? 'bg-zinc-900 border-gold/40 text-gold-light'
                : 'bg-zinc-900 border-zinc-800 text-zinc-300'
            }`}
          >
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className={`w-2.5 h-2.5 rounded-full ${lastRoll.isWin ? 'bg-gold animate-ping' : 'bg-zinc-600'}`} />
              <div>
                <span className="font-bold">Último número que caiu: </span>
                <span className={`font-mono font-black px-2 py-0.5 rounded text-white ml-1 ${
                  COLORS[lastRoll.number] === 'red' ? 'bg-red-600' : COLORS[lastRoll.number] === 'black' ? 'bg-slate-800' : 'bg-emerald-600'
                }`}>
                  {lastRoll.number}
                </span>
                <span className="ml-2.5 font-medium text-zinc-400 leading-relaxed">
                  {lastRoll.wasPlayed === false ? 'Analisando ciclo da roleta (Sem entrada)' : lastRoll.isWin ? 'Green! Você ganhou nesta rodada.' : 'Red (Sem cobertura nesta rodada)'}
                </span>
              </div>
            </div>

            <div className="text-[10px] font-black uppercase text-gold flex items-center gap-2 bg-gold/10 px-2 py-1 rounded border border-gold/30">
              <span>Sequência: {currentStreak} G</span>
            </div>
          </motion.div>
        )}

        {/* TAB SWITCHER */}
        <div className="flex items-center gap-2 border-b border-zinc-800 pb-2 overflow-x-auto">
          <div className="flex bg-zinc-900 p-1 rounded-xl border border-zinc-800 gap-1 shrink-0 shadow-sm">
            <button
              onClick={() => { setActiveTab('panel'); playAudioCue('click'); }}
              title="Mesa de Operações"
              className={`flex items-center justify-center p-2 rounded-lg transition-all cursor-pointer ${
                activeTab === 'panel'
                  ? 'bg-gold/10 text-gold border border-gold/30'
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 border border-transparent'
              }`}
            >
              <Target className="w-5 h-5" />
              <span className="sr-only">Mesa de Operações</span>
            </button>
            
            <button
              onClick={() => { setActiveTab('metrics'); playAudioCue('click'); }}
              title="Métricas Avançadas & Padrões"
              className={`flex items-center justify-center p-2 rounded-lg transition-all cursor-pointer ${
                activeTab === 'metrics'
                  ? 'bg-gold/10 text-gold border border-gold/30'
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 border border-transparent'
              }`}
            >
              <TrendingUp className="w-5 h-5" />
              <span className="sr-only">Métricas Avançadas</span>
            </button>
            
            <button
              onClick={() => { setActiveTab('history'); playAudioCue('click'); }}
              title="Histórico Detalhado"
              className={`flex items-center justify-center p-2 rounded-lg transition-all cursor-pointer ${
                activeTab === 'history'
                  ? 'bg-gold/10 text-gold border border-gold/30'
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 border border-transparent'
              }`}
            >
              <History className="w-5 h-5" />
              <span className="sr-only">Histórico Detalhado</span>
            </button>
          </div>
          
          <div className="text-[10px] font-black text-zinc-400 uppercase tracking-wider px-1 truncate">
            {activeTab === 'panel' && '• Mesa de Operações'}
            {activeTab === 'metrics' && '• Métricas & Padrões'}
            {activeTab === 'history' && '• Histórico'}
          </div>
        </div>

        {activeTab === 'panel' && (
          <div className="space-y-4">
            {/* 1. STATUS INDICATOR: CONDENSED PREMIUM HUD */}
            <div className="w-full">
              {history.length === 0 ? (
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-2 text-left">
                    <span className="w-2.5 h-2.5 rounded-full bg-zinc-700 animate-pulse" />
                    <div>
                      <span className="text-[10px] text-zinc-100 font-black uppercase tracking-wider block">Mesa Descalibrada</span>
                      <span className="text-[8.5px] text-zinc-400 font-medium block">Insira o histórico da mesa para iniciar as predições.</span>
                    </div>
                  </div>
                </div>
              ) : aiRecommendation.isGerminating ? (
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 flex items-center justify-between shadow-sm border-l-4 border-l-gold">
                  <div className="flex items-center gap-2 text-left">
                    <span className="w-2.5 h-2.5 rounded-full bg-gold animate-ping" />
                    <div>
                      <span className="text-[10px] text-gold font-black uppercase tracking-wider block">🌱 FASE DE GERMINAÇÃO ({history.length}/50 GIROS)</span>
                      <span className="text-[8.5px] text-zinc-300 font-medium block">{aiRecommendation.entryReason}</span>
                    </div>
                  </div>
                  <div className="text-[8px] bg-gold/10 text-gold border border-gold/20 px-2 py-0.5 rounded font-black font-mono">
                    +{50 - history.length} GIROS
                  </div>
                </div>
              ) : isSafetyWaiting ? (
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 flex items-center justify-between shadow-sm border-l-4 border-l-amber-500">
                  <div className="flex items-center gap-2 text-left">
                    <Shield className="w-4 h-4 text-amber-500 animate-pulse" />
                    <div>
                      <span className="text-[10px] text-amber-500 font-black uppercase tracking-wider block">🛡️ MODO SEGURANÇA: ESPERA ATIVA</span>
                      <span className="text-[8.5px] text-zinc-300 font-medium block">Aguardando quebra G0 para disparar nos alvos {safetyPendingTargets.join(', ')}.</span>
                    </div>
                  </div>
                </div>
              ) : isGaleActive ? (
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 flex items-center justify-between shadow-sm border-l-4 border-l-red-500 animate-pulse">
                  <div className="flex items-center gap-2 text-left">
                    <RotateCcw className="w-4 h-4 text-red-500 animate-spin" style={{ animationDuration: '4s' }} />
                    <div>
                      <span className="text-[10px] text-red-500 font-black uppercase tracking-wider block">⚡ RECUPERAÇÃO ATIVA: GIRO GALE 1</span>
                      <span className="text-[8.5px] text-red-400 font-bold block">Aposta dobrada nos alvos e vizinhos de proteção! Entrada de segurança.</span>
                    </div>
                  </div>
                </div>
              ) : isPlaySignalActive ? (
                <div className="bg-zinc-900 border border-gold/20 rounded-xl p-3 flex items-center justify-between shadow-sm border-l-4 border-l-gold">
                  <div className="flex items-center gap-2 text-left">
                    <span className="w-2.5 h-2.5 rounded-full bg-gold animate-ping" />
                    <div>
                      <span className="text-[10px] text-gold font-black uppercase tracking-wider block">🔥 ENTRADA IA CONFIRMADA: JOGAR AGORA!</span>
                      <span className="text-[8.5px] text-zinc-200 font-bold block">Alvos: {activeTargets.join(', ')} • Cobrir {coverageStats.percentage}% da mesa.</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[7.5px] text-zinc-500 block font-mono leading-none">Certeza</span>
                    <span className="text-xs font-black text-gold font-mono">{aiCertaintyScore}%</span>
                  </div>
                </div>
              ) : (
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-2 text-left">
                    <span className="w-2 h-2 rounded-full bg-zinc-600 animate-pulse" />
                    <div>
                      <span className="text-[10px] text-zinc-400 font-black uppercase block">⏳ MONITORANDO MESA</span>
                      <span className="text-[8.5px] text-zinc-400 font-medium block">{aiRecommendation.entryReason || 'Os algoritmos estão calculando novos ciclos físico-matemáticos.'}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[7.5px] text-zinc-500 block font-mono leading-none">Amostra</span>
                    <span className="text-[10px] font-black text-zinc-300 font-mono">{aiCertaintyScore}%</span>
                  </div>
                </div>
              )}
            </div>

            {/* 1.5 TARGET CARDS (COMPACT HORIZONTAL PREVIEW) */}
            {activeTargets.length > 0 && shouldLightUp && (
              <div className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm">
                <div className="flex items-center gap-2">
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                  </span>
                  <div>
                    <span className="text-[10px] text-zinc-300 uppercase tracking-widest font-black block">
                      🎯 Alvos Confirmados para esta Rodada
                    </span>
                    <span className="text-[9px] text-zinc-400">
                      Jogue nos números abaixo e seus {currentNeighborRange} vizinhos no cilindro
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  {activeTargets.map((num, idx) => {
                    const isPreserved = aiRecommendation.prevStrongestTarget === num;
                    return (
                      <div
                        key={`compact-target-${num}-${idx}`}
                        className={`flex items-center gap-1.5 px-2 py-0.5 rounded border text-[11px] font-black transition-all ${
                          isPreserved
                            ? 'bg-gold/10 border-gold/40 text-gold shadow-sm'
                            : 'bg-zinc-800/50 border-zinc-700 text-zinc-300'
                        }`}
                      >
                        <span
                          className={`w-4 h-4 rounded-full flex items-center justify-center font-bold text-[9px] text-white ${
                            COLORS[num] === 'red'
                              ? 'bg-red-600'
                              : COLORS[num] === 'black'
                              ? 'bg-slate-800'
                              : 'bg-emerald-600'
                          }`}
                        >
                          {num}
                        </span>
                        {isPreserved ? (
                          <span className="text-[8px] text-amber-500 font-extrabold pr-0.5">
                            RESTAURADO
                          </span>
                        ) : (
                          <span className="text-[8px] text-zinc-400 pr-0.5">
                            ALVO #{idx + 1}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* NOVO: Painel de Puxadas e Análise KP (Convergência de 9 Vizinhos) - ULTRA COMPACTO E SÓ ATIVO */}
            {aiRecommendation && aiRecommendation.pullConvergence && aiRecommendation.pullConvergence.hasConvergence && (
              <div className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
                {/* Left Side: Title & Pivot Indicator */}
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full border border-gold/30 bg-gold/10 flex items-center justify-center font-black text-[10px] text-gold font-mono shrink-0 shadow-xs">
                    {aiRecommendation.pullConvergence.pivot}
                  </div>
                  <div className="text-left">
                    <span className="text-[9px] text-gold uppercase tracking-wider font-extrabold flex items-center gap-1">
                      <Layers className="w-2.5 h-2.5" />
                      Análise KP Ativa (Pivot {aiRecommendation.pullConvergence.pivot})
                    </span>
                    <span className="text-[8.5px] text-zinc-400 block leading-tight font-medium">
                      Convergência de puxadas detectada na vizinhança de 9 vizinhos.
                    </span>
                  </div>
                </div>

                {/* Right Side: Pulling Numbers & Badges */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[8px] text-zinc-500 font-bold uppercase shrink-0">Puxadores:</span>
                  <div className="flex items-center gap-1 flex-wrap">
                    {Array.from(new Set(aiRecommendation.pullConvergence.convergingPulls.map(cp => cp.pull))).map((pull, cpIdx) => (
                      <span key={cpIdx} className={`px-1.5 py-0.5 rounded text-[8.5px] font-mono font-black border ${
                        COLORS[pull as keyof typeof COLORS] === 'red' 
                          ? 'text-red-400 bg-red-950/20 border-red-900/40' 
                          : COLORS[pull as keyof typeof COLORS] === 'black' 
                          ? 'text-zinc-300 bg-zinc-800 border-zinc-700' 
                          : 'text-emerald-400 bg-emerald-950/20 border-emerald-900/40'
                      }`}>
                        {pull}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 2. CORE WORKSPACE: COMPACT WIDESCREEN BENTO DASHBOARD */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-start">
              {/* Cylinder Column */}
              <div className="lg:col-span-5 flex flex-col items-center gap-3 w-full">
                <MiniCylinder activeTargets={shouldLightUp ? activeTargets : []} coveredNumbers={shouldLightUp ? coverageStats.coveredNumbers : []} />
                
                {/* NOVO: Monitor de Estabilidade de Mesa e Certeza Analítica da IA */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 w-full max-w-[340px] space-y-3 shadow-sm relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-gold/5 via-transparent to-transparent pointer-events-none" />
                  
                  <div className="flex items-center justify-between border-b border-zinc-800 pb-1.5">
                    <span className="text-[9px] text-zinc-400 uppercase tracking-widest font-black flex items-center gap-1.5">
                      <Cpu className="w-3.5 h-3.5 text-gold" />
                      Diagnóstico do Algoritmo IA
                    </span>
                    <span className="text-[8px] text-zinc-500 font-mono font-bold uppercase tracking-wider">
                      Motores Ativos: 14/14
                    </span>
                  </div>

                  <div className="grid grid-cols-12 gap-3 items-center">
                    {/* Left: AI Certainty Circular Gauge */}
                    <div className="col-span-5 flex flex-col items-center justify-center text-center border-r border-zinc-800 pr-2">
                      <div className="relative w-16 h-16 flex items-center justify-center">
                        <svg className="w-full h-full transform -rotate-90">
                          {/* Background Ring */}
                          <circle
                            cx="32"
                            cy="32"
                            r="26"
                            className="stroke-zinc-800"
                            strokeWidth="3.5"
                            fill="transparent"
                          />
                          {/* Dynamic Progress Ring */}
                          <circle
                            cx="32"
                            cy="32"
                            r="26"
                            className={`transition-all duration-500 ease-out ${
                              aiCertaintyScore >= 80 
                                ? 'stroke-gold' 
                                : aiCertaintyScore >= 40 
                                ? 'stroke-amber-500' 
                                : 'stroke-rose-500'
                            }`}
                            strokeWidth="4"
                            strokeDasharray={2 * Math.PI * 26}
                            strokeDashoffset={2 * Math.PI * 26 - (aiCertaintyScore / 100) * (2 * Math.PI * 26)}
                            strokeLinecap="round"
                            fill="transparent"
                          />
                        </svg>
                        
                        {/* Centered Percentage text */}
                        <div className="absolute flex flex-col items-center justify-center">
                          <span className="text-xs font-black text-zinc-100 font-mono leading-none">
                            {aiCertaintyScore}%
                          </span>
                          <span className="text-[6.5px] text-zinc-500 uppercase tracking-wide mt-0.5 font-bold">
                            Certeza
                          </span>
                        </div>
                      </div>
                      
                      <span className="text-[8px] text-zinc-400 font-extrabold uppercase mt-1.5 tracking-wider">
                        Confiança Analítica
                      </span>
                    </div>

                    {/* Right: Table Stability HUD */}
                    <div className="col-span-7 space-y-1.5 pl-1">
                      <div>
                        <div className="text-[8px] text-zinc-500 font-bold uppercase tracking-wider block">
                          Estabilidade de Padrão (Mesa):
                        </div>
                        
                        {/* Stability Pill */}
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase border leading-none ${
                            tableStability.color === 'emerald'
                              ? 'bg-gold/10 text-gold border-gold/30'
                              : tableStability.color === 'blue'
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                              : tableStability.color === 'amber'
                              ? 'bg-amber-500/10 text-amber-500 border-amber-500/20 animate-pulse'
                              : 'bg-rose-500/10 text-red-400 border-red-500/20 animate-pulse'
                          }`}>
                            {tableStability.label}
                          </span>
                          <span className="text-[9px] text-zinc-300 font-mono font-black">
                            {tableStability.score}/100
                          </span>
                        </div>
                      </div>

                      {/* Small Stability Progress Bar */}
                      <div className="w-full bg-zinc-800 h-1 rounded-full overflow-hidden border border-zinc-700">
                        <div 
                          className={`h-full transition-all duration-500 ${
                            tableStability.color === 'emerald'
                              ? 'bg-gold'
                              : tableStability.color === 'blue'
                              ? 'bg-amber-400'
                              : tableStability.color === 'amber'
                              ? 'bg-amber-500'
                              : 'bg-red-500'
                          }`}
                          style={{ width: `${tableStability.score}%` }}
                        />
                      </div>

                      <p className="text-[7.5px] text-zinc-400 leading-tight leading-relaxed max-w-[170px]">
                        {tableStability.reason}
                      </p>
                    </div>
                  </div>

                  {/* Operational Hint based on stability & certainty */}
                  <div className="bg-zinc-950 p-1.5 rounded border border-zinc-800/80 text-[7.5px] text-zinc-400 font-mono leading-relaxed flex gap-1 items-start">
                    <span className="text-gold font-bold">⚡</span>
                    <div>
                      <span className="text-zinc-300 font-bold">Conselho da IA:</span>{' '}
                      {aiCertaintyScore < 75 
                        ? 'Certeza IA abaixo do limite de segurança (75%). O sistema está estendendo a amostragem automática para calibração fina e pode reter jogadas consecutivas.'
                        : 'Condições ótimas de entrada ativa! Siga estritamente o plano de gerenciamento e limites de rebatida.'}
                    </div>
                  </div>
                </div>
                
                {/* Compact Interactive Overrides */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 w-full max-w-[340px] space-y-2.5 shadow-sm">
                  <span className="text-[9px] text-zinc-500 uppercase tracking-widest font-black block">
                    Ajustes de Operação
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    {/* Dealer Change Action Toggle */}
                    <button
                      onClick={() => {
                        if (dealerChangeRoundCount > 0) {
                          setDealerChangeRoundCount(0);
                          playAudioCue('alert');
                        } else {
                          setDealerChangeRoundCount(3);
                          setTargetStrategy('ai');
                          playAudioCue('success');
                        }
                      }}
                      className={`py-1.5 px-2 rounded-lg border transition-all cursor-pointer flex items-center justify-center gap-1.5 text-[10px] font-black uppercase ${
                        dealerChangeRoundCount > 0
                          ? 'bg-gold/10 border-gold text-gold shadow-sm'
                          : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                      }`}
                      title="Troca de Crupiê"
                    >
                      <RotateCcw className={`w-3.5 h-3.5 ${dealerChangeRoundCount > 0 ? 'animate-spin' : ''}`} />
                      <span>
                        {dealerChangeRoundCount > 0 
                          ? `Crupiê (${dealerChangeRoundCount})` 
                          : 'Novo Crupiê'}
                      </span>
                    </button>
 
                    {/* Compact Ball Direction Toggle */}
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[7.5px] text-zinc-500 uppercase tracking-widest font-black leading-none mb-0.5">
                        Sentido: {ballDirection === 'cw' ? 'HORÁRIO ↻' : 'ANTI-HORÁRIO ↺'}
                      </span>
                      <div className="grid grid-cols-2 gap-1 h-[24px]">
                        <button
                          onClick={() => {
                            setBallDirection('cw');
                            playAudioCue('click');
                          }}
                          className={`rounded border transition-all cursor-pointer flex items-center justify-center text-[7.5px] font-extrabold uppercase ${
                            ballDirection === 'cw'
                              ? 'bg-gold/10 border-gold/40 text-gold shadow-sm'
                              : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'
                          }`}
                          title="Próximo Giro: Horário"
                        >
                          <span>↻ HORÁRIO</span>
                        </button>
                        <button
                          onClick={() => {
                            setBallDirection('ccw');
                            playAudioCue('click');
                          }}
                          className={`rounded border transition-all cursor-pointer flex items-center justify-center text-[7.5px] font-extrabold uppercase ${
                            ballDirection === 'ccw'
                              ? 'bg-gold/10 border-gold/40 text-gold shadow-sm'
                              : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'
                          }`}
                          title="Próximo Giro: Anti-Horário"
                        >
                          <span>↺ ANTI-HOR.</span>
                        </button>
                      </div>
                    </div>
                  </div>
 
                  <p className="text-[7.5px] text-zinc-500 leading-normal font-medium mt-1">
                    💡 <strong>Sentido:</strong> Alterna automaticamente (CW ⇆ CCW). <strong className="text-gold">Troca de Crupiê:</strong> Quando ativada, a IA calibra as forças físicas dos 14 motores para o novo crupiê, mantendo os alvos de alta precisão.
                  </p>
 
                  {/* Target and Neighbor Configuration Section */}
                  <div className="border-t border-zinc-800 pt-2.5 space-y-2.5">
                    {/* Gestão de Banca & Ficha Dinâmica (Substituindo a Quantidade de Alvos) */}
                    <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800/60 space-y-2.5">
                      <div className="flex items-center justify-between border-b border-zinc-800 pb-1.5">
                        <span className="text-[9px] text-zinc-400 uppercase tracking-widest font-black flex items-center gap-1.5">
                          <Coins className="w-3.5 h-3.5 text-gold" />
                          Banca & Dimensionamento de Fichas por IA
                        </span>
                        <span className="text-[8px] bg-gold/10 border border-gold/30 text-gold px-1 py-0.2 rounded font-black font-mono">IA ATIVA</span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-center">
                        {/* Banca Inicial */}
                        <div className="bg-zinc-900 p-1.5 rounded border border-zinc-800">
                          <div className="text-[8px] font-bold text-zinc-500 uppercase">Inicial</div>
                          {isEditingBankroll ? (
                            <div className="flex items-center justify-center mt-1">
                              <span className="text-zinc-500 font-mono text-[10px]">R$</span>
                              <input
                                type="number"
                                value={bankrollInputVal}
                                onChange={(e) => setBankrollInputVal(e.target.value)}
                                onBlur={() => {
                                  const val = parseFloat(bankrollInputVal);
                                  if (!isNaN(val) && val >= 1) {
                                    setInitialBankroll(val);
                                    setCurrentBankroll(val);
                                  }
                                  setIsEditingBankroll(false);
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    const val = parseFloat(bankrollInputVal);
                                    if (!isNaN(val) && val >= 1) {
                                      setInitialBankroll(val);
                                      setCurrentBankroll(val);
                                    }
                                    setIsEditingBankroll(false);
                                  } else if (e.key === 'Escape') {
                                    setIsEditingBankroll(false);
                                  }
                                }}
                                className="w-12 bg-zinc-950 text-zinc-100 font-mono font-bold text-[10px] px-0.5 rounded border border-gold/50 focus:outline-none text-center"
                                autoFocus
                              />
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                  setBankrollInputVal(initialBankroll.toString());
                                  setIsEditingBankroll(true);
                                }}
                                className="font-mono font-extrabold text-[11px] text-zinc-300 hover:text-gold mt-1 cursor-pointer transition-colors block w-full text-center"
                                title="Clique para editar"
                              >
                                R$ {initialBankroll.toFixed(0)} <span className="text-[8px] text-zinc-500">✎</span>
                              </button>
                            )}
                          </div>

                        {/* Banca Atual */}
                        <div className="bg-zinc-900 p-1.5 rounded border border-zinc-800">
                          <div className="text-[8px] font-bold text-zinc-500 uppercase">Atual</div>
                          <div className="font-mono font-black text-[11px] text-zinc-100 mt-1">
                            R$ {currentBankroll.toFixed(2)}
                          </div>
                        </div>

                        {/* Lucro */}
                        <div className="bg-zinc-900 p-1.5 rounded border border-zinc-800">
                          <div className="text-[8px] font-bold text-zinc-500 uppercase">Lucro</div>
                          <div className={`font-mono font-extrabold text-[10px] mt-1 ${
                            currentBankroll - initialBankroll > 0 
                              ? 'text-gold' 
                              : currentBankroll - initialBankroll < 0 
                              ? 'text-red-500' 
                              : 'text-zinc-500'
                          }`}>
                            {currentBankroll - initialBankroll > 0 ? '+' : ''}
                            R$ {(currentBankroll - initialBankroll).toFixed(1)}
                          </div>
                        </div>
                      </div>

                      {/* AI Risk Profile Toggle Group */}
                      <div className="space-y-1">
                        <span className="text-[8px] text-zinc-500 font-bold uppercase tracking-wider block">Perfil de Gestão de Risco por IA:</span>
                        <div className="grid grid-cols-3 gap-1 bg-zinc-950 p-0.5 rounded border border-zinc-800">
                          <button
                            onClick={() => {
                              setAiRiskProfile('conservative');
                              playAudioCue('click');
                            }}
                            className={`py-1 rounded text-[8px] font-extrabold uppercase transition-all cursor-pointer ${
                              aiRiskProfile === 'conservative'
                                ? 'bg-gold/10 border border-gold/30 text-gold font-black'
                                : 'text-zinc-500 hover:text-zinc-300'
                            }`}
                          >
                            Conservador
                          </button>
                          <button
                            onClick={() => {
                              setAiRiskProfile('moderate');
                              playAudioCue('click');
                            }}
                            className={`py-1 rounded text-[8px] font-extrabold uppercase transition-all cursor-pointer ${
                              aiRiskProfile === 'moderate'
                                ? 'bg-gold/10 border border-gold/30 text-gold font-black'
                                : 'text-zinc-500 hover:text-zinc-300'
                            }`}
                          >
                            Moderado/IA
                          </button>
                          <button
                            onClick={() => {
                              setAiRiskProfile('aggressive');
                              playAudioCue('click');
                            }}
                            className={`py-1 rounded text-[8px] font-extrabold uppercase transition-all cursor-pointer ${
                              aiRiskProfile === 'aggressive'
                                ? 'bg-rose-500/10 border border-rose-500/30 text-rose-400 font-black'
                                : 'text-zinc-500 hover:text-zinc-300'
                            }`}
                          >
                            Agressivo
                          </button>
                        </div>
                      </div>

                      {/* Ficha Dinâmica baseada na banca */}
                      <div className="bg-zinc-900 p-2 rounded border border-zinc-800 space-y-1.5 shadow-sm">
                        <div className="flex items-center justify-between">
                          <div className="text-left">
                            <div className="text-[8.5px] font-extrabold uppercase text-zinc-300 flex items-center gap-1">
                              Ficha Dimensionada por IA
                              <span className="text-[7px] text-gold lowercase font-mono">
                                ({aiRiskProfile === 'conservative' ? '0.1%' : aiRiskProfile === 'moderate' ? '0.2%' : '0.4%'} da banca)
                              </span>
                            </div>
                            <div className="text-[7px] text-zinc-500 leading-tight max-w-[150px]">
                              {aiRiskProfile === 'conservative' 
                                ? 'Foco absoluto em segurança de banca com rebaixamento mínimo.' 
                                : aiRiskProfile === 'moderate' 
                                ? 'Equilíbrio inteligente para obter crescimento estável.' 
                                : 'Aproveita oscilações rápidas de tendência.'}
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="font-mono font-black text-[13px] text-gold">
                              R$ {currentChip.toFixed(2)}
                            </span>
                            {isGaleActive && (
                              <span className="text-[7.5px] text-amber-600 block font-black">
                                Gale 1: R$ {(currentChip * 2).toFixed(2)}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        {/* IA Explanation of Best Betting Strategy */}
                        <div className="bg-zinc-950 p-1.5 rounded border border-zinc-800 text-[7.5px] text-zinc-400 leading-relaxed font-mono">
                          🧠 <span className="text-zinc-300 font-bold">Justificativa da IA:</span> Com banca de R$ {currentBankroll.toFixed(2)}, a ficha de R$ {currentChip.toFixed(2)} protege seu capital contra até {aiRiskProfile === 'conservative' ? '65' : aiRiskProfile === 'moderate' ? '35' : '15'} rodadas negativas consecutivas. {currentBankroll < 300 && "⚠️ Recomendado banca de R$ 300+ para melhor gestão!"}
                        </div>
                      </div>
                    </div>
                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[8px] text-zinc-500 uppercase tracking-widest font-black block">
                          Estratégia de Cobertura (Modo Operacional):
                        </span>
                        <span className="text-[8px] text-gold font-mono font-bold">
                          Cobertura: {coverageStats?.percentage}% ({coverageStats?.coveredNumbers?.length || 0}/37 Números)
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-1.5 bg-zinc-950 p-1 rounded-xl border border-zinc-800">
                        <button
                          onClick={() => {
                            setTargetCount(1);
                            setNeighborRange(9);
                            playAudioCue('success');
                          }}
                          className={`py-2 px-1.5 rounded-lg border transition-all cursor-pointer flex flex-col items-center justify-center text-center ${
                            targetCount === 1 && neighborRange === 9
                              ? 'bg-gold/10 border-gold/40 text-gold shadow-sm'
                              : 'bg-zinc-900 border-transparent text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'
                          }`}
                        >
                          <span className="text-[9.5px] font-black leading-tight">🎯 TIRO CONCENTRADO</span>
                          <span className="text-[7.5px] opacity-80 mt-0.5 font-mono">1 Alvo • 9 Vizinhos (19 Números)</span>
                        </button>
                        <button
                          onClick={() => {
                            setTargetCount(3);
                            setNeighborRange(3);
                            playAudioCue('success');
                          }}
                          className={`py-2 px-1.5 rounded-lg border transition-all cursor-pointer flex flex-col items-center justify-center text-center ${
                            targetCount === 3 && neighborRange === 3
                              ? 'bg-gold/10 border-gold/40 text-gold shadow-sm'
                              : 'bg-zinc-900 border-transparent text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'
                          }`}
                        >
                          <span className="text-[9.5px] font-black leading-tight">🦅 CERCO AMPLO</span>
                          <span className="text-[7.5px] opacity-80 mt-0.5 font-mono">3 Alvos • 3 Vizinhos (21 Números)</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
 
              <div className="lg:col-span-7 w-full">
                {inputMode === 'auto' ? (
                  <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center space-y-4 shadow-sm">
                    <h3 className="text-xs font-bold text-zinc-100 uppercase tracking-wider flex items-center justify-center gap-1.5">
                      <Camera className="w-4 h-4 text-gold" />
                      Scanner Inteligente de Tela (OCR) Ativo
                    </h3>
                    <AutoScanner onNumberDetected={handleNumberInput} />
                    <button
                      onClick={() => setInputMode('manual')}
                      className="px-4 py-1.5 bg-zinc-950 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-xs font-bold cursor-pointer transition-all"
                    >
                      Voltar para o Quadrante de Números
                    </button>
                  </div>
                ) : (
                  <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3.5 space-y-3.5 shadow-sm">
                    <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                      <div className="flex-1 pr-4">
                        <h3 className="text-xs font-bold text-zinc-100 uppercase tracking-wide flex items-center gap-2 leading-normal flex-wrap">
                          <Target className="w-4 h-4 text-gold" />
                          {activeTargets.length > 0 && shouldLightUp ? (
                            <>
                              <span className="text-zinc-400 font-black">NÚMEROS ALVOS:</span>
                              <span className="flex items-center gap-1.5 ml-1">
                                {activeTargets.map((num) => {
                                  const color = COLORS[num];
                                  const bgClass =
                                    color === 'red'
                                      ? 'bg-red-600 text-white border-red-500 shadow-sm'
                                      : color === 'black'
                                      ? 'bg-slate-800 text-white border-slate-700 shadow-sm'
                                      : 'bg-emerald-600 text-white border-emerald-500 shadow-sm';
                                  return (
                                    <span
                                      key={num}
                                      className={`inline-flex items-center justify-center w-6 h-6 rounded-full font-black text-xs font-mono border ${bgClass}`}
                                    >
                                      {num}
                                    </span>
                                  );
                                })}
                              </span>
                            </>
                          ) : (
                            <span>{targetStrategy === 'manual' ? 'Quadrante de Jogadas & Seleção Manual' : 'Quadrante de Jogadas (Aguardando Sinal)'}</span>
                          )}
                        </h3>
                        <p className="text-[9px] text-zinc-400 leading-relaxed mt-1">
                          {shouldLightUp ? (
                            targetStrategy === 'manual' && manualInputMode === 'select_targets' ? (
                              <>
                                <span className="text-gold font-bold">Modo Seleção Ativo:</span> Toque nos números no quadrante abaixo para definir os seus alvos manuais de entrada.
                              </>
                            ) : (
                              <>
                                O mapa abaixo mostra onde jogar. <span className="text-gold font-bold">Chips Amarelos</span> são alvos, <span className="text-emerald-500 font-bold">Bordas Verdes</span> são vizinhos. Toque no número sorteado para registrar!
                              </>
                            )
                          ) : (
                            <span className="text-zinc-500 font-medium">
                              ⚠️ Análise em andamento. Os alvos e vizinhos acenderão no quadrante assim que o sinal <span className="text-gold font-black animate-pulse">⚡ ENTRAR AGORA</span> for ativado.
                            </span>
                          )}
                        </p>
                      </div>
 
                      {targetStrategy === 'manual' && inputMode === 'manual' && (
                        <div className="flex bg-zinc-950 p-0.5 rounded-lg border border-zinc-800 shrink-0 self-start">
                          <button
                            onClick={() => setManualInputMode('select_targets')}
                            className={`px-2 py-1 rounded text-[9px] font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                              manualInputMode === 'select_targets'
                                ? 'bg-gold text-black shadow-sm font-black'
                                : 'text-zinc-500 hover:text-zinc-200'
                            }`}
                          >
                            <span className={`w-1 h-1 rounded-full ${manualInputMode === 'select_targets' ? 'bg-black' : 'bg-gold animate-pulse'}`}></span>
                            Configurar Alvos
                          </button>
                          <button
                            onClick={() => setManualInputMode('register_spin')}
                            className={`px-2 py-1 rounded text-[9px] font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                              manualInputMode === 'register_spin'
                                ? 'bg-gold text-black shadow-sm font-black'
                                : 'text-zinc-500 hover:text-zinc-200'
                            }`}
                          >
                            <span className={`w-1 h-1 rounded-full ${manualInputMode === 'register_spin' ? 'bg-black' : 'bg-gold animate-pulse'}`}></span>
                            Registrar Giro
                          </button>
                        </div>
                      )}
                    </div>

                    {/* 1-36 Numbers Grid - Layout Optimized for Clear Visualization */}
                    <div className="space-y-1">
                      {/* Zero (0) */}
                      {(() => {
                        const isZeroFrozen = hotColdStats.frozenNumbers.some(f => f.number === 0);
                        const isZeroCold = hotColdStats.coldNumbers.some(c => c.number === 0);
                        const isZeroTarget = activeTargets.includes(0) && shouldLightUp;
                        const isZeroCovered = coverageStats.coveredNumbers.includes(0) && shouldLightUp;
                        return (
                          <button
                            onClick={() => handleNumberInput(0)}
                            className={`w-full py-1.5 rounded-lg font-bold font-mono text-xs transition-all cursor-pointer active:scale-97 border ${
                              isZeroTarget
                                ? 'bg-gradient-to-br from-gold-hover to-gold text-black border-gold ring-2 ring-gold shadow-sm font-black'
                                : isZeroCovered
                                ? 'bg-emerald-950/20 text-emerald-400 border-emerald-900/40 font-black shadow-sm'
                                : isZeroFrozen
                                ? 'bg-red-950/20 text-red-400 border-red-900/40 hover:bg-red-900/30 opacity-80 animate-pulse'
                                : isZeroCold
                                ? 'bg-blue-950/20 text-blue-400 border-blue-900/40 hover:bg-blue-900/30 opacity-80'
                                : 'bg-emerald-950/30 text-emerald-400 border-emerald-900/40 hover:bg-emerald-950/50 opacity-80'
                            }`}
                          >
                            <div className="flex items-center justify-center gap-1.5 py-0.5">
                              <span className="text-xs">0 (Verde)</span>
                              {isZeroTarget ? (
                                <span className="text-[8px] bg-black text-gold px-1 py-0.2 rounded border border-gold/30 font-black">ALVO PRINCIPAL</span>
                              ) : isZeroCovered ? (
                                <span className="text-[8px] bg-emerald-600 text-white px-1 py-0.2 rounded font-black">COBRIR</span>
                              ) : isZeroFrozen ? (
                                <span className="text-[8px] bg-red-600 text-white px-1 py-0.2 rounded font-black">❄️ VETO (CONGELADO)</span>
                              ) : isZeroCold ? (
                                <span className="text-[8px] bg-blue-600 text-white px-1 py-0.2 rounded font-black">🧊 FRIO</span>
                              ) : null}
                            </div>
                          </button>
                        );
                      })()}

                      {/* Numbers Grid */}
                      <div className="grid grid-cols-6 gap-1">
                        {Array.from({ length: 36 }, (_, i) => i + 1).map((num) => {
                          const color = COLORS[num];
                          const isTarget = activeTargets.includes(num) && shouldLightUp;
                          const isCovered = coverageStats.coveredNumbers.includes(num) && shouldLightUp;
                          const isFrozen = hotColdStats.frozenNumbers.some((f) => f.number === num);
                          const isCold = hotColdStats.coldNumbers.some((c) => c.number === num);

                          return (
                            <button
                              key={`map-cell-${num}`}
                              onClick={() => handleNumberInput(num)}
                              className={`h-8.5 rounded-md flex flex-col items-center justify-center font-mono relative transition-all cursor-pointer active:scale-90 border ${
                                isTarget
                                  ? 'bg-gradient-to-br from-gold-hover to-gold text-black border-gold ring-1 ring-gold shadow-sm font-black'
                                  : isCovered
                                  ? 'bg-emerald-950/20 text-emerald-400 border-emerald-900/40 font-extrabold shadow-sm'
                                  : isFrozen
                                  ? 'bg-red-950/20 text-red-400 border-red-900/40 hover:bg-red-900/30 opacity-80'
                                  : isCold
                                  ? 'bg-blue-950/20 text-blue-400 border-blue-900/40 hover:bg-blue-900/30 opacity-80'
                                  : color === 'red'
                                  ? 'bg-red-950/10 text-red-400 border-red-900/20 hover:bg-red-900/30 opacity-80'
                                  : 'bg-zinc-950 text-zinc-300 border-zinc-850 hover:bg-zinc-800 opacity-80'
                              }`}
                            >
                              <span className="text-xs font-bold leading-none">{num}</span>
                              <span className={`text-[7px] mt-0.5 font-bold scale-90 ${isTarget ? 'text-zinc-900' : isCovered ? 'text-emerald-400' : isFrozen ? 'text-red-400' : isCold ? 'text-blue-400' : 'text-zinc-500'}`}>
                                {isTarget ? '🎯 ALVO' : isCovered ? 'COB' : isFrozen ? '❄️ VETO' : isCold ? '🧊 FRIO' : `T${getTerminal(num)}`}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* History controls */}
                    <div className="space-y-2 pt-1.5 pb-1">
                      <div className="grid grid-cols-2 gap-2.5">
                        <button
                          onClick={handleDeleteLastRoll}
                          disabled={history.length === 0}
                          className="flex items-center justify-center gap-1.5 py-1.5 px-3 bg-zinc-950 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-xs font-bold transition-all cursor-pointer active:scale-97 shadow-sm"
                        >
                          <RotateCcw className="w-3.5 h-3.5 text-gold" />
                          Apagar Último
                        </button>
                        <button
                          onClick={handleClearHistory}
                          disabled={history.length === 0}
                          className="flex items-center justify-center gap-1.5 py-1.5 px-3 bg-zinc-950 hover:bg-red-950/20 hover:text-red-400 hover:border-red-900/40 text-zinc-400 border border-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-xs font-bold transition-all cursor-pointer active:scale-97 shadow-sm"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-zinc-500" />
                          Limpar Sessão
                        </button>
                      </div>

                      <button
                        onClick={() => {
                          setIsPasteModalOpen(true);
                          playAudioCue('click');
                        }}
                        className="w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-gold/5 hover:bg-gold/10 border border-gold/20 text-gold rounded-lg text-xs font-black transition-all cursor-pointer active:scale-97 shadow-sm"
                      >
                        <Clipboard className="w-3.5 h-3.5 text-gold" />
                        Colar Histórico (Lote)
                      </button>
                    </div>

                    {/* Small legend */}
                    <div className="flex flex-wrap justify-center items-center gap-x-3 gap-y-1.5 text-[9px] bg-zinc-950 p-2 rounded-lg border border-zinc-850">
                      <div className="flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded bg-gradient-to-br from-gold-hover to-gold border border-gold"></span>
                        <span className="text-zinc-400 font-bold">Alvo</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded bg-emerald-950/20 border border-emerald-900/40"></span>
                        <span className="text-emerald-400 font-bold">Vizinho</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded bg-red-950/20 border border-red-900/40"></span>
                        <span className="text-red-400 font-bold">❄️ Veto</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded bg-blue-950/20 border border-blue-900/40"></span>
                        <span className="text-blue-400 font-bold">🧊 Frio</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* COMPACT TIMELINE AND STATS BAR */}
            <div className="mt-4 bg-zinc-900 border border-zinc-800 rounded-xl p-3 space-y-3 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800 pb-2">
                <div className="flex items-center gap-1.5">
                  <History className="w-3.5 h-3.5 text-zinc-500" />
                  <span className="text-[10px] text-zinc-100 uppercase tracking-widest font-black">
                    Resultados Recentes (Sequência)
                  </span>
                </div>
                
                {/* Mini Stats Inline Row */}
                <div className="flex items-center gap-2.5 sm:gap-3 text-[10px] font-bold flex-wrap">
                  <span className="text-zinc-500">
                    Giros: <strong className="text-zinc-300 font-mono">{history.length}</strong>
                  </span>
                  <div className="flex items-center gap-1.5 border-l border-zinc-800 pl-2.5">
                    <span className="flex items-center gap-1 text-[9px] text-gold bg-gold/10 px-1.5 py-0.5 rounded border border-gold/20 font-sans font-black uppercase tracking-wider">
                      GREEN: <span className="font-mono">{stats.wins}</span>
                    </span>
                    <span className="flex items-center gap-1 text-[9px] text-red-400 bg-red-950/20 px-1.5 py-0.5 rounded border border-red-900/40 font-sans font-black uppercase tracking-wider">
                      RED: <span className="font-mono">{stats.losses}</span>
                    </span>
                  </div>
                  <span className="text-zinc-500 border-l border-zinc-800 pl-2.5">
                    Assertividade: <strong className="text-gold font-mono">{winRate}%</strong>
                  </span>
                  <span className="text-zinc-500 border-l border-zinc-800 pl-2.5">
                    Seq: <strong className="text-gold font-mono">{currentStreak} G</strong>
                  </span>
                </div>
              </div>

              {/* Minimal horizontal stream of recent spins */}
              <div className="overflow-x-auto pb-1 custom-scrollbar">
                {history.length === 0 ? (
                  <div className="text-center py-1 text-zinc-500 text-[11px] italic">
                    Nenhum giro registrado. Toque nos números acima para iniciar a análise.
                  </div>
                ) : (
                  <div className="flex gap-1.5 min-w-[340px]">
                    {evaluatedHistory.slice(0, 14).map((entry, idx) => {
                      const num = entry.number;
                      const color = COLORS[num];

                      return (
                        <div
                          key={`timeline-spin-main-${entry.id}-${idx}`}
                          className="flex-1 flex flex-col items-center gap-0.5 p-1 bg-zinc-950 rounded-lg border border-zinc-850 min-w-[40px]"
                        >
                          <span className="text-[6.5px] text-zinc-500 font-bold uppercase tracking-tight">
                            {idx === 0 ? 'AGORA' : `${idx}ª`}
                          </span>
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shadow-sm ${
                            color === 'red'
                              ? 'bg-red-600 text-white'
                              : color === 'black'
                              ? 'bg-zinc-800 text-zinc-200 border border-zinc-700'
                              : 'bg-emerald-600 text-white'
                          }`}>
                            {num}
                          </div>
                          <span className={`text-[6.5px] font-black uppercase px-1 rounded-sm ${
                            entry.playStatus === 'win'
                              ? 'bg-gold/10 text-gold border border-gold/20'
                              : entry.playStatus === 'loss' || entry.playStatus === 'g0-loss'
                              ? 'bg-red-950/20 text-red-400 border border-red-900/40'
                              : 'bg-zinc-900 text-zinc-500 border border-zinc-855'
                          }`}>
                            {entry.playStatus === 'win' ? 'WIN' : entry.playStatus === 'loss' || entry.playStatus === 'g0-loss' ? 'RED' : 'OBS'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* METRICS VIEW */}
        {activeTab === 'metrics' && (
          <div className="space-y-4">
            <MetricsPanel history={history} />
            <PatternDetector historyNumbers={historyNumbers} onApplyTargets={handleApplyCustomTargets} />
          </div>
        )}

        {/* DETAILED HISTORY VIEW */}
        {activeTab === 'history' && (
          <HistoryPanel
            history={evaluatedHistory}
            onClearHistory={handleClearHistory}
            onGenerateDemoData={() => handleGenerateDemoData(65)}
          />
        )}

        {/* RECENT SPINS HORIZONTAL STREAM / HISTÓRICO DE CAPTURA - Hidden on main panel tab */}
        {activeTab !== 'panel' && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 space-y-2.5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-zinc-100 uppercase tracking-wide font-black flex items-center gap-1.5">
                <History className="w-3.5 h-3.5 text-zinc-500" />
                Linha do Tempo de Capturas (Recentes)
              </span>
              <span className="text-[9px] text-zinc-500 font-bold">
                Últimas {Math.min(history.length, 12)} saídas
              </span>
            </div>

            <div className="overflow-x-auto pb-1 custom-scrollbar">
              {history.length === 0 ? (
                <div className="text-center py-2 text-zinc-500 text-xs italic">
                  Nenhum número cadastrado nesta sessão. Insira giros no quadrante acima.
                </div>
              ) : (
                <div className="flex gap-1.5 min-w-[340px]">
                  {evaluatedHistory.slice(0, 12).map((entry, idx) => {
                    const num = entry.number;
                    const color = COLORS[num];

                    return (
                      <div
                        key={`timeline-spin-${entry.id}-${idx}`}
                        className="flex-1 flex flex-col items-center gap-1 p-1 bg-zinc-950 rounded-lg border border-zinc-850 min-w-[44px]"
                      >
                        <span className="text-[7px] text-zinc-500 font-bold uppercase">
                          {idx === 0 ? 'AGORA' : `${idx}ª`}
                        </span>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shadow-sm ${
                          color === 'red'
                            ? 'bg-red-600 text-white'
                            : color === 'black'
                            ? 'bg-zinc-800 text-zinc-200 border border-zinc-700'
                            : 'bg-emerald-600 text-white'
                        }`}>
                          {num}
                        </div>
                        <span className={`text-[7px] font-black uppercase px-1 rounded-sm ${
                          entry.playStatus === 'win'
                            ? 'bg-gold/10 text-gold border border-gold/20'
                            : entry.playStatus === 'loss' || entry.playStatus === 'g0-loss'
                            ? 'bg-red-950/20 text-red-400 border border-red-900/40'
                            : 'bg-zinc-900 text-zinc-500 border border-zinc-855'
                        }`}>
                          {entry.playStatus === 'win' ? 'WIN' : entry.playStatus === 'loss' || entry.playStatus === 'g0-loss' ? 'RED' : 'OBS'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* BOTTOM GLOBAL STATISTICS BAR - Hidden on main panel tab */}
        {activeTab !== 'panel' && (
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 shadow-sm">
              <span className="text-[8px] text-zinc-500 uppercase font-black block">Giros Registrados</span>
              <span className="text-sm font-black text-zinc-100 font-mono">{history.length}</span>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 shadow-sm">
              <span className="text-[8px] text-zinc-500 uppercase font-black block">Taxa de Acertos (Assertividade)</span>
              <span className="text-sm font-black font-mono text-gold">
                {winRate}%
              </span>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 shadow-sm">
              <span className="text-[8px] text-zinc-500 uppercase font-black block">Melhor Sequência (Greens)</span>
              <span className="text-sm font-black text-zinc-100 font-mono">{currentStreak} G</span>
            </div>
          </div>
        )}

      </main>

      {/* Modern Dialog Help Modal */}
      <AnimatePresence>
        {showHelpModal && (
          <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-3 z-50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-zinc-900 border border-zinc-800 rounded-xl max-w-md w-full overflow-hidden shadow-2xl relative"
            >
              <div className="p-5 space-y-3.5">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-gold" />
                    <h3 className="text-sm font-black text-zinc-100">Guia de Uso - Alvos e Vizinhos</h3>
                  </div>
                  <button
                    onClick={() => setShowHelpModal(false)}
                    className="p-1 rounded text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-3 text-xs text-zinc-400 leading-relaxed overflow-y-auto max-h-[300px] pr-2 custom-scrollbar">
                  <p>
                    O sistema de alvos e vizinhos foca em cobrir setores do cilindro da roleta europeia baseado em algoritmos preditivos avançados:
                  </p>

                  <div className="space-y-1 pl-2 border-l-2 border-gold">
                    <h4 className="font-black text-zinc-200 text-[11px]">🎯 1 Alvo com 9 Vizinhos (Tiro Concentrado):</h4>
                    <p className="text-[10px]">
                      Um único alvo com 9 vizinhos de cada lado no cilindro (total de 19 números). Oferece um foco cirúrgico no quadrante de maior convergência balística e cobre **51.4%** da mesa.
                    </p>
                  </div>

                  <div className="space-y-1 pl-2 border-l-2 border-gold">
                    <h4 className="font-black text-zinc-200 text-[11px]">🎯 3 Alvos com 3 Vizinhos (Cerco Amplo):</h4>
                    <p className="text-[10px]">
                      Cada um dos 3 alvos é apostado com 3 vizinhos de cada lado no cilindro (até 21 números no total). Excelente para momentos de forças dispersas na mesa e cobre **56.7%** da mesa.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-black text-zinc-200 text-[11px] uppercase tracking-wider">Métodos de Análise de IA:</h4>
                    <ul className="list-disc pl-4 space-y-1 text-[10px]">
                      <li><strong>Ressonância Dimensional:</strong> Conecta cada número aos seus dígitos, soma de dígitos e terminais dos vizinhos físicos no cilindro (ex: o número 14 é analisado dimensionalmente como os terminais 1, 4, 5, 0 [vizinho 20] e 1 [vizinho 31]).</li>
                      <li><strong>Terminais:</strong> Identifica grupos de dígitos terminais quentes que mais repetem.</li>
                      <li><strong>Repetições:</strong> Foca na frequência pura dos números que mais caíram.</li>
                      <li><strong>Opostos:</strong> Sugere os números localizados na metade oposta do cilindro em relação à última queda.</li>
                      <li><strong>Setor Cilindro:</strong> Analisa qual quadrante completo (Voisins, Tiers, etc.) está com maior densidade de quedas recentes.</li>
                      <li><strong>Assinatura:</strong> Mede o ritmo de pulo do dealer (espaçamento de slots) para adivinhar a próxima queda.</li>
                      <li><strong>Manual:</strong> Permite que você clique livremente nos botões para desenhar e travar seu próprio setor.</li>
                    </ul>
                  </div>

                  <div className="bg-zinc-950 p-2.5 rounded-lg border border-zinc-850 text-[10px] text-zinc-400">
                    💡 <strong>Assertividade no Histórico:</strong> O sistema memoriza os alvos exatos de cada rodada. Quando um novo número é registrado, o histórico marca automaticamente **GREEN (WIN)** se ele estava nos alvos preditos, ou **RED (LOSS)** se ficou fora.
                  </div>
                </div>

                <div className="pt-3 border-t border-zinc-800 flex justify-end">
                  <button
                    onClick={() => setShowHelpModal(false)}
                    className="px-4 py-1.5 bg-gold text-black hover:bg-gold-hover rounded-lg text-xs font-black cursor-pointer transition-all"
                  >
                    Entendido!
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {isPasteModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-3 z-50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-zinc-900 border border-zinc-800 rounded-xl max-w-md w-full overflow-hidden shadow-2xl relative"
            >
              <div className="p-5 space-y-4">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <Clipboard className="w-4 h-4 text-gold" />
                    <h3 className="text-sm font-black text-zinc-100">Colar Histórico em Lote</h3>
                  </div>
                  <button
                    onClick={() => {
                      setIsPasteModalOpen(false);
                      setPastedText('');
                    }}
                    className="p-1 rounded text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-3.5 text-xs text-zinc-400">
                  <p className="text-zinc-500 text-[11px] leading-relaxed">
                    Cole os números da sua roleta copiados diretamente do histórico da mesa. Qualquer separador (vírgula, espaço, quebra de linha) é válido.
                  </p>

                  <div className="space-y-1.5">
                    <label className="text-[10px] text-zinc-500 uppercase font-bold">Histórico de Números:</label>
                    <textarea
                      value={pastedText}
                      onChange={(e) => setPastedText(e.target.value)}
                      placeholder="Ex: 14, 2, 35, 12, 0, 32, 15, 19, 4, 21"
                      className="w-full h-24 bg-zinc-950 border border-zinc-800 focus:border-gold rounded-lg p-2.5 font-mono text-xs focus:outline-none text-zinc-200 resize-none"
                    />
                  </div>

                  {/* Preview section */}
                  {(() => {
                    const parsed = parsePastedNumbers(pastedText);
                    const previewNums = pasteInvertOrder ? [...parsed].reverse() : parsed;
                    if (parsed.length === 0) return null;

                    return (
                      <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[9.5px] font-bold text-zinc-500 uppercase">
                            Preview de Importação ({parsed.length} número{parsed.length > 1 ? 's' : ''}):
                          </span>
                          <span className="text-[8px] text-zinc-500 font-mono font-bold">
                            Cilindro Ativo
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-1.5 max-h-[85px] overflow-y-auto pr-1 custom-scrollbar">
                          {previewNums.map((num, i) => {
                            const color = COLORS[num];
                            const badgeColor =
                              color === 'red'
                                ? 'bg-red-950/20 border-red-900/40 text-red-400'
                                : color === 'black'
                                ? 'bg-zinc-900 border-zinc-800 text-zinc-300'
                                : 'bg-emerald-950/20 border-emerald-900/40 text-emerald-400';
                            return (
                              <div
                                key={`preview-${num}-${i}`}
                                className={`px-1.5 py-0.5 rounded font-mono font-bold text-[10px] border flex items-center justify-center gap-1 ${badgeColor}`}
                              >
                                {num}
                                {i === previewNums.length - 1 && (
                                  <span className="text-[7px] bg-gold/10 text-gold px-0.5 rounded font-sans uppercase font-black border border-gold/15">Mais Recente</span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                        <p className="text-[8px] text-zinc-500 leading-none">
                          👉 O último número da direita ({previewNums[previewNums.length - 1]}) será considerado o último giro ocorrido.
                        </p>
                      </div>
                    );
                  })()}

                  {/* Options */}
                  <div className="grid grid-cols-2 gap-3.5 bg-zinc-950 p-2.5 rounded-lg border border-zinc-850">
                    <label className="flex items-start gap-2 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={pasteInvertOrder}
                        onChange={(e) => setPasteInvertOrder(e.target.checked)}
                        className="mt-0.5 h-3.5 w-3.5 rounded border-zinc-800 bg-zinc-950 text-gold focus:ring-0 focus:ring-offset-0 cursor-pointer accent-gold"
                      />
                      <div className="text-left select-none">
                        <span className="text-[10px] font-black text-zinc-300 block leading-tight group-hover:text-gold transition-colors">Inverter Ordem</span>
                        <span className="text-[8.5px] text-zinc-500 leading-normal block">Se o mais recente estiver à esquerda no texto</span>
                      </div>
                    </label>

                    <label className="flex items-start gap-2 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={pasteOverwrite}
                        onChange={(e) => setPasteOverwrite(e.target.checked)}
                        className="mt-0.5 h-3.5 w-3.5 rounded border-zinc-800 bg-zinc-950 text-gold focus:ring-0 focus:ring-offset-0 cursor-pointer accent-gold"
                      />
                      <div className="text-left select-none">
                        <span className="text-[10px] font-black text-zinc-300 block leading-tight group-hover:text-gold transition-colors">Limpar Sessão Atual</span>
                        <span className="text-[8.5px] text-zinc-500 leading-normal block">Substitui todo o histórico pelo lote colado</span>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="pt-2.5 border-t border-zinc-800 flex items-center justify-end gap-2.5">
                  <button
                    onClick={() => {
                      setIsPasteModalOpen(false);
                      setPastedText('');
                    }}
                    className="px-3.5 py-1.5 text-[11px] font-bold text-zinc-400 hover:text-zinc-200 bg-zinc-950 hover:bg-zinc-850 rounded-lg cursor-pointer transition-all border border-zinc-850"
                  >
                    Cancelar
                  </button>
                  <button
                    disabled={parsePastedNumbers(pastedText).length === 0}
                    onClick={() => handleBatchInput(pastedText, pasteOverwrite, pasteInvertOrder)}
                    className="px-4 py-1.5 text-[11px] font-black bg-gold text-black hover:bg-gold-hover disabled:opacity-40 disabled:cursor-not-allowed rounded-lg shadow-md cursor-pointer transition-all flex items-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Confirmar Importação
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* User Profile & Bankroll Management Modal */}
        {showProfileModal && (
          <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-3 z-50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-zinc-900 border border-zinc-800 rounded-xl max-w-md w-full overflow-hidden shadow-2xl relative"
            >
              <div className="p-5 space-y-4">
                {/* Header */}
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-zinc-950 flex items-center justify-center border border-gold/20">
                      <User className="w-4 h-4 text-gold" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-zinc-100">Perfil & Planejamento de Gestão</h3>
                      <p className="text-[9.5px] text-zinc-500 leading-none font-bold">Controle e simulador de metas de alavancagem</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowProfileModal(false)}
                    className="p-1 rounded text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 cursor-pointer transition-all"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Profile Form */}
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[10px] text-zinc-500 uppercase font-black">👤 Nome do Operador</label>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 hover:border-zinc-700 focus:border-gold rounded-lg px-2.5 py-1.5 text-xs text-zinc-100 focus:outline-none font-bold transition-all"
                      placeholder="Digite seu nome..."
                    />
                  </div>

                  {/* Divider */}
                  <div className="border-t border-zinc-800 my-1" />

                  <h4 className="text-[10px] font-black uppercase text-gold flex items-center gap-1.5">
                    <Coins className="w-3.5 h-3.5 text-gold" />
                    Planejamento de Metas (Gestão de Banca)
                  </h4>

                  {/* Calculator Inputs Grid */}
                  <div className="grid grid-cols-3 gap-2.5">
                    {/* Banca Inicial */}
                    <div className="space-y-1 col-span-2">
                      <div className="flex justify-between items-center leading-none mb-1">
                        <label className="text-[9.5px] text-zinc-500 uppercase font-black">💵 Banca Inicial</label>
                        <button
                          type="button"
                          onClick={() => {
                            setStartingBankrollForGoal(currentBankroll);
                            playAudioCue('success');
                          }}
                          className="text-[8.5px] text-gold hover:text-gold-hover font-extrabold underline cursor-pointer"
                        >
                          Banca Ativa
                        </button>
                      </div>
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-500 text-[9px] font-bold">R$</span>
                        <input
                          type="number"
                          value={startingBankrollForGoal || ''}
                          onChange={(e) => setStartingBankrollForGoal(Math.max(0, parseFloat(e.target.value) || 0))}
                          className="w-full bg-zinc-950 border border-zinc-800 focus:border-gold rounded-lg pl-6 pr-2.5 py-1 text-xs text-zinc-100 focus:outline-none font-mono font-bold"
                        />
                      </div>
                    </div>

                    {/* Período em Dias */}
                    <div className="space-y-1">
                      <label className="text-[9.5px] text-zinc-500 uppercase font-black leading-none mb-1 block">📅 Dias</label>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={targetDays || ''}
                        onChange={(e) => setTargetDays(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-full bg-zinc-950 border border-zinc-800 focus:border-gold rounded-lg px-2 py-1 text-xs text-zinc-100 focus:outline-none font-mono font-bold mt-1"
                      />
                    </div>
                  </div>

                  {/* Meta de Banca final */}
                  <div className="space-y-1">
                    <label className="text-[9.5px] text-zinc-500 uppercase font-black">🎯 Meta de Banca Final</label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500 text-[9.5px] font-bold">R$</span>
                      <input
                        type="number"
                        value={targetGoal || ''}
                        onChange={(e) => setTargetGoal(Math.max(0, parseFloat(e.target.value) || 0))}
                        className="w-full bg-zinc-950 border border-zinc-800 focus:border-gold rounded-lg pl-7 pr-2.5 py-1 text-xs text-zinc-100 focus:outline-none font-mono font-bold"
                      />
                    </div>
                  </div>

                  {/* Mode Toggle Selection */}
                  <div className="space-y-1">
                    <label className="text-[9.5px] text-zinc-500 uppercase font-black block mb-0.5">Tipo de Crescimento</label>
                    <div className="flex bg-zinc-950 p-0.5 rounded-lg border border-zinc-850">
                      <button
                        type="button"
                        onClick={() => { setManagementPlanMode('linear'); playAudioCue('click'); }}
                        className={`flex-1 py-1 text-[9px] font-black uppercase rounded-md transition-all cursor-pointer ${managementPlanMode === 'linear' ? 'bg-gold text-black shadow-sm' : 'text-zinc-500 hover:text-zinc-350'}`}
                      >
                        Linear (Fixo/Dia)
                      </button>
                      <button
                        type="button"
                        onClick={() => { setManagementPlanMode('compound'); playAudioCue('click'); }}
                        className={`flex-1 py-1 text-[9px] font-black uppercase rounded-md transition-all cursor-pointer ${managementPlanMode === 'compound' ? 'bg-gold text-black shadow-sm' : 'text-zinc-500 hover:text-zinc-350'}`}
                      >
                        Compostos (%/Dia)
                      </button>
                    </div>
                  </div>

                  {/* Calculations Display Card */}
                  {(() => {
                    const totalGrowthNeeded = targetGoal - startingBankrollForGoal;
                    const isGoalInvalid = targetGoal <= startingBankrollForGoal || startingBankrollForGoal <= 0;
                    
                    const linearDailyProfit = isGoalInvalid ? 0 : totalGrowthNeeded / targetDays;
                    const compoundDailyRate = isGoalInvalid ? 0 : (targetGoal / startingBankrollForGoal) ** (1 / targetDays) - 1;

                    // Progress bar calculation
                    const planProgressPct = isGoalInvalid ? 0 : Math.min(100, Math.max(0, ((currentBankroll - startingBankrollForGoal) / totalGrowthNeeded) * 100));

                    // Generate Schedule List
                    const list = [];
                    if (!isGoalInvalid && targetDays > 0) {
                      let currentVal = startingBankrollForGoal;
                      for (let d = 1; d <= targetDays; d++) {
                        let targetVal = 0;
                        let profitVal = 0;
                        if (managementPlanMode === 'linear') {
                          targetVal = startingBankrollForGoal + (linearDailyProfit * d);
                          profitVal = linearDailyProfit;
                        } else {
                          const nextVal = currentVal * (1 + compoundDailyRate);
                          profitVal = nextVal - currentVal;
                          targetVal = nextVal;
                          currentVal = nextVal;
                        }
                        list.push({ day: d, bankrollTarget: targetVal, dailyProfit: profitVal });
                      }
                    }

                    return (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-2 bg-zinc-950 p-2.5 rounded-lg border border-zinc-850 text-xs shadow-xs">
                          <div className="space-y-0.5 border-r border-zinc-850 pr-2">
                            <span className="text-[8.5px] text-zinc-500 uppercase font-bold block">Meta de Lucro Total</span>
                            <span className="text-xs font-black text-zinc-300 font-mono">
                              {isGoalInvalid ? 'R$ 0,00' : `R$ ${totalGrowthNeeded.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                            </span>
                            <span className="text-[8.5px] text-zinc-500 block font-black font-mono">
                              {isGoalInvalid ? '0%' : `+${((totalGrowthNeeded / startingBankrollForGoal) * 100).toFixed(1)}%`}
                            </span>
                          </div>
                          <div className="space-y-0.5 pl-2">
                            <span className="text-[8.5px] text-zinc-500 uppercase font-bold block">Meta Diária Requerida</span>
                            {managementPlanMode === 'linear' ? (
                              <>
                                <span className="text-xs font-black text-gold font-mono">
                                  R$ {linearDailyProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                                <span className="text-[8px] text-zinc-500 block font-bold">
                                  {isGoalInvalid ? '0%' : `${((linearDailyProfit / startingBankrollForGoal) * 100).toFixed(1)}%`} fixado ao dia
                                </span>
                              </>
                            ) : (
                              <>
                                <span className="text-xs font-black text-gold font-mono">
                                  {(compoundDailyRate * 100).toFixed(2)}% ao dia
                                </span>
                                <span className="text-[8px] text-zinc-500 block font-bold">
                                  Juros sobre saldo diário
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Real-time Meta Progress bar using live currentBankroll */}
                        {!isGoalInvalid && (
                          <div className="bg-zinc-950 p-2.5 rounded-lg border border-zinc-850 space-y-1.5 shadow-xs">
                            <div className="flex justify-between text-[8.5px] font-bold leading-none">
                              <span className="text-zinc-500 uppercase">Evolução do Saldo:</span>
                              <span className="text-gold font-mono font-black">{planProgressPct.toFixed(1)}%</span>
                            </div>
                            <div className="w-full bg-zinc-900 h-2 rounded-full overflow-hidden border border-zinc-800">
                              <div
                                  className="bg-gold h-full rounded-full transition-all duration-500 shadow-xs"
                                  style={{ width: `${planProgressPct}%` }}
                                />
                            </div>
                            <div className="flex justify-between text-[8px] text-zinc-500 font-mono leading-none font-bold">
                              <span>Início: R$ {startingBankrollForGoal.toFixed(0)}</span>
                              <span className="text-zinc-300 font-black">Atual: R$ {currentBankroll.toFixed(1)}</span>
                              <span>Meta: R$ {targetGoal.toFixed(0)}</span>
                            </div>
                          </div>
                        )}

                        {/* Daily Cronograma List with visual Achieved flags */}
                        {!isGoalInvalid && list.length > 0 && (
                          <div className="space-y-1">
                            <label className="text-[9.5px] text-zinc-500 uppercase font-black block">📊 Planejamento Dia a Dia:</label>
                            <div className="max-h-[140px] overflow-y-auto pr-1 border border-zinc-850 rounded-lg bg-zinc-950/40 custom-scrollbar divide-y divide-zinc-850 shadow-xs">
                              {list.map((item) => {
                                const isAchieved = currentBankroll >= item.bankrollTarget;
                                return (
                                  <div
                                    key={`day-${item.day}`}
                                    className={`p-2 flex items-center justify-between text-[10px] font-mono transition-colors ${
                                      isAchieved
                                        ? 'bg-gold/5 text-gold border-l-2 border-gold'
                                        : 'text-zinc-400'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2">
                                      <span className={`text-[8.5px] font-bold px-1 py-0.5 rounded ${isAchieved ? 'bg-gold/10 text-gold font-black border border-gold/10' : 'bg-zinc-900 text-zinc-500 font-medium'}`}>
                                        Dia {String(item.day).padStart(2, '0')}
                                      </span>
                                      <span className="text-zinc-500">→</span>
                                      <span className="font-bold text-zinc-300">
                                        R$ {item.bankrollTarget.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1 text-[8.5px]">
                                      <span className="text-zinc-500 font-bold">(+{item.dailyProfit.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 1 })})</span>
                                      {isAchieved ? (
                                        <span className="text-gold font-black flex items-center gap-0.5 ml-1">
                                          <Check className="w-2.5 h-2.5 font-black" /> OK
                                        </span>
                                      ) : (
                                        <span className="text-zinc-500 ml-1">Faltam R$ {Math.max(0, item.bankrollTarget - currentBankroll).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 1 })}</span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {isGoalInvalid && (
                          <div className="p-3 bg-red-950/20 border border-red-900/40 rounded-lg text-[10px] text-red-400 text-center font-bold">
                            ⚠️ A meta deve ser maior que a banca inicial para gerar o cronograma de gestão.
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>

                {/* Footer and Save Actions */}
                <div className="pt-2.5 border-t border-zinc-800 flex items-center justify-end">
                  <button
                    onClick={() => setShowProfileModal(false)}
                    className="px-4 py-1.5 bg-gold text-black hover:bg-gold-hover rounded-lg text-xs font-black cursor-pointer transition-all"
                  >
                    Confirmar Gestão
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
