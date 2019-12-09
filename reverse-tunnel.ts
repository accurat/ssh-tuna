import { Socket } from 'net'
import { Client, ConnectConfig } from 'ssh2'

export interface ClientController {
  close: () => void
  state: 'connected' | 'closed' | 'error'
}

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

export function createClient(config: Config) {
  const conn = new Client()

  const client: ClientController = {
    close: conn.end,
    state: 'closed',
  }

  conn.on('ready', () => {
    client.state = 'connected'
    conn.forwardIn(config.dstHost, config.dstPort, (err, port) => {
      if (!err) return conn.emit('forward-in', port)
      console.error(`Error: ${err.message}`)
      client.state = 'error'
    })
  })

  conn.on('tcp connection', (info, accept, reject) => {
    let remote
    const srcSocket = new Socket()
    client.state = 'connected'

    srcSocket.on('error', err => {
      client.state = 'error'
      if (remote === undefined) return reject()
      remote.end()
    })

    srcSocket.connect(config.srcPort, config.srcHost, () => {
      remote = accept()
      srcSocket.pipe(remote).pipe(srcSocket)
    })
  })

  conn.on('error', err => {
    const { message } = err
    console.error('Error: ', message)
    conn.end()
  })

  conn.connect(config)

  return client
}
