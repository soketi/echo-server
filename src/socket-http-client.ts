import axios from 'axios';
import { Log } from './log';
import { Options } from './options';
import { Socket } from './socket';

export class SocketHttpClient {
    /**
     * Initialize the requester.
     */
    constructor(protected options: Options) {
        //
    }

    /**
     * Send a request to the server.
     */
    request(socket: Socket, options: any): Promise<{ [key: string]: any; }> {
        return new Promise((resolve, reject) => {
            options = this.prepareOptions(socket, options);

            axios(options).then(response => {
                let data;

                try {
                    data = JSON.parse(response.data);
                } catch (e) {
                    data = response.data;
                }

                resolve(data);
            }).catch(error => {
                if (error.response.status !== 200) {
                    if (this.options.development) {
                        Log.warning({
                            time: new Date().toISOString(),
                            socketId: socket ? socket.id : null,
                            options,
                            action: 'request',
                            status: 'non_200',
                            body: error.response.data,
                        });
                    }

                    reject({ reason: `The HTTP request got status ${error.response.status}` });
                } else {
                    Log.error({
                        time: new Date().toISOString(),
                        socketId: socket ? socket.id : null,
                        options,
                        action: 'request',
                        status: 'failed',
                        error,
                    });

                    reject({ reason: 'Error sending HTTP request.', status: null });
                }
            });
        });
    }

    /**
     * Prepare options for request to app server.
     */
    protected prepareOptions(socket: Socket, options: Options): any {
        return {
            ...options,
            ...{
                headers: {
                    ...(options.headers || {}),
                    ...this.prepareHeaders(socket, options)
                },
                maxContentLength: 2000,
                maxBodyLength: 2000,
            },
        };
    }

    /**
     * Prepare headers for request to app server.
     */
    protected prepareHeaders(socket: Socket, options: Options): { [key: string]: any; } {
        let headers = {
            'X-Requested-With': 'XMLHttpRequest',
        };

        if (socket) {
            let socketHeaders = {
                'X-Forwarded-For': socket.request.headers['x-forwarded-for'] || socket.handshake.headers['x-forwarded-for'] || socket.handshake.address || socket.conn.remoteAddress,
                'User-Agent': socket.request.headers['user-agent'] || socket.handshake.headers['user-agent'],
                'Cookie': options.headers['Cookie'] || socket.request.headers.cookie || socket.handshake.headers.cookie,
            }

            for (let headerName in socketHeaders) {
                let headerValue = socketHeaders[headerName];

                if (headerValue) {
                    options.headers[headerName] = headerValue;
                }
            }
        }

        return headers;
    }
}
