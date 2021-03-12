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
     * Get channel members.
     *
     * @param  {string}  nsp
     * @param  {string}  channel
     * @return {Promise<any>}
     */
    getMembersFromChannel(nsp: string, channel: string): Promise<any> {
        return new Promise(resolve => resolve(this.storage[`${nsp}:${channel}:members`] || []));
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
        return this.getMembersFromChannel(nsp, channel).then(members => {
            members.push(member);

            this.storage[`${nsp}:${channel}:members`] = members;

            return members;
        });
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
        return this.getMembersFromChannel(nsp, channel).then(existingMembers => {
            let newMembers = existingMembers.filter(existingMember => {
                return member.socket_id !== existingMember.socket_id;
            });

            this.storage[`${nsp}:${channel}:members`] = newMembers;

            return newMembers;
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
}
