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
     * Get the members for a specific
     * namespace and channel.
     *
     * @param  {string}  nsp
     * @param  {string}  channel
     * @return {Promise<any>}
     */
    get(nsp: string, channel: string): Promise<any> {
        return this.storage.get(nsp, channel);
    }

    /**
     * Set the new members in a specific
     * namespace and channel.
     *
     * @param  {string}  nsp
     * @param  {string}  channel
     * @param  {any}  members
     * @return {void}
     */
    set(nsp: string, channel: string, members: any): void {
        this.storage.set(nsp, channel, members);
    }
}
