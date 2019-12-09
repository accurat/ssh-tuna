interface ClientController {
    close: () => void;
}
export declare function tunnelPort(localPort: number, subdomain: string, tunnelDomain: string, sshPort: number): Promise<ClientController>;
export {};
