import os
import subprocess
import threading
import sys
import time

def run_server():
    port = os.getenv("PORT", "8000")
    print(f"Starting Token/Frontend Server on port {port}...", flush=True)
    subprocess.run([sys.executable, "server.py"])

def run_agent():
    print("Starting LiveKit Agent Worker...", flush=True)
    subprocess.run([sys.executable, "agent.py", "start"])

if __name__ == "__main__":
    # Start the web server in a background thread
    t = threading.Thread(target=run_server, daemon=True)
    t.start()
    
    # Give the web server a second to initialize
    time.sleep(1)
    
    # Run the agent in the main thread (blocking)
    run_agent()
