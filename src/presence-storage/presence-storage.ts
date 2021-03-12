import { PresenceStorageDriver } from './presence-storage-driver';
import { Log } from './../log';
import { RedisStorage } from './redis-storage';
import { LocalStorage } from './local-storage';

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
     *
     * @param {any} options
     */
    constructor(protected options: any) {
        if (options.presence.storage.database === 'redis') {
            this.storage = new RedisStorage(options);
        } else if (options.presence.storage.database === 'local') {
            this.storage = new LocalStorage(options);
        } else {
            Log.error('Storage driver not set.');
        }
    }

    /**
     * Get channel members.
     *
     * @param  {string}  nsp
     * @param  {string}  channel
     * @return {Promise<any>}
     */
    getMembersFromChannel(nsp: string, channel: string): Promise<any> {
        return this.storage.getMembersFromChannel(nsp, channel);
    }

    /**
     * Add a new member to a given channel.
     *
     * @param  {string}  nsp
     * @param  {string}  channel
     * @param  {any}  member
     * @return {Promise<any>}
     */
    addMemberToChannel(nsp: string, channel: string, member: any): Promise<any> {
        return this.storage.addMemberToChannel(nsp, channel, member);
    }

    /**
     * Remove a member from a given channel.
     *
     * @param  {string}  nsp
     * @param  {string}  channel
     * @param  {any}  member
     * @return {Promise<any>}
     */
    removeMemberFromChannel(nsp: string, channel: string, member: any): Promise<any> {
        return this.storage.removeMemberFromChannel(nsp, channel, member);
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
        return this.storage.memberExistsInChannel(nsp, channel, member);
    }
}
