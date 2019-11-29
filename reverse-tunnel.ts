import { Socket } from 'net'
import { Client, ConnectConfig } from 'ssh2'

interface Config extends ConnectConfig {
  dstHost: string
  dstPort: number
  srcHost: string
  srcPort: number
  host: string
  port: number
  keepAlive: boolean
  agent: string
  username: string
}

function noop() {}

export function createClient(
  config: Config,
  onReadyCb: Function = noop,
  onConnectionCb: Function = noop,
) {
  const conn = new Client()
  const errors = []

  conn.on('ready', () => {
    onReadyCb()
    conn.forwardIn(config.dstHost, config.dstPort, (err, port) => {
      if (err) return errors.push(err)
      conn.emit('forward-in', port)
    })
  })

  conn.on('tcp connection', (info, accept, reject) => {
    let remote
    const srcSocket = new Socket()

    srcSocket.on('error', err => {
      errors.push(err)
      if (remote === undefined) {
        reject()
      } else {
        remote.end()
      }
    })

    srcSocket.connect(config.srcPort, config.srcHost, () => {
      remote = accept()
      srcSocket.pipe(remote).pipe(srcSocket)
      if (errors.length === 0) {
        onConnectionCb(null, conn)
      } else {
        onConnectionCb(errors, null)
      }
    })
  })
  conn.connect(config)
  return conn
}
