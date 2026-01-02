export class PhotoUploadEvent {
    constructor(
        public readonly attendanceId: string,
        public readonly staffId: string,
        public readonly fileBuffer: Buffer,
        public readonly filename: string,
        public readonly mimetype: string,
    ) { }
}
