import { PresenceStorageDriver } from './presence-storage-driver';

export class LocalStorage implements PresenceStorageDriver {
    /**
     * The key-value storage.
     *
     * @type {object}
     */
    protected storage = {
        //
    };

    /**
     * Create a new cache instance.
     *
     * @param {any} options
     */
    constructor(protected options) {
        //
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
        return new Promise(resolve => resolve(this.storage[`${nsp}:${channel}:members`] || null));
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
        this.storage[`${nsp}:${channel}:members`] = members;
    }
}
