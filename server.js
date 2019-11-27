const http = require('http')
const url = require('url')
const redbird = require('redbird')
const fs = require('fs')
const ssh2 = require('ssh2')
const net = require('net')
const os = require('os')
const { validateSsh, findFirstFreeNumber } = require('./lib')

const AUTHORIZED_KEYS = process.env.AUTHORIZED_KEYS || `${os.homedir()}/.ssh/authorized_keys`
const HOST_KEYS = process.env.HOST_KEYS || '/etc/ssh/ssh_host_rsa_key'
const LISTENING_PORT = process.env.LISTENING_PORT || 4000
const PROXY_PORT = process.env.PROXY_PORT || 80
const FIRST_PORT = process.env.FIRST_PORT || 10888
const DOMAIN = process.env.DOMAIN || 'localhost'
const HTTPS = process.env.HTTPS || false

// This is the reverse proxy, will allocate subdomains to different requests
const reverseProxy = redbird({
  port: PROXY_PORT,
  letsencrypt: { path: __dirname + '/certs' },
  ssl: { port: 443 },
})

const authorizedKeys = ssh2.utils.parseKey(fs.readFileSync(AUTHORIZED_KEYS))
const serverConfig = { hostKeys: [fs.readFileSync(HOST_KEYS)] }
let proxies = []

// Redbird will generate https certificates on the fly with LetsEncrypt
const registerConfig = HTTPS
  ? { ssl: { letsencrypt: { email: 'luca.mattiazzi@accurat.it', production: true } } }
  : {}

function register(domain, port) {
  return reverseProxy.register(domain, `http://localhost:${port}`, registerConfig)
}

// This is the url where a port can be allocated upon request
register(DOMAIN, LISTENING_PORT)

function requestsHandler(req, res) {
  // I'm really optimistic!
  res.statusCode = 200
  res.setHeader('Content-Type', 'application/json')

  const queryData = url.parse(req.url, true).query
  const { subdomain } = queryData
  if (!subdomain) return res.end(JSON.stringify({ error: 'No subdomain' }))
  if (proxies.find(p => p.subdomain === subdomain))
    return res.end(JSON.stringify({ error: 'Subdomain already used' }))
  if (proxies.find(p => p.subdomain === '*'))
    return res.end(JSON.stringify({ error: 'Fuck you, ok?' }))
  const usedPorts = proxies.map(p => p.port)
  const port = findFirstFreeNumber(FIRST_PORT, usedPorts)
  const resolver = register(`${subdomain}.${DOMAIN}`, port)

  // Creates a new proxy
  const newProxy = { port, resolver, subdomain }
  proxies.push(newProxy)
  res.end(JSON.stringify({ port }))
}

new ssh2.Server(serverConfig, client => {
  client.on('authentication', ctx => validateSsh(ctx, authorizedKeys))
  client.on('session', accept => {
    const session = accept()
    session.on('shell', accept => accept())
  })
  client.on('error', err => console.error(err))
  client.on('request', (accept, reject, name, info) => {
    if (name !== 'tcpip-forward') return reject()
    const existingProxy = proxies.find(p => p.port === info.bindPort)
    if (!existingProxy) return reject()
    accept()
    const server = net
      .createServer(socket => {
        socket.setEncoding('utf8')
        client.forwardOut(
          'localhost',
          info.bindPort,
          socket.remoteAddress,
          socket.remotePort,
          (err, upstream) => {
            if (err) console.error(err)
            upstream.pipe(socket).pipe(upstream)
          },
        )
      })
      .listen(info.bindPort)
    existingProxy.tunnel = server
    client.on('end', () => {
      reverseProxy.removeResolver(existingProxy.resolver)
      proxies = proxies.filter(p => p.port !== existingProxy.port)
    })
  })
}).listen(2222, '0.0.0.0', function() {
  console.log('Listening on port ' + this.address().port)
})

http.createServer(requestsHandler).listen(LISTENING_PORT)
