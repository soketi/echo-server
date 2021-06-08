import { EmittedData } from '../echo-server';
import { Log } from './../log';
import { MetricsDriver } from './../metrics';
import { Options } from './../options';
import { PresenceStorage } from './../presence-storage';
import { PrivateChannel } from './private-channel';
import { RateLimiter } from '../rate-limiter';
import { Socket } from './../socket';
import { Server as SocketIoServer } from 'socket.io';
import { Stats } from './../stats';
import { Utils } from './../utils';

export interface Member {
    user_id: number|string;
    user_data: {
        [key: string]: any;
    };
    socket_id?: string;
}

export class PresenceChannel extends PrivateChannel {
    /**
     * Database instance to store presence channel data.
     */
     presenceStorage: PresenceStorage;

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
        super(io, stats, metrics, rateLimiter, options);

        this.presenceStorage = new PresenceStorage(options, io);
    }

    /**
     * Join a given channel.
     */
    join(socket: Socket, data: EmittedData): Promise<Member|{ socket: Socket; data: EmittedData }|null> {
        return this.signatureIsValid(socket, data).then(isValid => {
            if (!isValid) {
                return null;
            }

            let member: Member = null;
            let memberAsString: string = data.channel_data;

            try {
                member = JSON.parse(memberAsString) as Member;
            } catch (e) {
                //
            }

            if (!member) {
                if (this.options.development) {
                    Log.error('Member format is not JSONable.');
                }

                socket.emit('socket:error', { message: 'The member received from the HTTP API request is not JSONable.', code: 4303 });

                return null;
            }

            return this.presenceStorage.memberExistsInChannel(Utils.getNspForSocket(socket), data.channel, member).then(exists => {
                /**
                 * If member.user_id already exists, there is no way on connecting this socket to the same channel.
                 * This avoids duplicated tabs for users, as well as minimizing impact on the network.
                 */
                if (!exists) {
                    if (Utils.dataToKilobytes(member) > parseFloat(this.options.presence.maxMemberSizeInKb as string)) {
                        socket.emit('socket:error', { message: `The member size exceeds ${this.options.presence.maxMemberSizeInKb} KB.`, code: 4100 });
                    } else {
                        member.socket_id = socket.id;

                        this.presenceStorage.addMemberToChannel(socket, Utils.getNspForSocket(socket), data.channel, member).then(members => {
                            if (members.length > this.options.presence.maxMembersPerChannel) {
                                socket.emit('socket:error', { message: 'The maximum channel members amount has been reached.', code: 4100 });
                                socket.disconnect();
                            } else {
                                socket.join(data.channel);
                                this.onSubscribed(socket, data.channel, members);
                                this.onJoin(socket, data.channel, member);
                            }
                        });
                    }
                } else {
                    socket.emit('socket:info', { message: 'The member you are trying to connect to is already connected on another connection.' });
                }

                return member;
            }, error => {
                socket.emit('socket:error', { message: 'There is an internal problem.', code: 4304 });

                return null;
            });
        });
    }

    /**
     * Leave a channel. Remove a member from a
     * presenece channel and broadcast they have left
     * only if not other presence channel instances exist.
     */
    leave(socket: Socket, channel: string): void {
        this.presenceStorage.whoLeft(socket, Utils.getNspForSocket(socket), channel).then(memberWhoLeft => {
            /**
             * Since in .join(), only the first connection that has a certain member.user_id is stored (the rest
             * of the sockets that connect with the member.user_id are rejected), we check if the socket exists.
             * If the socket leaves, then delete the user associated with it.
             */
            if (memberWhoLeft) {
                this.presenceStorage.removeMemberFromChannel(socket, Utils.getNspForSocket(socket), channel, memberWhoLeft).then(members => {
                    socket.leave(channel);
                    this.onLeave(socket, channel, memberWhoLeft);
                });
            }
        }, error => {
            Log.error(error);

            socket.emit('socket:error', { message: 'There is an internal problem.', code: 4305 });
        });
    }

    /**
     * Handle joins.
     */
    onJoin(socket: Socket, channel: string, member: Member): void {
        super.onJoin(socket, channel, member);

        socket.to(channel).emit('presence:joining', channel, member);

        /**
         * We can't intercept the socket.emit() function, so
         * this one will be present here to mark an outgoing WS message.
         */
        if (this.options.metrics.enabled) {
            this.metrics.markWsMessage(Utils.getNspForSocket(socket), 'presence:joining', channel, member);
        }

        this.stats.markWsMessage(socket.data.echoApp);
    }

    /**
     * Handle leaves.
     */
    onLeave(socket: Socket, channel: string, member: Member): void {
        this.io.of(Utils.getNspForSocket(socket))
            .to(channel)
            .emit('presence:leaving', channel, member);

        /**
         * We can't intercept the socket.emit() function, so
         * this one will be present here to mark an outgoing WS message.
         */
        if (this.options.metrics.enabled) {
            this.metrics.markWsMessage(Utils.getNspForSocket(socket), 'presence:leaving', channel, member);
        }

        this.stats.markWsMessage(socket.data.echoApp);
    }

    /**
     * Handle subscriptions.
     */
    onSubscribed(socket: Socket, channel: string, members: Member[]): void {
        this.io.of(Utils.getNspForSocket(socket))
            .to(socket.id)
            .emit('presence:subscribed', channel, members);

        /**
         * We can't intercept the socket.emit() function, so
         * this one will be present here to mark an outgoing WS message.
         */
        if (this.options.metrics.enabled) {
            this.metrics.markWsMessage(Utils.getNspForSocket(socket), 'presence:subscribed', channel, members);
        }

        this.stats.markWsMessage(socket.data.echoApp);
    }

    /**
     * Get the members of a presence channel.
     */
    getMembers(namespace: string, channel: string): Promise<Member[]> {
        return this.presenceStorage.getMembersFromChannel(namespace, channel);
    }

    /**
     * Get the data to sign for the token.
     */
    protected getDataToSignForToken(socket: Socket, data: EmittedData): string {
        return `${socket.id}:${data.channel}:${data.channel_data}`;
    }
}
