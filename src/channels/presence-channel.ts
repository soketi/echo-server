import { PresenceStorage } from './../presence-storage';
import { Log } from './../log';
import { PrivateChannel } from './private-channel';

export class PresenceChannel extends PrivateChannel {
    /**
     * Database instance to store presence channel data.
     */
     presenceStorage: PresenceStorage;

    /**
     * Create a new channel instance.
     *
     * @param {any} io
     * @param {any} stats
     * @param {any} prometheus
     * @param {any} options
     */
    constructor(protected io, protected stats, protected prometheus, protected options) {
        super(io, stats, prometheus, options);

        this.presenceStorage = new PresenceStorage(options);
    }

    /**
     * Join a given channel.
     *
     * @param  {any}  socket
     * @param  {any}  data
     * @return {Promise<any>}
     */
    join(socket: any, data: any): Promise<any> {
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
                    Log.error('Unable to join channel. Member data for presence channel missing. Maybe the authentication host and/or url is not right?');
                }

                return;
            }

            return this.presenceStorage.memberExistsInChannel(this.getNspForSocket(socket), data.channel, member).then(exists => {
                /**
                 * If member.user_id already exists, there is no way on connecting this socket to the same channel.
                 * This avoids duplicated tabs for users, as well as minimizing impact on the network.
                 */
                if (!exists) {
                    member.socket_id = socket.id;

                    this.presenceStorage.addMemberToChannel(this.getNspForSocket(socket), data.channel, member).then(members => {
                        socket.join(data.channel);
                        this.onSubscribed(socket, data.channel, members);
                        this.onJoin(socket, data.channel, member);
                    });
                }

                return member;
            }, () => Log.error('Error retrieving pressence channel members.'));
        });
    }

    /**
     * Leave a channel. Remove a member from a
     * presenece channel and broadcast they have left
     * only if not other presence channel instances exist.
     *
     * @param  {any}  socket
     * @param  {string}  channel
     * @return {void}
     */
    leave(socket: any, channel: string): void {
        this.getMembers(this.getNspForSocket(socket), channel).then(members => {
            let memberWhoLeft = members.find(member => member.socket_id === socket.id);

            /**
             * Since in .join(), only the first connection that has a certain member.user_id is stored (the rest
             * of the sockets that connect with the member.user_id are rejected), we check if the socket exists.
             * If the socket leaves, then delete the user associated with it.
             */
            if (memberWhoLeft) {
                this.presenceStorage.removeMemberFromChannel(this.getNspForSocket(socket), channel, memberWhoLeft).then(members => {
                    socket.leave(channel);
                    this.onLeave(socket, channel, memberWhoLeft);
                });
            }
        }, error => Log.error(error));
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
        super.onJoin(socket, channel, member);

        this.io.of(this.getNspForSocket(socket))
            .sockets
            .get(socket.id)
            .broadcast
            .to(channel)
            .emit('presence:joining', channel, member);

        /**
         * We can't intercept the socket.emit() function, so
         * this one will be present here to mark an outgoing WS message.
         */
        if (this.options.prometheus.enabled) {
            this.prometheus.markWsMessage(this.getNspForSocket(socket), 'presence:joining', channel, member);
        }
    }

    /**
     * Handle leaves.
     *
     * @param  {any}  socket
     * @param  {string}  channel
     * @param  {any}  member
     * @return {void}
     */
    onLeave(socket: any, channel: string, member: any): void {
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
    }

    /**
     * Handle subscriptions.
     *
     * @param  {any}  socket
     * @param  {string}  channel
     * @param  {any[]}  members
     * @return {void}
     */
    onSubscribed(socket: any, channel: string, members: any[]) {
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
    }

    /**
     * Get the members of a presence channel.
     *
     * @param  {string}  namespace
     * @param  {string}  channel
     * @return {Promise<any>}
     */
    getMembers(namespace: any, channel: string): Promise<any> {
        return this.presenceStorage.getMembersFromChannel(namespace, channel);
    }

    /**
     * Get the data to sign for the token.
     *
     * @param  {any}  socket
     * @param  {any}  data
     * @return {string}
     */
    protected getDataToSignForToken(socket: any, data: any): string {
        return `${socket.id}:${data.channel}:${data.channel_data}`;
    }
}
