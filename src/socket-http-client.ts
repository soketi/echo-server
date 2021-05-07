import { Log } from './log';

const request = require('request');

export class SocketHttpClient {
    /**
     * Initialize the requester.
     *
     * @param {any} options
     */
    constructor(protected options: any) {
        //
    }

    /**
     * Send a request to the server.
     *
     * @param  {string}  method
     * @param  {any}  socket
     * @param  {any}  options
     * @return {Promise<any>}
     */
    request(socket: any, options: any): Promise<any> {
        return new Promise<any>((resolve, reject) => {
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
     *
     * @param  {any}  socket
     * @param  {any}  options
     * @return {any}
     */
    protected prepareHeaders(socket: any, options: any): any {
        options.headers['X-Requested-With'] = 'XMLHttpRequest';

        if (socket) {
            options.headers['X-Forwarded-For'] = socket.request.headers['x-forwarded-for'] || socket.handshake.headers['x-forwarded-for'] || socket.conn.remoteAddress;

            let userAgent = socket.request.headers['user-agent'] || socket.handshake.headers['user-agent'];
            let cookie = options.headers['Cookie'] || socket.request.headers.cookie || socket.handshake.headers.cookie;

            if (userAgent) {
                options.headers['User-Agent'] = userAgent;
            }

            if (cookie) {
                options.headers['Cookie'] = cookie;
            }
        }

        return options.headers;
    }
}
