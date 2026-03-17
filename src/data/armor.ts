import { ArmorPiece, ArmorSet } from '../types/game';

export const ARMOR_SETS: ArmorSet[] = [
  {
    id: 'falcon',
    name: 'Falcon',
    bonuses: [
      { pieces: 1, stats: {}, description: '-20% coste de estamina al rodar.' },
      { pieces: 2, stats: { critDamage: 0.12 }, description: '+12% Daño Crítico base.' },
      { pieces: 3, stats: { critRate: 0.05, critDamage: 0.20 }, description: 'Si Estamina > 90%, +5% Tasa Crítica y +20% Daño Crítico.' },
      { pieces: 4, stats: {}, description: 'Bajas restauran 30 estamina.' }
    ]
  },
  {
    id: 'lone_wolf',
    name: 'Lone Wolf',
    bonuses: [
      { pieces: 1, stats: { magazineCapacityBonus: 0.10 }, description: '+10% Capacidad de Cargador.' },
      { pieces: 2, stats: { critRate: 0.05 }, description: '+5% Tasa Crítica.' },
      { pieces: 3, stats: {}, description: 'Lonely Shadow: +6% Daño Crítico cada 2 críticos (Max 8 stacks).' },
      { pieces: 4, stats: {}, description: 'Max 10 stacks. Bajas dan +8% Tasa Crítica por 2s.' }
    ]
  },
  {
    id: 'scout',
    name: 'Scout',
    bonuses: [
      { pieces: 1, stats: {}, description: '+10% HP Máximo.' },
      { pieces: 2, stats: { weaponDamageBonus: 0.08 }, description: '+8% Daño de Arma.' },
      { pieces: 3, stats: { weaponDamageBonus: 0.20 }, description: '+20% Daño de Arma en sigilo.' },
      { pieces: 4, stats: {}, description: '+12% Velocidad. Regeneración de estamina +20% si HP < 50%.' }
    ]
  },
  {
    id: 'bastille',
    name: 'Bastille',
    bonuses: [
      { pieces: 1, stats: { reloadSpeedBonus: 0.15 }, description: '+15% Eficiencia de Recarga.' },
      { pieces: 2, stats: {}, description: '...' },
      { pieces: 3, stats: {}, description: '...' },
      { pieces: 4, stats: {}, description: '...' }
    ]
  },
  {
    id: 'blast',
    name: 'Blast',
    bonuses: [
      { pieces: 1, stats: {}, description: 'Daño de ataque cuerpo a cuerpo (pesado) +20%.' },
      { pieces: 2, stats: {}, description: 'Reducción de mitigación de daño físico al torso +20%.' },
      { pieces: 3, stats: {}, description: 'Baja cuerpo a cuerpo: +25% daño al siguiente golpe (5s) y +15% giro.' },
      { pieces: 4, stats: {}, description: 'Baja cuerpo a cuerpo: cura 20 estamina y +20% velocidad por 2s.' }
    ]
  },
  {
    id: 'rustic',
    name: 'Rustic',
    bonuses: [
      { pieces: 1, stats: {}, description: '+8% Velocidad de movimiento cinético.' },
      { pieces: 2, stats: { weaponDamageBonus: 0.15 }, description: '+15% Daño para armas cuerpo a cuerpo.' },
      { pieces: 3, stats: {}, description: '+600 Puntos de Vida Base (HP).' },
      { pieces: 4, stats: {}, description: '+20% Velocidad de recolección de materiales.' }
    ]
  },
  {
    id: 'prisoner',
    name: 'Prisoner (Prisionero)',
    bonuses: [
      { pieces: 1, stats: {}, description: '+10% Daño de Metralla (Shrapnel).' },
      { pieces: 2, stats: { weaponDamageBonus: 0.08 }, description: '+8% Daño de Arma.' },
      { pieces: 3, stats: {}, description: 'Los impactos de Metralla tienen probabilidad de golpear puntos débiles.' },
      { pieces: 4, stats: {}, description: 'Aumenta significativamente la frecuencia y el daño de la Metralla tras críticos.' }
    ]
  },
  {
    id: 'renegade',
    name: 'Renegade',
    bonuses: [
      { pieces: 1, stats: {}, description: 'Archer Focus: +4% daño a punto débil por hit (Max 10).' },
      { pieces: 2, stats: {}, description: '...' },
      { pieces: 3, stats: {}, description: '...' },
      { pieces: 4, stats: {}, description: '...' }
    ]
  },
  {
    id: 'dark_resonance',
    name: 'Dark Resonance',
    bonuses: [
      { pieces: 1, stats: {}, description: 'Otorga un Escudo al usar Ultimate.' },
      { pieces: 2, stats: { weaponDamageBonus: 0.10 }, description: 'Aumenta Daño de Jugador si Deviant Power no está al máximo.' },
      { pieces: 3, stats: {}, description: 'A mayor Deviant Power consumido, mayor Daño de Jugador.' },
      { pieces: 4, stats: {}, description: 'Habilidades de batalla consumen Deviant Power para reducir cooldowns.' }
    ]
  },
  {
    id: 'shelterer',
    name: 'Shelterer',
    bonuses: [
      { pieces: 1, stats: {}, description: '+8% Daño de Anomalía.' },
      { pieces: 2, stats: {}, description: '+10% Max HP.' },
      { pieces: 3, stats: {}, description: 'Al infligir daño de Anomalía, obtienes un stack de Shelter (Max 20). Cada stack da +1% Daño de Anomalía.' },
      { pieces: 4, stats: {}, description: 'A 20 stacks de Shelter, +20% Daño de Arma y +20% Daño de Anomalía.' }
    ]
  },
  {
    id: 'heavy_duty',
    name: 'Heavy Duty',
    bonuses: [
      { pieces: 1, stats: {}, description: '+10% Reducción de Daño de Fuego.' },
      { pieces: 2, stats: {}, description: '+10% Max HP.' },
      { pieces: 3, stats: {}, description: '+15% Daño de Explosión.' },
      { pieces: 4, stats: {}, description: 'Al recibir daño, +20% Daño de Explosión por 5s.' }
    ]
  },
  {
    id: 'agent',
    name: 'Agent',
    bonuses: [
      { pieces: 1, stats: {}, description: '+10% Velocidad de Recarga.' },
      { pieces: 2, stats: {}, description: '+10% Daño a Puntos Débiles.' },
      { pieces: 3, stats: {}, description: 'Al impactar punto débil, +15% Daño de Arma por 3s.' },
      { pieces: 4, stats: {}, description: 'Al matar con punto débil, recarga automáticamente el 20% del cargador.' }
    ]
  }
];

