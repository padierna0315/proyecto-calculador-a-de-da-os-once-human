import { CharacterStats, Target, Weapon } from '../types/game';
import { CombatHub } from '../combat_modules';

export interface TickResult {
  timeMs: number;
  damagePhysical: number;
  damageElemental: number;
  event?: string;
}

export class SimulationEngine {
  private weapon: Weapon;
  private stats: CharacterStats;
  private target: Target;
  private durationMs: number;
  private armorPieces: Record<string, number>;
  
  // Dynamic State
  private bullseyeExpiryMs: number = 0;
  private loneWolfStacks: number = 0;
  private loneWolfExpiryMs: number = 0;
  private doombringerStacks: number = 0;
  private doombringerExpiryMs: number = 0;

  constructor(weapon: Weapon, stats: CharacterStats, target: Target, durationSeconds: number, armorPieces: Record<string, number>) {
    this.weapon = weapon;
    this.stats = stats;
    this.target = target;
    this.durationMs = durationSeconds * 1000;
    this.armorPieces = armorPieces;
  }

  public run(): TickResult[] {
    const results: TickResult[] = [];
    let currentTimeMs = 0;
    
    const msPerShot = CombatHub.calculateMsBetweenShots(this.weapon.rpm * (1 + (this.stats.fireRateBonus || 0)));
    const effectiveMagSize = CombatHub.calculateMagazineSize(this.weapon.magazineSize, this.stats.magazineCapacityBonus || 0);
    const effectiveReloadTime = CombatHub.calculateReloadTimeMs(this.weapon.reloadTimeMs, this.stats.reloadSpeedBonus || 0);
    
    let currentAmmo = effectiveMagSize;
    let isReloading = false;
    let reloadEndTime = 0;

    while (currentTimeMs <= this.durationMs) {
      // Check dynamic buff expirations
      if (currentTimeMs > this.loneWolfExpiryMs) {
        this.loneWolfStacks = 0;
      }
      if (currentTimeMs > this.doombringerExpiryMs) {
        this.doombringerStacks = 0;
      }

      if (isReloading) {
        if (currentTimeMs >= reloadEndTime) {
          isReloading = false;
          currentAmmo = effectiveMagSize;
          results.push({ timeMs: currentTimeMs, damagePhysical: 0, damageElemental: 0, event: 'Reload End' });
        }
      } else {
        if (currentAmmo > 0) {
          const shotDamage = this.calculateShotDamage(currentTimeMs);
          results.push({
            timeMs: currentTimeMs,
            damagePhysical: shotDamage,
            damageElemental: 0,
            event: 'Shot'
          });
          currentAmmo--;
          currentTimeMs += msPerShot;
          continue;
        } else {
          isReloading = true;
          reloadEndTime = currentTimeMs + effectiveReloadTime;
          results.push({ timeMs: currentTimeMs, damagePhysical: 0, damageElemental: 0, event: 'Reload Start' });
        }
      }
      currentTimeMs += 10; 
    }

    return results;
  }

