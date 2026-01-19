export function isIP(_addr: string): number {
    return 0;
}

export function isIPv4(_addr: string): boolean {
    return false;
}

export function isIPv6(_addr: string): boolean {
    return false;
}

export function connect() {
    throw new Error('net.connect is not available in browser');
}

export class Socket {
    constructor() {
        throw new Error('net.Socket is not available in browser');
    }
}

export class Server {
    constructor() {
        throw new Error('net.Server is not available in browser');
    }
}

export function createServer() {
    throw new Error('net.createServer is not available in browser');
}

export function createConnection() {
    throw new Error('net.createConnection is not available in browser');
}

export default {
    isIP,
    isIPv4,
    isIPv6,
    connect,
    Socket,
    Server,
    createServer,
    createConnection,
};
