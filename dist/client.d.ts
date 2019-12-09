import { ClientController } from './reverse-tunnel';
export declare function tunnelPort(localPort: number, subdomain: string, tunnelDomain: string, sshPort: number): Promise<ClientController>;
