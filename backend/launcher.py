import asyncio
import threading
import time
import webbrowser
import socket
import os
from pathlib import Path

# Ensure local imports resolve when bundled
if __name__ == "__main__":
    # Set CWD to this file's directory so .env and relative paths work
    os.chdir(Path(__file__).parent)

from dotenv import load_dotenv  # type: ignore
load_dotenv()

from uvicorn import Config, Server  # type: ignore
from main import app  # FastAPI app

HOST = os.getenv("PRINTFARM_HOST", "127.0.0.1")
PORT = int(os.getenv("PRINTFARM_PORT", "8000"))
OPEN_BROWSER = os.getenv("PRINTFARM_OPEN_BROWSER", "1") != "0"


def wait_for_port(host: str, port: int, timeout: float = 10.0) -> bool:
    """Wait until a TCP port is accepting connections."""
    end = time.time() + timeout
    while time.time() < end:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
            sock.settimeout(0.5)
            try:
                sock.connect((host, port))
                return True
            except OSError:
                time.sleep(0.2)
    return False


def open_default_browser(url: str) -> None:
    try:
        webbrowser.open(url, new=2)
    except Exception:
        pass


async def run_server_async() -> None:
    config = Config(app=app, host=HOST, port=PORT, reload=False, log_level="info")
    server = Server(config)
    await server.serve()


def main() -> None:
    print(f"Starting PrintFarm backend on http://{HOST}:{PORT}")

    # Start uvicorn in a background thread running its own event loop
    loop = asyncio.new_event_loop()
    t = threading.Thread(target=loop.run_until_complete, args=(run_server_async(),), daemon=True)
    t.start()

    # Wait for server to come up, then open browser
    if OPEN_BROWSER:
        if wait_for_port(HOST, PORT, timeout=12.0):
            open_default_browser(f"http://{HOST}:{PORT}")
        else:
            print("Warning: backend did not start in time; not opening browser.")

    print("Press Ctrl+C to stop.")
    try:
        # Keep the main thread alive while the server thread runs
        while t.is_alive():
            time.sleep(0.5)
    except KeyboardInterrupt:
        print("\nShutting down...")
        # Best-effort stop; uvicorn will exit when process ends


if __name__ == "__main__":
    main()
