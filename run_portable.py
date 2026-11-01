#!/usr/bin/env python3
"""
BruFin Portable Server
Zero-dependency offline runner for BruFin.
Serves the pre-compiled portable build from 'dist/' using Python's built-in HTTP server.
Requires no Node.js or npm installed.
"""

import os
import sys
import webbrowser
from http.server import HTTPServer, SimpleHTTPRequestHandler

PORT = 5173
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DIST_DIR = os.path.join(SCRIPT_DIR, 'dist')

if not os.path.isdir(DIST_DIR):
    print(f"Error: Build directory not found at {DIST_DIR}")
    sys.exit(1)

class PortableRequestHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIST_DIR, **kwargs)

    def end_headers(self):
        # Enable caching-friendly offline headers
        self.send_header('Cache-Control', 'no-cache')
        super().end_headers()

def main():
    os.chdir(DIST_DIR)
    server_address = ('127.0.0.1', PORT)
    
    try:
        httpd = HTTPServer(server_address, PortableRequestHandler)
    except OSError:
        # Fallback to port 8080 or random free port if 5173 is in use
        server_address = ('127.0.0.1', 8080)
        httpd = HTTPServer(server_address, PortableRequestHandler)

    url = f"http://localhost:{server_address[1]}"
    print("=" * 60)
    print("🚀 BRUFIN - Standalone Portable Personal Finance App")
    print(f"📡 Local Address:   {url}")
    print(f"📂 Serving from:    {DIST_DIR}")
    print("🔒 Privacy:         100% Offline & Local (Zero External Calls)")
    print("=" * 60)
    print("Press Ctrl+C to stop the server.")

    # Open browser automatically if possible
    try:
        webbrowser.open(url)
    except Exception:
        pass

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nBruFin portable server stopped.")
        sys.exit(0)

if __name__ == '__main__':
    main()
