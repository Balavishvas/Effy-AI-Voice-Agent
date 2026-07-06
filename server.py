import os
import json
import urllib.parse
from http.server import SimpleHTTPRequestHandler, HTTPServer
from dotenv import load_dotenv
from livekit import api

load_dotenv()

PORT = 8000
LIVEKIT_URL = os.getenv("LIVEKIT_URL")
LIVEKIT_API_KEY = os.getenv("LIVEKIT_API_KEY")
LIVEKIT_API_SECRET = os.getenv("LIVEKIT_API_SECRET")

class TokenServerHandler(SimpleHTTPRequestHandler):
    def translate_path(self, path):
        # Ensure we always serve files relative to the 'frontend' directory
        # Use the actual directory of server.py to avoid issues with different Cwd
        script_dir = os.path.dirname(os.path.abspath(__file__))
        base_dir = os.path.join(script_dir, "frontend")
        
        parsed = urllib.parse.urlparse(path)
        decoded_path = urllib.parse.unquote(parsed.path)
        
        # Strip leading slashes to prevent absolute path resolution on Windows
        clean_path = decoded_path.lstrip('/')
        normalized = os.path.normpath(clean_path).lstrip('\\/')
        
        # Safety check: do not allow directory traversal
        if normalized.startswith("..") or os.path.isabs(normalized):
            normalized = "index.html"
            
        return os.path.join(base_dir, normalized)

    def do_GET(self):
        parsed_url = urllib.parse.urlparse(self.path)
        if parsed_url.path == "/api/token":
            query_params = urllib.parse.parse_qs(parsed_url.query)
            import uuid
            # Generate a unique room name and identity to prevent stuck sessions on LiveKit Cloud
            session_id = uuid.uuid4().hex[:8]
            room = f"effi-room-{session_id}"
            identity = f"web-user-{session_id}"

            if not LIVEKIT_API_KEY or not LIVEKIT_API_SECRET or not LIVEKIT_URL:
                self.send_response(500)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"error": "LiveKit credentials missing in environment"}).encode())
                return

            token = (
                api.AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET)
                .with_identity(identity)
                .with_name(identity)
                .with_grants(
                    api.VideoGrants(
                        room_join=True,
                        room=room,
                    )
                )
            )
            token_jwt = token.to_jwt()

            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps({
                "token": token_jwt,
                "url": LIVEKIT_URL
            }).encode())
        else:
            # Serve static files from 'frontend' folder automatically using translate_path override
            super().do_GET()

def run():
    print(f"Starting server on http://localhost:{PORT}")
    server = HTTPServer(("0.0.0.0", PORT), TokenServerHandler)
    server.serve_forever()

if __name__ == "__main__":
    run()
