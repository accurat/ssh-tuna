import * as got from 'got'
import { createClient } from './reverse-tunnel'
import { createServer } from 'http'

const {
  USER,
  SSH_AUTH_SOCK,
  SUBDOMAIN = 'maronn',
  SERVER_PORT = 2005,
  TUNNEL_DOMAIN = 'internal.accurat.io',
  SSH_PORT = 2222,
  ONLY_TUNNEL,
} = process.env

const protocol = TUNNEL_DOMAIN === 'localhost' ? 'http' : 'https'

export function tunnelPort(localPort: number, subdomain: string) {
  return got
    .post(`${protocol}://${TUNNEL_DOMAIN}?subdomain=${subdomain}`, { json: true })
    .then(res => {
      const { port, error } = res.body
      if (error) throw error
      return port
    })
    .then(dstPort => {
      return new Promise<string>((resolve, reject) => {
        return createClient(
          {
            host: TUNNEL_DOMAIN,
            port: Number(SSH_PORT),
            dstHost: 'localhost',
            dstPort: dstPort,
            srcHost: 'localhost',
            srcPort: localPort,
            keepAlive: true,
            agent: SSH_AUTH_SOCK,
            username: USER,
          },
          () => resolve(`${protocol}://${subdomain}.${TUNNEL_DOMAIN}`),
        )
      })
    })
}

if (ONLY_TUNNEL) {
  tunnelPort(Number(SERVER_PORT), SUBDOMAIN).then(url => {
    console.log(`Also mirrored on ${url}`)
  })
} else {
  createServer((req, res) => {
    res.statusCode = 200
    res.end(`Maronn, everything works here at ${SUBDOMAIN}!`)
  }).listen(SERVER_PORT, () => {
    console.log(`Server running on ${SERVER_PORT}`)
    tunnelPort(Number(SERVER_PORT), SUBDOMAIN).then(url => {
      console.log(`Also mirrored on ${url}`)
    })
  })
}
