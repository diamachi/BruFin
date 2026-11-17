# BruFin self-hosting

BruFin can run as a private web dashboard and API on your homelab. The server stores shared data in SQLite; the Android app and browser each keep a local working copy and sync through the API. Standalone mode still works without a server.

This guide covers both Docker Compose from source and the prebuilt Docker Hub image in Portainer.

## Choose where BruFin runs

| Setup | Image/source | Persistent storage |
| --- | --- | --- |
| Docker Compose on a Mac or Linux host | Build from this repository | `./data/` beside `docker-compose.yml` |
| Portainer on a homelab | `diamachi/brufin:v0.6.1` | Named Docker volume `brufin-data` |

In both setups, the container listens internally on port `8080` and publishes host port `8780` by default. You can choose another host port with `BRUFIN_HTTP_PORT`.

## Docker Compose from source

Requirements: Docker with the Compose plugin, and this repository checked out locally.

```sh
cp .env.example .env
mkdir -p data
chmod 700 data
docker compose up -d --build
```

The server creates a random API token on first start and stores it in `./data/api-token`. Keep the `data` directory private. If you prefer to set your own token, put a random value of at least 32 characters in `BRUFIN_API_TOKEN` in `.env` (for example, generate one with `openssl rand -hex 32`).

Open `http://<homelab-host>:8780` with the host's LAN or VPN address, not `localhost`. If the port is already used, set `BRUFIN_HTTP_PORT=8781` (or another free port) in `.env`, then recreate the service:

```sh
docker compose up -d
```

## Portainer with the Docker Hub image

Requirements: a homelab machine with Docker and Portainer, and host port `8780` available. If you use a private Docker Hub image, configure its registry credentials in Portainer first.

1. In Portainer, open **Stacks → Add stack** and name the stack `brufin`.
2. Open [`docker-compose.portainer.yml`](docker-compose.portainer.yml), copy its contents, and paste them into the Stack **Web editor**.
3. Under **Environment variables**, use these values (they are also the defaults in the Compose file):

   | Variable | Value | Purpose |
   | --- | --- | --- |
   | `BRUFIN_IMAGE` | `diamachi/brufin:v0.6.1` | Pin the BruFin image version |
   | `BRUFIN_BIND_ADDRESS` | `0.0.0.0` | Allow access from your LAN/VPN |
   | `BRUFIN_HTTP_PORT` | `8780` | Host port to open in the browser and app |
   | `BRUFIN_ALLOW_FIRST_RUN_PAIRING` | `true` | Enable one-time fresh-server setup |

   If only a reverse proxy on the Docker host should reach BruFin, set `BRUFIN_BIND_ADDRESS` to `127.0.0.1` instead. Set `BRUFIN_HTTP_PORT` to another unused port if `8780` is already taken.
4. Choose **Deploy the stack**. The API token is created automatically and saved with the SQLite database in the persistent `brufin-data` volume. There is no need to create or paste an API token in Portainer for normal first-time setup.

Open `http://<homelab-ip>:8780` (or your chosen host port) using the homelab's LAN/VPN address. At startup, select **Use my server with seamless sync**, then **Set up this server**. This claims the empty server once and connects the dashboard. BruFin opens Settings; choose **Show QR to pair a phone**. On Android, select **Use my server with seamless sync → Scan server QR**, scan the code, and choose **Use server data**. The QR code is short-lived, single-use, and does not contain the permanent API token.

Automatic setup is intended for a private homelab LAN or VPN. Anyone who can reach an empty, unclaimed server could claim it first. Do not expose it publicly during setup. Set `BRUFIN_ALLOW_FIRST_RUN_PAIRING=false` to disable automatic claiming and use the manual token fallback.

## Connect another client

In the BruFin app, choose **Use my server with seamless sync** and scan the QR displayed by the connected server dashboard. The phone keeps a local working copy and syncs when the server is reachable; offline edits are queued and retried. If two clients change the same record, BruFin asks which version to keep.

For manual setup, retrieve the generated token from Docker Compose:

```sh
docker compose exec brufin cat /data/api-token
```

In Portainer, open **Containers → brufin → Console**, select `/bin/sh`, and run:

```sh
cat /data/api-token
```

Treat the token like a password because it grants access to the finance database. The server uses one shared token for this single-user setup. Browser and Android clients store their server URL and token locally.

## Update and back up

For Portainer, change `BRUFIN_IMAGE` to the new version tag, then pull and redeploy the stack. Keep the `brufin-data` volume when replacing the container; removing the container does not require removing its volume.

For Compose from source, pull the source updates and run `docker compose up -d --build`. Keep the `./data` directory. To stop the local server without deleting its data, run `docker compose down`; do not add `-v` if you want to preserve named volumes.

Back up the database regularly. For a running server, use SQLite's online backup API or stop the service and copy the database and any `-wal`/`-shm` files together. Compose-from-source stores them in `./data/`; Portainer stores them in `brufin-data`. The API token is in the same persistent storage. Keep backups private and encrypted.

To rotate the token, set a new `BRUFIN_API_TOKEN` value in the container environment and redeploy, then reconnect each client with the new token. Preserve the existing database volume.

## Network and security

Port `8780` is the published host port by default; the container's internal port remains `8080`. For another host port, set `BRUFIN_HTTP_PORT`. Restrict access to your home network or VPN. For access away from home, use a private VPN such as Tailscale or WireGuard, or put the service behind an HTTPS reverse proxy. Do not expose the API directly to the public internet over plain HTTP. With a reverse proxy on the Docker host, bind to `127.0.0.1` and proxy to `127.0.0.1:8780` (or the host port you configured).

The Android app blocks HTTP by default. To pair with an HTTP server on your trusted home LAN or VPN, enable **Allow HTTP for trusted LAN/VPN** on the server setup screen or under **Settings → Self-hosted server**. HTTP does not encrypt the access token or finance data, so keep this off on public Wi-Fi and use HTTPS for remote access.

## Sync behavior

BruFin uses local IndexedDB as an offline working copy. It sends local edits when the server is available and checks for server changes at startup, when the app returns to the foreground or network, and when you request a sync. Revision checks prevent a stale device snapshot from silently overwriting newer server data. Same-record conflicts are shown for review.

On first connection, BruFin asks which data copy to use because it cannot safely assume whether an existing local database or the server should win. Back up the current app before connecting. For later devices, choose the server copy to populate the local cache.

## Troubleshooting

- **401:** Confirm that the client token matches `/data/api-token`, unless you configured `BRUFIN_API_TOKEN` yourself.
- **Cannot connect:** Check the host URL and port (default `8780`), container health, firewall, and LAN/VPN route.
- **Android cleartext error:** Enable **Allow HTTP for trusted LAN/VPN** only when connecting on a network you trust, or use HTTPS/a VPN-provided HTTPS hostname.
- **CORS error:** Add the Android origin shown in WebView logs to `BRUFIN_ALLOWED_ORIGINS`, then recreate the container.
- **Data conflict:** Review the choices in Settings. Export a JSON backup first if you are unsure.

Use backups and sample data while evaluating self-hosted sync before making the server your only copy.
