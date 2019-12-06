# SSH-Tuna

This Node application spawns an http server and an SSH Server in order to create a single hub where to receive http(s) requests and tunnel them to several different clients via SSH.
One can connect to the server using the `tunnelPort` function exported from the `client.ts` file, therefore installing this as a library with npm allows the connection to a running server.

## The Server

The server will first create a ssh folder and initialize it with a fresh `ssh_host_dsa` and `ssh_host_rsa`, and will generate and use a `authorized_keys` file with the same structure as the one in `~/.ssh/authorized_keys`. This will be the only way to authenticate to the ssh server, so be sure to copy the allowed keys here, otherwise no one will be able to connect.

Then the SSH server will start on a port (default: `2222`) different from the usual ssh one, and with a different rsa_key signature. Remeber to allow it to be seen from the network if you are using a firewall like ufw.

The http server will only handle 2 kind of requests on the main domain:

- POST: will allocate a subdomain for an incoming SSH connection. The query param `subdomain` is necessary to allocate a subdomain.

- GET: will return a list of currently open tunnels.

Also, an instance of redbird will run as reverse proxy, to dispatch every request to the correct tunnel. Once a subdomain is allocated, a port is reserved and if the ssh connection arrives before 5 seconds, the proxy is kept alive until the tunnel is open.

## The Client

The client will first reserve a subdomain, then open the reverse tunnel to the server.

## TODO

- Use a shared secret to be sure that the same origin reserves the subdomain and creates the tunnel

- Tests
