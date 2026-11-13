/**
 * Контроллер загрузок (Промт 10, Часть B).
 *
 * - POST /api/uploads/presign — подпись загрузки (JWT, rate limit);
 * - PUT /api/uploads/direct — приём файла в локальном режиме
 *   (подпись из presign, whitelist, ≤5 МБ);
 * - GET /api/media/* — публичная раздача (локальный режим).
 *
 * S3-режим: PUT идёт напрямую в бакет, /direct и /media не нужны.
 */
import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Put,
  Query,
  RawBodyRequest,
  Req,
  Res,
  StreamableFile,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { createReadStream } from 'node:fs';
import { mkdir, stat, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { ApiError } from '../common/filters/api-error';
import { UploadsService, MAX_UPLOAD_BYTES } from './uploads.service';
import { PresignDto } from './dto/uploads.dto';
import {
  CONTENT_TYPE_EXT,
  KEY_PATTERN,
  isAllowedContentType,
  mediaDir,
  verifyUploadToken,
} from './storage/local-disk.storage';

const CONTENT_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

@ApiTags('Загрузки')
@Controller()
export class UploadsController {
  constructor(private readonly uploads: UploadsService) {}

  /** Origin запроса — для абсолютных URL в локальном режиме. */
  private origin(req: Request): string {
    const proto = req.headers['x-forwarded-proto'];
    const host = req.headers.host ?? 'localhost:3000';
    const scheme = typeof proto === 'string' ? proto : 'http';
    return `${scheme}://${host}`;
  }

  @Post('uploads/presign')
  @ApiBearerAuth()
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @HttpCode(200)
  @ApiOperation({ summary: 'Подписать загрузку файла (5 минут, ≤5 МБ)' })
  presign(
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
    @Body() dto: PresignDto,
  ) {
    return this.uploads.presign({
      userId: user.userId,
      contentType: dto.contentType,
      origin: this.origin(req),
    });
  }

  @Public()
  @Put('uploads/direct')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @ApiOperation({ summary: 'Приём файла по подписи (локальный режим)' })
  async uploadDirect(
    @Req() req: RawBodyRequest<Request>,
    @Query('key') key?: string,
    @Query('expires') expires?: string,
    @Query('token') token?: string,
  ): Promise<{ publicUrl: string }> {
    if (!key || !expires || !token || !verifyUploadToken(key, expires, token)) {
      throw new ApiError(
        403,
        'UPLOAD_INVALID_SIGNATURE',
        'Ссылка недействительна или истекла',
      );
    }
    const contentType = String(req.headers['content-type'] ?? '').toLowerCase();
    if (!isAllowedContentType(contentType)) {
      throw new ApiError(
        400,
        'UPLOAD_INVALID_TYPE',
        'Допустимы только JPEG, PNG и WebP',
      );
    }
    const declared = Number(req.headers['content-length']);
    if (Number.isFinite(declared) && declared > MAX_UPLOAD_BYTES) {
      throw new ApiError(413, 'UPLOAD_TOO_LARGE', 'Файл больше 5 МБ');
    }

    // Читаем поток с жёстким лимитом байт.
    const chunks: Buffer[] = [];
    let received = 0;
    await new Promise<void>((resolvePromise, rejectPromise) => {
      req.on('data', (chunk: Buffer) => {
        received += chunk.length;
        if (received > MAX_UPLOAD_BYTES) {
          rejectPromise(
            new ApiError(413, 'UPLOAD_TOO_LARGE', 'Файл больше 5 МБ'),
          );
          req.destroy();
          return;
        }
        chunks.push(chunk);
      });
      req.on('end', () => resolvePromise());
      req.on('error', () =>
        rejectPromise(
          new ApiError(400, 'UPLOAD_READ_FAILED', 'Не удалось прочитать файл'),
        ),
      );
    });
    if (received === 0) {
      throw new ApiError(400, 'UPLOAD_EMPTY', 'Пустой файл');
    }

    const filePath = resolve(mediaDir(), key);
    if (!filePath.startsWith(resolve(mediaDir()))) {
      throw new ApiError(403, 'UPLOAD_INVALID_SIGNATURE', 'Недопустимый ключ');
    }
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, Buffer.concat(chunks));
    return { publicUrl: `/api/media/${key}` };
  }

  @Public()
  @Get('media/*splat')
  @ApiOperation({ summary: 'Публичная раздача загруженных файлов' })
  async serve(
    @Param('splat') splat: string | string[],
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const key = Array.isArray(splat) ? splat.join('/') : splat;
    if (!KEY_PATTERN.test(`uploads/${key.replace(/^uploads\//, '')}`)) {
      throw new ApiError(404, 'NOT_FOUND', 'Файл не найден');
    }
    const filePath = resolve(mediaDir(), key);
    const root = resolve(mediaDir());
    if (!filePath.startsWith(root)) {
      throw new ApiError(404, 'NOT_FOUND', 'Файл не найден');
    }
    let fileStat;
    try {
      fileStat = await stat(filePath);
    } catch {
      throw new ApiError(404, 'NOT_FOUND', 'Файл не найден');
    }
    const ext = filePath.split('.').pop() ?? '';
    res.setHeader('Content-Type', CONTENT_TYPES[ext] ?? 'application/octet-stream');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return new StreamableFile(createReadStream(filePath), {
      type: CONTENT_TYPES[ext],
      length: fileStat.size,
    });
  }
}
