import { Type } from 'class-transformer';
import { IsOptional, IsInt, Min, Max, IsDateString, IsString, IsIn } from 'class-validator';

export class AdminAttendanceQueryDto {
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page?: number = 1;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(100)
    limit?: number = 10;

    @IsOptional()
    @IsString()
    staffId?: string;

    @IsOptional()
    @IsDateString()
    clockInStart?: string;

    @IsOptional()
    @IsDateString()
    clockInEnd?: string;

    @IsOptional()
    @IsDateString()
    clockOutStart?: string;

    @IsOptional()
    @IsDateString()
    clockOutEnd?: string;

    @IsOptional()
    @IsIn(['clockIn', 'clockOut'])
    sortBy?: 'clockIn' | 'clockOut' = 'clockIn';

    @IsOptional()
    @IsIn(['asc', 'desc'])
    sortOrder?: 'asc' | 'desc' = 'desc';
}
