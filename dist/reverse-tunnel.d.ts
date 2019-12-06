import { Client, ConnectConfig } from 'ssh2';
interface Config extends ConnectConfig {
    dstHost: string;
    dstPort: number;
    srcHost: string;
    srcPort: number;
    host: string;
    port: number;
    keepAlive: boolean;
    agent: string;
    username: string;
}
export declare function createClient(config: Config): Client;
export {};
