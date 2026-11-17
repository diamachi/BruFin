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

Open `http://<homelab-host>:8780` using the host's LAN/VPN address (not `localhost`), or replace `8780` with the port configured in `BRUFIN_HTTP_PORT`. At startup, choose **Use my server with seamless sync**, then select **Set up this server** in the server-hosted browser. This claims the fresh empty server once and connects without requiring a token lookup. BruFin then opens Settings, where you can choose **Show QR to pair a phone**. On Android, choose **Use my server with seamless sync → Scan server QR**, scan the code, and choose **Use server data**. Pairing codes expire after five minutes and work once; the QR does not contain the long-lived API token.

This automatic claim is intended only for a private homelab LAN or VPN: anyone who can reach the fresh, unclaimed server can claim it first. Do not expose it publicly during setup. Set `BRUFIN_ALLOW_FIRST_RUN_PAIRING=false` in `.env` or the Portainer stack environment to disable automatic claiming and require the token fallback. The generated token can still be retrieved with the command below.

To retrieve the generated token for the browser or Android client:

```sh
docker compose exec brufin cat /data/api-token
```

## Portainer quick start

1. Open **Stacks → Add stack → Web editor** in Portainer and paste [`docker-compose.portainer.yml`](docker-compose.portainer.yml).
2. Set `BRUFIN_BIND_ADDRESS` to `0.0.0.0` for LAN access, or to `127.0.0.1` if only a reverse proxy on the Docker host should reach BruFin. Set `BRUFIN_HTTP_PORT` to an available host port; the default is `8780`. `BRUFIN_ALLOWED_ORIGINS` can usually stay at its default.
3. Deploy the stack. On first boot, BruFin automatically creates its API token and stores it in the `brufin-data` volume; first-run claiming is enabled by default for this private homelab setup.
4. Open BruFin at `http://<homelab-ip>:8780` (or the configured host port), choose **Use my server with seamless sync**, and select **Set up this server**. The browser claims and connects the empty server; then Settings opens with the QR pairing action.
5. On Android, select **Use my server with seamless sync → Scan server QR**, then choose **Use server data**. For manual setup or if automatic claiming is disabled, get the token in the container console with `cat /data/api-token`.

The same token remains valid after container recreation or image upgrades because it lives in the persistent volume. To rotate it, set a new `BRUFIN_API_TOKEN` value in the stack environment and redeploy; then update the token in every connected client. Back up the database volume before removing the stack, and select the option to preserve volumes when Portainer asks.

To stop the service, run `docker compose down`. Data stays in `./data`. To create a SQLite backup, stop the service first and copy `data/brufin.sqlite3` plus any `data/brufin.sqlite3-wal`/`data/brufin.sqlite3-shm` files if present, or use SQLite's online backup API while it is running. Keep backups encrypted and private.

## Deploy the Docker Hub image in Portainer

Follow the Portainer steps in [HOSTING.md](HOSTING.md) and use `diamachi/brufin:v0.6` for this release. Portainer creates a named `brufin-data` volume for SQLite, so replacing the container or pulling a newer image preserves data. Back up that volume before changing versions. If the Docker Hub image is private, configure Docker Hub credentials in Portainer's registry settings.

## Network access

The default host port is `8780` and the container listens internally on `8080`. Set `BRUFIN_HTTP_PORT` to choose another host port. Restrict access to your home network or VPN. For access away from home, use a private VPN such as Tailscale/WireGuard or place the service behind an HTTPS reverse proxy. Do not expose the API directly to the public internet over plain HTTP. When using a reverse proxy, set `BRUFIN_BIND_ADDRESS=127.0.0.1` and proxy to `127.0.0.1:8780` (or the configured host port).

The API expects `Authorization: Bearer <BRUFIN_API_TOKEN>`. The token grants access to the personal finance database, so keep it private and rotate it if a device is lost. Browser and Android app settings store the server URL and token on that client. The current self-hosted mode uses a shared single-user token rather than individual user accounts.

## Sync behavior

BruFin keeps its local IndexedDB as an offline working copy. It uploads local edits when the server is reachable and downloads server changes when the app starts, comes online, returns to the foreground, or the user requests a sync. A server revision check prevents a stale device snapshot from silently overwriting newer server data. When concurrent edits require resolution, BruFin preserves both choices and asks which version to keep.

The first connection requires an explicit direction because an existing browser database and an empty server cannot be guessed safely. Back up the current app before connecting. For later devices, choose the server copy to populate the local cache.

## Troubleshooting

- `401`: check that the client token matches the value in `/data/api-token`, unless you supplied `BRUFIN_API_TOKEN` as an environment variable.
- Cannot connect: verify the host URL and configured host port (default `8780`), container health, firewall, and VPN/LAN route.
- Android cleartext error: use HTTPS or a VPN-provided HTTPS hostname. Android blocks many cleartext network requests by default.
- CORS error: add the Android origin shown in WebView logs to `BRUFIN_ALLOWED_ORIGINS`, then recreate the container.
- Data conflict: review the conflict choices in Settings. Keep a JSON backup before resolving if unsure.

This self-hosting mode is an early implementation. It should be backed up and exercised with non-critical/sample data before relying on it as the only copy.
