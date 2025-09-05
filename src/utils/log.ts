export class Log {
    debug(msg: any, ...args: any[]) {
        const now = new Date().toISOString();
        console.log(`[${now}] ${msg}`, ...args);
    }
}