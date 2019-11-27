const crypto = require('crypto')

function validateSsh(ctx, authorizedKeys) {
  if (ctx.method !== 'publickey') return ctx.reject()
  const allowedPubSSHKey = authorizedKeys.getPublicSSH()
  if (
    ctx.key.algo !== authorizedKeys.type ||
    ctx.key.data.length !== allowedPubSSHKey.length ||
    !crypto.timingSafeEqual(ctx.key.data, allowedPubSSHKey) ||
    (ctx.signature && authorizedKeys.verify(ctx.blob, ctx.signature) !== true)
  ) {
    return ctx.reject()
  }
  return ctx.accept()
}

function findFirstFreeNumber(from, used) {
  let firstFree = from
  while (true) {
    if (!used.includes(firstFree)) break
    firstFree++
  }
  return firstFree
}

module.exports = { validateSsh, findFirstFreeNumber }
