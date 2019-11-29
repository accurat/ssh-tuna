import * as got from 'got'
import { createClient } from './reverse-tunnel'
import { createServer } from 'http'

const {
  USER,
  SSH_AUTH_SOCK,
  SERVER_PORT = 2005,
  TUNNEL_DOMAIN = 'internal.accurat.io',
} = process.env

export function tunnelPort(localPort: number, subdomain: string) {
  return got
    .post(`https://${TUNNEL_DOMAIN}?subdomain=${subdomain}`, { json: true })
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
            port: 2222,
            dstHost: 'localhost',
            dstPort: dstPort,
            srcHost: 'localhost',
            srcPort: localPort,
            keepAlive: true,
            agent: SSH_AUTH_SOCK,
            username: USER,
          },
          () => resolve(`https://${subdomain}.${TUNNEL_DOMAIN}`),
        )
      })
    })
}

createServer((req, res) => {
  res.statusCode = 200
  res.end('Maronn, everything works!')
}).listen(SERVER_PORT, () => {
  console.log(`Server running on ${SERVER_PORT}`)
  tunnelPort(Number(SERVER_PORT), 'maronn').then(url => {
    console.log(`Also mirrored on ${url}`)
  })
})
