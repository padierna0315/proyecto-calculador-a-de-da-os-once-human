/**
 * Module for managing shotgun dispersion and pellet mechanics.
 */

export function calculatePelletDamage(
  totalDamage: number,
  pelletCount: number,
  missChancePerPellet: number = 0.05 // 5% base miss chance for desync simulation
): number {
  if (pelletCount <= 0) return 0;
  
  const damagePerPellet = totalDamage / pelletCount;
  
  // Simulate miss chance
  if (Math.random() < missChancePerPellet) {
    return 0; // Pellet missed
  }
  
  return damagePerPellet;
}
