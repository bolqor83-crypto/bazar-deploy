/**
 * Модуль загрузок (Промт 10, Часть B).
 *
 * Провайдер MEDIA_STORAGE выбирается по env: настроен S3 (bucket +
 * ключи) — S3Storage, иначе LocalDiskStorage. Выбор виден в
 * /api/health (поле s3: ok | disabled).
 */
import { Module } from '@nestjs/common';
import { loadEnv } from '../config/env';
import { LocalDiskStorage } from './storage/local-disk.storage';
import { S3Storage } from './storage/s3.storage';
import { UploadsController } from './uploads.controller';
import { UploadsService } from './uploads.service';
import { MEDIA_STORAGE } from './uploads.constants';

function pickStorage() {
  const env = loadEnv();
  if (env.S3_BUCKET && env.S3_ACCESS_KEY_ID && env.S3_SECRET_ACCESS_KEY) {
    return new S3Storage();
  }
  return new LocalDiskStorage();
}

@Module({
  controllers: [UploadsController],
  providers: [
    UploadsService,
    { provide: MEDIA_STORAGE, useFactory: pickStorage },
  ],
  exports: [UploadsService],
})
export class UploadsModule {}
