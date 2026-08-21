# syntax=docker/dockerfile:1
# Multi-stage Dockerfile for Strategic Narrative Builder 2.0

# Single-stage build (no external dependencies needed)
FROM python:3.12-alpine

WORKDIR /app

# Copy source code
COPY server.py ./
COPY schema.sql ./
COPY static/ ./static/

# Verify Python syntax
RUN python3 -m py_compile server.py

# Create non-root user for security
RUN addgroup -g 1000 appuser && \
    adduser -u 1000 -G appuser -s /sbin/nologin -D appuser

# Create data and storage directories with proper permissions
RUN mkdir -p ./data ./storage/uploads && \
    chown -R appuser:appuser /app

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=8787 \
    HOST=0.0.0.0

# Expose application port
EXPOSE 8787

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python3 -c "import urllib.request; urllib.request.urlopen('http://localhost:8787/').read()" || exit 1

# Switch to non-root user
USER appuser

# Run application
CMD ["python3", "server.py"]
