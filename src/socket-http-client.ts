import { Log } from './log';
import { Options } from './options';
import { Socket } from './socket';

const request = require('request');

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
            options = {
                ...options,
                ...{
                    headers: this.prepareHeaders(socket, options),
                },
            };

            request(options, (error, response, body, next) => {
                if (error) {
                    Log.error({
                        time: new Date().toISOString(),
                        socketId: socket ? socket.id : null,
                        options,
                        action: 'request',
                        status: 'failed',
                        error,
                    });

                    reject({ reason: 'Error sending authentication request.', status: null });
                } else if (response.statusCode !== 200) {
                    if (this.options.development) {
                        Log.warning({
                            time: new Date().toISOString(),
                            socketId: socket ? socket.id : null,
                            options,
                            action: 'request',
                            status: 'non_200',
                            body: response.body,
                            error,
                        });
                    }

                    reject({ reason: `The HTTP request got status ${response.statusCode}` });
                } else {
                    try {
                        body = JSON.parse(response.body);
                    } catch (e) {
                        body = response.body
                    }

                    resolve(body);
                }
            });
        });
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
