import { Socket } from "./socket";

export class Utils {
    /**
     * Get the amount of bytes from given parameters.
     *
     * @param  {any}  data
     * @return {number}
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
     * Extract the namespace from socket.
     *
     * @param  {Socket}  socket
     * @return {string}
     */
    static getNspForSocket(socket: Socket): string {
        return socket.nsp.name;
    }
}