const SLOTS: ('Helmet' | 'Mask' | 'Top' | 'Bottom' | 'Gloves' | 'Shoes')[] = ['Helmet', 'Mask', 'Top', 'Bottom', 'Gloves', 'Shoes'];

// Generar piezas para todos los sets
export const ARMOR_PIECES: ArmorPiece[] = [];

ARMOR_SETS.forEach(set => {
  const isLegendary = ['lone_wolf', 'bastille', 'dark_resonance', 'prisoner', 'shelterer', 'renegade'].includes(set.id);
  const rarity = isLegendary ? 'Legendary' : 'Epic';
  const stars = isLegendary ? 6 : 5;

  SLOTS.forEach(slot => {
    ARMOR_PIECES.push({
      id: `${set.id}_${slot.toLowerCase()}`,
      name: `${set.name} ${slot}`,
      slot: slot,
      setId: set.id,
      description: `Pieza del conjunto ${set.name}.`,
      tier: 5,
      stars: stars,
      rarity: rarity
    });
  });
});

// Añadir Key Effect Armors
ARMOR_PIECES.push(
  {
    id: 'tactical_combat_shoes',
    name: 'Tactical Combat Shoes (Zapatos de combate táctico)',
    slot: 'Shoes',
    isKeyEffect: true,
    description: '[Key Effect] Tras recargar o rodar, aumenta el daño de arma y la velocidad de movimiento.',
    tier: 5,
    stars: 6,
    rarity: 'Legendary'
  },
  {
    id: 'gilded_gauntlets',
    name: 'Gilded Gauntlets',
    slot: 'Gloves',
    isKeyEffect: true,
    description: '[Key Effect] Permite que el daño de Quemadura (Burn) inflija Daño Crítico.',
    tier: 5,
    stars: 6,
    rarity: 'Legendary'
  },
  {
    id: 'pivot_step_boots',
    name: 'Pivot-Step Boots',
    slot: 'Shoes',
    isKeyEffect: true,
    description: '[Key Effect] Reinicia el cooldown de la Habilidad de Batalla tras usar la Ultimate de Anomalía.',
    tier: 5,
    stars: 6,
    rarity: 'Legendary'
  },
  {
    id: 'falcon_gloves',
    name: 'Falcon Gloves',
    slot: 'Gloves',
    isKeyEffect: true,
    description: '[Key Effect] Sinergia especial con la matriz de Ruptura Cinética (Shrapnel).',
    tier: 5,
    stars: 5,
    rarity: 'Epic'
  },
  {
    id: 'falcon_jacket',
    name: 'Falcon Jacket',
    slot: 'Top',
    isKeyEffect: true,
    description: '[Key Effect] Sinergia especial con la matriz de Ruptura Cinética (Shrapnel).',
    tier: 5,
    stars: 5,
    rarity: 'Epic'
  },
  {
    id: 'mayfly_goggles',
    name: 'Mayfly Goggles',
    slot: 'Mask',
    isKeyEffect: true,
    description: '[Key Effect] Aumenta el daño a objetivos con The Bullseye en 20%.',
    tier: 5,
    stars: 6,
    rarity: 'Legendary'
  },
  {
    id: 'beret',
    name: 'Beret',
    slot: 'Helmet',
    isKeyEffect: true,
    description: '[Key Effect] Aumenta la capacidad del cargador y la velocidad de recarga.',
    tier: 5,
    stars: 6,
    rarity: 'Legendary'
  },
  {
    id: 'gas_tight_helmet',
    name: 'Gas-Tight Helmet',
    slot: 'Helmet',
    isKeyEffect: true,
    description: '[Key Effect] Aumenta el daño de Power Surge.',
    tier: 5,
    stars: 6,
    rarity: 'Legendary'
  },
  {
    id: 'fateful_strike',
    name: 'Fateful Strike',
    slot: 'Top',
    isKeyEffect: true,
    description: '[Key Effect] Reduce la Tasa Crítica pero aumenta masivamente el Daño Crítico.',
    tier: 5,
    stars: 6,
    rarity: 'Legendary'
  },
  {
    id: 'shaman_vulture_top',
    name: 'Shaman Vulture Top',
    slot: 'Top',
    isKeyEffect: true,
    description: '[Key Effect] Aumenta el daño de Unstable Bomber.',
    tier: 5,
    stars: 6,
    rarity: 'Legendary'
  },
  {
    id: 'hardy_gloves',
    name: 'Hardy Gloves',
    slot: 'Gloves',
    isKeyEffect: true,
    description: '[Key Effect] Aumenta el daño cuerpo a cuerpo y la velocidad de ataque.',
    tier: 5,
    stars: 6,
    rarity: 'Legendary'
  },
  {
    id: 'weaver',
    name: 'Weaver',
    slot: 'Bottom',
    isKeyEffect: true,
    description: '[Key Effect] Aumenta el daño de Frost Vortex.',
    tier: 5,
    stars: 6,
    rarity: 'Legendary'
  },
  {
    id: 'covered_advance',
    name: 'Covered Advance',
    slot: 'Bottom',
    isKeyEffect: true,
    description: '[Key Effect] Aumenta el efecto de Fortress Warfare.',
    tier: 5,
    stars: 6,
    rarity: 'Legendary'
  }
);
