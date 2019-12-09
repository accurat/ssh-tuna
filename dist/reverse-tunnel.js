"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const net_1 = require("net");
const ssh2_1 = require("ssh2");
function createClient(config) {
    const conn = new ssh2_1.Client();
    let errorHandler = (err) => { };
    const client = {
        close: conn.end,
        state: 'closed',
        onerror: (cb) => (errorHandler = cb),
    };
    conn.on('ready', () => {
        client.state = 'connected';
        conn.forwardIn(config.dstHost, config.dstPort, (err, port) => {
            if (!err)
                return conn.emit('forward-in', port);
            console.error(`Error: ${err.message}`);
            client.state = 'error';
        });
    });
    conn.on('tcp connection', (info, accept, reject) => {
        let remote;
        const srcSocket = new net_1.Socket();
        client.state = 'connected';
        srcSocket.on('error', err => {
            client.state = 'error';
            if (remote === undefined)
                return reject();
            remote.end();
        });
        srcSocket.connect(config.srcPort, config.srcHost, () => {
            remote = accept();
            srcSocket.pipe(remote).pipe(srcSocket);
        });
    });
    conn.on('error', err => {
        errorHandler(err.message);
        const { message } = err;
        console.error('Error: ', message);
        conn.end();
    });
    conn.connect(config);
    return client;
}
exports.createClient = createClient;
