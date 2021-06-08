import { EmittedData } from '../echo-server';
import { Log } from './../log';
import { Member } from './presence-channel';
import { MetricsDriver } from './../metrics';
import { Options } from './../options';
import { RateLimiter } from '../rate-limiter';
import { Socket } from './../socket';
import { Server as SocketIoServer } from 'socket.io';
import { Stats } from './../stats';
import { Utils } from '../utils';

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
     */
    constructor(
        protected io: SocketIoServer,
        protected stats: Stats,
        protected metrics: MetricsDriver,
        protected rateLimiter: RateLimiter,
        protected options: Options,
    ) {
        //
    }

    /**
     * Join a given channel.
     */
    join(socket: Socket, data: EmittedData): Promise<Member|{ socket: Socket; data: EmittedData }|null> {
        return new Promise((resolve, reject) => {
            socket.join(data.channel);
            this.onJoin(socket, data.channel, null);

            resolve({ socket, data });
        });
    }

    /**
     * Leave a channel.
     */
    leave(socket: Socket, channel: string, reason: string): void {
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
     */
    onJoin(socket: Socket, channel: string, member: Member): void {
        socket.emit('channel:joined', channel);

        /**
         * We can't intercept the socket.emit() function, so
         * this one will be present here to mark an outgoing WS message.
         */
        if (this.options.metrics.enabled) {
            this.metrics.markWsMessage(Utils.getNspForSocket(socket), 'channel:joined', channel);
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
     */
    onClientEvent(socket: Socket, data: EmittedData): any {
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

                let payloadSizeInKb = Utils.dataToBytes(data.data) / 1024;

                if (payloadSizeInKb > parseFloat(this.options.eventLimits.maxPayloadInKb as string)) {
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
                    if (this.options.metrics.enabled) {
                        this.metrics.markWsMessage(Utils.getNspForSocket(socket), 'channel:joined', data.channel, data.data);
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
     */
    isInChannel(socket: Socket, channel: string): boolean {
        // TODO: Check this line? It throw error in ESLint.
        // @ts-ignore
        return socket.adapter.rooms.has(channel);
    }

    /**
     * Create alias for static.
     */
    static isInChannel(socket: Socket, channel: string): boolean {
        return this.isInChannel(socket, channel);
    }

    /**
     * Check if the given channel name is private.
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
     */
    static isPresenceChannel(channel: string): boolean {
        return channel.lastIndexOf('presence-', 0) === 0;
    }

    /**
     * Check if the given channel name is a encrypted private channel.
     */
    static isEncryptedPrivateChannel(channel: string): boolean {
        return channel.lastIndexOf('private-encrypted-', 0) === 0;
    }
}
