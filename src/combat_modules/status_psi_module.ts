/**
 * Module for managing Elemental and Status Damage.
 * Psi Intensity is the base value for status effects.
 */

export function calculateStatusDamagePerTick(
  psiIntensity: number,
  baseFactor: number,
  elementalDamageBonus: number,
  statusDamageBonus: number
): number {
  // Daño por Tick = (Psi_Intensity * Factor_Base) * (1 + Elemental_DMG_Bonus) * (1 + Status_DMG_Bonus)
  return (psiIntensity * baseFactor) * (1 + elementalDamageBonus) * (1 + statusDamageBonus);
}
