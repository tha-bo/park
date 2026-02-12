import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import Redis from 'ioredis';
import { NuldsController } from './nulds.controller';
import { NuldsService, DinoEventService, DinoLocationRepository, REDIS_CLIENT } from './services';
import { DinosaurEntity, DinoEventEntity, LocationEntity } from './entities';

@Module({
  imports: [
    HttpModule,
    TypeOrmModule.forFeature([DinosaurEntity, DinoEventEntity, LocationEntity]),
  ],
  controllers: [NuldsController],
  providers: [
    {
      provide: REDIS_CLIENT,
      useFactory: (config: ConfigService) => {
        const url = config.get<string>('REDIS_URL');
        if (!url) {
          throw new Error('REDIS_URL environment variable is required for DinoLocationRepository');
        }
        return new Redis(url);
      },
      inject: [ConfigService],
    },
    NuldsService,
    DinoEventService,
    DinoLocationRepository,
  ],
})
export class NuldsModule {}
