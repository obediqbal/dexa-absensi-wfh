import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { UploadService } from '../upload/upload.service';
import { ClockInDto } from './dto/clock-in.dto';
import { ClockOutDto } from './dto/clock-out.dto';
import { AttendanceQueryDto } from './dto/attendance-query.dto';
import { AdminAttendanceQueryDto } from './dto/admin-attendance-query.dto';
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
                clockInPhotoUrl: null,
                clockInPhotoKey: null,
                clockInUploadStatus: 'PENDING',
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

        const signedUrl = updatedAttendance.clockInPhotoKey
            ? await this.uploadService.getSignedUrl(updatedAttendance.clockInPhotoKey)
            : null;

        return new AttendanceResponseDto(updatedAttendance, signedUrl ?? undefined);
    }

    async getTodayAttendance(staffId: string, timezone?: string): Promise<AttendanceResponseDto | null> {
        // Calculate "today" based on the user's timezone
        // If timezone is provided (e.g., 'Asia/Jakarta', 'America/New_York'), use it
        // Otherwise, fall back to UTC
        const userTimezone = timezone || 'UTC';

        // Get current time in the user's timezone
        const now = new Date();
        const userNowString = now.toLocaleString('en-US', { timeZone: userTimezone });
        const userNow = new Date(userNowString);

        // Set to start of day in user's timezone
        const todayStart = new Date(userNow);
        todayStart.setHours(0, 0, 0, 0);

        // Set to start of next day in user's timezone
        const tomorrowStart = new Date(todayStart);
        tomorrowStart.setDate(tomorrowStart.getDate() + 1);

        // Convert back to UTC for database query
        // We need to find the UTC equivalent of the user's local day boundaries
        const userOffset = this.getTimezoneOffset(userTimezone);
        const todayStartUTC = new Date(todayStart.getTime() - userOffset);
        const tomorrowStartUTC = new Date(tomorrowStart.getTime() - userOffset);

        const attendance = await this.prisma.attendance.findFirst({
            where: {
                staffId,
                clockIn: {
                    gte: todayStartUTC,
                    lt: tomorrowStartUTC,
                },
            },
            orderBy: { clockIn: 'desc' },
        });

        if (!attendance) {
            return null;
        }

        const signedUrl = attendance.clockInPhotoKey
            ? await this.uploadService.getSignedUrl(attendance.clockInPhotoKey)
            : null;
        return new AttendanceResponseDto(attendance, signedUrl ?? undefined);
    }

    private getTimezoneOffset(timezone: string): number {
        // Get the timezone offset in milliseconds
        const now = new Date();
        const utcDate = new Date(now.toLocaleString('en-US', { timeZone: 'UTC' }));
        const tzDate = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
        return tzDate.getTime() - utcDate.getTime();
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
                const signedUrl = attendance.clockInPhotoKey
                    ? await this.uploadService.getSignedUrl(attendance.clockInPhotoKey)
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

        const signedUrl = attendance.clockInPhotoKey
            ? await this.uploadService.getSignedUrl(attendance.clockInPhotoKey)
            : null;
        return new AttendanceResponseDto(attendance, signedUrl ?? undefined);
    }

    async getAllAttendances(
        query: AdminAttendanceQueryDto,
    ): Promise<PaginatedAttendanceResponseDto> {
        const {
            page = 1,
            limit = 10,
            staffIds,
            clockInStart,
            clockInEnd,
            clockOutStart,
            clockOutEnd,
            sortBy = 'clockIn',
            sortOrder = 'desc',
            filterBy,
        } = query;

        const skip = (page - 1) * limit;

        const where: Record<string, unknown> = {};

        if (staffIds && staffIds.length > 0) {
            where.staffId = { in: staffIds };
        }

        if (clockInStart || clockInEnd) {
            where.clockIn = {};
            if (clockInStart) {
                (where.clockIn as Record<string, Date>).gte = new Date(clockInStart);
            }
            if (clockInEnd) {
                (where.clockIn as Record<string, Date>).lte = new Date(clockInEnd);
            }
        }

        if (clockOutStart || clockOutEnd) {
            where.clockOut = {};
            if (clockOutStart) {
                (where.clockOut as Record<string, Date>).gte = new Date(clockOutStart);
            }
            if (clockOutEnd) {
                (where.clockOut as Record<string, Date>).lte = new Date(clockOutEnd);
            }
        }

        if (filterBy) {
            for (const [key, value] of Object.entries(filterBy)) {
                if (value !== undefined && value !== null) {
                    if (key === 'id') {
                        where.id = value;
                    } else if (key === 'clockIn' || key === 'clockOut' || key === 'createdAt') {
                        where[key] = value instanceof Date ? value : new Date(value as string);
                    }
                }
            }
        }

        const orderBy = { [sortBy]: sortOrder };

        const [attendances, total] = await Promise.all([
            this.prisma.attendance.findMany({
                where,
                orderBy,
                skip,
                take: limit,
            }),
            this.prisma.attendance.count({ where }),
        ]);

        const attendancesWithSignedUrls = await Promise.all(
            attendances.map(async (attendance) => {
                const clockInSignedUrl = attendance.clockInPhotoKey
                    ? await this.uploadService.getSignedUrl(attendance.clockInPhotoKey)
                    : null;
                const clockOutSignedUrl = attendance.clockOutPhotoKey
                    ? await this.uploadService.getSignedUrl(attendance.clockOutPhotoKey)
                    : null;
                return new AttendanceResponseDto(
                    attendance,
                    clockInSignedUrl ?? undefined,
                    clockOutSignedUrl ?? undefined,
                );
            }),
        );

        return new PaginatedAttendanceResponseDto(attendancesWithSignedUrls, total, page, limit);
    }
}
