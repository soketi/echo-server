import { Socket } from "./socket";

export class Utils {
    /**
     * Get the amount of bytes from given parameters.
     */
    static dataToBytes(...data: any): number {
        return data.reduce((totalBytes, element) => {
            element = typeof element === 'string' ? element : JSON.stringify(element);

            try {
                return totalBytes += Buffer.byteLength(element, 'utf8');
            } catch (e) {
                return totalBytes;
            }
        }, 0);
    }

    /**
     * Get the amount of kilobytes from given parameters.
     */
    static dataToKilobytes(...data: any): number {
        return this.dataToBytes(...data) / 1024;
    }

    /**
     * Extract the namespace from socket.
     */
    static getNspForSocket(socket: Socket): string {
        return socket.nsp.name;
    }
}
