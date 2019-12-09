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

export function createClient(config: Config, connectedCb: Function, errorCb: Function): Client {
  const conn = new Client()

  conn.on('ready', () => {
    connectedCb(conn)
    conn.forwardIn(config.dstHost, config.dstPort, (err, port) => {
      if (!err) return conn.emit('forward-in', port)
      errorCb(err)
    })
  })

  conn.on('tcp connection', (info, accept, reject) => {
    let remote
    const srcSocket = new Socket()

    srcSocket.on('error', err => {
      if (remote === undefined) return reject()
      remote.end()
      errorCb(err)
    })

    srcSocket.connect(config.srcPort, config.srcHost, () => {
      remote = accept()
      srcSocket.pipe(remote).pipe(srcSocket)
    })
  })

  conn.on('error', err => {
    conn.end()
    errorCb(err)
  })

  conn.connect(config)

  return conn
}
