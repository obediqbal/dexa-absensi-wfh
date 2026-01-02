export type PhotoType = 'CLOCK_IN' | 'CLOCK_OUT';

export class PhotoUploadEvent {
    constructor(
        public readonly attendanceId: string,
        public readonly staffId: string,
        public readonly fileBuffer: Buffer,
        public readonly filename: string,
        public readonly mimetype: string,
        public readonly photoType: PhotoType = 'CLOCK_IN',
    ) { }
}
