import { Activity, ShieldAlert, Play, X, Target, Zap, Flame, Snowflake, Crosshair, Loader2, Sword, Shield, Shirt, Hand, Footprints, HardHat } from 'lucide-react';
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ARMOR_PIECES, ARMOR_SETS } from './data/armor';
import { CALIBRATIONS } from './data/calibrations';
import { WEAPONS } from './data/weapons';
import { SimulationEngine } from './engine/Simulator';
import { useBuildStore } from './store/useBuildStore';
import { ArmorSlotType, WeaponSlotType } from './types/game';
import { CombatHub } from './combat_modules';

type SlotSelection = { type: 'weapon', slot: WeaponSlotType } | { type: 'armor', slot: ArmorSlotType } | null;

export default function App() {
  const { equipment, config, setWeapon, setArmor, getEffectiveStats, getSetCounts, updateConfig } = useBuildStore();
  const [metrics, setMetrics] = useState({ sustained: 0, burst: 0, total: 0 });
  const [selectingSlot, setSelectingSlot] = useState<SlotSelection>(null);
  const [isEditingCalibration, setIsEditingCalibration] = useState(false);
  
  // Visual Simulation State
  const [isSimulating, setIsSimulating] = useState(false);
  const [targetSelection, setTargetSelection] = useState<'head' | 'torso'>('torso');
  const [dianaActive, setDianaActive] = useState(false);
  const [dianaStacks, setDianaStacks] = useState(0);
  const [isTrainingDummyMode, setIsTrainingDummyMode] = useState(true);
  const [distance, setDistance] = useState(10);
  const [doombringerStacks, setDoombringerStacks] = useState(0);
  const [simEvents, setSimEvents] = useState<{ id: number, damage: number, isCrit: boolean, isWeakspot: boolean, type: string }[]>([]);
  const [simStatus, setSimStatus] = useState<'idle' | 'shooting' | 'reloading'>('idle');
  const [activeBuffs, setActiveBuffs] = useState<{ id: string, label: string, active: boolean, value?: string, procRate: string }[]>([
    { id: 'diana', label: 'Diana (Vulnerabilidad)', active: false, value: '+8% Daño', procRate: '100%' },
    { id: 'diana_crit', label: 'Diana (Tasa Crítica)', active: false, value: '+30%', procRate: '100%' },
    { id: 'diana_stacks', label: 'Diana (Ataque/Recarga)', active: false, value: '+12% Atk / +8% Rec (x0)', procRate: '100%' },
    { id: 'diana_dr', label: 'Diana (Reducción Daño)', active: false, value: '-20% Daño Recibido', procRate: '100%' },
  ]);
  const [currentMag, setCurrentMag] = useState(0);
  const [totalSimDamage, setTotalSimDamage] = useState(0);
  const eventIdCounter = useRef(0);

  const dianaTimerRef = useRef<NodeJS.Timeout | null>(null);
  const dianaStacksTimerRef = useRef<NodeJS.Timeout | null>(null);

  const activateDiana = () => {
    setDianaActive(true);
    setActiveBuffs(prev => prev.map(b => 
      (b.id === 'diana' || b.id === 'diana_crit' || b.id === 'diana_dr') 
        ? { ...b, active: true } 
        : b
    ));

    if (dianaTimerRef.current) clearTimeout(dianaTimerRef.current);
    dianaTimerRef.current = setTimeout(() => {
      setDianaActive(false);
      setActiveBuffs(prev => prev.map(b => 
        (b.id === 'diana' || b.id === 'diana_crit' || b.id === 'diana_dr') 
          ? { ...b, active: false } 
          : b
      ));
    }, 12000);
  };

  const activateDianaStacks = () => {
    setDianaStacks(prev => {
      const newStacks = Math.min(prev + 1, 3);
      setActiveBuffs(buffs => buffs.map(b => {
        if (b.id === 'diana' || b.id === 'diana_crit') return { ...b, active: true };
        if (b.id === 'diana_stacks') return { ...b, active: newStacks > 0, value: `+${newStacks * 12}% Atk / +${newStacks * 8}% Rec (x${newStacks})` };
        if (b.id === 'diana_dr') return { ...b, active: true };
        return b;
      }));
      return newStacks;
    });

    if (dianaStacksTimerRef.current) clearTimeout(dianaStacksTimerRef.current);
    dianaStacksTimerRef.current = setTimeout(() => {
      setDianaStacks(0);
      setActiveBuffs(buffs => buffs.map(b => {
        if (b.id === 'diana_stacks') return { ...b, active: false, value: '+12% Atk / +8% Rec (x0)' };
        return b;
      }));
    }, 15000);
  };

  const getDynamicStats = (active = dianaActive, stacks = dianaStacks) => {
    const base = getEffectiveStats();
    const critRate = base.critRate + (active ? 0.30 : 0);
    const weaponBaseDamageBonus = base.weaponBaseDamageBonus + (stacks * 0.12);
    return { ...base, critRate, weaponBaseDamageBonus };
  };

  const runVisualStep = async () => {
    if (!equipment.Primary || isSimulating) return;
    
    setIsSimulating(true);
    setTotalSimDamage(0);
    
    // 1. Reinicio Estricto
    let localDianaActive = false;
    let localDoombringerStacks = 0;
    setDianaActive(false);
    setDoombringerStacks(0);
    
    const baseStats = getEffectiveStats();
    const magSize = Math.round(equipment.Primary.magazineSize * (1 + baseStats.magazineCapacityBonus));
    const reloadTime = 2460;
    
    for (let cycle = 0; cycle < 2; cycle++) {
      setSimStatus('shooting');
      for (let shot = 0; shot < magSize; shot++) {
        setCurrentMag(magSize - shot);
        
        // 1. Phase of Damage: Use current local state
        const currentStats = getDynamicStats(localDianaActive, localDoombringerStacks);
        
        let shotDamage = 0;
        let pelletsHit = 0;

        for (let p = 0; p < equipment.Primary.pelletCount; p++) {
          const ammoMult = config.ammoType === 'Tungsten' ? 1.10 : config.ammoType === 'Steel' ? 1.05 : 1.0;
          
          const kineticBaseNet = CombatHub.calculateKineticBaseNetDamage(
            equipment.Primary.baseAttack,
            localDoombringerStacks * 0.12,
            currentStats.weaponBaseDamageBonus,
            ammoMult
          );
          
          const pelletBase = kineticBaseNet / equipment.Primary.pelletCount;
          
          const missChance = isTrainingDummyMode ? 0 : 0.1;
          const isHit = Math.random() > missChance;
          
          if (isHit) {
            pelletsHit++;
            
            const bullseyeBuff = CombatHub.calculateBullseyeCritBuff(isTrainingDummyMode ? 2 : distance);
            const isCrit = Math.random() < (currentStats.critRate + bullseyeBuff);
            const isWeakspot = targetSelection === 'head';
            
            let pelletDmg = CombatHub.calculateImpactDamage(
              pelletBase,
              isCrit,
              currentStats.critDamage,
              isWeakspot,
              currentStats.weakspotDamage
            );
            
            const vulnBonus = localDianaActive ? 0.08 : 0;
            const vulnMult = CombatHub.calculateVulnerabilityMultiplier(vulnBonus);
            pelletDmg *= vulnMult;
            
            pelletDmg = Math.floor(pelletDmg);
            shotDamage += pelletDmg;
            
            setSimEvents(prev => [...prev.slice(-10), { 
              id: eventIdCounter.current++, 
              damage: pelletDmg, 
              isCrit: isCrit,
              isWeakspot: isWeakspot,
              type: 'normal'
            }]);
          }
        }

        // 2. Phase of Activation (Post-Impacto)
        if (!localDianaActive) {
          if (Math.random() < 0.8) {
            localDianaActive = true;
            setDianaActive(true);
          }
        } else if (pelletsHit === equipment.Primary.pelletCount) {
          localDoombringerStacks = Math.min(localDoombringerStacks + 1, 3);
          setDoombringerStacks(localDoombringerStacks);
        } else {
          localDoombringerStacks = 0;
          setDoombringerStacks(0);
        }

        setTotalSimDamage(prev => prev + shotDamage);
        
        await new Promise(r => setTimeout(r, 383));
      }

      setCurrentMag(0);
      setSimStatus('reloading');
      // Buffs remain active during reload
      await new Promise(r => setTimeout(r, reloadTime));
    }

    setSimStatus('idle');
    setIsSimulating(false);
  };


  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'Legendary': return 'text-yellow-500';
      case 'Epic': return 'text-purple-400';
      case 'Rare': return 'text-blue-400';
      default: return 'text-zinc-400';
    }
  };

  const getRarityBorder = (rarity: string) => {
    switch (rarity) {
      case 'Legendary': return 'border-yellow-600/50 hover:border-yellow-500';
      case 'Epic': return 'border-purple-600/50 hover:border-purple-500';
      case 'Rare': return 'border-blue-600/50 hover:border-blue-500';
      default: return 'border-zinc-700 hover:border-zinc-500';
    }
  };

  const getCategoryRoman = (tier: number) => {
    const numerals = ['I', 'II', 'III', 'IV', 'V'];
    return numerals[tier - 1] || tier.toString();
  };

  const renderStars = (stars: number, rarity: string) => {
    return (
      <div className="flex items-center gap-0.5 mt-1 justify-center">
        {Array.from({ length: stars }).map((_, i) => (
          <span key={i} className={`text-[8px] ${getRarityColor(rarity)}`}>★</span>
        ))}
      </div>
    );
  };

  const getSlotIcon = (slotId: string) => {
    switch (slotId) {
      case 'Primary': return <Crosshair className="w-6 h-6 text-zinc-700" />;
      case 'Secondary': return <Target className="w-6 h-6 text-zinc-700" />;
      case 'Melee': return <Sword className="w-6 h-6 text-zinc-700" />;
      case 'Helmet': return <HardHat className="w-6 h-6 text-zinc-700" />;
      case 'Mask': return <Shield className="w-6 h-6 text-zinc-700" />;
      case 'Top': return <Shirt className="w-6 h-6 text-zinc-700" />;
      case 'Gloves': return <Hand className="w-6 h-6 text-zinc-700" />;
      case 'Bottom': return <Shield className="w-6 h-6 text-zinc-700" />;
      case 'Shoes': return <Footprints className="w-6 h-6 text-zinc-700" />;
      default: return <Shield className="w-6 h-6 text-zinc-700" />;
    }
  };

  const renderTooltipContent = (item: any, isWeapon: boolean) => {
    if (!item) return null;
    return (
      <>
        <div className="flex justify-between items-start mb-1">
          <h4 className={`font-bold text-sm ${getRarityColor(item.rarity)}`}>{item.name}</h4>
          <span className="text-[10px] bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-400">Categoría {getCategoryRoman(item.tier)}</span>
        </div>
        <div className="mb-2 flex justify-start">
          {renderStars(item.stars, item.rarity)}
        </div>
        
        {!isWeapon && item.isKeyEffect && (
          <div className="mb-2 inline-block bg-indigo-900/50 border border-indigo-500/50 text-indigo-400 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
            Key Effect
          </div>
        )}

        <p className="text-xs text-zinc-300 mb-3 leading-relaxed">{item.description}</p>
        
        {isWeapon && (
          <div className="grid grid-cols-2 gap-2 text-[11px] text-zinc-400 bg-zinc-950/50 p-2.5 rounded border border-zinc-800/50">
            <div className="flex justify-between"><span>Daño Base:</span> <span className="text-zinc-100 font-mono">
              {item.pelletCount > 1 
                ? `${Math.floor(item.baseAttack / item.pelletCount)}x${item.pelletCount}` 
                : Math.floor(item.baseAttack)}
            </span></div>
            <div className="flex justify-between"><span>RPM:</span> <span className="text-zinc-100 font-mono">{item.rpm}</span></div>
            <div className="flex justify-between"><span>Cargador:</span> <span className="text-zinc-100 font-mono">{item.magazineSize}</span></div>
            <div className="flex justify-between"><span>T. Crítica:</span> <span className="text-zinc-100 font-mono">{(item.critRateBase * 100).toFixed(0)}%</span></div>
          </div>
        )}
        
        {!isWeapon && item.setId && (
          <div className="mt-3 pt-3 border-t border-zinc-800">
            <p className="text-[10px] font-bold text-zinc-500 mb-2 uppercase tracking-wider">Bonificaciones de Set</p>
            <div className="space-y-1.5">
              {ARMOR_SETS.find(s => s.id === item.setId)?.bonuses.map((b, i) => {
                const isActive = getSetCounts()[item.setId] >= b.pieces;
                return (
                  <div key={i} className={`text-[11px] flex gap-2 ${isActive ? 'text-emerald-400 font-medium' : 'text-zinc-500'}`}>
                    <span className="shrink-0 w-6">{b.pieces}pc:</span>
                    <span>{b.description}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </>
    );
  };

  const renderSlot = (type: 'weapon' | 'armor', slotId: string, item: any, className: string = '') => {
    const isWeapon = type === 'weapon';
    const borderClass = item ? getRarityBorder(item.rarity) : 'border-zinc-800 hover:border-zinc-600';
    
    return (
      <div 
        onClick={() => setSelectingSlot({ type, slot: slotId as any })}
        className={`relative group cursor-pointer bg-zinc-900/80 border ${borderClass} transition-all duration-200 rounded-xl flex flex-col items-center justify-center p-3 ${className}`}
      >
        {/* Top left indicator */}
        <div className="absolute top-2 left-2 flex items-center gap-1">
          <div className={`w-2 h-2 rotate-45 ${item ? (item.rarity === 'Legendary' ? 'bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.6)]' : 'bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.6)]') : 'bg-zinc-700'}`} />
        </div>
        
        {/* Top right indicator (for weapons) */}
        {isWeapon && (
          <div className="absolute top-2 right-2 bg-zinc-800 text-zinc-400 text-[10px] font-bold px-1.5 py-0.5 rounded-sm">
            {slotId === 'Primary' ? '1' : slotId === 'Secondary' ? '2' : 'M'}
          </div>
        )}

        {/* Content */}
        {item ? (
          <div className="text-center mt-4 w-full">
            <p className={`text-sm font-bold truncate w-full px-1 ${getRarityColor(item.rarity)}`}>{item.name}</p>
            {renderStars(item.stars, item.rarity)}
            {isWeapon && <p className="text-[10px] text-zinc-500 mt-1.5 uppercase tracking-wider">{item.type}</p>}
            {!isWeapon && item.setId && <p className="text-[10px] text-zinc-500 mt-1.5 uppercase tracking-wider truncate px-2">{ARMOR_SETS.find(s => s.id === item.setId)?.name}</p>}
            {!isWeapon && item.isKeyEffect && <p className="text-[10px] text-indigo-400 mt-1.5 uppercase tracking-wider font-bold">Key Effect</p>}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 opacity-40 group-hover:opacity-70 transition-opacity">
            {getSlotIcon(slotId)}
            <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-medium">{slotId}</span>
          </div>
        )}

        {/* Tooltip */}
        {item && (
          <div className="absolute z-50 invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all duration-200 bottom-full left-1/2 -translate-x-1/2 mb-3 w-80 bg-zinc-900/95 backdrop-blur-xl border border-zinc-700 rounded-xl shadow-2xl p-4 pointer-events-none">
            {renderTooltipContent(item, isWeapon)}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-emerald-500/30 pb-20">
      <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Activity className="w-6 h-6 text-emerald-500" />
            <h1 className="text-xl font-bold tracking-tight">Once Human <span className="text-zinc-400 font-medium">DPS Simulator</span></h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Visual Equipment */}
        <div className="lg:col-span-5 space-y-8">
          
          {/* Weapons Section */}
          <section>
            <div className="flex items-center gap-2 mb-4 border-b border-zinc-800 pb-3">
              <div className="w-1.5 h-5 bg-emerald-500 rounded-full" />
              <h2 className="text-xl font-bold text-zinc-100 tracking-tight">Armas</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {renderSlot('weapon', 'Primary', equipment.Primary, 'h-32')}
              {renderSlot('weapon', 'Secondary', equipment.Secondary, 'h-32')}
              {renderSlot('weapon', 'Melee', equipment.Melee, 'h-32')}
            </div>
          </section>

          {/* Armor Section */}
          <section>
            <div className="flex items-center gap-2 mb-4 border-b border-zinc-800 pb-3">
              <div className="w-1.5 h-5 bg-emerald-500 rounded-full" />
              <h2 className="text-xl font-bold text-zinc-100 tracking-tight">Armadura</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {renderSlot('armor', 'Helmet', equipment.Helmet, 'h-32')}
              {renderSlot('armor', 'Mask', equipment.Mask, 'h-32')}
              {renderSlot('armor', 'Top', equipment.Top, 'h-32')}
              {renderSlot('armor', 'Gloves', equipment.Gloves, 'h-32')}
              {renderSlot('armor', 'Bottom', equipment.Bottom, 'h-32')}
              {renderSlot('armor', 'Shoes', equipment.Shoes, 'h-32')}
            </div>
          </section>

          {/* Configuration Section */}
          <section>
            <div className="flex items-center gap-2 mb-3 border-b border-zinc-800 pb-2">
              <div className="w-1 h-4 bg-emerald-500" />
              <h2 className="text-lg font-medium text-zinc-300">Configuración</h2>
            </div>
            <div className="bg-zinc-900/50 p-4 rounded-lg border border-zinc-800 space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm text-zinc-400">Modo Muñeco de Pruebas</label>
                <button 
                  onClick={() => setIsTrainingDummyMode(!isTrainingDummyMode)}
                  className={`px-3 py-1.5 text-xs rounded-md border ${isTrainingDummyMode ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-zinc-950 border-zinc-800 text-zinc-400'}`}
                >
                  {isTrainingDummyMode ? 'Activado' : 'Desactivado'}
                </button>
              </div>
              <div className="flex items-center justify-between">
                <label className="text-sm text-zinc-400">Objetivo</label>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setTargetSelection('head')}
                    className={`px-3 py-1.5 text-xs rounded-md border ${targetSelection === 'head' ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-zinc-950 border-zinc-800 text-zinc-400'}`}
                  >
                    Cabeza
                  </button>
                  <button 
                    onClick={() => setTargetSelection('torso')}
                    className={`px-3 py-1.5 text-xs rounded-md border ${targetSelection === 'torso' ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-zinc-950 border-zinc-800 text-zinc-400'}`}
                  >
                    Torso
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <label className="text-sm text-zinc-400">Tipo de Munición</label>
                <select 
                  value={config.ammoType}
                  onChange={(e) => updateConfig({ ammoType: e.target.value as any })}
                  className="bg-zinc-950 border border-zinc-800 text-zinc-300 text-sm rounded-md px-3 py-1.5 focus:outline-none focus:border-emerald-500"
                >
                  <option value="Standard">Estándar (Sin bonus)</option>
                  <option value="Steel">Acero (+5% Daño, +5% Psi)</option>
                  <option value="Tungsten">Tungsteno (+10% Daño, +10% Psi)</option>
                </select>
              </div>
              <div className="flex items-center justify-between">
                <label className="text-sm text-zinc-400">Plano de Calibración</label>
                {config.calibrationId && !isEditingCalibration ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-emerald-400">
                      {CALIBRATIONS.find(c => c.id === config.calibrationId)?.name}
                    </span>
                    <button 
                      onClick={() => setIsEditingCalibration(true)}
                      className="text-[10px] bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-2 py-1 rounded border border-zinc-700 transition-colors"
                    >
                      Cambiar
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <select 
                      value={config.calibrationId || ''}
                      onChange={(e) => {
                        updateConfig({ calibrationId: e.target.value || null });
                        if (e.target.value) setIsEditingCalibration(false);
                      }}
                      className="bg-zinc-950 border border-zinc-800 text-zinc-300 text-sm rounded-md px-3 py-1.5 focus:outline-none focus:border-emerald-500 max-w-[150px] truncate"
                    >
                      <option value="">Ninguno</option>
                      {CALIBRATIONS.map(cal => (
                        <option key={cal.id} value={cal.id}>{cal.name}</option>
                      ))}
                    </select>
                    {config.calibrationId && (
                      <button 
                        onClick={() => setIsEditingCalibration(false)}
                        className="text-[10px] bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-2 py-1 rounded border border-zinc-700 transition-colors"
                      >
                        Cancelar
                      </button>
                    )}
                  </div>
                )}
              </div>
              
              {config.calibrationId && (
                <div className="space-y-3 mt-3 pt-3 border-t border-zinc-800">
                  <div className="flex items-center justify-between">
                    <label className="text-sm text-zinc-400">Daño de arma (%)</label>
                    {!isEditingCalibration ? (
                      <span className="text-sm font-bold text-zinc-100">{config.calibrationWeaponDamage}%</span>
                    ) : (
                      <input 
                        type="number" 
                        step="0.1"
                        value={config.calibrationWeaponDamage}
                        onChange={(e) => updateConfig({ calibrationWeaponDamage: parseFloat(e.target.value) || 0 })}
                        className="bg-zinc-950 border border-zinc-800 text-zinc-300 text-sm rounded-md px-3 py-1.5 w-24 text-right focus:outline-none focus:border-emerald-500"
                      />
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    {!isEditingCalibration ? (
                      <>
                        <span className="text-sm text-zinc-400">
                          {config.calibrationSubStatType === 'critRate' ? 'Tasa Crítica' : 'Daño Crítico'}
                        </span>
                        <span className="text-sm font-bold text-zinc-100">{config.calibrationSubStatValue}%</span>
                      </>
                    ) : (
                      <>
                        <select 
                          value={config.calibrationSubStatType}
                          onChange={(e) => updateConfig({ calibrationSubStatType: e.target.value as any })}
                          className="bg-zinc-950 border border-zinc-800 text-zinc-300 text-sm rounded-md px-2 py-1.5 focus:outline-none focus:border-emerald-500 flex-1"
                        >
                          <option value="critRate">Tasa Crítica (%)</option>
                          <option value="critDamage">Daño Crítico (%)</option>
                        </select>
                        <input 
                          type="number" 
                          step="0.1"
                          value={config.calibrationSubStatValue}
                          onChange={(e) => updateConfig({ calibrationSubStatValue: parseFloat(e.target.value) || 0 })}
                          className="bg-zinc-950 border border-zinc-800 text-zinc-300 text-sm rounded-md px-3 py-1.5 w-24 text-right focus:outline-none focus:border-emerald-500"
                        />
                      </>
                    )}
                  </div>
                  {isEditingCalibration && (
                    <button 
                      onClick={() => setIsEditingCalibration(false)}
                      className="w-full mt-2 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded transition-colors"
                    >
                      Guardar Calibración
                    </button>
                  )}
                </div>
              )}
            </div>
          </section>


          {/* Effective Stats Section */}
          <section>
            <div className="flex items-center gap-2 mb-3 border-b border-zinc-800 pb-2">
              <div className="w-1 h-4 bg-emerald-500" />
              <h2 className="text-lg font-medium text-zinc-300">Estadísticas Efectivas</h2>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex justify-between bg-zinc-900/50 p-3 rounded-lg border border-zinc-800">
                <span className="text-zinc-400">Ataque Base</span>
                <span className="font-mono text-emerald-400">
                  {equipment.Primary && equipment.Primary.pelletCount > 1 
                    ? `${Math.floor((equipment.Primary.baseAttack * (1 + getDynamicStats().weaponBaseDamageBonus)) / equipment.Primary.pelletCount)}x${equipment.Primary.pelletCount}`
                    : Math.floor(getDynamicStats().baseAttack + (equipment.Primary ? equipment.Primary.baseAttack * (1 + getDynamicStats().weaponBaseDamageBonus) : 0))}
                </span>
              </div>
              <div className="flex justify-between bg-zinc-900/50 p-3 rounded-lg border border-zinc-800">
                <span className="text-zinc-400">Poder Psíquico</span>
                <span className="font-mono text-emerald-400">{Math.round(getDynamicStats().psiIntensity)}</span>
              </div>
              <div className="flex justify-between bg-zinc-900/50 p-3 rounded-lg border border-zinc-800">
                <span className="text-zinc-400">Balas/Cargador</span>
                <span className="font-mono text-emerald-400">
                  {equipment.Primary ? Math.round(equipment.Primary.magazineSize * (1 + getDynamicStats().magazineCapacityBonus)) : getDynamicStats().baseMagazine}
                </span>
              </div>
              <div className="flex justify-between bg-zinc-900/50 p-3 rounded-lg border border-zinc-800">
                <span className="text-zinc-400">Tasa Crítica</span>
                <span className="font-mono text-emerald-400">{(getDynamicStats().critRate * 100).toFixed(1)}%</span>
              </div>
              <div className="flex justify-between bg-zinc-900/50 p-3 rounded-lg border border-zinc-800">
                <span className="text-zinc-400">Daño Crítico</span>
                <span className="font-mono text-emerald-400">{(getDynamicStats().critDamage * 100).toFixed(1)}%</span>
              </div>
              <div className="flex justify-between bg-zinc-900/50 p-3 rounded-lg border border-zinc-800">
                <span className="text-zinc-400">Punto Débil</span>
                <span className="font-mono text-emerald-400">{(getDynamicStats().weakspotDamage * 100).toFixed(1)}%</span>
              </div>
              <div className="flex justify-between bg-zinc-900/50 p-3 rounded-lg border border-zinc-800">
                <span className="text-zinc-400">Daño de Arma</span>
                <span className="font-mono text-emerald-400">+{(getDynamicStats().weaponDamageBonus * 100).toFixed(1)}%</span>
              </div>
              <div className="flex justify-between bg-zinc-900/50 p-3 rounded-lg border border-zinc-800">
                <span className="text-zinc-400">Daño de Estado</span>
                <span className="font-mono text-emerald-400">+{(getDynamicStats().statusDamageBonus * 100).toFixed(1)}%</span>
              </div>
            </div>
          </section>

        </div>

        {/* Right Column: Simulation & Stats */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Visual Simulation Area */}
          <section className="bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden relative h-[400px]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(16,185,129,0.05),transparent)] pointer-events-none" />
            
            {/* Header */}
            <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/80 backdrop-blur-sm relative z-10">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-emerald-500" />
                <h2 className="font-medium text-zinc-200">Campo de Pruebas Visual</h2>
              </div>
              <button 
                onClick={runVisualStep}
                disabled={isSimulating || !equipment.Primary}
                className={`flex items-center gap-2 px-6 py-2 rounded-full font-bold transition-all ${
                  isSimulating || !equipment.Primary
                    ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.3)]'
                }`}
              >
                {isSimulating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
                {isSimulating ? 'Simulando...' : 'Ejecutar Simulación'}
              </button>
            </div>

            {/* Simulation Stage */}
            <div className="relative h-full flex items-center justify-around px-12">
              {/* Character */}
              <div className="relative flex flex-col items-center gap-4">
                <motion.div 
                  animate={simStatus === 'shooting' ? { x: [0, -5, 0] } : {}}
                  transition={{ duration: 0.1, repeat: simStatus === 'shooting' ? Infinity : 0 }}
                  className="w-24 h-40 flex flex-col items-center justify-center relative"
                >
                  {/* Head */}
                  <div className="w-12 h-12 bg-zinc-800 rounded-full border-2 border-zinc-700 flex items-center justify-center relative mb-2" />
                  {/* Body */}
                  <div className="w-20 h-24 bg-zinc-800 rounded-lg border-2 border-zinc-700" />
                  {/* Gun */}
                  <motion.div 
                    animate={simStatus === 'shooting' ? { rotate: [-5, 5, -5] } : {}}
                    className="absolute right-[-20px] top-1/2 w-20 h-6 bg-zinc-600 rounded border border-zinc-500 shadow-lg"
                  />
                </motion.div>
                <div className="text-center">
                  <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Jugador</p>
                  <div className="flex gap-1 mt-1">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className={`w-3 h-1 rounded-full ${i < currentMag ? 'bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]' : 'bg-zinc-800'}`} />
                    ))}
                  </div>
                </div>
                {simStatus === 'reloading' && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute -top-8 bg-amber-500/20 text-amber-500 text-[10px] font-bold px-2 py-1 rounded border border-amber-500/30 uppercase tracking-tighter"
                  >
                    Recargando...
                  </motion.div>
                )}
              </div>

              {/* Target Dummy */}
              <div className="relative flex flex-col items-center gap-4">
                <motion.div 
                  animate={simStatus === 'shooting' ? { scale: [1, 0.98, 1], x: [0, 2, 0] } : {}}
                  className={`w-24 h-40 flex flex-col items-center justify-center relative transition-all duration-300 ${dianaActive ? 'drop-shadow-[0_0_20px_rgba(59,130,246,0.8)]' : ''}`}
                >
                  {/* Head */}
                  <div className={`w-12 h-12 bg-zinc-800 rounded-full border-2 ${dianaActive ? 'border-blue-500' : 'border-zinc-700'} flex items-center justify-center relative mb-2`}>
                    <Target className={`w-6 h-6 ${dianaActive ? 'text-blue-500' : 'text-emerald-500/50'}`} />
                  </div>
                  {/* Body */}
                  <div className={`w-20 h-24 bg-zinc-800 rounded-lg border-2 ${dianaActive ? 'border-blue-500' : 'border-zinc-700'}`} />
                  
                  {/* Damage Numbers Container */}
                  <div className="absolute inset-0 pointer-events-none">
                    <AnimatePresence>
                      {simEvents.map((event, index) => {
                        const isCrit = event.isCrit;
                        const isWeakspot = event.isWeakspot;
                        
                        let colorClass = 'text-white';
                        if (isCrit && isWeakspot) colorClass = 'text-red-500';
                        else if (isCrit) colorClass = 'text-emerald-500';
                        else if (isWeakspot) colorClass = 'text-red-500';
                        
                        // Position: 3 left, 3 right
                        const side = index % 2 === 0 ? -1 : 1;
                        const yOffset = (Math.floor(index / 2) * 20) - 40;
                        
                        return (
                          <motion.div
                            key={event.id}
                            initial={{ opacity: 1, x: 0, y: 0, scale: 0.5 }}
                            animate={{ opacity: 0, x: side * 60, y: yOffset - 50, scale: 1 }}
                            exit={{ opacity: 0 }}
                            className={`absolute font-black text-xl ${colorClass} left-1/2`}
                          >
                            {event.damage}
                            {isCrit && isWeakspot && <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-red-500 text-xs">!</span>}
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </div>
                </motion.div>
                <div className="text-center">
                  <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Muñeco de Prueba</p>
                  <p className="text-xl font-mono text-zinc-300 mt-1">{totalSimDamage.toLocaleString()}</p>
                </div>
              </div>
            </div>

            {/* Active Buffs Section */}
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-zinc-950/80 backdrop-blur-md border-t border-zinc-800">
              <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-2 text-center">Bufos activados</p>
              <div className="flex gap-2 justify-center flex-wrap">
                {activeBuffs.map(buff => (
                  <div 
                    key={buff.id}
                    className={`flex flex-col items-center gap-1 px-2 py-1 rounded-lg border transition-all duration-300 ${
                      buff.active 
                        ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.1)]' 
                        : 'bg-zinc-900/50 border-zinc-800 text-zinc-600'
                    }`}
                  >
                    <span className="text-[9px] font-bold uppercase tracking-tight">{buff.label}</span>
                    <span className="text-[10px] font-mono">{buff.value}</span>
                    <span className="text-[8px] opacity-70">Prob: {buff.procRate}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Metrics Grid */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800">
              <p className="text-xs text-zinc-500 uppercase font-bold mb-1">Daño Total</p>
              <p className="text-2xl font-mono text-zinc-100">{totalSimDamage.toLocaleString()}</p>
            </div>
            <div className="bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800">
              <p className="text-xs text-zinc-500 uppercase font-bold mb-1">Cargador</p>
              <p className="text-2xl font-mono text-zinc-100">{currentMag} / {equipment.Primary ? Math.round(equipment.Primary.magazineSize * (1 + getEffectiveStats().magazineCapacityBonus)) : 0}</p>
            </div>
            <div className="bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800">
              <p className="text-xs text-zinc-500 uppercase font-bold mb-1">Estado</p>
              <p className={`text-xl font-bold uppercase ${
                simStatus === 'shooting' ? 'text-emerald-500' : simStatus === 'reloading' ? 'text-amber-500' : 'text-zinc-500'
              }`}>
                {simStatus === 'shooting' ? 'Disparando' : simStatus === 'reloading' ? 'Recargando' : 'Listo'}
              </p>
            </div>
          </div>

        </div>
      </main>

      {/* Selection Modal */}
      {selectingSlot && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-zinc-800 bg-zinc-900/50">
              <h3 className="text-xl font-bold text-zinc-100">Seleccionar {selectingSlot.slot}</h3>
              <button onClick={() => setSelectingSlot(null)} className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 overflow-y-auto flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 bg-zinc-950/50">
              <div 
                onClick={() => {
                  if (selectingSlot.type === 'weapon') setWeapon(selectingSlot.slot as WeaponSlotType, null);
                  else setArmor(selectingSlot.slot as ArmorSlotType, null);
                  setSelectingSlot(null);
                }}
                className="p-4 border-2 border-dashed border-zinc-800 rounded-xl hover:border-zinc-600 hover:bg-zinc-900/50 cursor-pointer flex flex-col items-center justify-center text-zinc-500 transition-all min-h-[120px]"
              >
                <X className="w-8 h-8 mb-2 opacity-50" />
                <span className="font-medium uppercase tracking-wider text-sm">Desequipar</span>
              </div>
              
              {selectingSlot.type === 'weapon' ? (
                WEAPONS.filter(w => selectingSlot.slot === 'Melee' ? w.type === 'Melee' : w.type !== 'Melee').map(w => (
                  <div 
                    key={w.id}
                    onClick={() => { setWeapon(selectingSlot.slot as WeaponSlotType, w.id); setSelectingSlot(null); }}
                    className={`relative p-4 bg-zinc-900 border ${getRarityBorder(w.rarity)} rounded-xl cursor-pointer group hover:shadow-lg transition-all`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <span className={`font-bold text-base ${getRarityColor(w.rarity)}`}>{w.name}</span>
                        <div className="flex justify-start mt-1">{renderStars(w.stars, w.rarity)}</div>
                      </div>
                      <span className="text-[10px] bg-zinc-800 px-2 py-1 rounded-md text-zinc-400 font-medium uppercase tracking-wider">{w.type}</span>
                    </div>
                    <p className="text-xs text-zinc-400 line-clamp-2 mt-3 leading-relaxed">{w.description}</p>
                    
                    {/* Tooltip in Modal */}
                    <div className="absolute z-50 invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all duration-200 bottom-full left-1/2 -translate-x-1/2 mb-3 w-80 bg-zinc-900/95 backdrop-blur-xl border border-zinc-700 rounded-xl shadow-2xl p-4 pointer-events-none">
                      {renderTooltipContent(w, true)}
                    </div>
                  </div>
                ))
              ) : (
                ARMOR_PIECES.filter(p => p.slot === selectingSlot.slot).map(p => (
                  <div 
                    key={p.id}
                    onClick={() => { setArmor(selectingSlot.slot as ArmorSlotType, p.id); setSelectingSlot(null); }}
                    className={`relative p-4 bg-zinc-900 border ${getRarityBorder(p.rarity)} rounded-xl cursor-pointer group hover:shadow-lg transition-all`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <span className={`font-bold text-base ${getRarityColor(p.rarity)}`}>{p.name}</span>
                        <div className="flex justify-start mt-1">{renderStars(p.stars, p.rarity)}</div>
                      </div>
                      {p.isKeyEffect && <span className="text-[10px] bg-indigo-900/50 border border-indigo-500/30 text-indigo-400 px-2 py-1 rounded-md font-bold uppercase tracking-wider">Key Effect</span>}
                    </div>
                    <p className="text-xs text-zinc-400 line-clamp-2 mt-3 leading-relaxed">{p.description}</p>
                    
                    {/* Tooltip in Modal */}
                    <div className="absolute z-50 invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all duration-200 bottom-full left-1/2 -translate-x-1/2 mb-3 w-80 bg-zinc-900/95 backdrop-blur-xl border border-zinc-700 rounded-xl shadow-2xl p-4 pointer-events-none">
                      {renderTooltipContent(p, false)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
