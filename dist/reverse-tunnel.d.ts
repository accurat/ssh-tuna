import { ConnectConfig } from 'ssh2';
declare type Cb = (err: string) => void;
export interface ClientController {
    close: () => void;
    state: 'connected' | 'closed' | 'error';
    onerror: (cb: Cb) => void;
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
