"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const net_1 = require("net");
const ssh2_1 = require("ssh2");
function createClient(config, connectedCb, errorCb) {
    const conn = new ssh2_1.Client();
    conn.on('ready', () => {
        connectedCb(conn);
        conn.forwardIn(config.dstHost, config.dstPort, (err, port) => {
            if (!err)
                return conn.emit('forward-in', port);
            errorCb(err);
        });
    });
    conn.on('tcp connection', (info, accept, reject) => {
        let remote;
        const srcSocket = new net_1.Socket();
        srcSocket.on('error', err => {
            if (remote === undefined)
                return reject();
            remote.end();
            errorCb(err);
        });
        srcSocket.connect(config.srcPort, config.srcHost, () => {
            remote = accept();
            srcSocket.pipe(remote).pipe(srcSocket);
        });
    });
    conn.on('error', err => {
        conn.end();
        errorCb(err);
    });
    conn.connect(config);
    return conn;
}
exports.createClient = createClient;
