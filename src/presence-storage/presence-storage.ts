import { PresenceStorageDriver } from './presence-storage-driver';
import { Log } from './../log';
import { Member } from '../channels/presence-channel';
import { Options } from './../options';
import { Socket } from './../socket';
import { Server as SocketIoServer } from 'socket.io';
import { SocketStorage } from './socket-storage';

/**
 * Class that controls the key/value data store.
 */
export class PresenceStorage implements PresenceStorageDriver {
    /**
     * Storage driver for persistent channel.
     *
     * @type {PresenceStorageDriver}
     */
    protected storage: PresenceStorageDriver;

    /**
     * Create a new storage instance.
     */
    constructor(protected options: Options, protected io: SocketIoServer) {
        if (options.presence.storage.database === 'socket') {
            this.storage = new SocketStorage(options, io);
        } else {
            Log.error('Storage driver not set.');
        }
    }

    /**
     * Get channel members.
     */
    getMembersFromChannel(nsp: string, channel: string): Promise<Member[]> {
        return this.storage.getMembersFromChannel(nsp, channel);
    }

    /**
     * Add a new member to a given channel.
     */
    addMemberToChannel(socket: Socket, nsp: string, channel: string, member: Member): Promise<Member[]> {
        return this.storage.addMemberToChannel(socket, nsp, channel, member);
    }

    /**
     * Remove a member from a given channel.
     */
    removeMemberFromChannel(socket: Socket, nsp: string, channel: string, member: Member): Promise<Member[]> {
        return this.storage.removeMemberFromChannel(socket, nsp, channel, member);
    }

    /**
     * Check if the given member exists in a channel.
     */
    memberExistsInChannel(nsp: string, channel: string, member: Member): Promise<boolean> {
        return this.storage.memberExistsInChannel(nsp, channel, member);
    }

    /**
     * Check for presence members that share the same socket_id
     * as the given socket. Used to avoid doubling connections
     * for same presence user (like in the case of multiple tabs).
     */
    whoLeft(socket: Socket, nsp: string, channel: string): Promise<Member> {
        return this.storage.whoLeft(socket, nsp, channel);
    }
}
