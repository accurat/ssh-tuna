import * as got from 'got'
import * as tunnel from 'reverse-tunnel-ssh'
import * as fs from 'fs'
import * as os from 'os'
import { config as dotenvConfig } from 'dotenv'

dotenvConfig()
const { DOMAIN, SSH_PORT, NODE_ENV } = process.env

const protocol = NODE_ENV === 'production' ? 'https' : 'http'

function tunnelPort(localPort, subdomain) {
  return got
    .post(`${protocol}://${DOMAIN}?subdomain=${subdomain}`, { json: true })
    .then(res => {
      const { port, error } = res.body
      if (error) throw error
      return port
    })
    .then(dstPort => {
      const connection = tunnel(
        {
          host: `${DOMAIN}`,
          port: SSH_PORT,
          dstHost: 'localhost',
          dstPort: dstPort,
          srcHost: 'localhost',
          srcPort: localPort,
          keepAlive: true,
          // keepaliveInterval: 100,
          privateKey: fs.readFileSync(`${os.homedir()}/.ssh/id_rsa`),
        },
        cb => console.log('maronn connesso'),
      )
      return connection
    })
    .catch(err => {
      console.error(err)
    })
}

const randomString = Math.random()
  .toString(36)
  .replace(/[^a-z]/g, '')

console.log(randomString)

tunnelPort(5000, 'maronn')
