# Host BruFin with Portainer

This guide runs BruFin on a home server using Portainer. The server hosts the web dashboard and SQLite database; the Android app can connect to the same server and sync with it.

## Before you start

- A homelab machine with Docker and Portainer.
- The BruFin image published to GHCR by this repository's Docker workflow. Until the image is published, build the Docker Compose setup from source using [SELF_HOSTING.md](SELF_HOSTING.md).
- Port `8080` available on your LAN, or a reverse proxy/VPN for remote access.

## Deploy the stack

1. In Portainer, open **Stacks → Add stack**.
2. Give it a name such as `brufin`.
3. Open [`docker-compose.portainer.yml`](docker-compose.portainer.yml), copy its full contents, and paste them into the Stack **Web editor**.
4. Under **Environment variables**, add `BRUFIN_BIND_ADDRESS` with value `0.0.0.0` for LAN access. If a reverse proxy on the Docker host will be the only entry point, use `127.0.0.1` instead.
5. Select **Deploy the stack**. No API key needs to be created or pasted into Portainer.

The first start generates a random API token and saves it in the persistent `brufin-data` volume. The volume also stores the SQLite database, so it survives container replacement and image upgrades.

## Get the API token

1. In Portainer, open **Containers → brufin → Console**.
2. Select `/bin/sh`, connect, and run:

   ```sh
   cat /data/api-token
   ```

3. Copy the token. Treat it like a password: it grants access to the BruFin database.

## Open BruFin and connect devices

Open `http://<homelab-ip>:8080` in a browser. In BruFin, go to **Settings → Self-hosted server**, enter that server URL and the token, then choose whether to use the current device's data or the server copy. Repeat on each browser or Android app you want to sync.

Each connected device keeps a local working copy. Edits sync when the server is reachable; offline edits stay on the device and retry when it reconnects. If two devices change the same record, BruFin asks you to choose which copy to keep.

For access beyond your home network, use a VPN or HTTPS reverse proxy. Avoid exposing the server directly to the internet over plain HTTP. Android may also require HTTPS for network connections depending on the URL and device configuration.

## Update and back up

In Portainer, open the stack and redeploy/pull the newer image. Pin a version tag instead of `latest` if you want to control upgrades. Do not remove the `brufin-data` volume when recreating the stack.

Back up the `brufin-data` volume regularly. It contains both the database and the API token. If that volume is lost, connected devices still have local copies, but you will need to reconnect them to a newly initialized server.

To rotate the API token, set a new `BRUFIN_API_TOKEN` environment variable for the container and redeploy, then update the token on every connected device. Keep the old database volume in place.
