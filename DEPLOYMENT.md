# Deployment Guide for Effi AI Voice Assistant

This guide explains how to deploy your Effi AI Voice Assistant to the cloud so it can be accessed from anywhere.

The project consists of two components:
1. **Backend Agent Worker (`agent.py`)**: Runs continuously, connects to LiveKit Cloud, and handles the AI logic.
2. **Frontend & Token Server (`server.py`)**: Serves the website and generates secure tokens for WebRTC room access.

---

## Option A: Deploying Frontend & Token Server to Vercel (Free & Scalable)

You can host the frontend website and the token generation serverless API entirely for free on [Vercel](https://vercel.com).

I have created a [vercel.json](file:///f:/Effi%20Voice%20Assistant/vercel.json) file and a serverless endpoint [api/token.py](file:///f:/Effi%20Voice%20Assistant/api/token.py) in the project.

### 1. How to Deploy to Vercel:
1. Connect your GitHub repository to **Vercel**.
2. Vercel will automatically detect the configuration and deploy the static frontend assets from `/frontend` and the serverless function `/api/token.py`.
3. Add the following **Environment Variables** in Vercel settings:
   - `LIVEKIT_URL`
   - `LIVEKIT_API_KEY`
   - `LIVEKIT_API_SECRET`

*Note: Vercel does not support running persistent python worker processes, so the backend agent (`agent.py`) must still be deployed using Option B (Render/Railway background worker) or Option C (VPS).*

---

## Option B: Deploying via Railway / Render (Easiest for Backend Agent)

You can deploy both components easily on platforms like [Railway](https://railway.app/) or [Render](https://render.com/).

### 1. Preparing the Repository
Create a `Procfile` in the root directory to tell the hosting platform how to run your web server. 

Create a file named `Procfile` with the following content:
```text
web: python server.py
```

### 2. Deploying the Frontend & Token Server
1. Create an account on **Railway** or **Render**.
2. Connect your GitHub repository.
3. Set the build/start settings:
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `python server.py`
4. Add the following **Environment Variables** in the dashboard settings:
   - `LIVEKIT_URL` (from your LiveKit Cloud dashboard)
   - `LIVEKIT_API_KEY` (from your LiveKit Cloud dashboard)
   - `LIVEKIT_API_SECRET` (from your LiveKit Cloud dashboard)
   - `GOOGLE_API_KEY` (from Google AI Studio)

---

### 3. Deploying the Backend Agent Worker
Because the backend agent runs as a persistent worker (listening to LiveKit room jobs), it is best deployed as a background service or worker.

#### Docker Deployment (Recommended for Agents)
Create a `Dockerfile` in your root directory:

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies (needed for audio libraries)
RUN apt-get update && apt-get install -y \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Run the agent in production start mode
CMD ["python", "agent.py", "start"]
```

#### Deploying the Worker Container:
1. Deploy this container to **Railway** or **Render** as a **Private/Background Worker** (no web port exposing needed).
2. Attach the same **Environment Variables**:
   - `LIVEKIT_URL`
   - `LIVEKIT_API_KEY`
   - `LIVEKIT_API_SECRET`
   - `GOOGLE_API_KEY`

---

## Option C: Deploying on a VPS (DigitalOcean / Linode / AWS EC2)

If you have a Linux VPS (Ubuntu), you can run both services in the background using `pm2` or `systemd`.

### 1. Setup on VPS
```bash
# Clone the repository
git clone <your-repo-link>
cd Effy-AI-Voice-Agent

# Install Python & Virtualenv
sudo apt update
sudo apt install python3-pip python3-venv -y
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 2. Configure Environment Variables
Create the `.env` file on the VPS:
```env
LIVEKIT_URL=wss://...
LIVEKIT_API_KEY=...
LIVEKIT_API_SECRET=...
GOOGLE_API_KEY=...
```

### 3. Run using PM2 (Process Manager)
Install `pm2` and run both services so they automatically restart if they crash or if the server reboots:

```bash
# Install PM2 (requires Node.js)
sudo apt install nodejs npm -y
sudo npm install pm2 -g

# Start the Frontend / Token Server
pm2 start "venv/bin/python server.py" --name "effi-frontend"

# Start the Agent Worker
pm2 start "venv/bin/python agent.py start" --name "effi-agent"

# Save PM2 state to auto-start on reboot
pm2 save
pm2 startup
```
