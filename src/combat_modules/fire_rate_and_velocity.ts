/**
 * Module for managing Fire Rate (RPM) and Projectile Velocity.
 */

export function calculateMsBetweenShots(rpm: number): number {
  if (rpm <= 0) return 0;
  // Fórmula de Cadencia: Tiempo_Entre_Disparos_ms = 60000 / RPM
  return 60000 / rpm;
}

// TODO: Implement projectile velocity calculation
export function calculateProjectileVelocity(baseVelocity: number, velocityBonus: number): number {
  return baseVelocity * (1 + velocityBonus);
}

