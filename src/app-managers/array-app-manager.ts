import { App } from './../app';
import { AppManagerDriver } from './app-manager-driver';
import { EmittedData } from '../echo-server';
import { Options } from './../options';
import { Socket } from './../socket';

export class ArrayAppManager implements AppManagerDriver {
    /**
     * Create a new app manager instance.
     */
    constructor(protected options: Options) {
        //
    }

    /**
     * Find an app by given ID.
     */
    findById(id: string|number, socket: Socket, data: EmittedData): Promise<App|null> {
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
     */
    findByKey(key: string|number, socket: Socket, data: EmittedData): Promise<App|null> {
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
