import { Attendance } from '@prisma/client';

export class AttendanceResponseDto {
    id: string;
    staffId: string;
    clockIn: Date;
    clockOut: Date | null;
    photoUrl: string;
    notes: string | null;
    createdAt: Date;

    constructor(attendance: Attendance, signedPhotoUrl?: string) {
        this.id = attendance.id;
        this.staffId = attendance.staffId;
        this.clockIn = attendance.clockIn;
        this.clockOut = attendance.clockOut;
        this.photoUrl = signedPhotoUrl || attendance.photoUrl;
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
