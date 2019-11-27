const got = require('got')
const tunnel = require('reverse-tunnel-ssh')
const fs = require('fs')
const os = require('os')

const DOMAIN = process.env.DOMAIN || 'localhost'
const SSH_PORT = process.env.SSH_PORT || 2222

function tunnelPort(localPort, subdomain) {
  return got
    .get(`http://${DOMAIN}?subdomain=${subdomain}`, { json: true })
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
