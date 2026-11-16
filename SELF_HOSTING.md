# BruFin self-hosting

This runs the existing BruFin web app and a small API on your homelab. The API stores the shared BruFin data in SQLite at `./data/brufin.sqlite3`; the `./data` directory is a persistent Docker bind mount. Browser clients use the same web dashboard. Android clients can connect to the same API from BruFin Settings.

## Start from source with Docker Compose

Requirements: Docker with the Compose plugin.

```sh
cp .env.example .env
mkdir -p data
chmod 700 data
```

The API token is generated automatically on first start and saved in the persistent data directory. No key-generation step is needed. Keep that data directory private. If you prefer to supply your own token, set `BRUFIN_API_TOKEN` in `.env` to a random value of at least 32 characters (for example, `openssl rand -hex 32`).

```sh
docker compose up -d --build
```

Open `http://<homelab-host>:8080`. On the first browser connection, configure the same server URL and token in **Settings → Self-hosted server**. The server database starts empty. Choose whether to upload this device's current BruFin data or load data already stored on the server.

To retrieve the generated token for the browser or Android client:

```sh
docker compose exec brufin cat /data/api-token
```

## Portainer quick start

1. Open **Stacks → Add stack → Web editor** in Portainer and paste [`docker-compose.portainer.yml`](docker-compose.portainer.yml).
2. Set `BRUFIN_BIND_ADDRESS` to `0.0.0.0` for LAN access, or `127.0.0.1` if a reverse proxy runs on the Docker host. `BRUFIN_ALLOWED_ORIGINS` can usually stay at its default.
3. Deploy the stack. On first boot, BruFin automatically creates its API token and stores it in the `brufin-data` volume.
4. In **Containers → brufin → Console**, select `/bin/sh` and run `cat /data/api-token`. Copy this token into **Settings → Self-hosted server** in BruFin on each device.
5. Connect each device and choose whether to use its current data or the server copy.

The same token remains valid after container recreation or image upgrades because it lives in the persistent volume. To rotate it, set a new `BRUFIN_API_TOKEN` value in the stack environment and redeploy; then update the token in every connected client. Back up the database volume before removing the stack, and select the option to preserve volumes when Portainer asks.

To stop the service, run `docker compose down`. Data stays in `./data`. To create a SQLite backup, stop the service first and copy `data/brufin.sqlite3` plus any `data/brufin.sqlite3-wal`/`data/brufin.sqlite3-shm` files if present, or use SQLite's online backup API while it is running. Keep backups encrypted and private.

## Deploy the published image in Portainer

BruFin publishes a multi-architecture image to GitHub Container Registry (GHCR) from the `main` branch and version tags. After the first image is published, follow the Portainer quick start above and open `http://<homelab-host>:8080`.

The image is `ghcr.io/diamachi/brufin:latest`; version tags such as `ghcr.io/diamachi/brufin:v0.6` are available for controlled upgrades. Portainer creates a named `brufin-data` volume for SQLite, so replacing the container or pulling a newer image preserves data. Back up that volume before changing versions. Anonymous pulls require the GHCR package to be public; otherwise configure registry credentials in Portainer.

## Network access

The default port is 8080. Restrict access to your home network or VPN. For access away from home, use a private VPN such as Tailscale/WireGuard or place the service behind an HTTPS reverse proxy. Do not expose the API directly to the public internet over plain HTTP. When using a reverse proxy, set `BRUFIN_BIND_ADDRESS=127.0.0.1` and proxy to `127.0.0.1:8080`.

The API expects `Authorization: Bearer <BRUFIN_API_TOKEN>`. The token grants access to the personal finance database, so keep it private and rotate it if a device is lost. Browser and Android app settings store the server URL and token on that client. The current self-hosted mode uses a shared single-user token rather than individual user accounts.

## Sync behavior

BruFin keeps its local IndexedDB as an offline working copy. It uploads local edits when the server is reachable and downloads server changes when the app starts, comes online, returns to the foreground, or the user requests a sync. A server revision check prevents a stale device snapshot from silently overwriting newer server data. When concurrent edits require resolution, BruFin preserves both choices and asks which version to keep.

The first connection requires an explicit direction because an existing browser database and an empty server cannot be guessed safely. Back up the current app before connecting. For later devices, choose the server copy to populate the local cache.

## Troubleshooting

- `401`: check that the client token matches the value in `/data/api-token`, unless you supplied `BRUFIN_API_TOKEN` as an environment variable.
- Cannot connect: verify the host URL, port 8080, container health, firewall, and VPN/LAN route.
- Android cleartext error: use HTTPS or a VPN-provided HTTPS hostname. Android blocks many cleartext network requests by default.
- CORS error: add the Android origin shown in WebView logs to `BRUFIN_ALLOWED_ORIGINS`, then recreate the container.
- Data conflict: review the conflict choices in Settings. Keep a JSON backup before resolving if unsure.

This self-hosting mode is an early implementation. It should be backed up and exercised with non-critical/sample data before relying on it as the only copy.
