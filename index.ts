import * as redbird from 'redbird'
import * as http from 'http'
import * as url from 'url'
import * as fs from 'fs'
import * as ssh2 from 'ssh2'
import * as net from 'net'
import { config as dotenvConfig } from 'dotenv'
import { validateSsh, findFirstFreeNumber, generateSSHKey, copyFile } from './lib'
import { Proxy } from './types'
import { ParsedKey } from 'ssh2-streams'

const necessaryFiles = [
  {
    path: '.env',
    handler: copyFile('.env'),
    message: 'No dotenv found. Copied .env.example, but probably some values need to be changed',
  },
  {
    path: './ssh/authorized_keys',
    handler: copyFile('./ssh/authorized_keys'),
    message:
      "No authorized_keys file found. Copied authorized_keys.example, but noone will be able to access since it's empty",
  },
  {
    path: './ssh/ssh_host_rsa_key',
    handler: generateSSHKey,
    message: 'No ssh_host_rsa_key file found. Generated new ssh_host_rsa_key.',
  },
]

for (const file of necessaryFiles) {
  const exists = fs.existsSync(file.path)
  if (exists) continue
  file.handler()
  console.warn(file.message)
}

dotenvConfig()

const { WEBSERVER_PORT, PROXY_PORT, FIRST_PORT, DOMAIN, NODE_ENV, SSH_PASSPHRASE } = process.env

const AUTHORIZED_KEYS = fs
  .readFileSync(`./ssh/authorized_keys`)
  .toString()
  .split('\n')

const HOST_KEYS = fs.readFileSync('./ssh/ssh_host_rsa_key')

const authorizedKeys = AUTHORIZED_KEYS.reduce<ParsedKey[]>((acc, k) => {
  const parsed = ssh2.utils.parseKey(k)
  if (Object.keys(parsed).length === 0) return acc
  acc.push(parsed as ParsedKey)
  return acc
}, [])

const serverConfig = { hostKeys: [{ key: HOST_KEYS, passphrase: SSH_PASSPHRASE }] }

// Redbird will generate https certificates on the fly with LetsEncrypt
const registerConfig =
  NODE_ENV === 'production'
    ? { ssl: { letsencrypt: { email: 'luca.mattiazzi@accurat.it', production: true } } }
    : {}

class Server {
  proxies: Proxy[] = []
  reverseProxy: any
  sshServer: ssh2.Server

  constructor() {
    this.buildReverseProxy()
    this.allocateWebserver()
    this.startWebserver()
    this.startSSHServer()
  }

  buildReverseProxy = () => {
    this.reverseProxy = redbird({
      port: PROXY_PORT,
      letsencrypt: { path: __dirname + '/certs' },
      ssl: { port: 443 },
    })
  }

  allocateWebserver = () => {
    this.reverseProxy.register(DOMAIN, `http://localhost:${WEBSERVER_PORT}`, registerConfig)
  }

  startWebserver = () => {
    http.createServer(this.serverHandler).listen(WEBSERVER_PORT)
  }

  serverHandler = (req: http.IncomingMessage, res: http.ServerResponse) => {
    if (req.method === 'POST') return this.allocatePort(req, res)
    if (req.method === 'GET') return this.listActiveProxies(req, res)
    return res.end()
  }

  listActiveProxies = (req: http.IncomingMessage, res: http.ServerResponse) => {
    const activeProxies = this.proxies.map(p => ({
      port: p.port,
      domain: `${p.subdomain}.${DOMAIN}`,
    }))
    return res.end(JSON.stringify(activeProxies))
  }

  allocatePort = (req: http.IncomingMessage, res: http.ServerResponse) => {
    const { query } = url.parse(req.url, true)
    const { subdomain } = query as { subdomain: string | null }
    if (!subdomain) return res.end(JSON.stringify({ error: 'No subdomain' }))
    if (this.proxies.find(p => p.subdomain === subdomain))
      return res.end(JSON.stringify({ error: 'Subdomain already used' }))
    if (this.proxies.find(p => p.subdomain === '*'))
      return res.end(JSON.stringify({ error: 'Fuck you, ok?' }))
    const usedPorts = this.proxies.map(p => p.port)
    const port = findFirstFreeNumber(parseInt(FIRST_PORT), usedPorts)
    const resolver = this.reverseProxy.register(
      `${subdomain}.${DOMAIN}`,
      `http://localhost:${port}`,
      registerConfig,
    )

    const newProxy = { port, resolver, subdomain, tunnel: null }
    this.proxies.push(newProxy)
    res.end(JSON.stringify({ port }))
  }

  startSSHServer = () => {
    this.sshServer = new ssh2.Server(serverConfig, client => {
      client.on('authentication', ctx => validateSsh(ctx, authorizedKeys))
      client.on('session', accept => {
        const session = accept()
        session.on('shell', accept => accept())
      })
      client.on('error', err => console.error(err))
      client.on('request', (accept, reject, name, info) => {
        const { bindPort } = info
        if (name !== 'tcpip-forward') return reject()
        const existingProxy = this.proxies.find(p => p.port === bindPort)
        if (!existingProxy) return reject()
        accept()
        const server = net
          .createServer(socket => {
            socket.setEncoding('utf8')
            client.forwardOut(
              'localhost',
              bindPort,
              socket.remoteAddress,
              socket.remotePort,
              (err, upstream) => {
                if (err) console.error(err)
                upstream.pipe(socket).pipe(upstream)
              },
            )
          })
          .listen(bindPort)
        existingProxy.tunnel = server
        client.on('end', () => {
          server.close()
          this.reverseProxy.removeResolver(existingProxy.resolver)
          this.proxies = this.proxies.filter(p => p.port !== existingProxy.port)
        })
      })
    }).listen(2222, '0.0.0.0', function() {
      console.log('Listening on port ' + this.address().port)
    })
  }
}

const serverozzo = new Server()
