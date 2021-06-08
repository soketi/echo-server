import { Member } from '../channels/presence-channel';
import { Options } from './../options';
import { PresenceStorageDriver } from './presence-storage-driver';
import { Socket } from './../socket';
import { RemoteSocket, Server as SocketIoServer } from 'socket.io';

export class SocketStorage implements PresenceStorageDriver {
    /**
     * Create a new cache instance.
     *
     * @param {Options} options
     * @param {SocketIoServer} io
     */
    constructor(protected options: Options, protected io: SocketIoServer) {
        //
    }

    /**
     * Get channel members.
     *
     * @param  {string}  nsp
     * @param  {string}  channel
     * @return {Promise<Member[]>}
     */
    getMembersFromChannel(nsp: string, channel: string): Promise<Member[]> {
        // @ts-ignore
        return this.io.of(nsp).adapter.fetchSockets({ rooms: [channel], except: [] }).then((sockets: RemoteSocket[]) => {
            return sockets.map(socket => socket?.data?.presence?.[channel]).filter(member => !!member);
        });
    }

    /**
     * Add a new member to a given channel.
     *
     * @param  {Socket}  socket
     * @param  {string}  nsp
     * @param  {string}  channel
     * @param  {Member}  member
     * @return {Promise<Member[]>}
     */
    addMemberToChannel(socket: Socket, nsp: string, channel: string, member: Member): Promise<Member[]> {
        if (!socket.data) {
            socket.data = {};
        }

        if (!socket.data.presence) {
            socket.data.presence = {};
        }

        socket.data.presence[channel] = member;

        return this.getMembersFromChannel(nsp, channel);
    }

    /**
     * Remove a member from a given channel.
     *
     * @param  {Socket}  socket
     * @param  {string}  nsp
     * @param  {string}  channel
     * @param  {Member}  member
     * @return {Promise<Member[]>}
     */
    removeMemberFromChannel(socket: Socket, nsp: string, channel: string, member: Member): Promise<Member[]> {
        if (socket.data && socket.data.presence) {
            delete socket.data.presence[channel];
        }

        return this.getMembersFromChannel(nsp, channel);
    }

    /**
     * Check if the given member exists in a channel.
     *
     * @param  {string}  nsp
     * @param  {string}  channel
     * @param  {Member}  member
     * @return {Promise<boolean>}
     */
    memberExistsInChannel(nsp: string, channel: string, member: Member): Promise<boolean> {
        return this.getMembersFromChannel(nsp, channel).then(existingMembers => {
            let memberInChannel = existingMembers.find(existingMember => {
                return existingMember.user_id === member.user_id;
            });

            return !!memberInChannel;
        });
    }

    /**
     * Check for presence members that share the same socket_id
     * as the given socket. Used to avoid doubling connections
     * for same presence user (like in the case of multiple tabs).
     *
     * @param  {Socket}  socket
     * @param  {string}  nsp
     * @param  {string}  channel
     * @return {Promise<Member>}
     */
    whoLeft(socket: Socket, nsp: string, channel: string): Promise<Member> {
        return new Promise(resolve => resolve(socket.data.presence[channel]));
    }
}
