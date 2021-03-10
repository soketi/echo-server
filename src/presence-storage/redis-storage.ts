import { PresenceStorageDriver } from './presence-storage-driver';

const Redis = require('ioredis');

export class RedisStorage implements PresenceStorageDriver {
    /**
     * Redis client.
     *
     * @type {any}
     */
    protected redis: any;

    /**
     * Create a new cache instance.
     *
     * @param {any} options
     */
    constructor(protected options) {
        this.redis = new Redis(options.database.redis);
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
        return new Promise<any>((resolve, reject) => {
            this.redis.get(`${nsp}:${channel}:members`).then(value => resolve(JSON.parse(value)));
        });
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
        this.redis.set(`${nsp}:${channel}:members`, JSON.stringify(members));
    }
}
