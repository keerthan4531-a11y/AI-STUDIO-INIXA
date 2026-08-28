FROM python:3.11-slim

# Set global shared directory for Playwright browser binaries
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Install dependencies and Playwright with Chromium binaries
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN playwright install --with-deps chromium
RUN chmod -R 777 /ms-playwright

COPY server.py .

# Render exposes PORT dynamically (default 10000)
EXPOSE 10000

CMD ["python", "server.py"]
