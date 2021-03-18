import { App } from './../app';

export interface AppManagerDriver {
    /**
     * Find an app by given ID.
     *
     * @param  {string|number}  id
     * @param  {any}  socket
     * @param  {any}  data
     * @return {Promise<App|null>}
     */
    findById(id: string|number, socket: any, data: any): Promise<App|null>;

    /**
     * Find an app by given key.
     *
     * @param  {string|number}  key
     * @param  {any}  socket
     * @param  {any}  data
     * @return {Promise<App|null>}
     */
    findByKey(key: string|number, socket: any, data: any): Promise<App|null>;
}
