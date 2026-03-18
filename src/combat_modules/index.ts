/// <reference types="vite/client" />

/**
 * Combat Mechanics Hub
 * Acts as an integrator for all combat modules.
 * Uses a fail-safe mechanism: if a module is deleted, it provides a default fallback.
 */

const modules = import.meta.glob('./*.ts', { eager: true }) as Record<string, any>;

function getSafeFunction<T extends (...args: any[]) => any>(
  fileName: string, 
  functionName: string, 
  fallback: T
): T {
  const mod = modules[`./${fileName}.ts`];
  if (mod && typeof mod[functionName] === 'function') {
    return mod[functionName] as T;
  }
  console.warn(`[CombatHub] Module '${fileName}' or function '${functionName}' not found. Using fail-safe fallback.`);
  return fallback;
}

export const CombatHub = {
  // Pellet Mechanics
  calculatePelletDamage: (totalDamage: number, pelletCount: number, missChancePerPellet?: number): number => {
    return getSafeFunction('pellet_mechanics', 'calculatePelletDamage', ((total: number, count: number) => total / count) as any)(
      totalDamage, pelletCount, missChancePerPellet
    );
  },

  // Fire Rate and Velocity
  calculateMsBetweenShots: (rpm: number): number => {
    return getSafeFunction('fire_rate_and_velocity', 'calculateMsBetweenShots', ((r: number) => 60000 / r) as any)(
      rpm
    );
  },
  calculateProjectileVelocity: (baseVelocity: number, velocityBonus: number): number => {
    return getSafeFunction('fire_rate_and_velocity', 'calculateProjectileVelocity', ((v: number, b: number) => v * (1 + b)) as any)(
      baseVelocity, velocityBonus
    );
  },

  // Base Stats and Psi
  calculateKineticBaseNetDamage: (baseAttack: number, doombringerStacks: number, weaponDamageBonus: number, ammoMultiplier: number): number => {
    return getSafeFunction('base_stats_and_psi', 'calculateKineticBaseNetDamage', ((ba: number, ds: number, wdb: number, am: number) => (ba * (1 + ds)) * (1 + wdb) * am) as any)(
      baseAttack, doombringerStacks, weaponDamageBonus, ammoMultiplier
    );
  },

  // Weapon Passives
  calculateBullseyeCritBuff: (distance: number): number => {
    return getSafeFunction('weapon_passives', 'calculateBullseyeCritBuff', ((d: number) => 0) as any)(distance);
  },
  calculateDoombringerAttackBuff: (pelletsHit: number, totalPellets: number, currentStacks: number, currentTime: number, expiryTime: number): { stacks: number; expiryTime: number } => {
    return getSafeFunction('weapon_passives', 'calculateDoombringerAttackBuff', ((ph: number, tp: number, cs: number, ct: number, et: number) => ({ stacks: cs, expiryTime: et })) as any)(
      pelletsHit, totalPellets, currentStacks, currentTime, expiryTime
    );
  },

  // Status and Psi
  calculateStatusDamagePerTick: (psiIntensity: number, baseFactor: number, elementalDamageBonus: number, statusDamageBonus: number): number => {
    return getSafeFunction('status_psi_module', 'calculateStatusDamagePerTick', ((pi: number, bf: number, edb: number, sdb: number) => (pi * bf) * (1 + edb) * (1 + sdb)) as any)(
      psiIntensity, baseFactor, elementalDamageBonus, statusDamageBonus
    );
  },

  // Crit and Weakspot
  calculateImpactDamage: (baseNetDamage: number, isCrit: boolean, critDamageBonus: number, isWeakspot: boolean, weakspotDamageBonus: number): number => {
    return getSafeFunction('crit_and_weakspot', 'calculateImpactDamage', ((bnd: number, ic: boolean, cdb: number, iw: boolean, wdb: number) => Math.round(bnd * (1 + (ic ? cdb : 0) + (iw ? wdb : 0)))) as any)(
      baseNetDamage, isCrit, critDamageBonus, isWeakspot, weakspotDamageBonus
    );
  },

  // Vulnerability
  calculateVulnerabilityMultiplier: (vulnerabilityBonus: number): number => {
    return getSafeFunction('vulnerability_module', 'calculateVulnerabilityMultiplier', ((vb: number) => 1 + vb) as any)(
      vulnerabilityBonus
    );
  },

  // Magazine and Reload
  calculateMagazineSize: (baseMagazine: number, magazineCapacityBonus: number): number => {
    return getSafeFunction('magazine_and_reload', 'calculateMagazineSize', ((bm: number, mcb: number) => Math.floor(bm * (1 + mcb))) as any)(
      baseMagazine, magazineCapacityBonus
    );
  },
  calculateReloadTimeMs: (baseReloadTimeMs: number, reloadEfficiencyBonus: number): number => {
    return getSafeFunction('magazine_and_reload', 'calculateReloadTimeMs', ((brt: number, reb: number) => brt / (1 + reb)) as any)(
      baseReloadTimeMs, reloadEfficiencyBonus
    );
  }
};
