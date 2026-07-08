import asyncio
import os
import threading
from http.server import BaseHTTPRequestHandler, HTTPServer
from dotenv import load_dotenv

from livekit import agents
from livekit.agents import AgentServer, AgentSession, Agent, room_io
from livekit.plugins import (
    google,
)
from prompt import INSTRUTION, RESPONSE

load_dotenv()

# ---------------------------------------------------------------------------
# Tiny health-check HTTP server — keeps Render Web Service alive and lets
# Render verify the container is running (Render requires a bound port).
# ---------------------------------------------------------------------------
class HealthHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header("Content-Type", "text/plain")
        self.end_headers()
        self.wfile.write(b"Effi agent is running")

    def log_message(self, format, *args):
        pass  # Silence access logs

def start_health_server():
    port = int(os.getenv("PORT", 8080))
    server = HTTPServer(("0.0.0.0", port), HealthHandler)
    print(f"[Health] Listening on port {port}", flush=True)
    server.serve_forever()


class Assistant(Agent):
    def __init__(self) -> None:
        super().__init__(instructions=INSTRUTION)

server = AgentServer(
    load_fnc=lambda: 0.0
)

@server.rtc_session()
async def my_agent(ctx: agents.JobContext):
    session = AgentSession(
        llm=google.realtime.RealtimeModel(
            voice="Puck",
            temperature=0.8,
            instructions=INSTRUTION,
        )
    )

    await session.start(
        room=ctx.room,
        agent=Assistant(),
        room_options=room_io.RoomOptions(
            audio_input=room_io.AudioInputOptions(
                noise_cancellation=None,
            ),
        ),
    )

    await session.generate_reply(
        instructions=RESPONSE
    )

    while ctx.room.isconnected():
        await asyncio.sleep(1)


if __name__ == "__main__":
    # Start health-check server in background thread (keeps Render alive)
    health_thread = threading.Thread(target=start_health_server, daemon=True)
    health_thread.start()

    # Run the LiveKit agent worker (blocking)
    agents.cli.run_app(server)