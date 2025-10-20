// server/src/time/dateService.ts

// Minimal storage interface based on GameDataStorage behavior (same shape as InventoryService)
type DataStorage = {
  get: (key: string) => Promise<unknown>;
  set: (key: string, value: unknown) => Promise<void>;
};

function extractValue<T = unknown>(res: unknown): T | undefined {
  if (
    res &&
    typeof res === 'object' &&
    'value' in (res as Record<string, unknown>)
  ) {
    return (res as { value: T }).value;
  }
  return undefined;
}

export type PlayerDate = {
  day: number; // 1..28
  seasonIndex: number; // 0: Spring, 1: Summer, 2: Fall, 3: Winter
  year: number; // >= 1
};

const SEASON_DAYS = 28;
const SEASON_COUNT = 4 as const;
const SEASON_NAMES = ['Spring', 'Summer', 'Fall', 'Winter'] as const;

function getDefaultDate(): PlayerDate {
  return { day: 1, seasonIndex: 0, year: 1 };
}

function isValidDate(d: unknown): d is PlayerDate {
  if (!d || typeof d !== 'object') {
    return false;
  }
  const o = d as Record<string, unknown>;
  return (
    typeof o.day === 'number' &&
    typeof o.seasonIndex === 'number' &&
    typeof o.year === 'number' &&
    Number.isInteger(o.day) &&
    Number.isInteger(o.seasonIndex) &&
    Number.isInteger(o.year) &&
    o.day >= 1 &&
    o.day <= SEASON_DAYS &&
    o.seasonIndex >= 0 &&
    o.seasonIndex < SEASON_COUNT &&
    o.year >= 1
  );
}

class DateServiceImpl {
  private readonly dates = new Map<string, PlayerDate>(); // key: playerId
  private readonly store: DataStorage = storage.getDataStorage(
    'date'
  ) as DataStorage;

  async initForPlayer(playerId: string): Promise<void> {
    if (!this.dates.has(playerId)) {
      this.dates.set(playerId, getDefaultDate());
    }
    const res = await this.store.get(playerId);
    const value = extractValue<unknown>(res);
    if (value === undefined) {
      // No existing data; persist default to ensure storage has an entry
      await this.store.set(playerId, this.dates.get(playerId)!);
      return;
    }
    let parsed: unknown = value;
    if (typeof parsed === 'string') {
      try {
        parsed = JSON.parse(parsed);
      } catch {
        parsed = undefined;
      }
    }
    if (isValidDate(parsed)) {
      this.dates.set(playerId, { ...parsed });
    } else {
      // Fallback to default if malformed
      const def = getDefaultDate();
      this.dates.set(playerId, def);
      await this.store.set(playerId, def);
    }
  }

  clearForPlayer(playerId: string): void {
    this.dates.delete(playerId);
  }

  getDate(playerId: string): PlayerDate {
    return { ...(this.dates.get(playerId) ?? getDefaultDate()) };
  }

  async setDate(playerId: string, date: PlayerDate): Promise<void> {
    if (!isValidDate(date)) {
      throw new Error('Invalid PlayerDate');
    }
    this.dates.set(playerId, { ...date });
    await this.store.set(playerId, date);
  }

  async advanceDayForPlayer(playerId: string): Promise<PlayerDate> {
    let { day, seasonIndex, year } = this.getDate(playerId);
    day += 1;

    if (day > SEASON_DAYS) {
      day = 1;
      seasonIndex += 1;
      if (seasonIndex >= SEASON_COUNT) {
        seasonIndex = 0;
        year += 1;
      }
    }

    const next: PlayerDate = { day, seasonIndex, year };
    this.dates.set(playerId, next);
    await this.store.set(playerId, next);
    return { ...next };
  }

  getSeasonName(seasonIndex: number): 'Spring' | 'Summer' | 'Fall' | 'Winter' {
    return SEASON_NAMES[
      Math.max(0, Math.min(SEASON_NAMES.length - 1, seasonIndex))
    ];
  }
}

export const DateService = new DateServiceImpl();
