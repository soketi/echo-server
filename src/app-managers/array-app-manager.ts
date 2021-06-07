import { App } from './../app';
import { AppManagerDriver } from './app-manager-driver';
import { Socket } from './../socket';

export class ArrayAppManager implements AppManagerDriver {
    /**
     * Create a new app manager instance.
     *
     * @param {any} options
     */
    constructor(protected options: any) {
        //
    }

    /**
     * Find an app by given ID.
     *
     * @param  {string|number}  id
     * @param  {Socket}  socket
     * @param  {any}  data
     * @return {Promise<App|null>}
     */
    findById(id: string|number, socket: Socket, data: any): Promise<App|null> {
        return new Promise((resolve, reject) => {
            let app = this.options.appManager.array.apps.find(app => app.id == id);

            if (typeof app !== 'undefined') {
                resolve(new App(app));
            } else {
                reject({ reason: `App ${id} not found.` });
            }
        });
    }

    /**
     * Find an app by given key.
     *
     * @param  {string|number}  key
     * @param  {Socket}  socket
     * @param  {any}  data
     * @return {Promise<App|null>}
     */
    findByKey(key: string|number, socket: Socket, data: any): Promise<App|null> {
        return new Promise((resolve, reject) => {
            let app = this.options.appManager.array.apps.find(app => app.key == key);

            if (typeof app !== 'undefined') {
                resolve(new App(app));
            } else {
                reject({ reason: `App ${key} not found.` });
            }
        });
    }
}
