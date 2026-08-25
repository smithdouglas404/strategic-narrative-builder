# syntax=docker/dockerfile:1
# Container image for Strategic Narrative Builder 2.0

# Debian slim rather than Alpine: cryptography, Pillow and python-pptx publish
# manylinux wheels, so they install without a Rust/C toolchain in the image.
FROM python:3.12-slim

WORKDIR /app

# Optional runtime dependencies. Without cryptography the SMTP password and AI
# provider API keys are stored in plaintext, which is not acceptable for a
# hosted deployment; python-pptx and Pillow enable the C-level deck export.
RUN pip install --no-cache-dir --disable-pip-version-check \
        "cryptography>=42" "python-pptx>=0.6" "Pillow>=10"

# Copy source code
COPY server.py ./
COPY schema.sql ./
COPY static/ ./static/

# Verify Python syntax
RUN python3 -m py_compile server.py

# Create non-root user for security
RUN groupadd -g 1000 appuser && \
    useradd -u 1000 -g appuser -s /usr/sbin/nologin -M appuser

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
    CMD python3 -c "import urllib.request; urllib.request.urlopen('http://localhost:8787/api/health').read()" || exit 1

# Switch to non-root user
USER appuser

# Run application
CMD ["python3", "server.py"]
