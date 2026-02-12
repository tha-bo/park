import { Test, TestingModule } from '@nestjs/testing';
import {
  DinoLocationRepository,
  REDIS_CLIENT,
  SetDinosaurData,
} from './dino-location.repository';

describe('DinoLocationRepository', () => {
  let repo: DinoLocationRepository;
  let redis: {
    get: jest.Mock;
    set: jest.Mock;
    hget: jest.Mock;
    hset: jest.Mock;
    hdel: jest.Mock;
    del: jest.Mock;
  };

  beforeEach(async () => {
    redis = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
      hget: jest.fn().mockResolvedValue(null),
      hset: jest.fn().mockResolvedValue(undefined),
      hdel: jest.fn().mockResolvedValue(undefined),
      del: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DinoLocationRepository,
        { provide: REDIS_CLIENT, useValue: redis },
      ],
    }).compile();

    repo = module.get<DinoLocationRepository>(DinoLocationRepository);
    jest.clearAllMocks();
  });

  describe('normalizeLocation', () => {
    it('uppercases first character only', () => {
      expect(repo.normalizeLocation('a5')).toBe('A5');
      expect(repo.normalizeLocation('A5')).toBe('A5');
      expect(repo.normalizeLocation('z15')).toBe('Z15');
    });
  });

  describe('setDinosaurLocation', () => {
    const timestamp = new Date('2025-01-15T12:00:00Z');

    it('sets dino entry and adds to carnivore location when no previous entry', async () => {
      await repo.setDinosaurLocation(1, 'a5', timestamp);

      expect(redis.get).toHaveBeenCalledWith('dino:1');
      expect(redis.set).toHaveBeenCalledWith(
        'dino:1',
        JSON.stringify({ location: 'A5' }),
      );
      expect(redis.hset).toHaveBeenCalledWith(
        'carnivore:A5',
        '1',
        timestamp.toISOString(),
      );
      expect(redis.hdel).not.toHaveBeenCalled();
    });

    it('removes from previous carnivore location and adds to new one', async () => {
      redis.get
        .mockResolvedValueOnce(
          JSON.stringify({
            location: 'B10',
            herbivore: false,
            last_fed_at: null,
            digestion_period_in_hours: 24,
            is_active: true,
          }),
        )
        .mockResolvedValue(JSON.stringify({ location: 'A5' }));

      await repo.setDinosaurLocation(1, 'A5', timestamp);

      expect(redis.hdel).toHaveBeenCalledWith('carnivore:B10', '1');
      expect(redis.hset).toHaveBeenCalledWith(
        'carnivore:A5',
        '1',
        timestamp.toISOString(),
      );
    });

    it('skips adding to carnivore when previous entry was herbivore', async () => {
      redis.get.mockResolvedValue(
        JSON.stringify({
          location: 'B10',
          herbivore: true,
          is_active: true,
        }),
      );

      await repo.setDinosaurLocation(1, 'A5', timestamp);

      expect(redis.set).toHaveBeenCalled();
      expect(redis.hset).not.toHaveBeenCalled();
    });

    it('skips adding to carnivore when previous entry was inactive', async () => {
      redis.get.mockResolvedValue(
        JSON.stringify({
          location: 'B10',
          herbivore: false,
          is_active: false,
        }),
      );

      await repo.setDinosaurLocation(1, 'A5', timestamp);

      expect(redis.hset).not.toHaveBeenCalled();
    });

    it('skips update when previous carnivore timestamp is newer than new timestamp', async () => {
      redis.get.mockResolvedValue(
        JSON.stringify({ location: 'B10', herbivore: false, is_active: true }),
      );
      redis.hget.mockResolvedValue('2025-01-16T12:00:00Z'); // newer than timestamp

      await repo.setDinosaurLocation(1, 'A5', timestamp);

      expect(redis.set).not.toHaveBeenCalled();
      expect(redis.hset).not.toHaveBeenCalled();
    });

    it('does not add to carnivore when known not hungry (digestion not passed)', async () => {
      const recentFed = new Date();
      recentFed.setHours(recentFed.getHours() - 1);
      redis.get.mockResolvedValue(
        JSON.stringify({
          location: 'B10',
          herbivore: false,
          is_active: true,
          last_fed_at: recentFed.toISOString(),
          digestion_period_in_hours: 24,
        }),
      );
      redis.hget.mockResolvedValue(null);

      await repo.setDinosaurLocation(1, 'A5', timestamp);

      expect(redis.set).toHaveBeenCalled();
      expect(redis.hset).not.toHaveBeenCalled();
    });
  });

  describe('setDinosaur', () => {
    it('creates new entry when dino not in Redis', async () => {
      const data: SetDinosaurData = {
        herbivore: true,
        digestion_period_in_hours: 24,
        is_active: true,
      };

      await repo.setDinosaur(42, data);

      expect(redis.get).toHaveBeenCalledWith('dino:42');
      expect(redis.set).toHaveBeenCalledWith(
        'dino:42',
        JSON.stringify({
          herbivore: true,
          digestion_period_in_hours: 24,
          is_active: true,
        }),
      );
      expect(redis.hdel).not.toHaveBeenCalled();
    });

    it('merges data with existing entry', async () => {
      redis.get.mockResolvedValue(
        JSON.stringify({
          location: 'A5',
          herbivore: false,
          digestion_period_in_hours: 12,
        }),
      );

      await repo.setDinosaur(42, { herbivore: true });

      expect(redis.set).toHaveBeenCalledWith(
        'dino:42',
        JSON.stringify({
          location: 'A5',
          herbivore: true,
          digestion_period_in_hours: 12,
        }),
      );
    });

    it('sets last_fed_at as ISO string when provided', async () => {
      const fedAt = new Date('2025-01-10T10:00:00Z');
      await repo.setDinosaur(42, { last_fed_at: fedAt });

      expect(redis.set).toHaveBeenCalledWith(
        'dino:42',
        JSON.stringify({ last_fed_at: fedAt.toISOString() }),
      );
    });

    it('leaves existing last_fed_at unchanged when last_fed_at is passed as null', async () => {
      redis.get.mockResolvedValue(
        JSON.stringify({ location: 'A5', last_fed_at: '2025-01-01T00:00:00.000Z' }),
      );
      await repo.setDinosaur(42, { last_fed_at: null });

      expect(redis.set).toHaveBeenCalled();
      const setCall = (redis.set as jest.Mock).mock.calls[0];
      const saved = JSON.parse(setCall[1]) as { last_fed_at?: string | null };
      expect(saved.last_fed_at).toBe('2025-01-01T00:00:00.000Z');
    });

    it('removes from carnivore location when entry has location and becomes herbivore', async () => {
      redis.get.mockResolvedValue(
        JSON.stringify({ location: 'A5', herbivore: false }),
      );

      await repo.setDinosaur(42, { herbivore: true });

      expect(redis.hdel).toHaveBeenCalledWith('carnivore:A5', '42');
    });

    it('removes from carnivore when entry has last_fed_at (no longer hungry)', async () => {
      redis.get.mockResolvedValue(
        JSON.stringify({ location: 'A5', herbivore: false }),
      );
      await repo.setDinosaur(42, { last_fed_at: new Date() });

      expect(redis.hdel).toHaveBeenCalledWith('carnivore:A5', '42');
    });

    it('removes from carnivore when is_active becomes false', async () => {
      redis.get.mockResolvedValue(
        JSON.stringify({ location: 'A5', herbivore: false, is_active: true }),
      );
      await repo.setDinosaur(42, { is_active: false });

      expect(redis.hdel).toHaveBeenCalledWith('carnivore:A5', '42');
    });
  });

  describe('removeDinosaur', () => {
    it('returns false when dino not in Redis', async () => {
      redis.get.mockResolvedValue(null);

      const result = await repo.removeDinosaur(99);

      expect(result).toBe(false);
      expect(redis.del).not.toHaveBeenCalled();
    });

    it('returns true and removes from Redis when entry exists with no location', async () => {
      redis.get.mockResolvedValue(JSON.stringify({ herbivore: true }));

      const result = await repo.removeDinosaur(99);

      expect(result).toBe(true);
      expect(redis.hdel).not.toHaveBeenCalled();
      expect(redis.del).toHaveBeenCalledWith('dino:99');
    });

    it('removes from carnivore hash and deletes dino key when entry has location', async () => {
      redis.get.mockResolvedValue(
        JSON.stringify({ location: 'A5', herbivore: false }),
      );

      const result = await repo.removeDinosaur(99);

      expect(result).toBe(true);
      expect(redis.hdel).toHaveBeenCalledWith('carnivore:A5', '99');
      expect(redis.del).toHaveBeenCalledWith('dino:99');
    });
  });
});
