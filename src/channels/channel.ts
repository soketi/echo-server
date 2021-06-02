import { Log } from './../log';
import { Prometheus } from './../prometheus';
import { RateLimiter } from '../rate-limiter';
import { Stats } from './../stats';

export class Channel {
    /**
     * Allowed client events patterns.
     *
     * @type {string[]}
     */
    protected _clientEventPatterns: string[] = [
        'client-*',
    ];

    /**
     * Channels and patters for private channels.
     *
     * @type {string[]}
     */
    protected static _privateChannelPatterns: string[] = [
        'private-*',
        'private-encrypted-*',
        'presence-*',
    ];

    /**
     * Create a new channel instance.
     *
     * @param {any} io
     * @param {Stats} stats
     * @param {Prometheus} prometheus
     * @param {RateLimiter} rateLimiter
     * @param {any} options
     */
    constructor(
        protected io: any,
        protected stats: Stats,
        protected prometheus: Prometheus,
        protected rateLimiter: RateLimiter,
        protected options: any,
    ) {
        //
    }

    /**
     * Join a given channel.
     *
     * @param  {any}  socket
     * @param  {any}  data
     * @return {Promise<any>}
     */
    join(socket: any, data: any): Promise<any> {
        return new Promise((resolve, reject) => {
            socket.join(data.channel);
            this.onJoin(socket, data.channel, null);

            resolve({ socket, data });
        });
    }

    /**
     * Leave a channel.
     *
     * @param  {any}  socket
     * @param  {string}  channel
     * @param  {string}  reason
     * @return {void}
     */
    leave(socket: any, channel: string, reason: string): void {
        if (channel) {
            socket.leave(channel);

            if (this.options.development) {
                Log.info({
                    time: new Date().toISOString(),
                    socketId: socket.id,
                    action: 'leave',
                    channel,
                    reason,
                });
            }
        }
    }

    /**
     * Handle joins.
     *
     * @param  {any}  socket
     * @param  {string}  channel
     * @param  {any}  member
     * @return {void}
     */
    onJoin(socket: any, channel: string, member: any): void {
        socket.emit('channel:joined', channel);

        /**
         * We can't intercept the socket.emit() function, so
         * this one will be present here to mark an outgoing WS message.
         */
        if (this.options.prometheus.enabled) {
            this.prometheus.markWsMessage(this.getNspForSocket(socket), 'channel:joined', channel);
        }

        this.stats.markWsMessage(socket.data.echoApp);

        if (this.options.development) {
            Log.info({
                time: new Date().toISOString(),
                socketId: socket.id,
                action: 'onJoin',
                member,
                channel,
            });
        }
    }

    /**
     * Trigger a client message.
     *
     * @param  {any}  socket
     * @param  {any}  data
     * @return {void}
     */
    onClientEvent(socket: any, data: any): void {
        try {
            data = JSON.parse(data);
        } catch (e) {
            //
        }

        if (this.options.development) {
            Log.info({
                time: new Date().toISOString(),
                socketId: socket.id,
                action: 'client_event',
                status: 'received',
                data,
            });
        }

        if (data.event && data.channel) {
            if (
                this.isClientEvent(data.event) &&
                this.isInChannel(socket, data.channel)
            ) {
                if (data.event.length > this.options.eventLimits.maxNameLength) {
                    return socket.emit('socket:error', { message: `The broadcasting client event name is longer than ${this.options.eventLimits.maxNameLength} characters.`, code: 4100 });
                }

                let payloadSizeInKb = this.dataToBytes(data.data) / 1024;

                if (payloadSizeInKb > parseFloat(this.options.eventLimits.maxPayloadInKb)) {
                    return socket.emit('socket:error', { message: `The broadcasting client event payload is greater than ${this.options.eventLimits.maxPayloadInKb} KB.`, code: 4100 });
                }

                this.rateLimiter.forApp(socket.data.echoApp).forSocket(socket).consumeFrontendEventPoints(1).then(rateLimitData => {
                    socket.to(data.channel).emit(
                        data.event, data.channel, data.data
                    );

                    this.stats.markWsMessage(socket.data.echoApp);

                    /**
                     * We can't intercept the socket.emit() function, so
                     * this one will be present here to mark an outgoing WS message.
                     */
                    if (this.options.prometheus.enabled) {
                        this.prometheus.markWsMessage(this.getNspForSocket(socket), 'channel:joined', data.channel, data.data);
                    }

                    if (this.options.development) {
                        Log.info({
                            time: new Date().toISOString(),
                            socketId: socket.id,
                            action: 'client_event',
                            status: 'success',
                            data,
                        });
                    }
                }, error => {
                    if (this.options.development) {
                        Log.info({
                            time: new Date().toISOString(),
                            socketId: socket.id,
                            action: 'client_event',
                            status: 'over_quota',
                            data,
                        });
                    }

                    socket.emit('socket:error', { message: `The number of client messages per minute got exceeded. Please slow it down.`, code: 4100 });
                });
            }
        }
    }

    /**
     * Check if client is a client event.
     *
     * @param  {string}  event
     * @return {boolean}
     */
    isClientEvent(event: string): boolean {
        let isClientEvent = false;

        this._clientEventPatterns.forEach(pattern => {
            let regex = new RegExp(pattern.replace('*', '.*'));

            if (regex.test(event)) {
                isClientEvent = true;
            }
        });

        return isClientEvent;
    }

    /**
     * Check if a socket has joined a channel.
     *
     * @param  {any}  socket
     * @param  {string}  channel
     * @return {boolean}
     */
    isInChannel(socket: any, channel: string): boolean {
        return socket.adapter.rooms.has(channel);
    }

    /**
     * Create alias for static.
     *
     * @param  {any}  socket
     * @param  {string}  channel
     * @return {boolean}
     */
    static isInChannel(socket: any, channel: string): boolean {
        return this.isInChannel(socket, channel);
    }

    /**
     * Extract the namespace from socket.
     *
     * @param  {any}  socket
     * @return {string}
     */
    getNspForSocket(socket: any): string {
        return socket.nsp.name;
    }

    /**
     * Create alias for static.
     *
     * @param  {any}  socket
     * @return {string}
     */
    static getNspForSocket(socket: any): string {
        return this.getNspForSocket(socket);
    }

    /**
     * Check if the given channel name is private.
     *
     * @param  {string}  channel
     * @return {boolean}
     */
    static isPrivateChannel(channel: string): boolean {
        let isPrivate = false;

        this._privateChannelPatterns.forEach(pattern => {
            let regex = new RegExp(pattern.replace('*', '.*'));

            if (regex.test(channel)) {
                isPrivate = true;
            }
        });

        return isPrivate;
    }

    /**
     * Check if the given channel name is a presence channel.
     *
     * @param  {string}  channel
     * @return {boolean}
     */
    static isPresenceChannel(channel: string): boolean {
        return channel.lastIndexOf('presence-', 0) === 0;
    }

    /**
     * Check if the given channel name is a encrypted private channel.
     *
     * @param  {string}  channel
     * @return {boolean}
     */
    static isEncryptedPrivateChannel(channel: string): boolean {
        return channel.lastIndexOf('private-encrypted-', 0) === 0;
    }

    /**
     * Get the amount of bytes from given parameters.
     *
     * @param  {any}  data
     * @return {number}
     */
     protected dataToBytes(...data: any): number {
        return data.reduce((totalBytes, element) => {
            element = typeof element === 'string' ? element : JSON.stringify(element);

            try {
                return totalBytes += Buffer.byteLength(element, 'utf8');
            } catch (e) {
                return totalBytes;
            }
        }, 0);
    }
}
