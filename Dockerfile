FROM python:3.11-slim

WORKDIR /app

# Install system dependencies (needed for audio and compiling C dependencies)
RUN apt-get update && apt-get install -y \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Run only the LiveKit agent worker (web frontend is served by Vercel)
CMD ["python", "agent.py", "start"]
