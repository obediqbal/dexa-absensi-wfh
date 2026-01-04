import { Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Storage } from '@google-cloud/storage';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';

export interface UploadResult {
    url: string;
    key: string;
}

@Injectable()
export class UploadService {
    private storage: Storage;
    private bucketName: string;
    private maxFileSizeBytes: number;
    private allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];

    constructor(private readonly configService: ConfigService) {
        const keyFilePath = this.configService.get<string>('GCS_KEY_FILE');
        const projectId = this.configService.get<string>('GCS_PROJECT_ID');

        this.storage = new Storage({
            projectId,
            keyFilename: keyFilePath,
        });

        this.bucketName = this.configService.get<string>('GCS_BUCKET_NAME') || 'wfh-attendance-photos';
        const maxSizeMb = this.configService.get<number>('MAX_FILE_SIZE_MB') || 5;
        this.maxFileSizeBytes = maxSizeMb * 1024 * 1024;
    }

    validateFile(file: Express.Multer.File): void {
        if (!file) {
            throw new BadRequestException('No file provided');
        }

        if (file.size > this.maxFileSizeBytes) {
            throw new BadRequestException(
                `File size exceeds maximum allowed size of ${this.maxFileSizeBytes / 1024 / 1024}MB`,
            );
        }

        if (!this.allowedMimeTypes.includes(file.mimetype)) {
            throw new BadRequestException(
                `Invalid file type. Allowed types: ${this.allowedMimeTypes.join(', ')}`,
            );
        }
    }

    async uploadFile(
        file: Express.Multer.File,
        staffId: string,
    ): Promise<UploadResult> {
        this.validateFile(file);

        const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        const fileExtension = path.extname(file.originalname) || this.getExtensionFromMime(file.mimetype);
        const fileName = `${uuidv4()}${fileExtension}`;
        const key = `${staffId}/${date}/${fileName}`;

        try {
            const bucket = this.storage.bucket(this.bucketName);
            const blob = bucket.file(key);

            await blob.save(file.buffer, {
                contentType: file.mimetype,
                metadata: {
                    staffId,
                    uploadedAt: new Date().toISOString(),
                },
            });

            const [signedUrl] = await blob.getSignedUrl({
                action: 'read',
                expires: Date.now() + 60 * 60 * 1000,
            });

            const cleanUrl = signedUrl.split('?')[0];

            return {
                url: cleanUrl,
                key,
            };
        } catch (error) {
            throw new InternalServerErrorException('Failed to upload file to storage');
        }
    }

    async getSignedUrl(key: string, expirationMinutes = 60): Promise<string> {
        try {
            const bucket = this.storage.bucket(this.bucketName);
            const blob = bucket.file(key);

            const [signedUrl] = await blob.getSignedUrl({
                action: 'read',
                expires: Date.now() + expirationMinutes * 60 * 1000,
            });

            return signedUrl.split('?')[0];
        } catch (error) {
            throw new InternalServerErrorException('Failed to generate signed URL');
        }
    }

    async deleteFile(key: string): Promise<void> {
        try {
            const bucket = this.storage.bucket(this.bucketName);
            await bucket.file(key).delete();
        } catch (error) {
            console.error(`Failed to delete file ${key}:`, error);
        }
    }

    private getExtensionFromMime(mimeType: string): string {
        const mimeToExt: Record<string, string> = {
            'image/jpeg': '.jpg',
            'image/png': '.png',
            'image/webp': '.webp',
        };
        return mimeToExt[mimeType] || '.jpg';
    }
}
