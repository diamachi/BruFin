# Host BruFin with Portainer

This guide runs BruFin on a home server using Portainer. The server hosts the web dashboard and SQLite database; the Android app can connect to the same server and sync with it.

## Before you start

- A homelab machine with Docker and Portainer.
- Docker access to pull `diamachi/brufin:v0.6` from Docker Hub. For a private image, sign Portainer into Docker Hub first.
- Port `8080` available on your LAN, or a reverse proxy/VPN for remote access.

## Deploy the stack

1. In Portainer, open **Stacks → Add stack**.
2. Give it a name such as `brufin`.
3. Open [`docker-compose.portainer.yml`](docker-compose.portainer.yml), copy its full contents, and paste them into the Stack **Web editor**.
4. Under **Environment variables**, set `BRUFIN_IMAGE` to `diamachi/brufin:testing`. Set `BRUFIN_BIND_ADDRESS` to `0.0.0.0` for LAN access. If a reverse proxy on the Docker host will be the only entry point, use `127.0.0.1` instead.
5. Select **Deploy the stack**. No API key needs to be created or pasted into Portainer.

The first start generates a random API token and saves it in the persistent `brufin-data` volume. The volume also stores the SQLite database, so it survives container replacement and image upgrades. The `v0.6` tag pins this release; update the `BRUFIN_IMAGE` stack variable when you want to upgrade.

## Get the API token

1. In Portainer, open **Containers → brufin → Console**.
2. Select `/bin/sh`, connect, and run:

   ```sh
   cat /data/api-token
   ```

3. Copy the token. Treat it like a password: it grants access to the BruFin database.

## Open BruFin and connect devices

Open `http://<homelab-ip>:8080` in a browser using its LAN/VPN address. At startup choose **Use my server with seamless sync**, then select **Set up this server** in the server-hosted page. This one-time claim connects the dashboard without looking up the token. It is available only while the database is empty and before anyone claims setup. After connecting, BruFin opens Settings; choose **Show QR to pair a phone**. On Android, choose **Use my server with seamless sync → Scan server QR**, scan the code, and choose **Use server data**. Pairing codes expire after five minutes and can be used once; the QR does not contain the long-lived API token.

Automatic first-run setup is intended for a private homelab LAN or VPN. Anyone who can reach an unclaimed, empty server can claim it first. Do not expose the server publicly during setup; set `BRUFIN_ALLOW_FIRST_RUN_PAIRING=false` to require manual token setup instead. The token remains available in the Portainer console (`cat /data/api-token`) as a fallback. Open the server page with its LAN/VPN address, not `localhost`, so the phone can reach the address in the QR.

Each connected device keeps a local working copy. Edits sync when the server is reachable; offline edits stay on the device and retry when it reconnects. If two devices change the same record, BruFin asks you to choose which copy to keep.

For access beyond your home network, use a VPN or HTTPS reverse proxy. Avoid exposing the server directly to the internet over plain HTTP. Android may also require HTTPS for network connections depending on the URL and device configuration.

## Update and back up

In Portainer, open the stack and redeploy/pull the newer image. Set `BRUFIN_IMAGE` to a version tag when you want to control upgrades. Do not remove the `brufin-data` volume when recreating the stack.

Back up the `brufin-data` volume regularly. It contains both the database and the API token. If that volume is lost, connected devices still have local copies, but you will need to reconnect them to a newly initialized server.

To rotate the API token, set a new `BRUFIN_API_TOKEN` environment variable for the container and redeploy, then update the token on every connected device. Keep the old database volume in place.