  private calculateShotDamage(currentTimeMs: number): number {
    let totalShotDamage = 0;
    
    // Core Damage
    const kineticBaseNet = CombatHub.calculateKineticBaseNetDamage(
      this.weapon.baseAttack,
      this.doombringerStacks * 0.12,
      this.stats.weaponBaseDamageBonus || 0,
      1.0 // Default ammo multiplier
    );
    const pelletBase = kineticBaseNet / this.weapon.pelletCount;

    let pelletsHit = 0;

    for (let p = 0; p < this.weapon.pelletCount; p++) {
      // 1. Check if Bullseye is active for THIS pellet
      const bullseyeBuff = CombatHub.calculateBullseyeCritBuff(this.target.distance);
      
      // 2. Calculate dynamic stats for this pellet
      let currentCritDamage = this.stats.critDamage;
      if ((this.armorPieces['lone_wolf'] || 0) >= 4) {
        currentCritDamage += (this.loneWolfStacks * 0.015); // +1.5% per stack
      }

      // 3. Roll probabilities
      const isCrit = Math.random() < (this.stats.critRate + bullseyeBuff);
      const isWeakspotHit = Math.random() < 0.5; // Assuming 50% weakspot accuracy for now
      
      // 4. Calculate Pellet Damage
      let pelletDamage = CombatHub.calculateImpactDamage(
        pelletBase,
        isCrit,
        currentCritDamage,
        isWeakspotHit,
        this.stats.weakspotDamage
      );
      
      // Apply general weapon damage bonus and enemy type bonus
      pelletDamage *= (1 + this.stats.weaponDamageBonus) * (1 + this.stats.enemyTypeDamageBonus);
      
      // Apply Vulnerability (Diana/Bullseye)
      const vulnMult = CombatHub.calculateVulnerabilityMultiplier(bullseyeBuff > 0 ? 0.08 : 0);
      pelletDamage *= vulnMult;
      
      // Add base vulnerability
      pelletDamage *= (1 + this.stats.vulnerability);

      totalShotDamage += pelletDamage;
      pelletsHit++;
    }

    // Update Doombringer stacks
    const doombringerResult = CombatHub.calculateDoombringerAttackBuff(
      pelletsHit,
      this.weapon.pelletCount,
      this.doombringerStacks,
      currentTimeMs,
      this.doombringerExpiryMs
    );
    this.doombringerStacks = doombringerResult.stacks;
    this.doombringerExpiryMs = doombringerResult.expiryTime;

    // 5. Post-hit Triggers
    // The Bullseye Proc (65% chance per pellet for Doombringer)
    if (this.weapon.keyword === 'TheBullseye' && Math.random() < 0.65) {
      this.bullseyeExpiryMs = currentTimeMs + 12000; // 12 seconds mark
    }

    // Shrapnel Proc
    if (this.weapon.keyword === 'Shrapnel' && Math.random() < 0.30) {
      // Shrapnel deals 50% of weapon damage
      totalShotDamage += (kineticBaseNet * 0.5) * (1 + this.stats.weaponDamageBonus);
    }

    // Power Surge Proc
    if (this.weapon.keyword === 'PowerSurge' && Math.random() < 0.35) {
      // Power Surge deals Anomaly damage
      const surgeDamage = CombatHub.calculateStatusDamagePerTick(
        this.stats.psiIntensity || 0,
        0.4, // Base factor
        this.stats.elementalDamageBonus || 0,
        this.stats.statusDamageBonus || 0
      );
      totalShotDamage += surgeDamage;
    }

    // Unstable Bomber Proc
    if (this.weapon.keyword === 'UnstableBomber' && Math.random() < 0.25) {
      // Unstable Bomber deals 150% of weapon damage as Blast damage
      let bomberDamage = kineticBaseNet * 1.5 * (1 + this.stats.elementalDamageBonus);
      if (Math.random() < this.stats.critRate) {
        bomberDamage *= (1 + this.stats.critDamage);
      }
      totalShotDamage += bomberDamage;
    }

    // Fast Gunner Proc
    if (this.weapon.keyword === 'FastGunner' && Math.random() < 0.50) {
      // Fast Gunner increases RPM and Attack (simplified as flat damage bonus here)
      totalShotDamage += pelletBase * 0.10;
    }

    // Fortress Warfare Proc
    if (this.weapon.keyword === 'FortressWarfare' && Math.random() < 0.20) {
      // Fortress Warfare gives area buff (simplified as flat damage bonus here)
      totalShotDamage += pelletBase * 0.20;
    }

    // Bounce Proc
    if (this.weapon.keyword === 'Bounce' && Math.random() < 0.40) {
      // Bounce deals damage to another target (simplified as extra damage here)
      totalShotDamage += pelletBase * 0.50;
    }

    // Frost Vortex Proc
    if (this.weapon.keyword === 'FrostVortex' && Math.random() < 0.20) {
      // Frost Vortex deals continuous Frost damage (simplified as flat damage here)
      const vortexDamage = CombatHub.calculateStatusDamagePerTick(
        this.stats.psiIntensity || 0,
        0.3, // Base factor
        this.stats.elementalDamageBonus || 0,
        this.stats.statusDamageBonus || 0
      );
      totalShotDamage += vortexDamage;
    }

    // Burn Proc
    if (this.weapon.keyword === 'Burn' && Math.random() < 0.30) {
      // Burn deals continuous Blaze damage (simplified as flat damage here)
      const burnDamage = CombatHub.calculateStatusDamagePerTick(
        this.stats.psiIntensity || 0,
        0.2, // Base factor
        this.stats.elementalDamageBonus || 0,
        this.stats.statusDamageBonus || 0
      );
      totalShotDamage += burnDamage;
    }

    // Physical Proc (Melee)
    if (this.weapon.keyword === 'Physical' && Math.random() < 0.50) {
      // Physical deals extra damage
      totalShotDamage += pelletBase * 0.30;
    }

    // Lone Wolf 4pc Stacking
    if ((this.armorPieces['lone_wolf'] || 0) >= 4 && this.loneWolfStacks < 10) {
      this.loneWolfStacks++;
      this.loneWolfExpiryMs = currentTimeMs + 5000; // Stacks last 5 seconds (refreshing)
    }

    return totalShotDamage;
  }
}
