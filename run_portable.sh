#!/usr/bin/env bash
# Launch the prebuilt local dashboard with the portable Python runner; see run_portable.py for bind and fallback ports.
# BruFin Portable Launcher
# Runs the app using Python's built-in web server with zero external dependencies.

cd "$(dirname "$0")"
python3 run_portable.py
