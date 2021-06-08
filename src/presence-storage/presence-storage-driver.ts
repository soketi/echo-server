import { Member } from '../channels/presence-channel';
import { Socket } from './../socket';

/**
 * Interface for key/value data stores.
 */
export interface PresenceStorageDriver {
    /**
     * Get channel members.
     */
    getMembersFromChannel(nsp: string, channel: string): Promise<Member[]>;

    /**
     * Add a new member to a given channel.
     */
    addMemberToChannel(socket: Socket, nsp: string, channel: string, member: Member): Promise<Member[]>;

    /**
     * Remove a member from a given channel.
     */
    removeMemberFromChannel(socket: Socket, nsp: string, channel: string, member: Member): Promise<Member[]>;

    /**
     * Check if the given member exists in a channel.
     */
    memberExistsInChannel(nsp: string, channel: string, member: Member): Promise<boolean>;

    /**
     * Check for presence members that share the same socket_id
     * as the given socket. Used to avoid doubling connections
     * for same presence user (like in the case of multiple tabs).
     */
    whoLeft(socket: Socket, nsp: string, channel: string): Promise<Member>;
}
