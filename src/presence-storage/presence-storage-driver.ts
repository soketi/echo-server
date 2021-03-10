/**
 * Interface for key/value data stores.
 */
export interface PresenceStorageDriver {
    /**
     * Get the members for a specific
     * namespace and channel.
     *
     * @param  {string}  nsp
     * @param  {string}  channel
     * @return {Promise<any>}
     */
    get(nsp: string, channel: string): Promise<any>;

    /**
     * Set the new members in a specific
     * namespace and channel.
     *
     * @param  {string}  nsp
     * @param  {string}  channel
     * @param  {any}  members
     * @return {void}
     */
    set(nsp: string, channel: string, members: any): void;
}
