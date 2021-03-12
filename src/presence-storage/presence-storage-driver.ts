/**
 * Interface for key/value data stores.
 */
export interface PresenceStorageDriver {
    /**
     * Get channel members.
     *
     * @param  {string}  nsp
     * @param  {string}  channel
     * @return {Promise<any>}
     */
    getMembersFromChannel(nsp: string, channel: string): Promise<any>;

    /**
     * Add a new member to a given channel.
     *
     * @param  {string}  nsp
     * @param  {string}  channel
     * @param  {any}  member
     * @return {Promise<any>}
     */
    addMemberToChannel(nsp: string, channel: string, member: any): Promise<any>;

    /**
     * Remove a member from a given channel.
     *
     * @param  {string}  nsp
     * @param  {string}  channel
     * @param  {any}  member
     * @return {Promise<any>}
     */
    removeMemberFromChannel(nsp: string, channel: string, member: any): Promise<any>;

    /**
     * Check if the given member exists in a channel.
     *
     * @param  {string}  nsp
     * @param  {string}  channel
     * @param  {any}  member
     * @return {Promise<boolean>}
     */
    memberExistsInChannel(nsp: string, channel: string, member: any): Promise<boolean>;
}
