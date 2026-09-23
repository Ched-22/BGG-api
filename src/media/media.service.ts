import {
  BadRequestException,
  Injectable,
  PayloadTooLargeException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { mkdir, writeFile } from 'fs/promises';
import * as path from 'path';
import sharp from 'sharp';

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIMES = new Set([
  'image/jpeg',
  'image/png',
  'image/heic',
  'image/heif',
]);

@Injectable()
export class MediaService {
  private readonly storageRoot: string;
  private readonly publicBaseUrl: string;

  constructor(private config: ConfigService) {
    this.storageRoot = this.config.get<string>('MEDIA_LOCAL_PATH') || 'uploads';
    this.publicBaseUrl =
      this.config.get<string>('MEDIA_PUBLIC_BASE_URL') || 'http://localhost:3000';
  }

  async saveUpload(file: Express.Multer.File, context?: string) {
    if (!file) throw new BadRequestException('Ficheiro obrigatório');
    if (file.size > MAX_BYTES) {
      throw new PayloadTooLargeException('Ficheiro excede 10 MB');
    }

    const originalMime = file.mimetype || 'application/octet-stream';
    if (!ALLOWED_MIMES.has(originalMime)) {
      throw new BadRequestException('Formato não suportado. Use JPG, PNG ou HEIC.');
    }

    const subdir = context === 'vehicle-inspection' ? 'vehicle-inspection' : 'general';
    const dir = path.join(this.storageRoot, subdir);
    await mkdir(dir, { recursive: true });

    let buffer = file.buffer;
    let mimeType = originalMime;
    const isHeic = originalMime === 'image/heic' || originalMime === 'image/heif';

    if (isHeic) {
      buffer = await sharp(buffer).jpeg({ quality: 85 }).toBuffer();
      mimeType = 'image/jpeg';
    }

    const ext = mimeType === 'image/png' ? 'png' : 'jpg';
    const filename = `${randomUUID()}.${ext}`;
    const fullPath = path.join(dir, filename);
    await writeFile(fullPath, buffer);

    const url = `${this.publicBaseUrl.replace(/\/$/, '')}/api/media/files/${subdir}/${filename}`;

    return {
      url,
      mimeType,
      sizeBytes: buffer.length,
      originalMimeType: originalMime,
    };
  }

  resolveFilePath(subdir: string, filename: string): string {
    const safeSubdir = subdir.replace(/[^a-z0-9-]/gi, '');
    const safeName = path.basename(filename);
    return path.join(this.storageRoot, safeSubdir, safeName);
  }
}
