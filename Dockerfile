# Multi-stage Dockerfile for ClassVision 2.0 Backend
FROM python:3.11-slim AS builder

WORKDIR /app

# Install system build dependencies for OpenCV and cryptography
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# Final runtime image
FROM python:3.11-slim

WORKDIR /app

# Install runtime system libraries
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Create non-root unprivileged application user
RUN useradd -m -u 1001 -s /bin/bash appuser

# Copy installed python packages and backend application code
COPY --from=builder /install /usr/local
COPY --chown=appuser:appuser backend/ /app/

USER appuser

ENV ENVIRONMENT=production
ENV SERVER_HOST=0.0.0.0
ENV SERVER_PORT=8000
ENV PYTHONUNBUFFERED=1

EXPOSE 8000

CMD ["sh", "-c", "alembic upgrade head && uvicorn main:app --host 0.0.0.0 --port 8000"]
