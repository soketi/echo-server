import { App } from './../app';
import { Socket } from './../socket';

export interface AppManagerDriver {
    /**
     * Find an app by given ID.
     *
     * @param  {string|number}  id
     * @param  {Socket}  socket
     * @param  {any}  data
     * @return {Promise<App|null>}
     */
    findById(id: string|number, socket: Socket, data: any): Promise<App|null>;

    /**
     * Find an app by given key.
     *
     * @param  {string|number}  key
     * @param  {Socket}  socket
     * @param  {any}  data
     * @return {Promise<App|null>}
     */
    findByKey(key: string|number, socket: Socket, data: any): Promise<App|null>;
}
