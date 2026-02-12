import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DinoEventService } from './dino-event.service';
import { DinoLocationRepository } from './dino-location.repository';
import { DinosaurEntity, DinoEventEntity, LocationEntity } from '../entities';

describe('DinoEventService', () => {
  let service: DinoEventService;
  let dinosaurRepository: jest.Mocked<Repository<DinosaurEntity>>;
  let dinoEventRepository: jest.Mocked<Repository<DinoEventEntity>>;
  let locationRepository: jest.Mocked<Repository<LocationEntity>>;
  let dinoLocationRepository: jest.Mocked<Pick<DinoLocationRepository, 'setDinosaur' | 'setDinosaurLocation' | 'removeDinosaur'>>;

  beforeEach(async () => {
    dinosaurRepository = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((d) => d as DinosaurEntity),
      save: jest.fn().mockImplementation((d) => Promise.resolve(d)),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    } as unknown as jest.Mocked<Repository<DinosaurEntity>>;

    dinoEventRepository = {
      create: jest.fn((d) => d as DinoEventEntity),
      save: jest.fn().mockImplementation((d) => Promise.resolve(d)),
    } as unknown as jest.Mocked<Repository<DinoEventEntity>>;

    locationRepository = {
      upsert: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<Repository<LocationEntity>>;

    dinoLocationRepository = {
      setDinosaur: jest.fn().mockResolvedValue(undefined),
      setDinosaurLocation: jest.fn().mockResolvedValue(undefined),
      removeDinosaur: jest.fn().mockResolvedValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DinoEventService,
        { provide: getRepositoryToken(DinosaurEntity), useValue: dinosaurRepository },
        { provide: getRepositoryToken(DinoEventEntity), useValue: dinoEventRepository },
        { provide: getRepositoryToken(LocationEntity), useValue: locationRepository },
        { provide: DinoLocationRepository, useValue: dinoLocationRepository },
      ],
    }).compile();

    service = module.get<DinoEventService>(DinoEventService);
    jest.clearAllMocks();
  });

  describe('handleDinoAdded', () => {
    const event = {
      kind: 'dino_added' as const,
      id: 1,
      name: 'Rex',
      species: 'T-Rex',
      gender: 'male' as const,
      digestion_period_in_hours: 24,
      herbivore: false,
      park_id: 10,
      time: '2025-01-15T12:00:00Z',
    };

    it('saves dinosaur and event and calls setDinosaur', async () => {
      await service.handleDinoAdded(event);

      expect(dinosaurRepository.findOne).toHaveBeenCalledWith({
        where: { id: event.id },
      });
      expect(dinosaurRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 1,
          name: 'Rex',
          species: 'T-Rex',
          gender: 'male',
          digestion_period_in_hours: 24,
          herbivore: false,
          park_id: 10,
          is_active: true,
        }),
      );
      expect(dinosaurRepository.save).toHaveBeenCalled();
      expect(dinoEventRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          kind: 'dino_added',
          dinosaur_id: 1,
          park_id: 10,
          metadata: expect.objectContaining({
            name: 'Rex',
            species: 'T-Rex',
            herbivore: false,
          }),
        }),
      );
      expect(dinoEventRepository.save).toHaveBeenCalled();
      expect(dinoLocationRepository.setDinosaur).toHaveBeenCalledWith(1, {
        herbivore: false,
        digestion_period_in_hours: 24,
        is_active: true,
      });
    });

    it('keeps is_active false when existing dinosaur was removed', async () => {
      (dinosaurRepository.findOne as jest.Mock).mockResolvedValue({
        id: 1,
        is_active: false,
      });

      await service.handleDinoAdded(event);

      expect(dinosaurRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ is_active: false }),
      );
      expect(dinoLocationRepository.setDinosaur).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ is_active: false }),
      );
    });
  });

  describe('handleDinoFed', () => {
    const event = {
      kind: 'dino_fed' as const,
      dinosaur_id: 2,
      park_id: 10,
      time: '2025-01-15T14:00:00Z',
    };

    it('updates dinosaur last_fed_at and saves event and setDinosaur', async () => {
      await service.handleDinoFed(event);

      expect(dinosaurRepository.update).toHaveBeenCalledWith(
        { id: 2 },
        { last_fed_at: new Date(event.time) },
      );
      expect(dinoEventRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          kind: 'dino_fed',
          dinosaur_id: 2,
          park_id: 10,
        }),
      );
      expect(dinoEventRepository.save).toHaveBeenCalled();
      expect(dinoLocationRepository.setDinosaur).toHaveBeenCalledWith(2, {
        last_fed_at: new Date(event.time),
      });
    });

    it('saves dinosaur when update affects 0 rows', async () => {
      (dinosaurRepository.update as jest.Mock).mockResolvedValue({
        affected: 0,
      });

      await service.handleDinoFed(event);

      expect(dinosaurRepository.save).toHaveBeenCalledWith({
        id: 2,
        park_id: 10,
        last_fed_at: new Date(event.time),
      });
    });
  });

  describe('handleDinoLocationUpdated', () => {
    const event = {
      kind: 'dino_location_updated' as const,
      dinosaur_id: 3,
      location: 'B10',
      park_id: 10,
      time: '2025-01-15T16:00:00Z',
    };

    it('updates dinosaur current_location, setDinosaurLocation, and saves event', async () => {
      await service.handleDinoLocationUpdated(event);

      expect(dinosaurRepository.update).toHaveBeenCalledWith(
        { id: 3 },
        { current_location: 'B10' },
      );
      expect(dinoLocationRepository.setDinosaurLocation).toHaveBeenCalledWith(
        3,
        'B10',
        new Date(event.time),
      );
      expect(dinoEventRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          kind: 'dino_location_updated',
          dinosaur_id: 3,
          metadata: { location: 'B10' },
        }),
      );
      expect(dinoEventRepository.save).toHaveBeenCalled();
    });

    it('saves dinosaur when update affects 0 rows', async () => {
      (dinosaurRepository.update as jest.Mock).mockResolvedValue({
        affected: 0,
      });

      await service.handleDinoLocationUpdated(event);

      expect(dinosaurRepository.save).toHaveBeenCalledWith({
        id: 3,
        park_id: 10,
        current_location: 'B10',
      });
    });
  });

  describe('handleDinoRemoved', () => {
    const event = {
      kind: 'dino_removed' as const,
      dinosaur_id: 4,
      park_id: 10,
      time: '2025-01-15T18:00:00Z',
    };

    it('updates dinosaur is_active and removed_at, removeDinosaur, saves event', async () => {
      await service.handleDinoRemoved(event);

      expect(dinosaurRepository.update).toHaveBeenCalledWith(
        { id: 4 },
        {
          is_active: false,
          removed_at: new Date(event.time),
        },
      );
      expect(dinoLocationRepository.removeDinosaur).toHaveBeenCalledWith(4);
      expect(dinoEventRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          kind: 'dino_removed',
          dinosaur_id: 4,
          park_id: 10,
        }),
      );
      expect(dinoEventRepository.save).toHaveBeenCalled();
    });

    it('saves dinosaur when update affects 0 rows', async () => {
      (dinosaurRepository.update as jest.Mock).mockResolvedValue({
        affected: 0,
      });

      await service.handleDinoRemoved(event);

      expect(dinosaurRepository.save).toHaveBeenCalledWith({
        id: 4,
        park_id: 10,
        is_active: false,
        removed_at: new Date(event.time),
      });
    });
  });

  describe('handleMaintenancePerformed', () => {
    const event = {
      kind: 'maintenance_performed' as const,
      location: 'A5',
      park_id: 10,
      time: '2025-01-15T20:00:00Z',
    };

    it('upserts location with maintenance_performed', async () => {
      await service.handleMaintenancePerformed(event);

      expect(locationRepository.upsert).toHaveBeenCalledWith(
        {
          location: 'A5',
          park_id: 10,
          maintenance_performed: new Date(event.time),
        },
        ['location', 'park_id'],
      );
    });

    it('catches and logs error when upsert fails', async () => {
      const err = new Error('DB error');
      (locationRepository.upsert as jest.Mock).mockRejectedValue(err);
      const logSpy = jest.spyOn(service['logger'], 'error').mockImplementation();

      await service.handleMaintenancePerformed(event);

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to save maintenance'),
        err,
      );
      logSpy.mockRestore();
    });
  });
});
