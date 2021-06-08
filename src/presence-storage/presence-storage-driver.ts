import { Member } from '../channels/presence-channel';
import { Socket } from './../socket';

/**
 * Interface for key/value data stores.
 */
export interface PresenceStorageDriver {
    /**
     * Get channel members.
     *
     * @param  {string}  nsp
     * @param  {string}  channel
     * @return {Promise<any>}
     */
    getMembersFromChannel(nsp: string, channel: string): Promise<any>;

    /**
     * Add a new member to a given channel.
     *
     * @param  {Socket}  socket
     * @param  {string}  nsp
     * @param  {string}  channel
     * @param  {Member}  member
     * @return {Promise<any>}
     */
    addMemberToChannel(socket: Socket, nsp: string, channel: string, member: Member): Promise<any>;

    /**
     * Remove a member from a given channel.
     *
     * @param  {Socket}  socket
     * @param  {string}  nsp
     * @param  {string}  channel
     * @param  {Member}  member
     * @return {Promise<any>}
     */
    removeMemberFromChannel(socket: Socket, nsp: string, channel: string, member: Member): Promise<any>;

    /**
     * Check if the given member exists in a channel.
     *
     * @param  {string}  nsp
     * @param  {string}  channel
     * @param  {Member}  member
     * @return {Promise<boolean>}
     */
    memberExistsInChannel(nsp: string, channel: string, member: Member): Promise<boolean>;

    /**
     * Check for presence members that share the same socket_id
     * as the given socket. Used to avoid doubling connections
     * for same presence user (like in the case of multiple tabs).
     *
     * @param  {Socket}  socket
     * @param  {string}  nsp
     * @param  {string}  channel
     * @return {Promise<any>}
     */
    whoLeft(socket: Socket, nsp: string, channel: string): Promise<any>;
}
