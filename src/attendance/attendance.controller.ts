import {
    Controller,
    Post,
    Get,
    Param,
    Body,
    Query,
    UseGuards,
    UseInterceptors,
    UploadedFile,
    Req,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import { AttendanceService } from './attendance.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { CurrentUser as ICurrentUser } from '../auth/interfaces/jwt-payload.interface';
import { ClockInDto } from './dto/clock-in.dto';
import { ClockOutDto } from './dto/clock-out.dto';
import { AttendanceQueryDto } from './dto/attendance-query.dto';
import {
    AttendanceResponseDto,
    PaginatedAttendanceResponseDto,
} from './dto/attendance-response.dto';

@Controller('attendance')
@UseGuards(JwtAuthGuard)
export class AttendanceController {
    constructor(private readonly attendanceService: AttendanceService) { }

    @Post('clock-in')
    @HttpCode(HttpStatus.CREATED)
    @UseInterceptors(FileInterceptor('photo'))
    async clockIn(
        @CurrentUser() user: ICurrentUser,
        @UploadedFile() photo: Express.Multer.File,
        @Body() dto: ClockInDto,
        @Req() req: Request,
    ): Promise<AttendanceResponseDto> {
        const ipAddress = req.ip || req.socket.remoteAddress;
        const userAgent = req.headers['user-agent'];

        return this.attendanceService.clockIn(
            user.id,
            photo,
            dto,
            ipAddress,
            userAgent,
        );
    }

    @Post('clock-out')
    @HttpCode(HttpStatus.OK)
    @UseInterceptors(FileInterceptor('photo'))
    async clockOut(
        @CurrentUser() user: ICurrentUser,
        @UploadedFile() photo: Express.Multer.File,
        @Body() dto: ClockOutDto,
    ): Promise<AttendanceResponseDto> {
        return this.attendanceService.clockOut(user.id, photo, dto);
    }

    @Get('today')
    async getTodayAttendance(
        @CurrentUser() user: ICurrentUser,
    ): Promise<AttendanceResponseDto | null> {
        return this.attendanceService.getTodayAttendance(user.id);
    }

    @Get('history')
    async getAttendanceHistory(
        @CurrentUser() user: ICurrentUser,
        @Query() query: AttendanceQueryDto,
    ): Promise<PaginatedAttendanceResponseDto> {
        return this.attendanceService.getAttendanceHistory(user.id, query);
    }

    @Get(':id')
    async getAttendanceById(
        @CurrentUser() user: ICurrentUser,
        @Param('id') id: string,
    ): Promise<AttendanceResponseDto> {
        return this.attendanceService.getAttendanceById(user.id, id);
    }
}
