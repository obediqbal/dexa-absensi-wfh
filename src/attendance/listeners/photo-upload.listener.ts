import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import { UploadService } from '../../upload/upload.service';
import { PhotoUploadEvent } from '../events/photo-upload.event';

@Injectable()
export class PhotoUploadListener {
    private readonly logger = new Logger(PhotoUploadListener.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly uploadService: UploadService,
    ) { }

    @OnEvent('photo.upload')
    async handlePhotoUpload(event: PhotoUploadEvent): Promise<void> {
        const { attendanceId, staffId, fileBuffer, filename, mimetype, photoType } = event;

        this.logger.log(`Starting background ${photoType} upload for attendance ${attendanceId}`);

        const isClockOut = photoType === 'CLOCK_OUT';

        try {
            await this.prisma.attendance.update({
                where: { id: attendanceId },
                data: isClockOut
                    ? { clockOutUploadStatus: 'UPLOADING' }
                    : { uploadStatus: 'UPLOADING' },
            });

            const file = {
                buffer: fileBuffer,
                originalname: filename,
                mimetype,
                size: fileBuffer.length,
            } as Express.Multer.File;

            const uploadResult = await this.uploadService.uploadFile(file, staffId);

            await this.prisma.attendance.update({
                where: { id: attendanceId },
                data: isClockOut
                    ? {
                        clockOutPhotoUrl: uploadResult.url,
                        clockOutPhotoKey: uploadResult.key,
                        clockOutUploadStatus: 'COMPLETED',
                    }
                    : {
                        photoUrl: uploadResult.url,
                        photoKey: uploadResult.key,
                        uploadStatus: 'COMPLETED',
                    },
            });

            this.logger.log(`${photoType} upload completed for attendance ${attendanceId}`);
        } catch (error) {
            this.logger.error(`${photoType} upload failed for attendance ${attendanceId}:`, error);

            await this.prisma.attendance.update({
                where: { id: attendanceId },
                data: isClockOut
                    ? { clockOutUploadStatus: 'FAILED' }
                    : { uploadStatus: 'FAILED' },
            }).catch((updateError) => {
                this.logger.error(`Failed to update status to FAILED:`, updateError);
            });
        }
    }
}

