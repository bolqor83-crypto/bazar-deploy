/**
 * S3-совместимое хранилище: Cloudflare R2 / Backblaze B2 / AWS
 * (Промт 10, Часть B).
 *
 * presign через @aws-sdk/s3-request-presigner: PUT-подпись на 5
 * минут, Content-Type фиксируется в подписи. Публичный URL —
 * S3_PUBLIC_BASE_URL (публичный bucket / CDN).
 */
import { Injectable } from '@nestjs/common';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { loadEnv } from '../../config/env';
import { ApiError } from '../../common/filters/api-error';
import { CONTENT_TYPE_EXT, UPLOAD_TTL_MS } from './local-disk.storage';
import type { MediaStorage, PresignedUpload } from './storage.interface';

@Injectable()
export class S3Storage implements MediaStorage {
  private client(): S3Client {
    const env = loadEnv();
    if (!env.S3_BUCKET || !env.S3_ACCESS_KEY_ID || !env.S3_SECRET_ACCESS_KEY) {
      throw new ApiError(
        503,
        'S3_NOT_CONFIGURED',
        'S3-хранилище не сконфигурировано',
      );
    }
    return new S3Client({
      region: env.S3_REGION || 'auto',
      endpoint: env.S3_ENDPOINT || undefined,
      forcePathStyle: Boolean(env.S3_ENDPOINT),
      credentials: {
        accessKeyId: env.S3_ACCESS_KEY_ID,
        secretAccessKey: env.S3_SECRET_ACCESS_KEY,
      },
    });
  }

  async presign(input: {
    userId: string;
    contentType: string;
  }): Promise<PresignedUpload> {
    const env = loadEnv();
    const client = this.client();
    const ext = CONTENT_TYPE_EXT[input.contentType];
    const key = `uploads/${input.userId}/${crypto.randomUUID()}.${ext}`;
    const command = new PutObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: key,
      ContentType: input.contentType,
    });
    const uploadUrl = await getSignedUrl(client, command, {
      expiresIn: UPLOAD_TTL_MS / 1000,
    });
    const base = env.S3_PUBLIC_BASE_URL.replace(/\/$/, '');
    return {
      uploadUrl,
      publicUrl: `${base}/${key}`,
      key,
      expiresAt: new Date(Date.now() + UPLOAD_TTL_MS),
    };
  }
}
