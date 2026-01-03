import { Type, Transform } from 'class-transformer';
import { IsOptional, IsInt, Min, Max, IsDateString, IsString, IsIn, IsArray } from 'class-validator';

export const SORTABLE_FIELDS = [
    'clockIn',
    'clockOut',
    'createdAt',
] as const;

export type SortableField = (typeof SORTABLE_FIELDS)[number];

export type FilterBy = Partial<Record<SortableField | 'id', string | Date | null>>;

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
    @IsArray()
    @IsString({ each: true })
    @Transform(({ value }) => {
        if (!value) return undefined;
        if (Array.isArray(value)) return value;
        return value.split(',').map((s: string) => s.trim());
    })
    staffIds?: string[];

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
    @IsString()
    @IsIn(SORTABLE_FIELDS)
    sortBy?: SortableField = 'clockIn';

    @IsOptional()
    @IsString()
    @IsIn(['asc', 'desc'])
    sortOrder?: 'asc' | 'desc' = 'desc';

    @IsOptional()
    @IsString()
    @Transform(({ value }) => {
        if (!value) return undefined;
        try {
            return JSON.parse(value);
        } catch {
            return undefined;
        }
    })
    filterBy?: FilterBy;
}
