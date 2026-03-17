import { CharacterStats, Target, Weapon } from '../types/game';

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
    
    const effectiveRpm = this.weapon.rpm * (1 + (this.stats.fireRateBonus || 0));
    const msPerShot = 60000 / effectiveRpm;
    // Capacidad de cargador: Base * (1 + Bonus). Ej: 2 * 1.10 = 2.2 -> Floor = 2. 
    // Nota: Para llegar a 3 balas, se necesita +50%. Para 5 balas, +150%.
    const effectiveMagSize = Math.floor(this.weapon.magazineSize * (1 + this.stats.magazineCapacityBonus));
    const effectiveReloadTime = this.weapon.reloadTimeMs / (1 + this.stats.reloadSpeedBonus);
    
    let currentAmmo = effectiveMagSize;
    let isReloading = false;
    let reloadEndTime = 0;

    while (currentTimeMs <= this.durationMs) {
      // Check dynamic buff expirations
      if (currentTimeMs > this.loneWolfExpiryMs) {
        this.loneWolfStacks = 0;
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
    const weaponBaseDamage = this.weapon.baseAttack * (1 + (this.stats.weaponBaseDamageBonus || 0));
    const totalBaseAttack = weaponBaseDamage + (this.stats.baseAttack || 0);
    const damagePerPellet = totalBaseAttack / this.weapon.pelletCount;

    for (let p = 0; p < this.weapon.pelletCount; p++) {
      // 1. Check if Bullseye is active for THIS pellet
      const isBullseyeActive = currentTimeMs <= this.bullseyeExpiryMs;
      
      // 2. Calculate dynamic stats for this pellet
      let currentCritDamage = this.stats.critDamage;
      if ((this.armorPieces['lone_wolf'] || 0) >= 4) {
        currentCritDamage += (this.loneWolfStacks * 0.015); // +1.5% per stack
      }

      let currentVulnerability = this.stats.vulnerability;
      if (isBullseyeActive) {
        currentVulnerability += 0.08; // +8% Vulnerability from The Bullseye mark
      }

      // 3. Roll probabilities
      const isCrit = Math.random() < this.stats.critRate;
      const isWeakspot = Math.random() < 0.5; // Assuming 50% weakspot accuracy for now

      // 4. Calculate Pellet Damage
      let multiplierBlock = 1;
      if (isCrit || isWeakspot) {
        multiplierBlock = 0;
        if (isCrit) multiplierBlock += currentCritDamage;
        if (isWeakspot) multiplierBlock += this.stats.weakspotDamage;
        multiplierBlock += currentVulnerability; // Additive vulnerability
      }

      const pelletDamage = damagePerPellet 
        * (1 + this.stats.weaponDamageBonus) 
        * (multiplierBlock === 1 ? 1 : multiplierBlock) 
        * (1 + this.stats.enemyTypeDamageBonus);

      totalShotDamage += pelletDamage;

      // 5. Post-hit Triggers
      // The Bullseye Proc (65% chance per pellet for Doombringer)
      if (this.weapon.keyword === 'TheBullseye' && Math.random() < 0.65) {
        this.bullseyeExpiryMs = currentTimeMs + 12000; // 12 seconds mark
      }

      // Shrapnel Proc
      if (this.weapon.keyword === 'Shrapnel' && Math.random() < 0.30) {
        // Shrapnel deals 50% of weapon damage
        totalShotDamage += (weaponBaseDamage * 0.5) * (1 + this.stats.weaponDamageBonus);
      }

      // Power Surge Proc
      if (this.weapon.keyword === 'PowerSurge' && Math.random() < 0.35) {
        // Power Surge deals Anomaly damage
        const surgeDamage = weaponBaseDamage * 0.4 * (1 + this.stats.elementalDamageBonus);
        totalShotDamage += surgeDamage;
      }

      // Unstable Bomber Proc
      if (this.weapon.keyword === 'UnstableBomber' && Math.random() < 0.25) {
        // Unstable Bomber deals 150% of weapon damage as Blast damage
        let bomberDamage = weaponBaseDamage * 1.5 * (1 + this.stats.elementalDamageBonus);
        if (Math.random() < this.stats.critRate) {
          bomberDamage *= (1 + this.stats.critDamage);
        }
        totalShotDamage += bomberDamage;
      }

      // Fast Gunner Proc
      if (this.weapon.keyword === 'FastGunner' && Math.random() < 0.50) {
        // Fast Gunner increases RPM and Attack (simplified as flat damage bonus here)
        totalShotDamage += pelletDamage * 0.10;
      }

      // Fortress Warfare Proc
      if (this.weapon.keyword === 'FortressWarfare' && Math.random() < 0.20) {
        // Fortress Warfare gives area buff (simplified as flat damage bonus here)
        totalShotDamage += pelletDamage * 0.20;
      }

      // Bounce Proc
      if (this.weapon.keyword === 'Bounce' && Math.random() < 0.40) {
        // Bounce deals damage to another target (simplified as extra damage here)
        totalShotDamage += pelletDamage * 0.50;
      }

      // Frost Vortex Proc
      if (this.weapon.keyword === 'FrostVortex' && Math.random() < 0.20) {
        // Frost Vortex deals continuous Frost damage (simplified as flat damage here)
        totalShotDamage += weaponBaseDamage * 0.3 * (1 + this.stats.elementalDamageBonus);
      }

      // Burn Proc
      if (this.weapon.keyword === 'Burn' && Math.random() < 0.30) {
        // Burn deals continuous Blaze damage (simplified as flat damage here)
        totalShotDamage += weaponBaseDamage * 0.2 * (1 + this.stats.elementalDamageBonus);
      }

      // Physical Proc (Melee)
      if (this.weapon.keyword === 'Physical' && Math.random() < 0.50) {
        // Physical deals extra damage
        totalShotDamage += pelletDamage * 0.30;
      }

      // Lone Wolf 4pc Stacking
      if ((this.armorPieces['lone_wolf'] || 0) >= 4 && this.loneWolfStacks < 10) {
        this.loneWolfStacks++;
        this.loneWolfExpiryMs = currentTimeMs + 5000; // Stacks last 5 seconds (refreshing)
      }
    }

    return totalShotDamage;
  }
}
