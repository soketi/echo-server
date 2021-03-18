import { PresenceStorageDriver } from './presence-storage-driver';

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
     *
     * @param {any} options
     * @param {any} io
     */
    constructor(protected options: any, protected io: any) {
        this.redis = new Redis(options.database.redis);
    }

    /**
     * Get channel members.
     *
     * @param  {string}  nsp
     * @param  {string}  channel
     * @return {Promise<any>}
     */
    getMembersFromChannel(nsp: string, channel: string): Promise<any> {
        return this.redis.hget(`${nsp}:${channel}`, 'members').then(value => value ? JSON.parse(value) : []);
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
        return this.getMembersFromChannel(nsp, channel).then(members => {
            members.push(member);

            return this.redis.hset(`${nsp}:${channel}`, 'members', JSON.stringify(members)).then(() => {
                return members;
            });
        });
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
        return this.getMembersFromChannel(nsp, channel).then(members => {
            return members.find(member => member.socket_id === socket.id);
        });
    }
}
