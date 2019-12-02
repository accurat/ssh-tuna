import * as fs from 'fs'
import * as crypto from 'crypto'
import { ParsedKey } from 'ssh2-streams'
import { execSync } from 'child_process'
import { config as dotenvConfig } from 'dotenv'

dotenvConfig()

const { SSH_PASSPHRASE } = process.env

function validateKey(ctx, authorizedKey: ParsedKey): boolean {
  const allowedPubSSHKey = authorizedKey.getPublicSSH()
  return (
    ctx.key.algo === authorizedKey.type &&
    ctx.key.data.length === allowedPubSSHKey.length &&
    crypto.timingSafeEqual(ctx.key.data, allowedPubSSHKey as any) &&
    (!ctx.signature || authorizedKey.verify(ctx.blob, ctx.signature) === true)
  )
}

export function validateSsh(ctx, authorizedKeys: ParsedKey[]) {
  if (ctx.method !== 'publickey') return ctx.reject()
  if (authorizedKeys.some(k => validateKey(ctx, k))) return ctx.accept()
  return ctx.reject()
}

export function findFirstFreeNumber(from: number, used: number[]): number {
  let firstFree = from
  while (true) {
    if (!used.includes(firstFree)) break
    firstFree++
  }
  return firstFree
}

export function generateSSHKey() {
  const code = `ssh-keygen -t dsa -f ./ssh/ssh_host_dsa_key -P ${SSH_PASSPHRASE} && ssh-keygen -t rsa -b 4096 -f ./ssh/ssh_host_rsa_key -P ${SSH_PASSPHRASE}`
  execSync(code)
}

export function copyFile(filePath: string) {
  return function() {
    fs.copyFileSync(`${filePath}.example`, filePath)
  }
}
