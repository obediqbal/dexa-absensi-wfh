import { Module } from '@nestjs/common';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';
import { UploadModule } from '../upload/upload.module';
import { PhotoUploadListener } from './listeners/photo-upload.listener';

@Module({
    imports: [UploadModule],
    controllers: [AttendanceController],
    providers: [AttendanceService, PhotoUploadListener],
    exports: [AttendanceService],
})
export class AttendanceModule { }

