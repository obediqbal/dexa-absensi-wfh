# Attendance Microservice

A NestJS-based microservice for managing staff attendance with clock-in/clock-out functionality, supporting photo uploads and timezone-aware tracking.

## Endpoints

### User Endpoints (Authenticated)

- `POST /attendance/clock-in` - Clock in with photo and location data
- `POST /attendance/clock-out` - Clock out with photo
- `GET /attendance/today` - Get today's attendance record (timezone-aware)
- `GET /attendance/history` - Get paginated attendance history
- `GET /attendance/:id` - Get specific attendance record by ID

### Admin Endpoints (Admin Only)

- `GET /attendance/admin/all` - Get all staff attendances with filtering and sorting

## Installation (Dev)

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your database and Google Cloud Storage credentials
```

3. Run database migrations:
```bash
npx prisma migrate dev
```

## Usage (Dev)

Start the development server:
```bash
npm run start:dev
```

The service will be available at `http://localhost:3001` (or the port specified in your `.env` file).
