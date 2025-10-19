# =============================
# AITU Multi-stage Build (Frontend + Backend)
# =============================
# Stage 1: Frontend build (React + Vite)
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

# Enable corepack (yarn) and install dependencies first for caching
COPY package.json ./
COPY yarn.lock ./ 2>/dev/null || true
RUN corepack enable && corepack prepare yarn@stable --activate && \
  yarn install --network-timeout 600000

# Copy frontend source (keep this list explicit for cache efficiency)
COPY index.html ./
COPY tsconfig*.json ./
COPY tailwind.config.js ./
COPY postcss.config.cjs ./
COPY vite.config.ts ./
COPY public ./public
COPY src ./src

# Build static assets
RUN yarn build

# =============================
# Stage 2: Backend + Final Runtime (FastAPI + Uvicorn)
# =============================
FROM python:3.13-slim AS backend
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

# (Optional) system deps (uncomment if future libs need build toolchain)
# RUN apt-get update && apt-get install -y --no-install-recommends \
#     build-essential curl ca-certificates && \
#     rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy backend dependency manifests first for better caching
COPY backend/pyproject.toml backend/pdm.lock backend/requirements.txt ./backend/

# Install backend deps (prefer requirements.txt fallback)
# If you switch fully to pdm, replace with: pip install -r requirements.txt OR use 'pip install .'
RUN pip install --upgrade pip && \
    if [ -f backend/requirements.txt ]; then pip install -r backend/requirements.txt; fi

# Copy backend source
COPY backend ./backend

# Copy built frontend assets into a static directory consumed by FastAPI (configure StaticFiles in main.py)
COPY --from=frontend-builder /app/frontend/dist ./backend/static

# Expose port (FastAPI default uvicorn port)
EXPOSE 8000

# Set environment variables for runtime (override with -e or docker compose)
ENV APP_HOST=0.0.0.0 \
    APP_PORT=8000 \
    FRONTEND_STATIC_DIR=static \
    MODEL_NAME=default-model

# Healthcheck (simple TCP)
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 CMD python - <<'PY' || exit 1
import socket,os
s=socket.socket(); 
try:
  s.connect((os.environ.get('APP_HOST','127.0.0.1'), int(os.environ.get('APP_PORT','8000'))))
except Exception as e:
  raise SystemExit(1)
finally:
  s.close()
PY

# NOTE: Ensure backend/main.py mounts static if you want to serve frontend:
# from fastapi.staticfiles import StaticFiles
# app.mount('/', StaticFiles(directory='static', html=True), name='static')
# (Place BEFORE any catch-all routes so index.html works for SPA refresh.)

WORKDIR /app/backend
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]

# =============================
# Usage:
#   docker build -t aitu:latest .
#   docker run --rm -p 8000:8000 \
#       -e SILICONFLOW_API_KEY=sk-xxx \
#       -e OPENAI_API_KEY=sk-yyy \
#       aitu:latest
# =============================
