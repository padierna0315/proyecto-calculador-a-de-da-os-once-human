import { create } from 'zustand';
import { ARMOR_PIECES, ARMOR_SETS } from '../data/armor';
import { CALIBRATIONS } from '../data/calibrations';
import { WEAPONS } from '../data/weapons';
import { ArmorPiece, ArmorSlotType, CharacterStats, SimulationConfig, Target, Weapon, WeaponSlotType } from '../types/game';

interface BuildState {
  equipment: {
    Primary: Weapon | null;
    Secondary: Weapon | null;
    Melee: Weapon | null;
    Helmet: ArmorPiece | null;
    Mask: ArmorPiece | null;
    Top: ArmorPiece | null;
    Bottom: ArmorPiece | null;
    Gloves: ArmorPiece | null;
    Shoes: ArmorPiece | null;
  };
  baseStats: CharacterStats;
  config: SimulationConfig;
  
  setWeapon: (slot: WeaponSlotType, weaponId: string | null) => void;
  setArmor: (slot: ArmorSlotType, pieceId: string | null) => void;
  updateConfig: (config: Partial<SimulationConfig>) => void;
  getEffectiveStats: () => CharacterStats;
  getSetCounts: () => Record<string, number>;
}

const defaultStats: CharacterStats = {
  baseAttack: 20, // Base 20 attack from naked character
  baseMagazine: 1, // Base 1 capacity from naked character
  weaponBaseDamageBonus: 0,
  weaponDamageBonus: 0, // Base 0% from naked character
  critRate: 0.00, // Base 0%
  critDamage: 0.00, // Base 0%, weapon provides 30%
  weakspotDamage: 0.00, // Base 0%, weapon provides 60%
  vulnerability: 0,
  enemyTypeDamageBonus: 0,
  psiIntensity: 125, // Base 125 from naked character
  statusDamageBonus: 0, // Base 0% from naked character
  elementalDamageBonus: 0,
  magazineCapacityBonus: 0,
  reloadSpeedBonus: 0,
  fireRateBonus: 0,
};

const defaultTarget: Target = {
  id: 'dummy',
  name: 'Training Dummy',
  category: 'Normal',
  baseDamageReduction: 0,
  elementalResistance: 0,
  distance: 5,
};

export const useBuildStore = create<BuildState>((set, get) => ({
  equipment: {
    Primary: WEAPONS.find(w => w.id === 'dbsg_doombringer') || null,
    Secondary: null,
    Melee: null,
    Helmet: null,
    Mask: null,
    Top: null,
    Bottom: null,
    Gloves: null,
    Shoes: null,
  },
  baseStats: defaultStats,
  config: {
    durationSeconds: 60,
    target: defaultTarget,
    assume100PercentWeakspot: false,
    foodBuffActive: false,
    chefDeviantOptimized: false,
    ammoType: 'Steel', // Defaulting to Steel as requested
    calibrationId: 'cal_heavy_shotgun',
    calibrationWeaponDamage: 44.6,
    calibrationSubStatType: 'critDamage',
    calibrationSubStatValue: 32.2,
  },
  
  setWeapon: (slot, weaponId) => {
    const weapon = WEAPONS.find(w => w.id === weaponId) || null;
    set((state) => ({
      equipment: { ...state.equipment, [slot]: weapon }
    }));
  },

  setArmor: (slot, pieceId) => {
    const piece = ARMOR_PIECES.find(p => p.id === pieceId) || null;
    set((state) => ({
      equipment: { ...state.equipment, [slot]: piece }
    }));
  },

  updateConfig: (config) => set((state) => ({ config: { ...state.config, ...config } })),

  getSetCounts: () => {
    const state = get();
    const counts: Record<string, number> = {};
    
    const armorSlots: ArmorSlotType[] = ['Helmet', 'Mask', 'Top', 'Bottom', 'Gloves', 'Shoes'];
    armorSlots.forEach(slot => {
      const piece = state.equipment[slot];
      if (piece && piece.setId) {
        counts[piece.setId] = (counts[piece.setId] || 0) + 1;
      }
    });
    
    return counts;
  },

  getEffectiveStats: () => {
    const state = get();
    let effective = { ...state.baseStats };

    // Ammo bonuses are applied directly to base attack in Simulator and UI,
    // but they also affect Psi Intensity
    if (state.config.ammoType === 'Steel') {
      effective.psiIntensity += 0.05;
      effective.weaponBaseDamageBonus += 0.05;
    } else if (state.config.ammoType === 'Tungsten') {
      effective.psiIntensity += 0.10;
      effective.weaponBaseDamageBonus += 0.10;
    }

    // Apply Primary Weapon Base Stats (Only primary affects shooting stats for now)
    const primary = state.equipment.Primary;
    if (primary) {
      effective.critRate = primary.critRateBase;
      effective.critDamage = primary.critDamageBase;
      effective.weakspotDamage = primary.weakspotDamageBase;
    }

    // Apply Calibration Blueprint
    if (state.config.calibrationId) {
      const calibration = CALIBRATIONS.find(c => c.id === state.config.calibrationId);
      if (calibration) {
        Object.entries(calibration.stats).forEach(([statKey, value]) => {
          const key = statKey as keyof CharacterStats;
          effective[key] = (effective[key] || 0) + (value as number);
        });
        
        // Apply dynamic sub-stats
        // Note: calibrationWeaponDamage is applied directly to the weapon's base attack in Simulator and UI,
        // not to the global weaponDamageBonus.
        effective.weaponBaseDamageBonus += (state.config.calibrationWeaponDamage / 100);
        if (state.config.calibrationSubStatType === 'critRate') {
          effective.critRate += (state.config.calibrationSubStatValue / 100);
        } else if (state.config.calibrationSubStatType === 'critDamage') {
          effective.critDamage += (state.config.calibrationSubStatValue / 100);
        }
      }
    }

    // Apply Armor Set Bonuses
    const setCounts = get().getSetCounts();
    
    Object.entries(setCounts).forEach(([setId, pieces]) => {
      const armorSet = ARMOR_SETS.find(a => a.id === setId);
      if (armorSet) {
        armorSet.bonuses.forEach(bonus => {
          if (pieces >= bonus.pieces) {
            Object.entries(bonus.stats).forEach(([statKey, value]) => {
              const key = statKey as keyof CharacterStats;
              effective[key] = (effective[key] || 0) + (value as number);
            });
          }
        });
      }
    });

    return effective;
  }
}));
