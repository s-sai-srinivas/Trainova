# Trainova - AI Coaching OS

A mobile-first, AI-powered coaching operating system for personal trainers and their athletes.

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **Database:** PostgreSQL 15 (via Prisma ORM)
- **Auth:** Custom JWT (HMAC SHA-256) + session cookies
- **Styling:** Custom CSS design tokens + Tailwind CSS v4

## Getting Started

### Prerequisites

- Node.js 18+
- Docker (for PostgreSQL)

### Development

1. Start the database:
   ```bash
   cd fe && docker compose up -d
   ```

2. Set up environment:
   ```bash
   cp .env.example .env
   # Edit .env with your DATABASE_URL and JWT_SECRET
   ```

3. Initialize database:
   ```bash
   npx prisma db push
   npx prisma db seed
   ```

4. Run dev server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000)

### Seed Credentials

- **Trainer:** Phone `+919876543210`, Password `password123`

## Project Structure

```
fe/
├── app/              # Next.js App Router pages
│   ├── trainer/      # Trainer portal routes
│   └── client/       # Athlete portal routes
├── components/       # React components
├── lib/              # Services, auth, config
│   └── services/     # Business logic (Prisma queries)
├── prisma/           # Database schema & seeds
└── public/           # Static assets
```

## Features

### Trainer Portal
- Dashboard with AI-powered attention feed
- Client directory with compliance tracking
- Plan builder with exercise library
- Client profile management with progress tracking

### Athlete Portal
- Daily workout execution with set tracking
- Morning check-in (weight, sleep, energy, diet)
- Meal logging with macro tracking
- Progress photos with comparison tool
