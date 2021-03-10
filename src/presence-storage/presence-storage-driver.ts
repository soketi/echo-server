/**
 * Interface for key/value data stores.
 */
export interface PresenceStorageDriver {
    /**
     * Get a value from the database.
     *
     * @param  {string}  key
     * @return {Promise<any>}
     */
    get(key: string): Promise<any>;

    /**
     * Set a value to the database.
     *
     * @param {string} key
     * @param {any} value
     * @return {void}
     */
    set(key: string, value: any): void;
}
