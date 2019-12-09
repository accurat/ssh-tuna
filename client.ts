import fetch from 'node-fetch'
import { createClient, ClientController } from './reverse-tunnel'
import { createServer } from 'http'

const { USER, SSH_AUTH_SOCK } = process.env

export function tunnelPort(
  localPort: number,
  subdomain: string,
  tunnelDomain: string,
  sshPort: number,
): Promise<ClientController> {
  if (localPort === undefined) throw new Error('No port given')
  if (subdomain === undefined) throw new Error('No subdomain given')
  const protocol = tunnelDomain === 'localhost' ? 'http' : 'https'
  const url = `${protocol}://${tunnelDomain}?subdomain=${subdomain}`
  return fetch(url, { method: 'post' })
    .then(res => res.json())
    .then(res => {
      const { port, error } = res
      if (error) throw error
      return port
    })
    .then(dstPort => {
      const client = createClient({
        host: tunnelDomain,
        port: Number(sshPort),
        dstHost: 'localhost',
        dstPort: dstPort,
        srcHost: 'localhost',
        srcPort: localPort,
        keepAlive: true,
        agent: SSH_AUTH_SOCK,
        username: USER,
      })
      return client
    })
}

const {
  SUBDOMAIN = 'maronn',
  SERVER_PORT = 2005,
  TUNNEL_DOMAIN = 'internal.accurat.io',
  SSH_PORT = 2222,
  ONLY_TUNNEL = null,
} = process.env

function run() {
  tunnelPort(Number(SERVER_PORT), SUBDOMAIN, TUNNEL_DOMAIN, Number(SSH_PORT)).then(client => {
    const protocol = TUNNEL_DOMAIN === 'localhost' ? 'http' : 'https'
    const url = `${protocol}://${SUBDOMAIN}.${TUNNEL_DOMAIN}`
    console.log(`Tunnel opened between port ${SERVER_PORT} and ${url}`)
  })
  if (ONLY_TUNNEL) return
  createServer((req, res) => {
    res.statusCode = 200
    res.end(`Maronn, everything works here at ${SUBDOMAIN}!`)
  }).listen(SERVER_PORT, () => {
    console.log(`Server running on ${SERVER_PORT}`)
  })
}

if (require.main === module) run()
