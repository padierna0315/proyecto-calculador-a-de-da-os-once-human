/**
 * Module for managing Weapon Passives (The Bull's Eye, Doombringer).
 */

export function calculateBullseyeCritBuff(distance: number): number {
  // Probabilidad de activación: 30% base, 80% si <= 8m
  const activationChance = distance <= 8 ? 0.8 : 0.3;
  const activated = Math.random() < activationChance;
  
  // Buff: +30% Crit Rate
  return activated ? 0.30 : 0;
}

export function calculateDoombringerAttackBuff(
  pelletsHit: number,
  totalPellets: number,
  currentStacks: number,
  currentTime: number,
  expiryTime: number
): { stacks: number; expiryTime: number } {
  // Condición: Todos los perdigones impactan
  const allHit = pelletsHit === totalPellets;
  
  let newStacks = currentStacks;
  let newExpiryTime = expiryTime;

  if (allHit) {
    // Gana una carga, máx 3
    newStacks = Math.min(currentStacks + 1, 3);
    newExpiryTime = currentTime + 15000; // 15 segundos
  } else if (currentTime > expiryTime) {
    // Si expira, se reinicia
    newStacks = 0;
    newExpiryTime = 0;
  }

  return { stacks: newStacks, expiryTime: newExpiryTime };
}
