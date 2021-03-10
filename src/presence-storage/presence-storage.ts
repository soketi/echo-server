import { PresenceStorageDriver } from './presence-storage-driver';
import { Log } from './../log';
import { RedisStorage } from './redis-storage';
import { LocalStorage } from './local-storage';

/**
 * Class that controls the key/value data store.
 */
export class PresenceStorage implements PresenceStorageDriver {
    /**
     * Database driver.
     *
     * @type {DatabaseDriver}
     */
    protected driver: PresenceStorageDriver;

    /**
     * Create a new database instance.
     *
     * @param {any} options
     */
    constructor(protected options: any) {
        if (options.presence.storage.database === 'redis') {
            this.driver = new RedisStorage(options);
        } else if (options.presence.storage.database === 'local') {
            this.driver = new LocalStorage(options);
        } else {
            Log.error('Database driver not set.');
        }
    }

    /**
     * Get a value from the database.
     *
     * @param  {string}  key
     * @return {Promise<any>}
     */
    get(key: string): Promise<any> {
        return this.driver.get(key);
    }

    /**
     * Set a value to the database.
     *
     * @param {string} key
     * @param {any} value
     * @return {void}
     */
    set(key: string, value: any): void {
        this.driver.set(key, value);
    }
}
