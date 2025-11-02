/* =========================
 * 公共枚举 / 基础类型
 * ========================= */
export enum Faction {
  Survivor = 'Survivor',
  Overseer = 'Overseer',
}

export enum DamageType {
  Physical = 'Physical',
  Terror = 'Terror', // 恐惧/精神
  Trap = 'Trap',
  Environment = 'Environment',
}

export enum CCType {
  Stun = 'Stun',
  Silence = 'Silence',
  Slow = 'Slow',
  Blind = 'Blind',
  Suppress = 'Suppress', // 不能交互
  Fear = 'Fear', // 恐惧
  Reveal = 'Reveal', // 位置显形
}

export enum NoiseTag {
  SearchRustle = 'SearchRustle',
  IncubatorPulse = 'IncubatorPulse',
  CarveChip = 'CarveChip',
  WaxBubble = 'WaxBubble', // 熬蜡气泡声
  IgniteFlare = 'IgniteFlare', // 点火火焰声
  LightFlicker = 'LightFlicker',
  AltarHum = 'AltarHum',
  TrapSnap = 'TrapSnap',
  RescueAlarm = 'RescueAlarm',
}

export enum ObjectiveTag {
  Search = 'Search', // 搜索节点（干枯蔓/草垛/箱）
  Incubate = 'Incubate', // 保温催生（相当于发电机）
  Carve = 'Carve', // 雕刻台
  WaxAndWick = 'WaxAndWick', // 熬蜡装芯
  Ignite = 'Ignite', // 点火
  CarryLantern = 'CarryLantern',
  Altar = 'Altar', // 祭台充能
  EscapeDoor = 'EscapeDoor',
  Sabotage = 'Sabotage', // 监管者破坏
  Hunt = 'Hunt',
  Bind = 'Bind',
  Rescue = 'Rescue',
  GateKeep = 'GateKeep',
}
