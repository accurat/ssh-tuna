"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const crypto = require("crypto");
const child_process_1 = require("child_process");
const dotenv_1 = require("dotenv");
dotenv_1.config();
const { SSH_PASSPHRASE } = process.env;
function validateKey(ctx, authorizedKey) {
    const allowedPubSSHKey = authorizedKey.getPublicSSH();
    return (ctx.key.algo === authorizedKey.type &&
        ctx.key.data.length === allowedPubSSHKey.length &&
        crypto.timingSafeEqual(ctx.key.data, allowedPubSSHKey) &&
        (!ctx.signature || authorizedKey.verify(ctx.blob, ctx.signature) === true));
}
function validateSsh(ctx, authorizedKeys) {
    if (ctx.method !== 'publickey')
        return ctx.reject();
    if (authorizedKeys.some(k => validateKey(ctx, k)))
        return ctx.accept();
    return ctx.reject();
}
exports.validateSsh = validateSsh;
function findFirstFreeNumber(from, used) {
    let firstFree = from;
    while (true) {
        if (!used.includes(firstFree))
            break;
        firstFree++;
    }
    return firstFree;
}
exports.findFirstFreeNumber = findFirstFreeNumber;
function generateSSHKey() {
    const code = `ssh-keygen -t dsa -f ./ssh/ssh_host_dsa_key -P ${SSH_PASSPHRASE} && ssh-keygen -t rsa -b 4096 -f ./ssh/ssh_host_rsa_key -P ${SSH_PASSPHRASE}`;
    child_process_1.execSync(code);
}
exports.generateSSHKey = generateSSHKey;
function copyFile(filePath) {
    return function () {
        fs.copyFileSync(`${filePath}.example`, filePath);
    };
}
exports.copyFile = copyFile;
