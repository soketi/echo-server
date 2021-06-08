import { Member } from '../channels/presence-channel';
import { Options } from './../options';
import { PresenceStorageDriver } from './presence-storage-driver';
import { Socket } from './../socket';
import { Server as SocketIoServer } from 'socket.io';

const Redis = require('ioredis');

export class RedisStorage implements PresenceStorageDriver {
    /**
     * Redis client.
     *
     * @type {Redis}
     */
    protected redis: typeof Redis;

    /**
     * Create a new cache instance.
     */
    constructor(protected options: Options, protected io: SocketIoServer) {
        this.redis = new Redis(options.database.redis);
    }

    /**
     * Get channel members.
     */
    getMembersFromChannel(nsp: string, channel: string): Promise<Member[]> {
        return this.redis.hget(`${nsp}:${channel}`, 'members').then(value => value ? JSON.parse(value) : []);
    }

    /**
     * Add a new member to a given channel.
     */
    addMemberToChannel(socket: Socket, nsp: string, channel: string, member: Member): Promise<Member[]> {
        return this.getMembersFromChannel(nsp, channel).then(members => {
            members.push(member);

            return this.redis.hset(`${nsp}:${channel}`, 'members', JSON.stringify(members)).then(() => {
                return members;
            });
        });
    }

    /**
     * Remove a member from a given channel.
     */
    removeMemberFromChannel(socket: Socket, nsp: string, channel: string, member: Member): Promise<Member[]> {
        return this.getMembersFromChannel(nsp, channel).then(existingMembers => {
            let newMembers = existingMembers.filter(existingMember => {
                return member.socket_id !== existingMember.socket_id;
            });

            return this.redis.hset(`${nsp}:${channel}`, 'members', JSON.stringify(newMembers)).then(() => {
                return newMembers;
            });
        });
    }

    /**
     * Check if the given member exists in a channel.
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
     */
    whoLeft(socket: Socket, nsp: string, channel: string): Promise<Member> {
        return this.getMembersFromChannel(nsp, channel).then(members => {
            return members.find(member => member.socket_id === socket.id);
        });
    }
}
