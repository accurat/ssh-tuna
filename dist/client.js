"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_fetch_1 = require("node-fetch");
const reverse_tunnel_1 = require("./reverse-tunnel");
const http_1 = require("http");
const { USER, SSH_AUTH_SOCK } = process.env;
function tunnelPort(localPort, subdomain, tunnelDomain, sshPort) {
    if (localPort === undefined)
        throw new Error('No port given');
    if (subdomain === undefined)
        throw new Error('No subdomain given');
    const protocol = tunnelDomain === 'localhost' ? 'http' : 'https';
    const url = `${protocol}://${tunnelDomain}?subdomain=${subdomain}`;
    return node_fetch_1.default(url, { method: 'post' })
        .then(res => res.json())
        .then(res => {
        const { port, error } = res;
        if (error)
            throw error;
        return port;
    })
        .then(dstPort => {
        const promise = new Promise((resolve, reject) => {
            const client = reverse_tunnel_1.createClient({
                host: tunnelDomain,
                port: Number(sshPort),
                dstHost: 'localhost',
                dstPort: dstPort,
                srcHost: 'localhost',
                srcPort: localPort,
                keepAlive: true,
                agent: SSH_AUTH_SOCK,
                username: USER,
            }, resolve, reject);
            return client;
        });
        return promise;
    });
}
exports.tunnelPort = tunnelPort;
const { SUBDOMAIN = 'maronn', SERVER_PORT = 2005, TUNNEL_DOMAIN = 'internal.accurat.io', SSH_PORT = 2222, ONLY_TUNNEL = null, } = process.env;
function run() {
    tunnelPort(Number(SERVER_PORT), SUBDOMAIN, TUNNEL_DOMAIN, Number(SSH_PORT))
        .then(client => {
        const protocol = TUNNEL_DOMAIN === 'localhost' ? 'http' : 'https';
        const url = `${protocol}://${SUBDOMAIN}.${TUNNEL_DOMAIN}`;
        console.log(`Tunnel opened between port ${SERVER_PORT} and ${url}`);
    })
        .catch(err => {
        console.error('err', err.message);
    });
    if (ONLY_TUNNEL)
        return;
    http_1.createServer((req, res) => {
        res.statusCode = 200;
        res.end(`Maronn, everything works here at ${SUBDOMAIN}!`);
    }).listen(SERVER_PORT, () => {
        console.log(`HTTP Server running on ${SERVER_PORT}`);
    });
}
if (require.main === module)
    run();
