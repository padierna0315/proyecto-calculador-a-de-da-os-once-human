export type DamageType = 'Physical' | 'Burn' | 'PowerSurge' | 'FrostVortex' | 'Shrapnel' | 'TheBullseye' | 'UnstableBomber' | 'FastGunner' | 'FortressWarfare' | 'Bounce';
export type TargetCategory = 'Normal' | 'Elite' | 'GreatOne' | 'Player';

export type ArmorSlotType = 'Helmet' | 'Mask' | 'Top' | 'Bottom' | 'Gloves' | 'Shoes';
export type WeaponSlotType = 'Primary' | 'Secondary' | 'Melee';

export interface Target {
  id: string;
  name: string;
  category: TargetCategory;
  baseDamageReduction: number;
  elementalResistance: number;
  distance: number;
}

export type Rarity = 'Legendary' | 'Epic' | 'Rare' | 'Common';

export interface Weapon {
  id: string;
  name: string;
  type: 'AssaultRifle' | 'SMG' | 'LMG' | 'Shotgun' | 'Sniper' | 'Pistol' | 'Melee';
  baseAttack: number;
  pelletCount: number;
  rpm: number;
  magazineSize: number;
  reloadTimeMs: number;
  critRateBase: number;
  critDamageBase: number;
  weakspotDamageBase: number;
  keyword: DamageType;
  description: string;
  tier: number;
  stars: number;
  rarity: Rarity;
}

export interface ArmorSet {
  id: string;
  name: string;
  bonuses: {
    pieces: number;
    stats: Partial<CharacterStats>;
    description?: string;
  }[];
}

export interface ArmorPiece {
  id: string;
  name: string;
  slot: ArmorSlotType;
  setId?: string; // Si pertenece a un set
  isKeyEffect?: boolean;
  description: string;
  tier: number;
  stars: number;
  rarity: Rarity;
}

export interface Mod {
  id: string;
  name: string;
  slot: ArmorSlotType | 'Weapon';
  isNewEcosystem: boolean;
  staticEffects: Partial<CharacterStats>;
  conditionalEffects?: ConditionalEffect[];
}

export interface CharacterStats {
  baseAttack: number;
  baseMagazine: number;
  weaponBaseDamageBonus: number; // Bonus that applies directly to the weapon's base attack (Ammo + Calibration)
  weaponDamageBonus: number;
  critRate: number;
  critDamage: number;
  weakspotDamage: number;
  vulnerability: number;
  enemyTypeDamageBonus: number;
  psiIntensity: number;
  statusDamageBonus: number;
  elementalDamageBonus: number;
  magazineCapacityBonus: number;
  reloadSpeedBonus: number;
  fireRateBonus: number;
}

export interface ConditionalEffect {
  id: string;
  trigger: 'OnReload' | 'OnCrit' | 'OnWeakspot' | 'OnHit';
  durationMs: number;
  effects: Partial<CharacterStats>;
}

export interface SimulationConfig {
  durationSeconds: number;
  target: Target;
  assume100PercentWeakspot: boolean;
  foodBuffActive: boolean;
  chefDeviantOptimized: boolean;
  ammoType: 'Standard' | 'Steel' | 'Tungsten';
  calibrationId: string | null;
  calibrationWeaponDamage: number;
  calibrationSubStatType: 'critRate' | 'critDamage';
  calibrationSubStatValue: number;
}
