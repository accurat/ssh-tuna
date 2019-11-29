import * as crypto from 'crypto'
import { ParsedKey } from 'ssh2-streams'

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
