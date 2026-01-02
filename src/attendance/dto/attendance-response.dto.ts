import { Attendance, UploadStatus } from '@prisma/client';

export class AttendanceResponseDto {
    id: string;
    staffId: string;
    clockIn: Date;
    clockOut: Date | null;
    clockInPhotoUrl: string | null;
    clockInUploadStatus: UploadStatus;
    clockOutPhotoUrl: string | null;
    clockOutUploadStatus: UploadStatus | null;
    notes: string | null;
    createdAt: Date;

    constructor(
        attendance: Attendance,
        signedClockInPhotoUrl?: string,
        signedClockOutPhotoUrl?: string,
    ) {
        this.id = attendance.id;
        this.staffId = attendance.staffId;
        this.clockIn = attendance.clockIn;
        this.clockOut = attendance.clockOut;
        this.clockInPhotoUrl = signedClockInPhotoUrl || attendance.clockInPhotoUrl;
        this.clockInUploadStatus = attendance.clockInUploadStatus;
        this.clockOutPhotoUrl = signedClockOutPhotoUrl || attendance.clockOutPhotoUrl;
        this.clockOutUploadStatus = attendance.clockOutUploadStatus;
        this.notes = attendance.notes;
        this.createdAt = attendance.createdAt;
    }
}

export class PaginatedAttendanceResponseDto {
    data: AttendanceResponseDto[];
    meta: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };

    constructor(
        attendances: AttendanceResponseDto[],
        total: number,
        page: number,
        limit: number,
    ) {
        this.data = attendances;
        this.meta = {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }
}
