import { resolve } from 'path';
import { PresenceStorageDriver } from './presence-storage-driver';

export class SocketStorage implements PresenceStorageDriver {
    /**
     * Create a new cache instance.
     *
     * @param {any} options
     * @param {any} io
     */
    constructor(protected options: any, protected io: any) {
        //
    }

    /**
     * Get channel members.
     *
     * @param  {string}  nsp
     * @param  {string}  channel
     * @return {Promise<any>}
     */
    getMembersFromChannel(nsp: string, channel: string): Promise<any> {
        return this.io.of(nsp).adapter.fetchSockets({ rooms: [channel], except: [] }).then(sockets => {
            return sockets.map(socket => {
                return socket?.data?.presence?.[channel];
            }).filter(member => !!member);
        });
    }

    /**
     * Add a new member to a given channel.
     *
     * @param  {any}  socket
     * @param  {string}  nsp
     * @param  {string}  channel
     * @param  {any}  member
     * @return {Promise<any>}
     */
    addMemberToChannel(socket: any, nsp: string, channel: string, member: any): Promise<any> {
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
     * @param  {any}  socket
     * @param  {string}  nsp
     * @param  {string}  channel
     * @param  {any}  member
     * @return {Promise<any>}
     */
    removeMemberFromChannel(socket: any, nsp: string, channel: string, member: any): Promise<any> {
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
     * @param  {any}  member
     * @return {Promise<boolean>}
     */
    memberExistsInChannel(nsp: string, channel: string, member: any): Promise<boolean> {
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
     * @param  {any}  socket
     * @param  {string}  nsp
     * @param  {string}  channel
     * @return {Promise<any>}
     */
    whoLeft(socket: any, nsp: string, channel: string): Promise<any> {
        return new Promise(resolve => {
            resolve(socket.data.presence[channel]);
        });
    }
}
