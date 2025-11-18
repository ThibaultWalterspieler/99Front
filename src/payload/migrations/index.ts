import * as migration_20251116_200416 from './20251116_200416';

export const migrations = [
  {
    up: migration_20251116_200416.up,
    down: migration_20251116_200416.down,
    name: '20251116_200416'
  },
];
