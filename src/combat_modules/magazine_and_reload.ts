/**
 * Module for managing Magazine Capacity and Reload Time.
 */

export function calculateMagazineSize(baseMagazine: number, magazineCapacityBonus: number): number {
  // El juego NO redondea hacia arriba libremente. Trunca los decimales.
  return Math.floor(baseMagazine * (1 + magazineCapacityBonus));
}

export function calculateReloadTimeMs(baseReloadTimeMs: number, reloadEfficiencyBonus: number): number {
  // Final Reload Time = Base Reload Time / (1 + Reload Efficiency Bonus)
  return baseReloadTimeMs / (1 + reloadEfficiencyBonus);
}
