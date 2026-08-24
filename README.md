# SpeechPartner

SpeechPartner is a full-stack app for spoken English practice with narration analysis and interactive grammar drills.

## Quick Start (Docker)

Anyone using this project should be able to clone it and run a single command.

1. Clone the repository.
2. Create environment files from examples:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

3. Fill required values in:
- `backend/.env` (Supabase service values, Groq key, Gemini key)
- `frontend/.env` (Supabase URL + anon key)

4. Start everything:

```bash
docker compose up --build -d
```

5. Open the app:
- Frontend: `http://localhost:5173`
- Backend health check: `http://localhost:8000/`

## Docker Files

- Backend image: `backend/Dockerfile`
- Frontend image: `frontend/Dockerfile`
- Frontend web server config: `frontend/nginx.conf`
- Service orchestration: `docker-compose.yml`

## Stop Services

```bash
docker compose down
```

## Troubleshooting

- If startup fails with a Docker daemon error, start Docker Desktop first.
- If frontend cannot call backend, verify `VITE_API_BASE_URL` in `frontend/.env`.
- If backend fails at startup, verify required keys in `backend/.env`.
