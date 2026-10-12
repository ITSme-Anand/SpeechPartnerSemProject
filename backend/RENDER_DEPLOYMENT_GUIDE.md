# Deploying Speech Partner Backend to Render with Docker

This guide explains how to deploy the `backend` Docker container to [Render](https://render.com).

---

## 🚀 Quick Deployment Options

You can deploy using either the **Render Dashboard UI** (manual) or **Render Blueprint** (automated via `render.yaml`).

---

### Method 1: Render Dashboard UI (Recommended)

1. Log in to [dashboard.render.com](https://dashboard.render.com).
2. Click **New +** → **Web Service**.
3. Choose **Build and deploy from a Git repository** and connect your GitHub/GitLab repository.
4. Configure the service settings:

| Setting | Value |
|---|---|
| **Name** | `speechpartner-backend` (or your choice) |
| **Region** | Choose nearest (e.g., Oregon, Ohio, Frankfurt, Singapore) |
| **Branch** | `main` |
| **Root Directory** | `backend` *(Important: sets Docker context to the backend folder)* |
| **Language / Runtime** | **Docker** *(Render detects `backend/Dockerfile` automatically)* |
| **Instance Type** | **Starter ($7/mo)** recommended *(see Memory Note below)* |

5. **Advanced Settings**:
   - **Health Check Path**: `/health`
   - **Docker Build Context**: `.` (or leave default since Root Directory is set to `backend`)
   - **Dockerfile Path**: `Dockerfile` (or leave default)

6. **Environment Variables**:
   Under **Environment Variables**, click **Add Environment Variable** and enter:

   | Key | Value | Notes |
   |---|---|---|
   | `FRONTEND_URL` | `https://speech-partner-sem-project.vercel.app` | **Your frontend URL**. Whenever this URL changes, update this variable and Render restarts automatically with the new CORS origin allowed! |
   | `SUPABASE_URL` | `https://xyz.supabase.co` | Your Supabase project URL |
   | `SUPABASE_SERVICE_KEY` | `ey...` | Supabase service role secret key |
   | `SUPABASE_JWT_SECRET` | `...` | Supabase JWT secret |
   | `GROQ_API_KEY` | `gsk_...` | Groq API Key (Whisper STT + drills) |
   | `GEMINI_API_KEY` | `AIza...` | Google Gemini API Key |
   | `CORS_ORIGINS` | *(Optional)* | Comma-separated extra URLs if needed |

7. Click **Create Web Service**.
   Render will build the Docker image, run the health check at `/health`, and deploy your backend to:
   `https://<your-service-name>.onrender.com`

---

### Method 2: Render Blueprint (`render.yaml`)

If deploying the entire repository:
1. In the Render Dashboard, click **Blueprints** → **New Blueprint Instance**.
2. Select your repository.
3. Render reads [`render.yaml`](../render.yaml) from your repository root and sets up the Web Service automatically with Docker, health checks, and prompted environment variables.
4. Fill in the prompted secret values and click **Apply**.

---

## ⚠️ Important Note on Instance Types & Memory

- **Speech Processing Pipeline**: The backend loads PyTorch, Silero VAD, and a dynamic int8 quantized `wav2vec2` filler detection model.
- **Free Tier (512 MB RAM)**: Free tier instances will run, but heavy simultaneous speech analysis requests may experience Out-Of-Memory (OOM) pauses. Also, free tier instances spin down after 15 minutes of inactivity (causing a 30-50 second cold start on first request).
- **Starter Plan (2 GB RAM)**: Strongly recommended for stable ML inference, no sleep/cold starts, and fast response times.

---

## 🌐 Dynamic `FRONTEND_URL` & CORS

The backend dynamically reads `FRONTEND_URL`:
- Strips any accidental trailing slashes (e.g. `https://my-app.vercel.app/` → `https://my-app.vercel.app`).
- Adds the origin to FastAPI's CORS middleware.
- Supports multiple comma-separated URLs if you have multiple previews.
- Also allows all `https://*.vercel.app` and `https://*.onrender.com` preview URLs by default.

**When your frontend domain changes:**
Simply update `FRONTEND_URL` in the Render Environment Variables tab and click **Save Changes**. Render will automatically restart the backend with the new domain enabled.

---

## 🔗 Connecting Your Frontend to Render

Once Render finishes deploying:
1. Copy your Render backend URL: `https://speechpartner-backend.onrender.com`
2. Test the health check in your browser or terminal:
   ```bash
   curl https://speechpartner-backend.onrender.com/health
   # {"status":"healthy","service":"Grammar Partner API","version":"2.0.0"}
   ```
3. In your frontend hosting platform (e.g., Vercel):
   Set the environment variable:
   ```env
   VITE_API_BASE_URL=https://speechpartner-backend.onrender.com
   ```
4. Redeploy your frontend.
