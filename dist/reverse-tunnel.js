"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const net_1 = require("net");
const ssh2_1 = require("ssh2");
function createClient(config) {
    const conn = new ssh2_1.Client();
    const errors = [];
    conn.on('ready', () => {
        conn.forwardIn(config.dstHost, config.dstPort, (err, port) => {
            if (err)
                return errors.push(err);
            conn.emit('forward-in', port);
        });
    });
    conn.on('tcp connection', (info, accept, reject) => {
        let remote;
        const srcSocket = new net_1.Socket();
        srcSocket.on('error', err => {
            errors.push(err);
            if (remote === undefined) {
                reject();
            }
            else {
                remote.end();
            }
        });
        srcSocket.connect(config.srcPort, config.srcHost, () => {
            remote = accept();
            srcSocket.pipe(remote).pipe(srcSocket);
        });
    });
    conn.connect(config);
    return conn;
}
exports.createClient = createClient;
