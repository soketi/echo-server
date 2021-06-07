import { PresenceStorage } from './../presence-storage';
import { Log } from './../log';
import { PrivateChannel } from './private-channel';
import { Prometheus } from './../prometheus';
import { RateLimiter } from '../rate-limiter';
import { Socket } from './../socket';
import { Stats } from './../stats';

export class PresenceChannel extends PrivateChannel {
    /**
     * Database instance to store presence channel data.
     */
     presenceStorage: PresenceStorage;

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
        super(io, stats, prometheus, rateLimiter, options);

        this.presenceStorage = new PresenceStorage(options, io);
    }

    /**
     * Join a given channel.
     *
     * @param  {Socket}  socket
     * @param  {any}  data
     * @return {Promise<any>}
     */
    join(socket: Socket, data: any): Promise<any> {
        return this.signatureIsValid(socket, data).then(isValid => {
            if (!isValid) {
                return;
            }

            let member = data.channel_data;

            try {
                member = JSON.parse(member);
            } catch (e) {
                //
            }

            if (!member) {
                if (this.options.development) {
                    Log.error('Member format is not JSONable.');
                }

                socket.emit('socket:error', { message: 'The member received from the HTTP API request is not JSONable.', code: 4303 });

                return;
            }

            return this.presenceStorage.memberExistsInChannel(this.getNspForSocket(socket), data.channel, member).then(exists => {
                /**
                 * If member.user_id already exists, there is no way on connecting this socket to the same channel.
                 * This avoids duplicated tabs for users, as well as minimizing impact on the network.
                 */
                if (!exists) {
                    if (this.dataToKilobytes(member) > this.options.presence.maxMemberSizeInKb) {
                        socket.emit('socket:error', { message: `The member size exceeds ${this.options.presence.maxMemberSizeInKb} KB.`, code: 4100 });
                    } else {
                        member.socket_id = socket.id;

                        this.presenceStorage.addMemberToChannel(socket, this.getNspForSocket(socket), data.channel, member).then(members => {
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
            });
        });
    }

    /**
     * Leave a channel. Remove a member from a
     * presenece channel and broadcast they have left
     * only if not other presence channel instances exist.
     *
     * @param  {Socket}  socket
     * @param  {string}  channel
     * @return {void}
     */
    leave(socket: Socket, channel: string): void {
        this.presenceStorage.whoLeft(socket, this.getNspForSocket(socket), channel).then(memberWhoLeft => {
            /**
             * Since in .join(), only the first connection that has a certain member.user_id is stored (the rest
             * of the sockets that connect with the member.user_id are rejected), we check if the socket exists.
             * If the socket leaves, then delete the user associated with it.
             */
            if (memberWhoLeft) {
                this.presenceStorage.removeMemberFromChannel(socket, this.getNspForSocket(socket), channel, memberWhoLeft).then(members => {
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
     *
     * @param  {Socket}  socket
     * @param  {string}  channel
     * @param  {any}  member
     * @return {void}
     */
    onJoin(socket: Socket, channel: string, member: any): void {
        super.onJoin(socket, channel, member);

        socket.to(channel).emit('presence:joining', channel, member);

        /**
         * We can't intercept the socket.emit() function, so
         * this one will be present here to mark an outgoing WS message.
         */
        if (this.options.prometheus.enabled) {
            this.prometheus.markWsMessage(this.getNspForSocket(socket), 'presence:joining', channel, member);
        }

        this.stats.markWsMessage(socket.data.echoApp);
    }

    /**
     * Handle leaves.
     *
     * @param  {Socket}  socket
     * @param  {string}  channel
     * @param  {any}  member
     * @return {void}
     */
    onLeave(socket: Socket, channel: string, member: any): void {
        this.io.of(this.getNspForSocket(socket))
            .to(channel)
            .emit('presence:leaving', channel, member);

        /**
         * We can't intercept the socket.emit() function, so
         * this one will be present here to mark an outgoing WS message.
         */
        if (this.options.prometheus.enabled) {
            this.prometheus.markWsMessage(this.getNspForSocket(socket), 'presence:leaving', channel, member);
        }

        this.stats.markWsMessage(socket.data.echoApp);
    }

    /**
     * Handle subscriptions.
     *
     * @param  {Socket}  socket
     * @param  {string}  channel
     * @param  {any[]}  members
     * @return {void}
     */
    onSubscribed(socket: Socket, channel: string, members: any[]): void {
        this.io.of(this.getNspForSocket(socket))
            .to(socket.id)
            .emit('presence:subscribed', channel, members);

        /**
         * We can't intercept the socket.emit() function, so
         * this one will be present here to mark an outgoing WS message.
         */
        if (this.options.prometheus.enabled) {
            this.prometheus.markWsMessage(this.getNspForSocket(socket), 'presence:subscribed', channel, members);
        }

        this.stats.markWsMessage(socket.data.echoApp);
    }

    /**
     * Get the members of a presence channel.
     *
     * @param  {string}  namespace
     * @param  {string}  channel
     * @return {Promise<any>}
     */
    getMembers(namespace: string, channel: string): Promise<any> {
        return this.presenceStorage.getMembersFromChannel(namespace, channel);
    }

    /**
     * Get the data to sign for the token.
     *
     * @param  {Socket}  socket
     * @param  {any}  data
     * @return {string}
     */
    protected getDataToSignForToken(socket: Socket, data: any): string {
        return `${socket.id}:${data.channel}:${data.channel_data}`;
    }

    /**
     * Get the amount of kb from given parameters.
     *
     * @param  {any}  data
     * @return {number}
     */
    protected dataToKilobytes(...data: any): number {
        return data.reduce((totalKilobytes, element) => {
            element = typeof element === 'string' ? element : JSON.stringify(element);

            try {
                return totalKilobytes += Buffer.byteLength(element, 'utf8') / 1024;
            } catch (e) {
                return totalKilobytes;
            }
        }, 0);
    }
}
