/*
定义所有json读取用的tokens
*/

export const INVENTORY_TOKENS = {
  InventoryStorage: 'storage.inventory',
  InventoryService: 'service.inventory',
} as const;

// src/services/music/music.tokens.ts
export const MUSIC_TOKENS = {
  Source: 'music.source',
  Service: 'music.service',
} as const;

// map service tokens
export const MAP_TOKENS = {
  Source: 'map.source',
  Service: 'map.service',
} as const;

// player data service tokens
export const PLAYER_TOKENS = {
  PlayerStorage: 'storage.player',
  PlayerService: 'service.player',
} as const;
