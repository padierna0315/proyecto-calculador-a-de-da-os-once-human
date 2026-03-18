/**
 * Module for managing Critical Hits and Weakspot Damage.
 * Crit Damage and Weakspot Damage are additive to each other.
 */

export function calculateImpactDamage(
  baseNetDamage: number,
  isCrit: boolean,
  critDamageBonus: number,
  isWeakspot: boolean,
  weakspotDamageBonus: number
): number {
  // Multiplicador Impacto = 1 + (esCritico? Crit_DMG_Bonus : 0) + (esPuntoDebil? Weakspot_DMG_Bonus : 0)
  const multiplier = 1 + (isCrit ? critDamageBonus : 0) + (isWeakspot ? weakspotDamageBonus : 0);

  // Retorno Final: Math.round(baseNetDamage * Multiplicador_Impacto)
  return Math.round(baseNetDamage * multiplier);
}


