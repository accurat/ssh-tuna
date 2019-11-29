import { Server } from 'net'

export interface Proxy {
  port: number
  subdomain: string
  resolver: any
  tunnel: Server | null
}
