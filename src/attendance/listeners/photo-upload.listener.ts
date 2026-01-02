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
        const { attendanceId, staffId, fileBuffer, filename, mimetype } = event;

        this.logger.log(`Starting background upload for attendance ${attendanceId}`);

        try {
            await this.prisma.attendance.update({
                where: { id: attendanceId },
                data: { uploadStatus: 'UPLOADING' },
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
                data: {
                    photoUrl: uploadResult.url,
                    photoKey: uploadResult.key,
                    uploadStatus: 'COMPLETED',
                },
            });

            this.logger.log(`Upload completed for attendance ${attendanceId}`);
        } catch (error) {
            this.logger.error(`Upload failed for attendance ${attendanceId}:`, error);

            await this.prisma.attendance.update({
                where: { id: attendanceId },
                data: { uploadStatus: 'FAILED' },
            }).catch((updateError) => {
                this.logger.error(`Failed to update status to FAILED:`, updateError);
            });
        }
    }
}
