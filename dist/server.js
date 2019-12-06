"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const redbird = require("redbird");
const http = require("http");
const url = require("url");
const fs = require("fs");
const ssh2 = require("ssh2");
const net = require("net");
const dotenv_1 = require("dotenv");
const lib_1 = require("./lib");
const MAX_WAIT_FOR_PROXY = 5000;
const necessaryFiles = [
    {
        path: '.env',
        handler: lib_1.copyFile('.env'),
        message: 'No dotenv found. Copied .env.example, but probably some values need to be changed',
    },
    {
        path: './ssh/authorized_keys',
        handler: lib_1.copyFile('./ssh/authorized_keys'),
        message: "No authorized_keys file found. Copied authorized_keys.example, but noone will be able to access since it's empty",
    },
    {
        path: './ssh/ssh_host_rsa_key',
        handler: lib_1.generateSSHKey,
        message: 'No ssh_host_rsa_key file found. Generated new ssh_host_rsa_key.',
    },
];
for (const file of necessaryFiles) {
    const exists = fs.existsSync(file.path);
    if (exists)
        continue;
    file.handler();
    console.warn(file.message);
}
dotenv_1.config();
const { WEBSERVER_PORT, PROXY_PORT, FIRST_PORT, DOMAIN, NODE_ENV, SSH_PASSPHRASE, SSH_PORT, } = process.env;
const AUTHORIZED_KEYS = fs
    .readFileSync(`./ssh/authorized_keys`)
    .toString()
    .split('\n');
const HOST_KEYS = fs.readFileSync('./ssh/ssh_host_rsa_key');
const authorizedKeys = AUTHORIZED_KEYS.reduce((acc, k) => {
    const parsed = ssh2.utils.parseKey(k);
    if (Object.keys(parsed).length === 0)
        return acc;
    acc.push(parsed);
    return acc;
}, []);
const serverConfig = { hostKeys: [{ key: HOST_KEYS, passphrase: SSH_PASSPHRASE }] };
const registerConfig = NODE_ENV === 'production'
    ? { ssl: { letsencrypt: { email: 'luca.mattiazzi@accurat.it', production: true } } }
    : {};
class Server {
    constructor() {
        this.proxies = [];
        this.start = () => {
            this.buildReverseProxy();
            this.allocateWebserver();
            this.startWebserver();
            this.startSSHServer();
        };
        this.buildReverseProxy = () => {
            this.reverseProxy = redbird({
                port: PROXY_PORT,
                letsencrypt: { path: __dirname + '/certs' },
                ssl: { port: 443 },
                bunyan: false,
            });
        };
        this.allocateWebserver = () => {
            this.reverseProxy.register(DOMAIN, `http://localhost:${WEBSERVER_PORT}`, registerConfig);
        };
        this.startWebserver = () => {
            http.createServer(this.serverHandler).listen(WEBSERVER_PORT);
        };
        this.serverHandler = (req, res) => {
            if (req.method === 'POST')
                return this.allocatePort(req, res);
            if (req.method === 'GET')
                return this.listActiveProxies(req, res);
            return res.end();
        };
        this.listActiveProxies = (req, res) => {
            const activeProxies = this.proxies.map(p => ({
                port: p.port,
                domain: `${p.subdomain}.${DOMAIN}`,
            }));
            return res.end(JSON.stringify(activeProxies));
        };
        this.errorRequest = (res, error) => {
            console.log('error', error);
            return res.end(JSON.stringify({ error }));
        };
        this.allocatePort = (req, res) => {
            const { query } = url.parse(req.url, true);
            const { subdomain } = query;
            if (!subdomain)
                return this.errorRequest(res, 'No subdomain');
            if (this.proxies.find(p => p.subdomain === subdomain))
                return this.errorRequest(res, `Subdomain ${subdomain} already used`);
            if (this.proxies.find(p => p.subdomain === '*'))
                return this.errorRequest(res, 'Fuck you, ok?');
            const usedPorts = this.proxies.map(p => p.port);
            const port = lib_1.findFirstFreeNumber(parseInt(FIRST_PORT), usedPorts);
            console.log(`Allocating port ${port} to ${subdomain}`);
            const resolver = this.reverseProxy.register(`${subdomain}.${DOMAIN}`, `http://localhost:${port}`, registerConfig);
            const newProxy = { port, resolver, subdomain, tunnel: null, timeout: null };
            const timeout = setTimeout(() => this.killProxy(newProxy), MAX_WAIT_FOR_PROXY);
            newProxy.timeout = timeout;
            this.proxies.push(newProxy);
            res.end(JSON.stringify({ port }));
        };
        this.killProxy = (proxy) => {
            console.log(`Killing proxy ${proxy.subdomain}`);
            this.reverseProxy.removeResolver(proxy.resolver);
            this.proxies = this.proxies.filter(p => p.port !== proxy.port);
        };
        this.startSSHServer = () => {
            this.sshServer = new ssh2.Server(serverConfig, client => {
                client.on('authentication', ctx => lib_1.validateSsh(ctx, authorizedKeys));
                client.on('session', accept => {
                    const session = accept();
                    session.on('shell', accept => accept());
                });
                client.on('error', err => console.error(err));
                client.on('request', (accept, reject, name, info) => {
                    const { bindPort } = info;
                    if (name !== 'tcpip-forward')
                        return reject();
                    const existingProxy = this.proxies.find(p => p.port === bindPort);
                    if (!existingProxy)
                        return reject();
                    console.log(`Proxy ${existingProxy.subdomain} opened tunnel!`);
                    accept();
                    clearTimeout(existingProxy.timeout);
                    const server = net
                        .createServer(socket => {
                        socket.setEncoding('utf8');
                        client.forwardOut('localhost', bindPort, socket.remoteAddress, socket.remotePort, (err, upstream) => {
                            if (err)
                                console.error(err);
                            upstream.pipe(socket).pipe(upstream);
                        });
                    })
                        .listen(bindPort);
                    existingProxy.tunnel = server;
                    client.on('end', () => {
                        server.close();
                        this.killProxy(existingProxy);
                    });
                    client.on('close', () => {
                        server.close();
                        this.killProxy(existingProxy);
                    });
                    client.on('error', () => {
                        server.close();
                        this.killProxy(existingProxy);
                    });
                });
            }).listen(Number(SSH_PORT), '0.0.0.0', function () {
                console.log('Listening on port ' + this.address().port);
            });
        };
    }
}
const serverozzo = new Server();
serverozzo.start();
