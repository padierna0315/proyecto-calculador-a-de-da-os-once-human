import { CharacterStats } from '../types/game';

export interface CalibrationBlueprint {
  id: string;
  name: string;
  compatibleTypes: string[];
  stats: Partial<CharacterStats>;
  description: string;
}

export const CALIBRATIONS: CalibrationBlueprint[] = [
  {
    id: 'cal_heavy_shotgun',
    name: 'Estilo Pesado',
    compatibleTypes: ['Shotgun'],
    stats: { magazineCapacityBonus: 0.60, reloadSpeedBonus: -0.10 },
    description: 'Capacidad del cargador +60%, Velocidad de recarga -10%'
  }
];
