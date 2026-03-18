/**
 * Module for managing core kinetic damage.
 */

export function calculateKineticBaseNetDamage(
  baseAttack: number,
  doombringerStacks: number, // 0.12 * stacks
  weaponDamageBonus: number,
  ammoMultiplier: number
): number {
  // DañoBaseNeto = (Ataque_Arma * (1 + Doombringer_Attack_Stacks)) * (1 + Weapon_DMG_Bonus) * Multiplicador_Municion
  return (baseAttack * (1 + doombringerStacks)) * (1 + weaponDamageBonus) * ammoMultiplier;
}


