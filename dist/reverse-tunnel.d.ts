import { ConnectConfig } from 'ssh2';
export interface ClientController {
    close: () => void;
    state: 'connected' | 'closed' | 'error';
}
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
export declare function createClient(config: Config): ClientController;
export {};