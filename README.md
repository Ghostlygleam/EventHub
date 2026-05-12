# EventHub

Student event management platform built for IMAT2718K Integrated Project.

## Stack

- **Backend:** Python + FastAPI + Supabase (PostgreSQL)
- **Frontend:** React + TypeScript + Vite
- **Email:** Resend
- **Infra:** Docker + Docker Compose

## Quick Start

```bash
# 1. Clone the repo
git clone https://github.com/Ghostlygleam/EventHub.git
cd EventHub

# 2. Set up environment variables
cp backend/.env.example backend/.env
# Fill in your Supabase and Resend credentials

# 3. Run with Docker
docker-compose up --build
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API docs: http://localhost:8000/docs

## Project Structure

```
eventhub/
├── backend/        # FastAPI backend
├── frontend/       # React + TypeScript frontend
├── docker-compose.yml
└── README.md
```

## Team

- Backend: Viktoriya, Mikhail
- Frontend: Vlad
