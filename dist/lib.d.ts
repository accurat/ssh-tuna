import { ParsedKey } from 'ssh2-streams';
export declare function validateSsh(ctx: any, authorizedKeys: ParsedKey[]): any;
export declare function findFirstFreeNumber(from: number, used: number[]): number;
export declare function generateSSHKey(): void;
export declare function copyFile(filePath: string): () => void;
