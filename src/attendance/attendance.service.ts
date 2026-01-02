import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { UploadService } from '../upload/upload.service';
import { ClockInDto } from './dto/clock-in.dto';
import { ClockOutDto } from './dto/clock-out.dto';
import { AttendanceQueryDto } from './dto/attendance-query.dto';
import {
    AttendanceResponseDto,
    PaginatedAttendanceResponseDto,
} from './dto/attendance-response.dto';
import { PhotoUploadEvent } from './events/photo-upload.event';

@Injectable()
export class AttendanceService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly uploadService: UploadService,
        private readonly eventEmitter: EventEmitter2,
    ) { }

    async clockIn(
        staffId: string,
        photo: Express.Multer.File,
        dto: ClockInDto,
        ipAddress?: string,
        userAgent?: string,
    ): Promise<AttendanceResponseDto> {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const existingAttendance = await this.prisma.attendance.findFirst({
            where: {
                staffId,
                clockIn: {
                    gte: today,
                    lt: tomorrow,
                },
                clockOut: null,
            },
        });

        if (existingAttendance) {
            throw new BadRequestException('You have already clocked in today. Please clock out first.');
        }

        this.uploadService.validateFile(photo);

        const attendance = await this.prisma.attendance.create({
            data: {
                staffId,
                clockIn: new Date(),
                photoUrl: null,
                photoKey: null,
                uploadStatus: 'PENDING',
                ipAddress,
                userAgent,
                notes: dto.notes,
            },
        });

        this.eventEmitter.emit(
            'photo.upload',
            new PhotoUploadEvent(
                attendance.id,
                staffId,
                photo.buffer,
                photo.originalname,
                photo.mimetype,
            ),
        );

        return new AttendanceResponseDto(attendance);
    }

    async clockOut(
        staffId: string,
        photo: Express.Multer.File,
        dto: ClockOutDto,
    ): Promise<AttendanceResponseDto> {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const attendance = await this.prisma.attendance.findFirst({
            where: {
                staffId,
                clockIn: {
                    gte: today,
                    lt: tomorrow,
                },
                clockOut: null,
            },
        });

        if (!attendance) {
            throw new BadRequestException('No active clock-in found for today. Please clock in first.');
        }

        this.uploadService.validateFile(photo);

        const updatedAttendance = await this.prisma.attendance.update({
            where: { id: attendance.id },
            data: {
                clockOut: new Date(),
                clockOutUploadStatus: 'PENDING',
                notes: dto.notes ? `${attendance.notes || ''}\n${dto.notes}`.trim() : attendance.notes,
            },
        });

        this.eventEmitter.emit(
            'photo.upload',
            new PhotoUploadEvent(
                attendance.id,
                staffId,
                photo.buffer,
                photo.originalname,
                photo.mimetype,
                'CLOCK_OUT',
            ),
        );

        const signedUrl = updatedAttendance.photoKey
            ? await this.uploadService.getSignedUrl(updatedAttendance.photoKey)
            : null;

        return new AttendanceResponseDto(updatedAttendance, signedUrl ?? undefined);
    }

    async getTodayAttendance(staffId: string): Promise<AttendanceResponseDto | null> {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const attendance = await this.prisma.attendance.findFirst({
            where: {
                staffId,
                clockIn: {
                    gte: today,
                    lt: tomorrow,
                },
            },
            orderBy: { clockIn: 'desc' },
        });

        if (!attendance) {
            return null;
        }

        const signedUrl = attendance.photoKey
            ? await this.uploadService.getSignedUrl(attendance.photoKey)
            : null;
        return new AttendanceResponseDto(attendance, signedUrl ?? undefined);
    }

    async getAttendanceHistory(
        staffId: string,
        query: AttendanceQueryDto,
    ): Promise<PaginatedAttendanceResponseDto> {
        const { page = 1, limit = 10, startDate, endDate } = query;
        const skip = (page - 1) * limit;

        const where: Record<string, unknown> = { staffId };

        if (startDate || endDate) {
            where.clockIn = {};
            if (startDate) {
                (where.clockIn as Record<string, Date>).gte = new Date(startDate);
            }
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                (where.clockIn as Record<string, Date>).lte = end;
            }
        }

        const [attendances, total] = await Promise.all([
            this.prisma.attendance.findMany({
                where,
                orderBy: { clockIn: 'desc' },
                skip,
                take: limit,
            }),
            this.prisma.attendance.count({ where }),
        ]);

        const attendancesWithSignedUrls = await Promise.all(
            attendances.map(async (attendance) => {
                const signedUrl = attendance.photoKey
                    ? await this.uploadService.getSignedUrl(attendance.photoKey)
                    : null;
                return new AttendanceResponseDto(attendance, signedUrl ?? undefined);
            }),
        );

        return new PaginatedAttendanceResponseDto(attendancesWithSignedUrls, total, page, limit);
    }

    async getAttendanceById(
        staffId: string,
        attendanceId: string,
    ): Promise<AttendanceResponseDto> {
        const attendance = await this.prisma.attendance.findFirst({
            where: {
                id: attendanceId,
                staffId,
            },
        });

        if (!attendance) {
            throw new NotFoundException('Attendance record not found');
        }

        const signedUrl = attendance.photoKey
            ? await this.uploadService.getSignedUrl(attendance.photoKey)
            : null;
        return new AttendanceResponseDto(attendance, signedUrl ?? undefined);
    }
}
