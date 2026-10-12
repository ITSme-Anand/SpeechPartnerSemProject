# Speech Partner Backend API

FastAPI speech analysis and drill platform backend.

---

## Tech Stack
- **Framework**: FastAPI (Python 3.12)
- **Speech Processing**: PyTorch (CPU-only), Silero VAD, Transformers (wav2vec2), Praat Parselmouth, Librosa
- **Database & Auth**: Supabase
- **Transcription & LLM**: Groq (Whisper STT, LLaMA) & Google Gemini

---

## Environment Variables

Copy `.env.example` to `.env` and fill in your keys:

```bash
cp .env.example .env
```

| Variable | Description | Example / Default |
|---|---|---|
| `SUPABASE_URL` | Supabase project URL | `https://xyz.supabase.co` |
| `SUPABASE_SERVICE_KEY` | Supabase service role secret key | `ey...` |
| `SUPABASE_JWT_SECRET` | Supabase JWT secret for auth verification | `...` |
| `GROQ_API_KEY` | Groq API Key (Whisper STT + drills) | `gsk_...` |
| `GEMINI_API_KEY` | Google Gemini API Key | `AIza...` |
| `FRONTEND_URL` | Frontend origin for CORS | `https://speech-partner-sem-project.vercel.app` |
| `CORS_ORIGINS` | Optional comma-separated list of extra allowed origins | `http://localhost:5173,https://my-preview.vercel.app` |
| `PORT` | HTTP port to listen on | `8000` |

---

## AWS EC2 Deployment (Docker)

To deploy on an AWS EC2 instance:
1. Run `./deploy-ec2.sh` for automated setup, swap check, and health verification.
2. Or run `docker compose up -d --build`.

See **[AWS_EC2_DEPLOYMENT_GUIDE.md](./AWS_EC2_DEPLOYMENT_GUIDE.md)** for full instructions, Security Group configuration, Swap memory setup, and HTTPS/SSL configuration.

---

## Local Development

### 1. Direct Python Execution
```bash
python -m venv venv
source venv/bin/activate
pip install torch --index-url https://download.pytorch.org/whl/cpu
pip install -r requirements.txt

uvicorn app.main:app --reload --port 8000
```

### 2. Docker Execution
```bash
docker compose up -d --build
# Or standalone:
docker build -t speechpartner-backend .
docker run --env-file .env -p 8000:8000 speechpartner-backend
```

---

## Health Check & Documentation

- **Health Check**: `GET http://localhost:8000/health` (returns `{"status": "healthy"}`)
- **Interactive Swagger Docs**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`

---

## Other Cloud Platforms

- Render: See [RENDER_DEPLOYMENT_GUIDE.md](./RENDER_DEPLOYMENT_GUIDE.md).
